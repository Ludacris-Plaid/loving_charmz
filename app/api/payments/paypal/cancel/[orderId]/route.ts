import { redirect } from 'next/navigation';

import { markPaymentFailed } from '@/lib/payments/ledger';
import { isValidOrderId, loadOwnedOrder } from '@/lib/payments/returns';

export const dynamic = 'force-dynamic';

/** PayPal cancel URL: the shopper backed out before approving the payment. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let destination = '/checkout?payment=cancelled';

  if (isValidOrderId(orderId)) {
    const lookup = await loadOwnedOrder(orderId);

    if (lookup.kind === 'unauthenticated') {
      redirect('/login?next=/checkout');
    }

    if (lookup.kind === 'ok' && lookup.order.payment_status !== 'paid') {
      await markPaymentFailed({
        orderId,
        provider: 'paypal',
        reason: 'Shopper cancelled at PayPal',
      });
    }
  }

  redirect(destination);
}
