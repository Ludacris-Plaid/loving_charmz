'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

async function fetchWishlist() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${supabaseUrl}/rest/v1/wishlists?select=*,product:products(*)&order=created_at.desc`, {
      headers: { apikey: supabaseKey! }
    });
    return await res.json();
  } catch { return []; }
}

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist().then(w => { setItems(w); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">💛</div>
        <h2 className="font-display text-2xl text-obsidian-50 mb-2">Your wishlist is empty</h2>
        <p className="text-obsidian-400 mb-6">Save pieces you love to revisit later.</p>
        <Link href="/shop" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
          Browse Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-obsidian-50">My Wishlist</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Link key={item.id} href={`/products/${item.product?.slug}`} className="group">
            <article className="surface-premium rounded-card overflow-hidden border border-obsidian-700/50 hover-lift">
              <div className="aspect-square bg-obsidian-800 flex items-center justify-center text-5xl">
                {item.product?.images?.[0] || '💎'}
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400">
                  {item.product?.name}
                </h3>
                <p className="text-gold-400 mt-1">${item.product?.base_price}</p>
                <button className="text-rose-400 text-sm mt-2 hover:text-rose-300">Remove</button>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}