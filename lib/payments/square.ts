import { createHmac, timingSafeEqual } from 'node:crypto';

import type { SquareConfig } from './config';
import { requestJson, safeReference } from './http';
import {
  PaymentProviderError,
  type CreateSessionInput,
  type PaymentConfirmation,
  type PaymentOutcome,
  type PaymentSession,
  type PaymentWebhookEvent,
} from './types';

/**
 * Square adapter built on the hosted Checkout API (payment links).
 *
 * Square's embedded Web Payments SDK needs a *public* application id that this
 * project does not configure, and it would require collecting card data in the
 * browser. Hosted checkout needs only the access token and location id, keeps
 * card entry on Square's own domain, and returns the shopper to us afterwards —
 * the same shape as the PayPal flow, so checkout stays provider-agnostic.
 */

type SquarePaymentLink = {
  id?: string;
  order_id?: string;
  url?: string;
  long_url?: string;
};
type SquareOrder = {
  id?: string;
  state?: string;
  tenders?: { id?: string; payment_id?: string; amount_money?: { amount?: number; currency?: string } }[];
};
type SquareMoney = { amount?: number; currency?: string };

export async function createSquareSession(
  config: SquareConfig,
  input: CreateSessionInput,
): Promise<PaymentSession> {
  const amountMinor = toMinorUnits(input.amount.value);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new PaymentProviderError('square', 'invalid_amount', 'Square requires a positive order amount.', input.amount);
  }

  const payload = await requestJson<{ payment_link?: SquarePaymentLink }>(
    'square',
    `${config.baseUrl}/v2/online-checkout/payment-links`,
    {
      headers: squareHeaders(config),
      body: {
        // Reusing the order id makes a retried request return the same link
        // instead of creating a second checkout the shopper could pay twice.
        idempotency_key: `lc-order-${input.orderId}`,
        quick_pay: {
          name: `Loving Charmz order ${input.reference}`.slice(0, 255),
          price_money: {
            amount: amountMinor,
            currency: input.amount.currency,
          },
          location_id: config.locationId,
        },
        checkout_options: {
          redirect_url: input.returnUrl,
          ask_for_shipping_address: false,
        },
      },
    },
  );

  const link = payload?.payment_link;
  const providerOrderId = safeReference(link?.order_id, 64);
  const redirectUrl = link?.url;

  if (!providerOrderId || !redirectUrl || !/^https:\/\//.test(redirectUrl)) {
    throw new PaymentProviderError(
      'square',
      'missing_checkout_link',
      'Square accepted the request but did not return a checkout link.',
      payload,
    );
  }

  return {
    provider: 'square',
    providerOrderId,
    redirectUrl,
    status: 'OPEN',
    mode: config.mode,
  };
}

/** Reads the state of the hosted checkout order Square created for us. */
export async function confirmSquareOrder(
  config: SquareConfig,
  providerOrderId: string,
): Promise<PaymentConfirmation> {
  const payload = await requestJson<{ order?: SquareOrder }>(
    'square',
    `${config.baseUrl}/v2/orders/${encodeURIComponent(providerOrderId)}`,
    { method: 'GET', headers: squareHeaders(config) },
  );

  const order = payload?.order;
  if (!order?.id) {
    throw new PaymentProviderError('square', 'order_not_found', 'Square could not find that checkout order.', payload);
  }

  const tender = Array.isArray(order.tenders) && order.tenders.length > 0 ? order.tenders[0] : undefined;
  const amountMinor = tender?.amount_money?.amount;

  return {
    provider: 'square',
    orderId: null,
    providerOrderId: safeReference(order.id, 64) || providerOrderId,
    providerTransactionId: safeReference(tender?.payment_id ?? tender?.id, 64),
    status: resolveSquareOutcome(order.state),
    amount:
      typeof amountMinor === 'number'
        ? { value: minorUnitsToMoney(amountMinor), currency: tender?.amount_money?.currency || 'USD' }
        : null,
    payerEmail: null,
    raw: order,
  };
}

export function squareWebhookSignature(
  config: SquareConfig,
  notificationUrl: string,
  rawBody: string,
): string {
  const key = config.webhookSignatureKey ?? '';
  return createHmac('sha256', key).update(notificationUrl + rawBody).digest('base64');
}

export function verifySquareWebhookSignature(
  config: SquareConfig,
  params: { signature: string | null; notificationUrl: string; rawBody: string },
): boolean {
  if (!config.webhookSignatureKey || !params.signature) return false;
  const expected = squareWebhookSignature(config, params.notificationUrl, params.rawBody);
  const providedBuffer = Buffer.from(params.signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

const SQUARE_EVENT_KINDS: Record<string, PaymentWebhookEvent['kind']> = {
  'payment.created': 'paid',
  'payment.updated': 'paid',
  'order.updated': 'paid',
  'refund.created': 'refunded',
  'refund.updated': 'refunded',
};

/** Maps a Square webhook body onto the provider-agnostic event shape. */
export function parseSquareWebhookEvent(event: unknown): PaymentWebhookEvent {
  const record = asRecord(event);
  const type = typeof record.type === 'string' ? record.type : '';
  const defaultKind = SQUARE_EVENT_KINDS[type] ?? 'ignored';
  const object = asRecord(asRecord(record.data).object);

  const payment = asRecord(object.payment);
  if (payment.id) {
    const status = typeof payment.status === 'string' ? payment.status : '';
    const kind: PaymentWebhookEvent['kind'] =
      status === 'COMPLETED'
        ? 'paid'
        : status === 'FAILED' || status === 'CANCELED'
          ? 'failed'
          : defaultKind === 'refunded'
            ? 'refunded'
            : 'ignored';
    const money = asRecord(payment.amount_money ?? payment.total_money);
    return {
      provider: 'square',
      kind,
      orderId: null,
      providerOrderId: safeReference(payment.order_id, 64),
      providerTransactionId: safeReference(payment.id, 64),
      amount: moneyValue(money),
      payerEmail: null,
      raw: event,
    };
  }

  const refund = asRecord(object.refund);
  if (refund.id) {
    return {
      provider: 'square',
      kind: 'refunded',
      orderId: null,
      providerOrderId: safeReference(refund.order_id, 64),
      providerTransactionId: safeReference(refund.id, 64),
      amount: moneyValue(asRecord(refund.amount_money)),
      payerEmail: null,
      raw: event,
    };
  }

  const order = asRecord(object.order);
  if (order.id) {
    const state = typeof order.state === 'string' ? order.state : '';
    return {
      provider: 'square',
      kind: state === 'COMPLETED' ? 'paid' : state === 'CANCELED' ? 'failed' : 'ignored',
      orderId: null,
      providerOrderId: safeReference(order.id, 64),
      providerTransactionId: null,
      amount: null,
      payerEmail: null,
      raw: event,
    };
  }

  return {
    provider: 'square',
    kind: 'ignored',
    orderId: null,
    providerOrderId: null,
    providerTransactionId: null,
    amount: null,
    payerEmail: null,
    raw: event,
  };
}

function squareHeaders(config: SquareConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    'Square-Version': config.apiVersion,
  };
}

function resolveSquareOutcome(state?: string): PaymentOutcome {
  switch (state) {
    case 'COMPLETED':
      return 'paid';
    case 'CANCELED':
      return 'failed';
    default:
      return 'pending';
  }
}

function toMinorUnits(value: string): number {
  return Math.round(Number(value) * 100);
}

function minorUnitsToMoney(amount: number): string {
  return (amount / 100).toFixed(2);
}

function moneyValue(money: Record<string, unknown>): { value: string; currency: string } | null {
  const amount = money.amount;
  const currency = money.currency;
  if (typeof amount !== 'number' || typeof currency !== 'string') return null;
  return { value: minorUnitsToMoney(amount), currency };
}

function asRecord(value: unknown): any {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}
