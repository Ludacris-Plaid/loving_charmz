'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/supabase/queries/cart';
import type { Product, ProductVariant } from '@/lib/supabase/types';

interface Props {
  product: Product;
  selectedVariant?: ProductVariant;
}

export function AddToCartButton({ product, selectedVariant }: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    setLoading(true);
    setError(null);
    try {
      await addToCart(product.id, selectedVariant?.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setError('Please sign in to add items to cart');
      console.error('Failed to add to cart:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="btn-gold w-full py-4 px-8 rounded-pill text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner-gold w-4 h-4" />
            Adding...
          </span>
        ) : added ? (
          <span className="flex items-center justify-center gap-2">
            <span>✓</span>
            Added to Cart
          </span>
        ) : (
          'Add to Cart'
        )}
      </button>
      {error && (
        <p className="text-rose-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}