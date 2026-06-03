import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { getCartWithItemsServer } from '@/lib/cart/server';
import { getSession } from '@/components/admin/AdminGuard';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { images } from '@/lib/images';
import type { CartItem } from '@/lib/supabase/types';

export const metadata = {
  title: 'Checkout — Loving Charmz',
};

export default async function CheckoutPage() {
  const [session, cart] = await Promise.all([getSession(), getCartWithItemsServer()]);
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

  const subtotal = items.reduce<number>((sum, item) => {
    const price = Number(item.product?.base_price || 0) + Number(item.variant?.price_adjustment || 0);
    return sum + price * Number(item.quantity || 0);
  }, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);

  const summaryItems = items.map((item, index) => ({
    id: item.id,
    name: item.product?.name || 'Item',
    variant: item.variant?.name || null,
    quantity: item.quantity,
    price:
      Number(item.product?.base_price || 0) + Number(item.variant?.price_adjustment || 0),
    image: images.shop[index % images.shop.length],
  }));

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-plum-900 mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <CheckoutForm defaultEmail={session.email || ''} />
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
              <span className="text-ink-800">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Shipping</span>
              <span className="text-ink-800">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Tax</span>
              <span className="text-ink-800">${tax.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-cream-300 flex justify-between">
              <span className="font-medium text-plum-900">Total</span>
              <span className="font-semibold plum-gradient-text text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
