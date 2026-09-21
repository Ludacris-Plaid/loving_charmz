import { createHmac, timingSafeEqual } from 'node:crypto';

import type { SquareConfig } from './config';
import { requestJson, safeReference } from './http';
import {
  PaymentProviderError,
  type CreateSessionInput,
  type MoneyAmount,
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
  const providerTransactionId = safeReference(tender?.payment_id ?? tender?.id, 64);

  // Orders created through payment links stay OPEN even after the money has
  // moved — Square never flips them to COMPLETED. The payment object behind
  // the tender is the source of truth for capture, so when a tender exists we
  // ask Square about that payment directly and let the order state only
  // provide the fallback (CANCELED → failed, no tenders → pending).
  let status = resolveSquareOutcome(order.state);
  if (tender?.payment_id && status !== 'paid') {
    const paymentPayload = await requestJson<{ payment?: { status?: string } }>(
      'square',
      `${config.baseUrl}/v2/payments/${encodeURIComponent(tender.payment_id)}`,
      { method: 'GET', headers: squareHeaders(config) },
    );
    const paymentStatus = paymentPayload?.payment?.status;
    if (paymentStatus === 'COMPLETED') status = 'paid';
    else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') status = 'failed';
  }

  return {
    provider: 'square',
    orderId: null,
    providerOrderId: safeReference(order.id, 64) || providerOrderId,
    providerTransactionId,
    status,
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

/**
 * Direct card charge for the embedded Web Payments SDK flow.
 *
 * The browser only ever sends a single-use card token (`sourceId`), never card
 * data, and never the amount: the caller is expected to pass the *server-side*
 * order total. The idempotency key is derived from our order id, so a retried
 * tokenization after a network blip cannot double-charge the shopper.
 */
export async function createSquareDirectCharge(
  config: SquareConfig,
  input: { sourceId: string; orderId: string; amount: MoneyAmount; reference?: string },
): Promise<{ providerTransactionId: string | null; status: string; raw: unknown }> {
  const amountMinor = toMinorUnits(input.amount.value);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new PaymentProviderError('square', 'invalid_amount', 'Square requires a positive order amount.', input.amount);
  }

  // Dynamic import keeps the Square SDK out of any bundle that does not
  // actually charge a card.
  const { SquareClient, SquareEnvironment } = await import('square');
  const client = new SquareClient({
    token: config.accessToken,
    environment: config.mode === 'live' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  const response = await client.payments.create({
    sourceId: input.sourceId,
    idempotencyKey: `lc-order-${input.orderId}`,
    amountMoney: {
      amount: BigInt(amountMinor),
      // The SDK's generated Currency type is a string union; CAD is valid.
      currency: input.amount.currency as never,
    },
    locationId: config.locationId,
    note: `Loving Charmz order ${input.reference ?? input.orderId}`.slice(0, 500),
  });

  const payment = response.payment;
  return {
    providerTransactionId: payment?.id ?? null,
    status: payment?.status ?? 'UNKNOWN',
    raw: payment,
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

/**
 * Issues a full refund for a completed Square payment.
 *
 * The caller must verify the order exists and is paid before calling — this
 * function trusts the caller on the amount. Square requires the original
 * payment id; we store it in `payment_transactions.provider_data.payment_id`
 * at settlement time.
 */
export async function createSquareRefund(
  config: SquareConfig,
  params: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    orderId: string;
  },
): Promise<{ refundId: string | null; status: string; raw: unknown }> {
  const { SquareClient, SquareEnvironment } = await import('square');
  const client = new SquareClient({
    token: config.accessToken,
    environment: config.mode === 'live' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  const response = await client.refunds.refundPayment({
    idempotencyKey: `lc-refund-${params.orderId}`,
    paymentId: params.paymentId,
    amountMoney: {
      amount: BigInt(params.amountMinor),
      currency: params.currency as never,
    },
    reason: 'Refund initiated by store owner',
  });

  const refund = response.refund;
  return {
    refundId: refund?.id ?? null,
    status: refund?.status ?? 'UNKNOWN',
    raw: refund,
  };
}
