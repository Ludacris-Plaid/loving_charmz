import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { getCartWithItemsServer } from '@/lib/cart/server';
import { getSession } from '@/components/admin/AdminGuard';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { lineUnitPrice } from '@/lib/checkout/pricing';
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

  // The order review panel lives inside CheckoutForm, beside the shipping
  // radios, so its totals update as the shopper types a postal code and
  // picks a service — it is computed by the same engine that charges.
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
      <CheckoutForm
        defaultEmail={session.email || ''}
        methods={methods}
        items={summaryItems.map(({ name, variant, quantity, price }) => ({
          name,
          variant,
          quantity,
          unitPrice: price,
        }))}
      />
    </Container>
  );
}
