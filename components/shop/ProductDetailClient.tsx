'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { AnimatedSelect, SelectOption } from '@/components/ui/AnimatedSelect';
import { addToCartAction } from '@/lib/cart/actions';
import {
  availableMaterials,
  availableSizes,
  findVariant,
  MATERIAL_LABELS,
  SIZE_LABELS,
  variantPrice,
  type VariantLike,
} from '@/lib/shop/variants';
import { images } from '@/lib/images';
import type { Product, ProductVariant } from '@/lib/supabase/types';

type Props = {
  product: Product;
  variants: ProductVariant[];
  imageUrl?: string;
  initialCartCount: number;
  isLoggedIn: boolean;
};

export default function ProductDetailClient({
  product,
  variants,
  imageUrl,
  initialCartCount,
  isLoggedIn,
}: Props) {
  const materials = useMemo(
    () => availableMaterials(variants as unknown as VariantLike[]),
    [variants],
  );
  const [material, setMaterial] = useState<string>(materials[0] || '');
  const sizes = useMemo(
    () => availableSizes(variants as unknown as VariantLike[], material),
    [variants, material],
  );
  const [size, setSize] = useState<string>('');

  // Keep the selected size valid whenever the material changes: if the new
  // material doesn't offer the current size, fall back to its first size.
  const effectiveSize = sizes.includes(size) ? size : sizes[0] || '';

  // With no size dimension (jewelry), the size selector is hidden entirely.
  const hasSizes = sizes.length > 0;

  const selected = useMemo(
    () => findVariant(variants as unknown as VariantLike[], material, hasSizes ? effectiveSize : null) ?? null,
    [variants, material, hasSizes, effectiveSize],
  );

  const totalPrice = variantPrice(product as any, selected as any);
  const productImage = imageUrl || images.shop[0];

  const stock = selected ? Number(selected.stock_quantity) : 0;
  const soldOut = !selected || stock <= 0;
  const lowStock = !soldOut && stock <= 3;

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const materialOptions: SelectOption[] = materials.map((m) => ({
    value: m,
    label: MATERIAL_LABELS[m] || m,
  }));
  const sizeOptions: SelectOption[] = sizes.map((s) => ({
    value: s,
    label: SIZE_LABELS[s] || s,
  }));

  const handleAdd = () => {
    if (!selected) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await addToCartAction(product.id, selected.id, 1);
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
        {/* Photo fills the whole card on desktop (no dead white space below the
            square), and stays a neat square on phones. Applies to every product
            automatically, old or new. */}
        <div className="surface-card relative overflow-hidden aspect-square lg:aspect-auto">
          <Image src={productImage} alt={product.name} fill className="object-cover" priority />
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

          <div className={hasSizes ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}>
            <AnimatedSelect
              label="Material"
              options={materialOptions}
              value={material}
              onChange={(m) => {
                setMaterial(m);
                setFeedback(null);
              }}
            />
            {hasSizes && (
              <AnimatedSelect
                label="Size"
                options={sizeOptions}
                value={effectiveSize}
                onChange={(s) => {
                  setSize(s);
                  setFeedback(null);
                }}
              />
            )}
          </div>

          {/* Live per-combination availability from the selected variant row. */}
          <p
            className={`text-sm ${
              soldOut ? 'text-red-600' : lowStock ? 'text-amber-600' : 'text-ink-500'
            }`}
            role="status"
          >
            {soldOut
              ? 'This combination is currently out of stock.'
              : lowStock
                ? `Only ${stock} left in ${selected?.name}.`
                : 'In stock and handcrafted to order.'}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleAdd}
              disabled={pending || soldOut}
              className="btn-plum w-full px-8 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Adding…' : soldOut ? 'Out of stock' : isLoggedIn ? 'Add to cart' : 'Sign in to purchase'}
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
