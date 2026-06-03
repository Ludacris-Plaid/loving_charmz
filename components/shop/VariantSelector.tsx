'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/lib/supabase/types';

type Props = {
  variants: ProductVariant[];
  basePrice: number;
  onSelect?: (variant: ProductVariant) => void;
};

export function ProductVariantSelector({ variants, basePrice, onSelect }: Props) {
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] || null);

  if (!variants.length) return null;

  const handleSelect = (v: ProductVariant) => {
    setSelected(v);
    onSelect?.(v);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-plum-700">Select finish</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          return (
            <button
              key={variant.id}
              onClick={() => handleSelect(variant)}
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
      {selected && (
        <p className="text-sm text-ink-600">
          ${(basePrice + selected.price_adjustment).toFixed(2)} in {selected.name}
        </p>
      )}
    </div>
  );
}
