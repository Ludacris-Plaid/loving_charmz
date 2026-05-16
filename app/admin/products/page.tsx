'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

async function fetchProducts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
    });
    return await res.json();
  } catch { return []; }
}

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(p => { setProducts(p); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-obsidian-50">Products</h1>
        <button className="btn-gold px-6 py-2 rounded-pill text-sm font-semibold uppercase">
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner-dots"><span></span><span></span><span></span></div></div>
      ) : (
        <div className="surface-premium rounded-card border border-obsidian-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-obsidian-700">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Product</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Price</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Personalizable</th>
                <th className="text-right p-4 text-sm font-medium text-obsidian-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-obsidian-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-obsidian-800 flex items-center justify-center text-xl">
                        {product.images?.[0] || '💎'}
                      </div>
                      <div>
                        <p className="text-obsidian-50 font-medium">{product.name}</p>
                        <p className="text-obsidian-500 text-sm">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gold-400">${product.base_price}</td>
                  <td className="p-4">
                    <span className={`badge-gold ${product.is_active ? '' : 'opacity-50'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-obsidian-400">
                    {product.is_personalizable ? '✓' : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gold-500 hover:text-gold-400 text-sm">Edit</button>
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