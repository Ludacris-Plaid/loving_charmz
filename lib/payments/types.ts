/**
 * Provider-agnostic payment vocabulary.
 *
 * The storefront speaks in "payment methods" (paypal, card); each method maps to
 * a provider adapter. Everything that crosses the adapter boundary is expressed
 * with the types below so the checkout flow never has to know which provider it
 * is talking to.
 */

export type PaymentProviderId = 'paypal' | 'square';

/** What the shopper picks in the payment section of the checkout form. */
export type PaymentMethodId = 'paypal' | 'card';

export type PaymentMode = 'sandbox' | 'live';

export type MoneyAmount = {
  /** Decimal string, e.g. "124.97" — never a float, never rounded by the provider. */
  value: string;
  currency: string;
};

/**
 * A payment attempt that has been started at the provider and is waiting for the
 * shopper. `redirectUrl` is where the browser must be sent next.
 */
export type PaymentSession = {
  provider: PaymentProviderId;
  /** The provider's own order/payment-link id. */
  providerOrderId: string;
  redirectUrl: string;
  status: string;
  mode: PaymentMode;
};

export type PaymentOutcome = 'paid' | 'failed' | 'pending' | 'refunded';

/**
 * The provider's answer for a payment attempt. `orderId` is *our* order id when
 * the provider echoes it back; the caller may fall back to its own record.
 */
export type PaymentConfirmation = {
  provider: PaymentProviderId;
  orderId: string | null;
  providerOrderId: string;
  providerTransactionId: string | null;
  status: PaymentOutcome;
  amount: MoneyAmount | null;
  payerEmail: string | null;
  raw: unknown;
};

export type CreateSessionInput = {
  orderId: string;
  /** Human-facing reference shown in the provider's UI, e.g. "LC-1F4C2A9B". */
  reference: string;
  amount: MoneyAmount;
  returnUrl: string;
  cancelUrl: string;
};

export type PaymentProvider = {
  id: PaymentProviderId;
  mode: PaymentMode;
  createSession(input: CreateSessionInput): Promise<PaymentSession>;
  /**
   * Ask the provider what actually happened. For PayPal this captures the
   * approved order; for Square it reads the state of the hosted checkout order.
   */
  confirm(providerOrderId: string): Promise<PaymentConfirmation>;
};

export type WebhookKind = 'paid' | 'failed' | 'refunded' | 'ignored';

export type PaymentWebhookEvent = {
  provider: PaymentProviderId;
  kind: WebhookKind;
  /** Our order id, when the event carries it. */
  orderId: string | null;
  providerOrderId: string | null;
  providerTransactionId: string | null;
  amount: MoneyAmount | null;
  payerEmail: string | null;
  raw: unknown;
};

export class PaymentProviderError extends Error {
  readonly provider: PaymentProviderId;
  readonly code: string;
  readonly raw: unknown;

  constructor(provider: PaymentProviderId, code: string, message: string, raw?: unknown) {
    super(message);
    this.name = 'PaymentProviderError';
    this.provider = provider;
    this.code = code;
    this.raw = raw;
  }
}

export function isPaymentProviderError(error: unknown): error is PaymentProviderError {
  return error instanceof PaymentProviderError;
}
