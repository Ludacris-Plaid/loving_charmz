import { redirect } from 'next/navigation';

import { confirmPayment } from '@/lib/payments';
import { findLatestTransaction, markPaymentConfirmed, markPaymentFailed } from '@/lib/payments/ledger';
import { isValidOrderId, loadOwnedOrder } from '@/lib/payments/returns';

export const dynamic = 'force-dynamic';

/**
 * PayPal return URL. The shopper lands here after approving in PayPal, and this
 * is the first place money actually moves: `confirmPayment` captures the order.
 *
 * Nothing is settled on the strength of the redirect alone — the capture
 * response is what marks the order paid.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let destination = '/checkout?payment=unavailable';

  if (isValidOrderId(orderId)) {
    const lookup = await loadOwnedOrder(orderId);

    if (lookup.kind === 'unauthenticated') {
      redirect(`/login?next=${encodeURIComponent(`/checkout/confirmation?id=${orderId}`)}`);
    }

    if (lookup.kind === 'ok') {
      destination = `/checkout?payment=pending`;

      if (lookup.order.payment_status === 'paid') {
        destination = `/checkout/confirmation?id=${orderId}`;
      } else {
        const transaction = await findLatestTransaction(orderId, 'paypal');
        if (!transaction?.provider_transaction_id) {
          destination = '/checkout?payment=unavailable';
        } else {
          try {
            const confirmation = await confirmPayment({
              provider: 'paypal',
              providerOrderId: transaction.provider_transaction_id,
            });

            if (confirmation.status === 'paid') {
              const settled = await markPaymentConfirmed({
                orderId,
                provider: 'paypal',
                providerTransactionId: confirmation.providerTransactionId,
                paymentId: confirmation.providerTransactionId,
                payerEmail: confirmation.payerEmail,
                raw: confirmation.raw,
              });
              destination = settled.ok
                ? `/checkout/confirmation?id=${orderId}`
                : `/checkout?payment=pending`;
              if (!settled.ok) console.error('[paypal capture] settle failed', settled.error);
            } else if (confirmation.status === 'failed' || confirmation.status === 'refunded') {
              await markPaymentFailed({
                orderId,
                provider: 'paypal',
                reason: `PayPal reported ${confirmation.status}`,
              });
              destination = '/checkout?payment=failed';
            }
          } catch (error) {
            // A capture failure is not proof of failure: PayPal may have taken
            // the money and the webhook may still settle it, so the shopper is
            // told to check rather than shown a fake success.
            console.error('[paypal capture] capture failed', error);
            destination = '/checkout?payment=pending';
          }
        }
      }
    }
  }

  redirect(destination);
}
