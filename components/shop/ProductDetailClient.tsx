'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
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
import { parseDescription } from '@/lib/shop/description';
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

  // Open on a combination the customer can actually buy: the first in-stock
  // variant wins over raw variant order (which is where stock usually sits).
  const defaultSelection = useMemo(() => {
    const active = (variants as unknown as VariantLike[]).filter((v) => v.is_active);
    const stocked = active.find((v) => v.stock_quantity > 0);
    if (stocked) return { material: stocked.material as string, size: stocked.size || '' };
    return { material: materials[0] || '', size: '' };
    // Runs once per product page load; selectors update these states after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants]);
  const [material, setMaterial] = useState<string>(defaultSelection.material);

  const sizes = useMemo(
    () => availableSizes(variants as unknown as VariantLike[], material),
    [variants, material],
  );
  const [size, setSize] = useState<string>(defaultSelection.size);

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

  // Thumbnail gallery: the server passes the first image; the full gallery
  // comes from the product row. Square crop views for every image, with the
  // first as the open thumbnail.
  const gallery: string[] = useMemo(() => {
    const list = (product.images ?? []).filter(Boolean);
    if (list.length > 0) return list;
    return imageUrl ? [imageUrl] : [images.shop[0]];
  }, [product.images, imageUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const activeImage = gallery[Math.min(imageIndex, gallery.length - 1)];

  // Gallery navigation: wrap-around prev/next shared by the overlay arrows,
  // arrow keys (when the frame or a thumbnail has focus), and touch swipes.
  const hasMultiplePhotos = gallery.length > 1;
  const showPrevPhoto = () =>
    setImageIndex((i) => (i - 1 + gallery.length) % gallery.length);
  const showNextPhoto = () => setImageIndex((i) => (i + 1) % gallery.length);

  const handleGalleryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showPrevPhoto();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showNextPhoto();
    }
  };

  // Swipe: track the touch start X on the main photo; a horizontal move of
  // more than 40px on release flips the photo (left = next, right = prev).
  const touchStartX = useRef<number | null>(null);

  const parsed = useMemo(() => parseDescription(product.description || ''), [product.description]);

  const stock = selected ? Number(selected.stock_quantity) : 0;
  const soldOut = !selected || stock <= 0;
  const lowStock = !soldOut && stock <= 3;
  // The button stays honest about what can still be added: a variant the
  // cart already holds to its max is un-buyable, same as sold out.
  const [cartAdds, setCartAdds] = useState(0);
  const addable = stock - cartAdds;

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
      else {
        setFeedback({ kind: 'ok', text: 'Added to cart' });
        setCartAdds((n) => n + 1); // optimistic cap; reset on variant switch
      }
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
        <div className="flex flex-col gap-3">
          {/* Main photo fills the whole card on desktop (no dead white space
              below the square), and stays a neat square on phones. Focusable
              so arrow keys flip photos; touch users swipe. */}
          <div
            role="group"
            aria-roledescription="carousel"
            aria-label={`${product.name} photos`}
            tabIndex={0}
            onKeyDown={handleGalleryKeyDown}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || !hasMultiplePhotos) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (dx > 40) showPrevPhoto();
              else if (dx < -40) showNextPhoto();
              touchStartX.current = null;
            }}
            className="surface-card relative overflow-hidden aspect-square lg:aspect-auto lg:flex-1 outline-none focus-visible:ring-2 focus-visible:ring-plum-400"
          >
            <Image
              key={activeImage}
              src={activeImage}
              alt={`${product.name} — photo ${imageIndex + 1} of ${gallery.length}`}
              fill
              className="object-cover motion-base"
              priority
            />

            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={showPrevPhoto}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-cream-50/85 text-plum-900 shadow-md backdrop-blur-sm transition hover:bg-cream-50 focus-visible:ring-2 focus-visible:ring-plum-400"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-cream-50/85 text-plum-900 shadow-md backdrop-blur-sm transition hover:bg-cream-50 focus-visible:ring-2 focus-visible:ring-plum-400"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-cream-50">
                  {imageIndex + 1} / {gallery.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails — one per product photo, click to swap the main view. */}
          {hasMultiplePhotos && (
            <div className="grid grid-cols-5 gap-3">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show photo ${i + 1} of ${gallery.length}`}
                  aria-current={i === imageIndex}
                  className={`relative aspect-square overflow-hidden rounded-md motion-base ${
                    i === imageIndex
                      ? 'ring-2 ring-plum-600 ring-offset-2 ring-offset-cream-50'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {product.tagline && (
            <span className="badge-mint">{product.tagline}</span>
          )}
          <h1 className="font-display text-4xl font-semibold text-plum-900 sm:text-5xl">
            {product.name}
          </h1>
          {parsed.paragraphs.map((para, i) => (
            <p key={i} className="text-ink-700 leading-relaxed">{para}</p>
          ))}
          {parsed.specs.length > 0 && (
            <ul className="space-y-1.5 text-sm text-ink-700">
              {parsed.specs.map((spec, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-plum-500" aria-hidden />
                  <span>
                    {spec.label && <strong className="font-semibold text-plum-800">{spec.label}: </strong>}
                    {spec.value}
                  </span>
                </li>
              ))}
            </ul>
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
              setCartAdds(0); // per-variant count; refetches happen at cart/checkout
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
              : addable <= 0
                ? 'All available stock is in your cart.'
                : lowStock
                  ? `Only ${stock} left in ${selected?.name}.`
                  : 'In stock and handcrafted to order.'}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleAdd}
              disabled={pending || soldOut || addable <= 0}
              className="btn-plum w-full px-8 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Adding…' : soldOut ? 'Out of stock' : addable <= 0 ? 'In your cart' : isLoggedIn ? 'Add to cart' : 'Sign in to purchase'}
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
