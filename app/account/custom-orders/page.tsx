'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

async function fetchCustomOrders() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${supabaseUrl}/rest/v1/personalization_requests?select=*,product:products(*)&order=created_at.desc`, {
      headers: { apikey: supabaseKey! }
    });
    return await res.json();
  } catch { return []; }
}

export default function CustomOrdersPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomOrders().then(r => { setRequests(r); setLoading(false); });
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    reviewing: 'bg-blue-500/20 text-blue-400',
    quoted: 'bg-purple-500/20 text-purple-400',
    in_progress: 'bg-orange-500/20 text-orange-400',
    completed: 'bg-green-500/20 text-green-400',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="font-display text-2xl text-obsidian-50 mb-2">No custom orders</h2>
        <p className="text-obsidian-400 mb-6">Create a personalized keepsake that tells your unique story.</p>
        <Link href="/custom-orders" className="btn-gold px-8 py-3 rounded-pill text-sm font-semibold uppercase">
          Start Custom Order
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-obsidian-50">Custom Orders</h1>
        <Link href="/custom-orders" className="btn-outline-gold px-6 py-2 rounded-pill text-sm font-semibold uppercase">
          New Request
        </Link>
      </div>

      <div className="space-y-4">
        {requests.map(req => (
          <article key={req.id} className="surface-premium rounded-card p-6 border border-obsidian-700/50">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-obsidian-200 font-medium">
                  {req.product?.name || 'Custom Order'}
                </p>
                <p className="text-sm text-obsidian-500">
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-pill text-xs ${statusColors[req.status] || 'bg-gray-500/20 text-gray-400'}`}>
                {req.status}
              </span>
            </div>

            {req.pet_name && (
              <div className="text-sm text-obsidian-400 mb-2">
                <span className="text-obsidian-300">Pet Name:</span> {req.pet_name}
              </div>
            )}

            {req.freeform_text && (
              <p className="text-sm text-obsidian-400 line-clamp-2">{req.freeform_text}</p>
            )}

            {req.admin_notes && (
              <div className="mt-3 pt-3 border-t border-obsidian-700">
                <p className="text-xs text-obsidian-500">Admin Notes:</p>
                <p className="text-sm text-obsidian-300">{req.admin_notes}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}