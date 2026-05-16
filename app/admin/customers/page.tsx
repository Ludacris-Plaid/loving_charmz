'use client';

import { useState, useEffect } from 'react';

async function fetchCustomers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
    });
    return await res.json();
  } catch { return []; }
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers().then(c => { setCustomers(c); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-obsidian-50">Customers</h1>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner-dots"><span></span><span></span><span></span></div></div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-obsidian-400">No customers yet</div>
      ) : (
        <div className="surface-premium rounded-card border border-obsidian-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-obsidian-700">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Username</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Display Name</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Public</th>
                <th className="text-left p-4 text-sm font-medium text-obsidian-400">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id} className="border-b border-obsidian-800">
                  <td className="p-4 text-obsidian-200">{customer.username}</td>
                  <td className="p-4 text-obsidian-300">{customer.display_name || '—'}</td>
                  <td className="p-4 text-obsidian-400">
                    {customer.is_public ? '✓' : '—'}
                  </td>
                  <td className="p-4 text-obsidian-400 text-sm">
                    {new Date(customer.created_at).toLocaleDateString()}
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