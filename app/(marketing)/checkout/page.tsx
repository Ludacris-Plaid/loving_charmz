import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { getCartWithItemsServer } from '@/lib/cart/server';
import { getSession } from '@/components/admin/AdminGuard';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { computeOrderTotals, lineUnitPrice, FLAT_SHIPPING_RATE } from '@/lib/checkout/pricing';
import { getPaymentMethodOptions } from '@/lib/payments/config';
import { images } from '@/lib/images';
import type { CartItem } from '@/lib/supabase/types';

export const metadata = {
  title: 'Checkout — Loving Charmz',
};

const PAYMENT_NOTICES: Record<string, string> = {
  failed: 'That payment did not go through and nothing was charged. You can try again below.',
  cancelled: 'Payment was cancelled — nothing was charged, and your cart is still here.',
  pending:
    'We have not received confirmation of that payment yet. If you completed checkout it should appear shortly; otherwise start a new payment below.',
  unavailable: 'We could not find an active payment for that order. Please start a new payment below.',
};

type Props = {
  searchParams: Promise<{ payment?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const [{ payment }, session, cart] = await Promise.all([
    searchParams,
    getSession(),
    getCartWithItemsServer(),
  ]);
  if (!session) redirect('/login?next=/checkout');
  const items: CartItem[] = cart?.items || [];

  if (items.length === 0) {
    return (
      <Container className="py-16">
        <div className="max-w-md mx-auto text-center surface-card p-10">
          <span className="badge-mint mb-3">Empty cart</span>
          <h1 className="font-display text-2xl text-plum-900 mt-2 mb-2">Your cart is empty</h1>
          <p className="text-ink-600 mb-6">Add a keepsake to begin checkout.</p>
          <Link href="/shop" className="btn-plum px-6 py-2.5 text-sm">Browse the collection</Link>
        </div>
      </Container>
    );
  }

  // Pre-submit estimate: the shopper has not picked a shipping service yet,
  // so quote the standard tier (flat rate / Regular Parcel) — the only one
  // the free-over-$50 promotion covers. The live checkout form re-prices
  // from the actual selection once a postal code is entered.
  const totals = computeOrderTotals(
    items.map((item) => ({
      unitPrice: lineUnitPrice({
        base_price: item.product?.base_price,
        price_adjustment: item.variant?.price_adjustment,
      }),
      quantity: Number(item.quantity || 0),
    })),
  );
  const estimateShipping = totals.shipping === 0 ? 0 : FLAT_SHIPPING_RATE;

  const summaryItems = items.map((item, index) => ({
    id: item.id,
    name: item.product?.name || 'Item',
    variant: item.variant?.name || null,
    quantity: item.quantity,
    price: lineUnitPrice({
      base_price: item.product?.base_price,
      price_adjustment: item.variant?.price_adjustment,
    }),
    image: images.shop[index % images.shop.length],
  }));

  const methods = getPaymentMethodOptions();
  const notice = payment ? PAYMENT_NOTICES[payment] : undefined;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-plum-900 mb-8">Checkout</h1>
      {notice && (
        <p
          role="status"
          className="mb-8 rounded-md border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-800"
        >
          {notice}
        </p>
      )}
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <CheckoutForm defaultEmail={session.email || ''} methods={methods} totalAmount={totals.total} />
        </div>
        <aside className="surface-card p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Order review</h2>
          <ul className="space-y-3 mb-4">
            {summaryItems.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span className="font-medium text-ink-800">
                  {item.name}
                  {item.variant ? ` (${item.variant})` : ''} × {item.quantity}
                </span>
                <span className="ml-auto text-ink-700">${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-cream-300 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-600">Subtotal</span>
              <span className="text-ink-800">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Shipping{totals.shipping === 0 ? ' (standard)' : ''}</span>
              <span className="text-ink-800">
                {estimateShipping === 0 ? 'FREE' : `$${estimateShipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Tax</span>
              <span className="text-ink-800">${totals.tax.toFixed(2)}</span>
            </div>
            <p className="text-xs text-ink-500">
              Free shipping applies to standard shipping only. Xpresspost and Priority are charged at their listed rates.
            </p>
            <div className="pt-2 border-t border-cream-300 flex justify-between">
              <span className="font-medium text-plum-900">Total</span>
              <span className="font-semibold plum-gradient-text text-lg">
                ${(totals.subtotal + estimateShipping + totals.tax).toFixed(2)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
