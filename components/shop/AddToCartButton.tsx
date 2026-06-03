'use client';

import { useTransition } from 'react';
import { addToCartAction } from '@/lib/cart/actions';
import type { Product, ProductVariant } from '@/lib/supabase/types';

type Props = {
  product: Product;
  selectedVariant?: ProductVariant;
  isLoggedIn: boolean;
};

export function AddToCartButton({ product, selectedVariant, isLoggedIn }: Props) {
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    startTransition(async () => {
      await addToCartAction(product.id, selectedVariant?.id || null, 1);
    });
  };

  return (
    <button onClick={handleAdd} disabled={pending} className="btn-plum px-6 py-3 text-sm">
      {pending ? 'Adding…' : isLoggedIn ? 'Add to cart' : 'Sign in to add'}
    </button>
  );
}
