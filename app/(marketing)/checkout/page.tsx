'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getCartWithItems } from '@/lib/supabase/queries/cart';
import type { CartItem } from '@/lib/supabase/types';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    paymentMethod: 'paypal',
  });

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

  const subtotal = items.reduce((sum, item) => {
    const price = (item.product?.base_price || 0) + (item.variant?.price_adjustment || 0);
    return sum + (price * item.quantity);
  }, 0);

  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    setTimeout(() => {
      router.push('/checkout/confirmation');
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  if (items.length === 0) {
    return (
      <Container className="py-12">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="font-display text-2xl text-obsidian-50 mb-2">Your cart is empty</h2>
          <Link href="/shop" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
            Continue Shopping
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <h1 className="font-display text-3xl font-semibold text-obsidian-50 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                required
                className="input-gold w-full px-4 py-3 rounded-card"
              />
            </div>
          </section>

          <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Shipping Address</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First name"
                required
                className="input-gold px-4 py-3 rounded-card"
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last name"
                required
                className="input-gold px-4 py-3 rounded-card"
              />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
                required
                className="sm:col-span-2 input-gold px-4 py-3 rounded-card"
              />
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                required
                className="input-gold px-4 py-3 rounded-card"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  required
                  className="input-gold px-4 py-3 rounded-card"
                />
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="ZIP"
                  required
                  className="input-gold px-4 py-3 rounded-card"
                />
              </div>
            </div>
          </section>

          <section className="surface-premium rounded-card p-6 border border-obsidian-700/50">
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-card border border-obsidian-700 cursor-pointer hover:border-gold-500 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={formData.paymentMethod === 'paypal'}
                  onChange={handleChange}
                  className="accent-gold-500"
                />
                <span className="text-obsidian-200">PayPal</span>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-card border border-obsidian-700 cursor-pointer hover:border-gold-500 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={handleChange}
                  className="accent-gold-500"
                />
                <span className="text-obsidian-200">Credit / Debit Card</span>
              </label>
            </div>
          </section>
        </div>

        <div className="surface-premium rounded-card p-6 border border-obsidian-700/50 h-fit">
          <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Order Review</h2>
          <div className="space-y-3 mb-6">
            {items.map((item) => {
              const price = (item.product?.base_price || 0) + (item.variant?.price_adjustment || 0);
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-obsidian-400">
                    {item.product?.name} {item.variant ? `(${item.variant.name})` : ''} × {item.quantity}
                  </span>
                  <span className="text-obsidian-200">${(price * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-obsidian-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-obsidian-400">Subtotal</span>
              <span className="text-obsidian-200">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-obsidian-400">Shipping</span>
              <span className="text-obsidian-200">
                {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-obsidian-400">Tax</span>
              <span className="text-obsidian-200">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-obsidian-700">
              <span className="text-obsidian-50 font-medium">Total</span>
              <span className="text-gold-400 font-semibold text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold w-full mt-6 py-3 px-6 rounded-pill text-sm font-semibold uppercase disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </form>
    </Container>
  );
}