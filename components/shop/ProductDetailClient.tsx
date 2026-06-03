'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { addToCartAction } from '@/lib/cart/actions';
import { images } from '@/lib/images';
import type { Product, ProductVariant } from '@/lib/supabase/types';

type Props = {
  product: Product;
  variants: ProductVariant[];
  imageUrl?: string;
  initialCartCount: number;
  isLoggedIn: boolean;
};

export default function ProductDetailClient({ product, variants, imageUrl, initialCartCount, isLoggedIn }: Props) {
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] || null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const totalPrice = product.base_price + (selected?.price_adjustment || 0);
  const productImage = imageUrl || images.shop[0];

  const handleAdd = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await addToCartAction(product.id, selected?.id || null, 1);
      if (res.error) setFeedback({ kind: 'err', text: res.error });
      else setFeedback({ kind: 'ok', text: 'Added to cart' });
    });
  };

  return (
    <Container className="py-12">
      <nav className="mb-8 text-sm text-ink-500">
        <Link href="/shop" className="hover:text-plum-700 motion-base">Shop</Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-700">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="surface-card overflow-hidden">
          <div className="relative aspect-square">
            <Image src={productImage} alt={product.name} fill className="object-cover" priority />
          </div>
        </div>

        <div className="space-y-6">
          {product.tagline && (
            <span className="badge-mint">{product.tagline}</span>
          )}
          <h1 className="font-display text-4xl font-semibold text-plum-900 sm:text-5xl">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-ink-700 leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-semibold plum-gradient-text">${totalPrice.toFixed(2)}</p>
            {selected && (
              <span className="text-sm text-ink-500">in {selected.name}</span>
            )}
          </div>

          {product.is_personalizable && (
            <div className="surface-soft p-4 text-sm text-ink-700 flex items-start gap-2">
              <span className="badge-mint shrink-0">Personalizable</span>
              <span>This piece can be engraved or customized. <Link href="/custom-orders" className="plum-gradient-text font-medium">Start a custom order →</Link></span>
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-plum-700">Select finish</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const isSelected = selected?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelected(variant)}
                      className={[
                        'motion-base rounded-pill px-4 py-2 text-sm font-medium',
                        isSelected
                          ? 'bg-plum-700 text-cream-50'
                          : 'border border-cream-300 bg-surface text-ink-700 hover:border-plum-500 hover:text-plum-700',
                      ].join(' ')}
                    >
                      {variant.name}
                      {variant.price_adjustment > 0 && (
                        <span className={['ml-1 text-xs', isSelected ? 'text-mint-200' : 'text-ink-500'].join(' ')}>
                          +${variant.price_adjustment}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleAdd}
              disabled={pending}
              className="btn-plum w-full px-8 py-3.5 text-sm"
            >
              {pending ? 'Adding…' : isLoggedIn ? 'Add to cart' : 'Sign in to purchase'}
            </button>
            {feedback && (
              <p
                role="status"
                className={[
                  'text-sm text-center',
                  feedback.kind === 'ok' ? 'text-plum-700' : 'text-red-600',
                ].join(' ')}
              >
                {feedback.text}
                {feedback.kind === 'err' && (
                  <>
                    {' '}
                    <Link href="/login?next=/products" className="underline">Sign in</Link>
                  </>
                )}
              </p>
            )}
            <p className="text-center text-xs text-ink-500">
              {initialCartCount > 0 ? `${initialCartCount} item${initialCartCount === 1 ? '' : 's'} in your cart` : 'Cart is empty'}
            </p>
          </div>

          <div className="divider-cream" />
          <ul className="space-y-3 text-sm text-ink-700">
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">1</span> Free shipping on orders over $100</li>
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">2</span> Handcrafted to order, just for you</li>
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">3</span> Lifetime quality guarantee</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
