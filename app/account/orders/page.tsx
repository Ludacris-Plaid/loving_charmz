'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

async function fetchOrders() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: { apikey: supabaseKey! }
    });
    return await res.json();
  } catch { return []; }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then(o => { setOrders(o); setLoading(false); });
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    processing: 'bg-blue-500/20 text-blue-400',
    shipped: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="font-display text-2xl text-obsidian-50 mb-2">No orders yet</h2>
        <p className="text-obsidian-400 mb-6">When you place an order, it will appear here.</p>
        <Link href="/shop" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
          Browse Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-obsidian-50">My Orders</h1>

      <div className="space-y-4">
        {orders.map(order => (
          <article key={order.id} className="surface-premium rounded-card p-6 border border-obsidian-700/50">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-obsidian-200 font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm text-obsidian-500">
                  {new Date(order.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-pill text-xs ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                {order.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-obsidian-400">
                {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
              </div>
              <div className="text-gold-400 font-semibold">${order.total?.toFixed(2)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}