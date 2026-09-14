import 'server-only';

import {
  findOrderIdByProviderOrderId,
  findOrderIdByProviderPaymentId,
  markPaymentConfirmed,
  markPaymentFailed,
  markPaymentRefunded,
} from './ledger';
import { isValidOrderId } from './returns';
import type { PaymentWebhookEvent } from './types';

export type ReconcileResult = {
  matched: boolean;
  orderId: string | null;
  kind: PaymentWebhookEvent['kind'];
  detail: string;
};

/**
 * Applies a verified webhook event to the ledger.
 *
 * Webhooks are the authoritative record: a shopper can close the tab on the
 * return route, but a captured payment still arrives here and settles the order.
 * Unmatched events are reported rather than guessed at.
 */
export async function reconcileWebhookEvent(event: PaymentWebhookEvent): Promise<ReconcileResult> {
  if (event.kind === 'ignored') {
    return { matched: false, orderId: null, kind: 'ignored', detail: 'event_not_actionable' };
  }

  const explicitOrderId = event.orderId && isValidOrderId(event.orderId) ? event.orderId : null;
  const orderId =
    explicitOrderId ??
    (event.providerOrderId
      ? await findOrderIdByProviderOrderId(event.provider, event.providerOrderId)
      : null) ??
    (event.providerTransactionId
      ? await findOrderIdByProviderPaymentId(event.provider, event.providerTransactionId)
      : null);

  if (!orderId) {
    return { matched: false, orderId: null, kind: event.kind, detail: 'no_matching_order' };
  }

  if (event.kind === 'paid') {
    const result = await markPaymentConfirmed({
      orderId,
      provider: event.provider,
      providerTransactionId: event.providerTransactionId,
      paymentId: event.providerTransactionId,
      payerEmail: event.payerEmail,
      raw: event.raw,
    });
    return {
      matched: true,
      orderId,
      kind: event.kind,
      detail: result.ok ? (result.alreadySettled ? 'already_settled' : 'settled') : result.error,
    };
  }

  if (event.kind === 'failed') {
    const result = await markPaymentFailed({
      orderId,
      provider: event.provider,
      reason: 'Provider reported a failed payment',
    });
    return {
      matched: true,
      orderId,
      kind: event.kind,
      detail: result.ok ? 'marked_failed' : result.error,
    };
  }

  const result = await markPaymentRefunded({
    orderId,
    provider: event.provider,
    reason: 'Provider reported a refund',
  });
  return {
    matched: true,
    orderId,
    kind: event.kind,
    detail: result.ok ? 'marked_refunded' : result.error,
  };
}
