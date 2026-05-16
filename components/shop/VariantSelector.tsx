'use client';

import { useState, useEffect } from 'react';
import type { ProductVariant } from '@/lib/supabase/types';

interface Props {
  productId: string;
  variants: ProductVariant[];
  basePrice: number;
}

export function ProductVariantSelector({ variants, basePrice }: Props) {
  const [selected, setSelected] = useState<ProductVariant | null>(variants[0] || null);

  useEffect(() => {
    // Dispatch event for parent component to capture selected variant
    window.dispatchEvent(new CustomEvent('variant-selected', { detail: selected }));
  }, [selected]);

  if (!variants.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-obsidian-300 uppercase tracking-wider">
        Select Finish
      </p>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          const price = basePrice + variant.price_adjustment;
          
          return (
            <button
              key={variant.id}
              onClick={() => setSelected(variant)}
              className={`
                px-4 py-2 rounded-pill text-sm font-medium transition-all
                ${isSelected 
                  ? 'bg-gold-500 text-obsidian-950' 
                  : 'border border-obsidian-700 text-obsidian-300 hover:border-gold-500 hover:text-gold-400'
                }
              `}
            >
              {variant.name}
              {variant.price_adjustment > 0 && (
                <span className={`ml-1 ${isSelected ? 'text-obsidian-700' : 'text-obsidian-500'}`}>
                  +${variant.price_adjustment}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}