import { redirect } from 'next/navigation';

import { confirmPayment } from '@/lib/payments';
import { findLatestTransaction, markPaymentConfirmed, markPaymentFailed } from '@/lib/payments/ledger';
import { isValidOrderId, loadOwnedOrder } from '@/lib/payments/returns';

export const dynamic = 'force-dynamic';

/**
 * Square returns the shopper to this route after hosted checkout.
 *
 * The redirect itself proves nothing — Square's redirect can be replayed — so
 * the order state is re-read from Square's API before anything is settled.
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
      destination = '/checkout?payment=pending';

      if (lookup.order.payment_status === 'paid') {
        destination = `/checkout/confirmation?id=${orderId}`;
      } else {
        const transaction = await findLatestTransaction(orderId, 'square');
        if (!transaction?.provider_transaction_id) {
          destination = '/checkout?payment=unavailable';
        } else {
          try {
            const confirmation = await confirmPayment({
              provider: 'square',
              providerOrderId: transaction.provider_transaction_id,
            });

            if (confirmation.status === 'paid') {
              const settled = await markPaymentConfirmed({
                orderId,
                provider: 'square',
                providerTransactionId: confirmation.providerTransactionId,
                paymentId: confirmation.providerTransactionId,
                raw: confirmation.raw,
              });
              destination = settled.ok
                ? `/checkout/confirmation?id=${orderId}`
                : '/checkout?payment=pending';
              if (!settled.ok) console.error('[square return] settle failed', settled.error);
            } else if (confirmation.status === 'failed') {
              await markPaymentFailed({
                orderId,
                provider: 'square',
                reason: 'Square reported the checkout as cancelled',
              });
              destination = '/checkout?payment=failed';
            }
          } catch (error) {
            console.error('[square return] confirm failed', error);
            destination = '/checkout?payment=pending';
          }
        }
      }
    }
  }

  redirect(destination);
}
