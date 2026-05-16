'use client';

import { useState, useEffect } from 'react';

async function fetchOrders() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
    });
    return await res.json();
  } catch { return []; }
}

export default function AdminOrders() {
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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-obsidian-50">Orders</h1>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner-dots"><span></span><span></span><span></span></div></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-obsidian-400">No orders yet</div>
      ) : (
        <div className="surface-premium rounded-card border border-obsidian-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-obsidian-700">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Order ID</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Total</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Date</th>
                <th className="text-right p-4 text-sm font-medium text-obsidian-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-obsidian-800">
                  <td className="p-4 text-obsidian-200 font-mono text-sm">{order.id.slice(0, 8)}...</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-pill text-xs ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-gold-400">${order.total}</td>
                  <td className="p-4 text-obsidian-400 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gold-500 hover:text-gold-400 text-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}