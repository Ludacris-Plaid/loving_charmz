'use client';

import { useState, useTransition } from 'react';
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

type Props = {
  items: LineItem[];
};

export function CartLineItems({ items }: Props) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
