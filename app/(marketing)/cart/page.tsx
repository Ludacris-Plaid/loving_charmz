import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getCartWithItemsServer } from '@/lib/cart/server';
import { getSession } from '@/components/admin/AdminGuard';
import { CartLineItems } from '@/components/shop/CartLineItems';
import { images } from '@/lib/images';
import type { CartItem } from '@/lib/supabase/types';

export const metadata = {
  title: 'Your cart — Loving Charmz',
};

export default async function CartPage() {
  const [session, cart] = await Promise.all([getSession(), getCartWithItemsServer()]);
  const items: CartItem[] = cart?.items || [];

  if (!session) {
    return (
      <Container className="py-16">
        <div className="max-w-md mx-auto text-center surface-card p-10">
          <span className="badge-mint mb-3">Sign in to continue</span>
          <h1 className="font-display text-2xl text-plum-900 mt-2 mb-2">Your cart is waiting</h1>
          <p className="text-ink-600 mb-6">Sign in to view your saved cart and continue your keepsake journey.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login?next=/cart" className="btn-plum px-6 py-2.5 text-sm">Sign in</Link>
            <Link href="/shop" className="btn-outline px-6 py-2.5 text-sm">Keep browsing</Link>
          </div>
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

  return (
    <Container className="py-12 sm:py-16">
      <div className="text-center mb-8">
        <span className="badge-mint">Your cart</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-[1.1] tracking-tight mt-4">
          <span className="block">
            <span className="hero-word hero-word-1 text-plum-900">Pieces</span>{' '}
            <span className="hero-word hero-word-2 text-plum-900">you&rsquo;re</span>{' '}
            <span className="hero-word hero-word-3 text-plum-900">bringing</span>
          </span>
          <span className="block mt-1">
            <span className="hero-word hero-word-4 text-plum-900">home</span>
          </span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 surface-card">
          <span className="badge-mint mb-3">Empty</span>
          <h2 className="font-display text-2xl text-plum-900 mt-2 mb-2">Your cart is empty</h2>
          <p className="text-ink-600 mb-6">Start adding pieces that speak to your heart.</p>
          <Link href="/shop" className="btn-plum px-8 py-3 text-sm">Browse the collection</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <CartLineItems
              items={items.map((item, index) => ({
                id: item.id,
                quantity: item.quantity,
                product: {
                  id: item.product?.id,
                  name: item.product?.name,
                  slug: item.product?.slug,
                  base_price: item.product?.base_price,
                },
                variant: item.variant ? {
                  id: item.variant.id,
                  name: item.variant.name,
                  price_adjustment: item.variant.price_adjustment,
                } : null,
                image: images.shop[index % images.shop.length],
              }))}
            />
          </div>

          <aside className="surface-card p-6 h-fit lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Order summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="text-ink-800">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="text-ink-800">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Tax (8%)</dt>
                <dd className="text-ink-800">${tax.toFixed(2)}</dd>
              </div>
              <div className="pt-3 border-t border-cream-300 flex justify-between">
                <dt className="font-medium text-plum-900">Total</dt>
                <dd className="font-semibold plum-gradient-text text-lg">${total.toFixed(2)}</dd>
              </div>
            </dl>
            <Link href="/checkout" className="btn-plum mt-6 w-full py-3 text-sm">
              Proceed to checkout
            </Link>
            <p className="mt-3 text-center text-xs text-ink-500">
              {shipping === 0
                ? 'You qualify for free shipping.'
                : `Add $${(100 - subtotal).toFixed(2)} more for free shipping.`}
            </p>
          </aside>
        </div>
      )}
    </Container>
  );
}
