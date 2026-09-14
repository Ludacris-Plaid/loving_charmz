'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { AnimatedSelect, SelectOption } from '@/components/ui/AnimatedSelect';
import { addToCartAction } from '@/lib/cart/actions';
import { images } from '@/lib/images';
import type { Product, ProductVariant } from '@/lib/supabase/types';

const METAL_OPTIONS: SelectOption[] = [
  { value: 'brass', label: 'Brass', priceAdjustment: 0 },
  { value: 'stainless_steel', label: 'Stainless Steel', priceAdjustment: 25 },
];

const SIZE_OPTIONS: SelectOption[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

type Props = {
  product: Product;
  variants: ProductVariant[];
  imageUrl?: string;
  initialCartCount: number;
  isLoggedIn: boolean;
};

export default function ProductDetailClient({ product, variants, imageUrl, initialCartCount, isLoggedIn }: Props) {
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] || null);
  const [metalType, setMetalType] = useState<string>(METAL_OPTIONS[0].value);
  const [size, setSize] = useState<string>(SIZE_OPTIONS[0].value);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const metalAdjustment = METAL_OPTIONS.find((m) => m.value === metalType)?.priceAdjustment || 0;
  const totalPrice = product.base_price + (selected?.price_adjustment || 0) + metalAdjustment;
  const productImage = imageUrl || images.shop[0];

  const handleAdd = () => {
    setFeedback(null);
    startTransition(async () => {
      // Store selections in localStorage for cart display
      const selections = { metalType, size, metalAdjustment };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`product_${product.id}_selections`, JSON.stringify(selections));
      }
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



          <div className="grid grid-cols-2 gap-4">
            <AnimatedSelect
              label="Metal Type"
              options={METAL_OPTIONS}
              value={metalType}
              onChange={setMetalType}
            />
            <AnimatedSelect
              label="Size"
              options={SIZE_OPTIONS}
              value={size}
              onChange={setSize}
            />
          </div>

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
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">1</span> Free shipping on orders over $50 CAD</li>
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">2</span> Handcrafted to order, just for you</li>
            <li className="flex items-start gap-3"><span className="badge-mint shrink-0">3</span> Lifetime quality guarantee</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
