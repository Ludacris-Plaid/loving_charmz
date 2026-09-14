import type { PayPalConfig } from './config';
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
 * PayPal Orders v2 adapter.
 *
 * Two-step by design: `createPayPalSession` creates an order and hands back the
 * approval URL the shopper must visit; `capturePayPalOrder` is only called after
 * PayPal sends the shopper back, and is the moment money actually moves.
 */

type PayPalLink = { href?: string; rel?: string; method?: string };
type PayPalCapture = {
  id?: string;
  status?: string;
  custom_id?: string;
  amount?: { value?: string; currency_code?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
};
type PayPalPurchaseUnit = {
  reference_id?: string;
  custom_id?: string;
  payments?: { captures?: PayPalCapture[] };
  amount?: { value?: string; currency_code?: string };
};
type PayPalOrder = {
  id?: string;
  status?: string;
  intent?: string;
  payer?: { email_address?: string };
  links?: PayPalLink[];
  purchase_units?: PayPalPurchaseUnit[];
};

type CachedToken = { accessToken: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();
const TOKEN_SAFETY_WINDOW_MS = 30_000;

export async function getPayPalAccessToken(config: PayPalConfig): Promise<string> {
  const cached = tokenCache.get(config.clientId);
  if (cached && cached.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS) return cached.accessToken;

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const payload = await requestJson<{ access_token?: string; expires_in?: number }>(
    'paypal',
    `${config.baseUrl}/v1/oauth2/token`,
    {
      method: 'POST',
      form: { grant_type: 'client_credentials' },
      headers: { Authorization: `Basic ${basic}` },
    },
  );

  const accessToken = payload?.access_token;
  if (!accessToken) {
    throw new PaymentProviderError('paypal', 'authentication_failed', 'PayPal did not return an access token.', payload);
  }

  const expiresIn = Number(payload.expires_in || 0) || 3000;
  tokenCache.set(config.clientId, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return accessToken;
}

/** Test seam: the cache would otherwise leak credentials between test cases. */
export function resetPayPalTokenCache(): void {
  tokenCache.clear();
}

export async function createPayPalSession(
  config: PayPalConfig,
  input: CreateSessionInput,
): Promise<PaymentSession> {
  const accessToken = await getPayPalAccessToken(config);

  const order = await requestJson<PayPalOrder>('paypal', `${config.baseUrl}/v2/checkout/orders`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=representation',
      'PayPal-Request-Id': `lc-order-${input.orderId}`,
    },
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          description: `Loving Charmz order ${input.reference}`.slice(0, 127),
          amount: {
            currency_code: input.amount.currency,
            value: input.amount.value,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Loving Charmz',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    },
  });

  const providerOrderId = safeReference(order.id, 64);
  const approvalUrl = pickApprovalUrl(order.links);
  if (!providerOrderId || !approvalUrl) {
    throw new PaymentProviderError(
      'paypal',
      'missing_approval_link',
      'PayPal accepted the order but did not return an approval link.',
      order,
    );
  }

  return {
    provider: 'paypal',
    providerOrderId,
    redirectUrl: approvalUrl,
    status: order.status || 'CREATED',
    mode: config.mode,
  };
}

/**
 * Captures an approved PayPal order. Safe to call twice: PayPal answers
 * `ORDER_ALREADY_CAPTURED`, and we then read the order back instead of failing.
 */
export async function capturePayPalOrder(
  config: PayPalConfig,
  providerOrderId: string,
): Promise<PaymentConfirmation> {
  const accessToken = await getPayPalAccessToken(config);

  try {
    const order = await requestJson<PayPalOrder>(
      'paypal',
      `${config.baseUrl}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'return=representation',
          'PayPal-Request-Id': `lc-capture-${providerOrderId}`,
        },
        body: {},
      },
    );
    return toConfirmation(order, providerOrderId);
  } catch (error) {
    if (error instanceof PaymentProviderError && error.code === 'ORDER_ALREADY_CAPTURED') {
      return fetchPayPalOrder(config, providerOrderId);
    }
    throw error;
  }
}

export async function fetchPayPalOrder(
  config: PayPalConfig,
  providerOrderId: string,
): Promise<PaymentConfirmation> {
  const accessToken = await getPayPalAccessToken(config);
  const order = await requestJson<PayPalOrder>(
    'paypal',
    `${config.baseUrl}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`,
    { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return toConfirmation(order, providerOrderId);
}

export async function verifyPayPalWebhookSignature(
  config: PayPalConfig,
  headers: Headers,
  event: unknown,
): Promise<boolean> {
  if (!config.webhookId) return false;

  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) return false;

  const accessToken = await getPayPalAccessToken(config);
  const result = await requestJson<{ verification_status?: string }>(
    'paypal',
    `${config.baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: config.webhookId,
        webhook_event: event,
      },
    },
  );

  return result?.verification_status === 'SUCCESS';
}

const PAYPAL_EVENT_KINDS: Record<string, PaymentWebhookEvent['kind']> = {
  'PAYMENT.CAPTURE.COMPLETED': 'paid',
  'PAYMENT.CAPTURE.DENIED': 'failed',
  'PAYMENT.CAPTURE.REFUNDED': 'refunded',
  'PAYMENT.CAPTURE.REVERSED': 'refunded',
  'CHECKOUT.ORDER.APPROVED': 'ignored',
  'CHECKOUT.ORDER.COMPLETED': 'ignored',
};

/** Maps a PayPal webhook body onto the provider-agnostic event shape. */
export function parsePayPalWebhookEvent(event: unknown): PaymentWebhookEvent {
  const record = asRecord(event);
  const eventType = typeof record.event_type === 'string' ? record.event_type : '';
  const kind = PAYPAL_EVENT_KINDS[eventType] ?? 'ignored';
  const resource = asRecord(record.resource);
  const purchaseUnit = Array.isArray(resource.purchase_units)
    ? asRecord(resource.purchase_units[0])
    : {};
  const capture = Array.isArray(purchaseUnit.payments?.captures)
    ? asRecord(purchaseUnit.payments?.captures?.[0])
    : {};

  const orderId =
    safeReference(capture.custom_id, 64) ||
    safeReference(resource.custom_id, 64) ||
    safeReference(purchaseUnit.custom_id, 64);
  const providerOrderId =
    safeReference(resource.supplementary_data?.related_ids?.order_id, 64) ||
    safeReference(resource.id, 64);

  // Refund events identify the *refund*, which we never stored. Their `up` link
  // points at the capture we did store, so that is what gets looked up.
  const upLink = Array.isArray(resource.links)
    ? resource.links.find((link: PayPalLink) => link?.rel === 'up' && typeof link?.href === 'string')
    : undefined;
  const captureFromUpLink = upLink?.href
    ? safeReference(String(upLink.href).split('/').filter(Boolean).pop(), 64)
    : null;
  const providerTransactionId =
    kind === 'refunded'
      ? captureFromUpLink ?? safeReference(resource.id, 64)
      : safeReference(capture.id ?? resource.id, 64);

  const amountSource = asRecord(capture.amount ?? resource.amount);
  const amountValue = typeof amountSource.value === 'string' ? amountSource.value : null;
  const currency = typeof amountSource.currency_code === 'string' ? amountSource.currency_code : null;

  return {
    provider: 'paypal',
    kind,
    orderId,
    providerOrderId,
    providerTransactionId,
    amount: amountValue && currency ? { value: amountValue, currency } : null,
    payerEmail: typeof record.resource?.payer?.email_address === 'string' ? record.resource.payer.email_address : null,
    raw: event,
  };
}

function pickApprovalUrl(links: PayPalLink[] | undefined): string | null {
  if (!Array.isArray(links)) return null;
  const preferred = links.find((link) => link.rel === 'payer-action') ?? links.find((link) => link.rel === 'approve');
  const href = preferred?.href;
  return typeof href === 'string' && /^https:\/\//.test(href) ? href : null;
}

function toConfirmation(order: PayPalOrder, fallbackOrderId: string): PaymentConfirmation {
  const purchaseUnit = Array.isArray(order.purchase_units) ? order.purchase_units[0] : undefined;
  const capture = purchaseUnit?.payments?.captures?.[0];
  const amountSource = capture?.amount ?? purchaseUnit?.amount;

  return {
    provider: 'paypal',
    orderId: safeReference(capture?.custom_id ?? purchaseUnit?.custom_id ?? purchaseUnit?.reference_id, 64),
    providerOrderId: safeReference(order.id, 64) || fallbackOrderId,
    providerTransactionId: safeReference(capture?.id, 64),
    status: resolvePayPalOutcome(order.status, capture?.status),
    amount:
      typeof amountSource?.value === 'string' && typeof amountSource?.currency_code === 'string'
        ? { value: amountSource.value, currency: amountSource.currency_code }
        : null,
    payerEmail: typeof order.payer?.email_address === 'string' ? order.payer.email_address : null,
    raw: order,
  };
}

function resolvePayPalOutcome(orderStatus?: string, captureStatus?: string): PaymentOutcome {
  switch (captureStatus) {
    case 'COMPLETED':
      return 'paid';
    case 'DECLINED':
    case 'FAILED':
    case 'VOIDED':
      return 'failed';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'refunded';
    default:
      break;
  }

  switch (orderStatus) {
    case 'COMPLETED':
      return 'paid';
    case 'VOIDED':
      return 'failed';
    default:
      return 'pending';
  }
}

function asRecord(value: unknown): any {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}
