'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getCartWithItems, updateCartItemQuantity, removeFromCart, clearCart } from '@/lib/supabase/queries/cart';
import type { CartItem } from '@/lib/supabase/types';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cart = await getCartWithItems();
        if (mounted) setItems(cart?.items || []);
      } catch { /* ignore */ } 
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    await updateCartItemQuantity(itemId, quantity);
    const cart = await getCartWithItems();
    setItems(cart?.items || []);
  };

  const handleRemove = async (itemId: string) => {
    await removeFromCart(itemId);
    const cart = await getCartWithItems();
    setItems(cart?.items || []);
  };

  const handleClear = async () => {
    setClearing(true);
    await clearCart();
    setItems([]);
    setClearing(false);
  };

  const subtotal = items.reduce((sum, item) => {
    const price = (item.product?.base_price || 0) + (item.variant?.price_adjustment || 0);
    return sum + (price * item.quantity);
  }, 0);

  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center py-20">
          <div className="spinner-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold text-obsidian-50">Your Cart</h1>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-sm text-obsidian-500 hover:text-rose-400 transition-colors"
          >
            {clearing ? 'Clearing...' : 'Clear cart'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="font-display text-2xl text-obsidian-50 mb-2">Your cart is empty</h2>
          <p className="text-obsidian-400 mb-6">Start adding pieces that speak to your heart.</p>
          <Link href="/shop" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
            Browse Collection
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const price = (item.product?.base_price || 0) + (item.variant?.price_adjustment || 0);
              return (
                <article
                  key={item.id}
                  className="surface-premium rounded-card p-4 flex gap-4 border border-obsidian-700/50"
                >
                  <div className="w-24 h-24 rounded-card bg-obsidian-800 flex items-center justify-center text-3xl">
                    {item.product?.images?.[0] || '✨'}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product?.slug}`} className="hover:text-gold-400 transition-colors">
                      <h3 className="font-display text-lg font-semibold text-obsidian-50">
                        {item.product?.name}
                      </h3>
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-obsidian-500">{item.variant.name}</p>
                    )}
                    <p className="text-gold-400 font-medium mt-1">${price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-obsidian-500 hover:text-rose-400 text-sm transition-colors"
                    >
                      Remove
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full border border-obsidian-700 text-obsidian-300 hover:border-gold-500"
                      >
                        −
                      </button>
                      <span className="text-obsidian-200 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border border-obsidian-700 text-obsidian-300 hover:border-gold-500"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="surface-premium rounded-card p-6 border border-obsidian-700/50 h-fit">
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-obsidian-400">Subtotal</span>
                <span className="text-obsidian-200">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obsidian-400">Shipping</span>
                <span className="text-obsidian-200">
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-obsidian-400">Tax</span>
                <span className="text-obsidian-200">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-obsidian-700 pt-3 flex justify-between">
                <span className="text-obsidian-50 font-medium">Total</span>
                <span className="text-gold-400 font-semibold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="btn-gold w-full mt-6 py-3 px-6 rounded-pill text-sm font-semibold uppercase text-center block"
            >
              Proceed to Checkout
            </Link>
            <p className="text-xs text-obsidian-500 text-center mt-3">
              {shipping === 0 ? 'You qualify for free shipping!' : `Add ${(100 - subtotal).toFixed(2)} more for free shipping`}
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}