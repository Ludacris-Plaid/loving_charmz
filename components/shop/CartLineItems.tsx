'use client';

import { useState, useTransition, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  updateCartItemAction,
  removeFromCartAction,
  clearCartAction,
} from '@/lib/cart/actions';

type LineItem = {
  id: string;
  quantity: number;
  product: { id?: string; name?: string; slug?: string; base_price?: number | string };
  variant: { id: string; name: string; price_adjustment: number | string } | null;
  image: string;
};

type ProductSelections = {
  metalType: string;
  size: string;
  metalAdjustment: number;
};

/** Reads a product's saved selections from localStorage; SSR-safe. */
function readSelections(productId: string): ProductSelections | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`product_${productId}_selections`);
    return stored ? (JSON.parse(stored) as ProductSelections) : null;
  } catch {
    return null;
  }
}

const subscribeNoop = () => () => {};

type Props = {
  items: LineItem[];
};

const METAL_LABELS: Record<string, string> = {
  brass: 'Brass',
  stainless_steel: 'Stainless Steel',
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export function CartLineItems({ items }: Props) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // True only after hydration, with no effect and no setState (which the
  // react-hooks lint rules reject). readSelections() reads localStorage safely
  // because the server snapshot is false and localStorage is only touched when
  // this is true on the client.
  const localStorageReady = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const updateQty = (itemId: string, qty: number) => {
    setBusy(itemId);
    setError(null);
    startTransition(async () => {
      const res = await updateCartItemAction(itemId, qty);
      if (res.error) setError(res.error);
      setBusy(null);
    });
  };

  const remove = (itemId: string) => {
    setBusy(itemId);
    setError(null);
    startTransition(async () => {
      const res = await removeFromCartAction(itemId);
      if (res.error) setError(res.error);
      setBusy(null);
    });
  };

  const clear = () => {
    setClearing(true);
    setError(null);
    startTransition(async () => {
      const res = await clearCartAction();
      if (res.error) setError(res.error);
      setClearing(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={clearing || pending}
          className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 hover:text-plum-700 motion-base"
        >
          {clearing ? 'Clearing…' : 'Clear cart'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <ul className="space-y-3">
        {items.map((item) => {
          const price =
            Number(item.product?.base_price || 0) + Number(item.variant?.price_adjustment || 0);
          const lineTotal = +(price * item.quantity).toFixed(2);
          const isBusy = busy === item.id;
          return (
            <li key={item.id} className="surface-card p-4 flex gap-4">
              <Link
                href={`/products/${item.product?.slug || ''}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-cream-300"
              >
                <Image src={item.image} alt={item.product?.name || ''} fill className="object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
              <Link
                href={`/products/${item.product?.slug || ''}`}
                className="font-display text-lg font-semibold text-plum-900 hover:text-plum-700 motion-base"
              >
                {item.product?.name || 'Item'}
              </Link>
              {item.variant && (
                <p className="text-xs text-ink-500 mt-0.5">{item.variant.name}</p>
              )}
              {item.product?.id && localStorageReady && (() => {
                const selections = readSelections(item.product!.id!);
                if (!selections) return null;
                return (
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-ink-500 bg-cream-100 px-2 py-0.5 rounded">
                      {METAL_LABELS[selections.metalType] || selections.metalType}
                    </span>
                    <span className="text-xs text-ink-500 bg-cream-100 px-2 py-0.5 rounded">
                      {SIZE_LABELS[selections.size] || selections.size}
                    </span>
                  </div>
                );
              })()}
                <p className="text-sm font-medium text-plum-700 mt-1">${price.toFixed(2)} each</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={isBusy}
                  className="text-xs text-ink-500 hover:text-plum-700 motion-base"
                >
                  Remove
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    disabled={isBusy}
                    aria-label="Decrease quantity"
                    className="h-8 w-8 rounded-pill border border-cream-300 text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-ink-800">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    disabled={isBusy}
                    aria-label="Increase quantity"
                    className="h-8 w-8 rounded-pill border border-cream-300 text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-semibold text-plum-900">${lineTotal.toFixed(2)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
