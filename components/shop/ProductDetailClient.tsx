'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { addToCart } from '@/lib/supabase/queries/cart';
import { images } from '@/lib/images';
import type { Product, ProductVariant } from '@/lib/supabase/types';

interface Props {
  product: Product;
  variants: ProductVariant[];
  imageUrl?: string;
}

function VariantSelector({ variants, basePrice, onSelect }: { variants: ProductVariant[]; basePrice: number; onSelect: (v: ProductVariant) => void }) {
  const [selected, setSelected] = useState(variants[0] || null);

  const handleSelect = (v: ProductVariant) => {
    setSelected(v);
    onSelect(v);
  };

  if (!variants.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-obsidian-300 uppercase tracking-wider">Select Finish</p>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          return (
            <button
              key={variant.id}
              onClick={() => handleSelect(variant)}
              className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${isSelected ? 'bg-gold-500 text-obsidian-950' : 'border border-obsidian-700 text-obsidian-300 hover:border-gold-500 hover:text-gold-400'}`}
            >
              {variant.name}
              {variant.price_adjustment > 0 && <span className={`ml-1 ${isSelected ? 'text-obsidian-700' : 'text-obsidian-500'}`}>+${variant.price_adjustment}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddToCartBtn({ product, selectedVariant }: { product: Product; selectedVariant?: ProductVariant }) {
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
    } catch {
      setError('Please sign in to add items to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={handleAddToCart} disabled={loading} className="btn-gold w-full py-4 px-8 rounded-pill text-sm font-semibold uppercase tracking-wide disabled:opacity-50">
        {loading ? 'Adding...' : added ? '✓ Added to Cart' : 'Add to Cart'}
      </button>
      {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
    </div>
  );
}

export default function ProductDetailClient({ product, variants, imageUrl }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(variants[0] || null);
  const totalPrice = product.base_price + (selectedVariant?.price_adjustment || 0);
  
  const productImage = imageUrl || images.shop[0];

  return (
    <Container className="py-12">
      <nav className="text-sm text-obsidian-500 mb-8">
        <Link href="/shop" className="hover:text-gold-500 transition-colors">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-obsidian-300">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="surface-premium rounded-card overflow-hidden border border-obsidian-700/50">
          <div className="aspect-square relative overflow-hidden">
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/50 to-transparent" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gold-500 mb-2">{product.tagline}</p>
            <h1 className="font-display text-4xl font-semibold text-obsidian-50">{product.name}</h1>
          </div>

          <p className="text-obsidian-300 leading-relaxed">{product.description}</p>

          <div className="text-2xl font-semibold text-gold-400">
            ${totalPrice.toFixed(2)}
            {selectedVariant && <span className="text-sm text-obsidian-500 ml-2">({selectedVariant.name})</span>}
          </div>

          {product.is_personalizable && (
            <div className="flex items-center gap-2 text-obsidian-400 text-sm">
              <span className="text-gold-500">✦</span>
              This piece can be personalized with engravings or custom details
            </div>
          )}

          {variants.length > 0 && (
            <VariantSelector variants={variants} basePrice={product.base_price} onSelect={setSelectedVariant} />
          )}

          <AddToCartBtn product={product} selectedVariant={selectedVariant || undefined} />

          <div className="border-t border-obsidian-800 pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-gold-500 mt-1">✓</span>
              <div><p className="text-obsidian-200 font-medium">Free shipping</p><p className="text-obsidian-500 text-sm">On orders over $100</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-500 mt-1">✓</span>
              <div><p className="text-obsidian-200 font-medium">Handcrafted with care</p><p className="text-obsidian-500 text-sm">Each piece made to order</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-500 mt-1">✓</span>
              <div><p className="text-obsidian-200 font-medium">Lifetime guarantee</p><p className="text-obsidian-500 text-sm">We stand behind our quality</p></div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}