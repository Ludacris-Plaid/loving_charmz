import 'server-only';

import {
  getPayPalConfig,
  getSquareConfig,
  isProviderConfigured,
  resolvePaymentMethod,
  type PaymentMethodOption,
} from './config';
import { parsePayPalWebhookEvent, capturePayPalOrder, createPayPalSession, verifyPayPalWebhookSignature } from './paypal';
import { orderReference } from './reference';
import { parseSquareWebhookEvent, confirmSquareOrder, createSquareSession, verifySquareWebhookSignature } from './square';
import type {
  MoneyAmount,
  PaymentMethodId,
  PaymentProvider,
  PaymentProviderId,
  PaymentSession,
  PaymentWebhookEvent,
  PaymentConfirmation,
} from './types';
import { PaymentProviderError } from './types';

export * from './types';
export {
  getPaymentMethodOptions,
  isProviderConfigured,
  paymentMethodLabel,
  resolvePaymentMethod,
  type PaymentMethodOption,
} from './config';

/**
 * Provider registry: the only place that knows both providers exist.
 *
 * Checkout and the payment routes talk to `getProvider` / `startPaymentSession`
 * and never branch on provider specifics.
 */
export function getProvider(provider: PaymentProviderId): PaymentProvider | null {
  if (provider === 'paypal') {
    const config = getPayPalConfig();
    if (!config) return null;
    return {
      id: 'paypal',
      mode: config.mode,
      createSession: (input) => createPayPalSession(config, input),
      confirm: (providerOrderId) => capturePayPalOrder(config, providerOrderId),
    };
  }

  const config = getSquareConfig();
  if (!config) return null;
  return {
    id: 'square',
    mode: config.mode,
    createSession: (input) => createSquareSession(config, input),
    confirm: (providerOrderId) => confirmSquareOrder(config, providerOrderId),
  };
}

export function requirePaymentMethod(method: string): PaymentMethodOption {
  const option = resolvePaymentMethod(method);
  if (!option) {
    throw new PaymentProviderError('paypal', 'unknown_payment_method', `Unsupported payment method: ${method}`);
  }
  if (!isProviderConfigured(option.provider)) {
    throw new PaymentProviderError(
      option.provider,
      'provider_not_configured',
      `${option.label} is not configured for this environment.`,
    );
  }
  return option;
}

/**
 * Creates the provider-side checkout the shopper is sent to. The order already
 * exists locally at this point (the provider is given its id as the reference),
 * but no money has moved: `confirmPayment` is what settles it.
 */
export async function startPaymentSession(params: {
  method: PaymentMethodId;
  orderId: string;
  amount: MoneyAmount;
  siteUrl: string;
}): Promise<PaymentSession> {
  const option = requirePaymentMethod(params.method);
  const provider = getProvider(option.provider);
  if (!provider) {
    throw new PaymentProviderError(option.provider, 'provider_not_configured', `${option.label} is not configured.`);
  }

  const base = params.siteUrl.replace(/\/+$/, '');
  const returnUrl =
    option.provider === 'paypal'
      ? `${base}/api/payments/paypal/capture/${params.orderId}`
      : `${base}/api/payments/square/return/${params.orderId}`;
  const cancelUrl = `${base}/api/payments/paypal/cancel/${params.orderId}`;

  return provider.createSession({
    orderId: params.orderId,
    reference: orderReference(params.orderId),
    amount: params.amount,
    returnUrl,
    cancelUrl,
  });
}

/** Asks the provider what happened to a payment attempt. */
export async function confirmPayment(params: {
  provider: PaymentProviderId;
  providerOrderId: string;
}): Promise<PaymentConfirmation> {
  const provider = getProvider(params.provider);
  if (!provider) {
    throw new PaymentProviderError(
      params.provider,
      'provider_not_configured',
      `${params.provider} is not configured for this environment.`,
    );
  }
  return provider.confirm(params.providerOrderId);
}

export type WebhookVerification =
  | { ok: true; event: PaymentWebhookEvent }
  | { ok: false; reason: 'not_configured' | 'invalid_signature' | 'invalid_payload' };

/**
 * Verifies and normalises an incoming provider webhook.
 *
 * A provider whose webhook secret is not configured is treated as *unverifiable*
 * rather than trusted: accepting unauthenticated "payment completed" posts would
 * let anyone mark orders paid.
 */
export async function verifyAndParseWebhook(params: {
  provider: PaymentProviderId;
  headers: Headers;
  rawBody: string;
  notificationUrl: string;
}): Promise<WebhookVerification> {
  const payload = parseJson(params.rawBody);
  if (payload === undefined) return { ok: false, reason: 'invalid_payload' };

  if (params.provider === 'paypal') {
    const config = getPayPalConfig();
    if (!config) return { ok: false, reason: 'not_configured' };
    const verified = await verifyPayPalWebhookSignature(config, params.headers, payload);
    if (!verified) return { ok: false, reason: 'invalid_signature' };
    return { ok: true, event: parsePayPalWebhookEvent(payload) };
  }

  const config = getSquareConfig();
  if (!config) return { ok: false, reason: 'not_configured' };
  const verified = verifySquareWebhookSignature(config, {
    signature: params.headers.get('x-square-hmacsha256-signature'),
    notificationUrl: params.notificationUrl,
    rawBody: params.rawBody,
  });
  if (!verified) return { ok: false, reason: 'invalid_signature' };
  return { ok: true, event: parseSquareWebhookEvent(payload) };
}

export function isWebhookConfigured(provider: PaymentProviderId): boolean {
  if (provider === 'paypal') return Boolean(getPayPalConfig()?.webhookId);
  return Boolean(getSquareConfig()?.webhookSignatureKey);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
