'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

async function fetchStats() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const [productsRes, ordersRes, usersRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=id`, {
        headers: { apikey: supabaseKey! }
      }),
      fetch(`${supabaseUrl}/rest/v1/orders?select=id,status,total`, {
        headers: { apikey: supabaseKey! }
      }),
      fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, {
        headers: { apikey: supabaseKey! }
      }),
    ]);

    const products = await productsRes.json();
    const orders = await ordersRes.json();
    const users = await usersRes.json();

    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

    return { products: products.length, orders: orders.length, users: users.length, totalRevenue, pendingOrders };
  } catch {
    return { products: 0, orders: 0, users: 0, totalRevenue: 0, pendingOrders: 0 };
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, totalRevenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(s => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'Total Products', value: stats.products, emoji: '💎', href: '/admin/products' },
    { label: 'Total Orders', value: stats.orders, emoji: '📦', href: '/admin/orders' },
    { label: 'Customers', value: stats.users, emoji: '👥', href: '/admin/customers' },
    { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(0)}`, emoji: '💰', href: '/admin/orders' },
    { label: 'Pending Orders', value: stats.pendingOrders, emoji: '⏳', href: '/admin/orders' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-obsidian-50">Admin Dashboard</h1>
        <p className="text-obsidian-400 mt-1">Manage your store</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner-dots"><span></span><span></span><span></span></div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map(card => (
            <Link key={card.label} href={card.href} className="block">
              <div className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
                <div className="text-3xl mb-3">{card.emoji}</div>
                <p className="text-2xl font-semibold text-obsidian-50">{card.value}</p>
                <p className="text-sm text-obsidian-400">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
          <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/products" className="block p-3 rounded-card border border-obsidian-700 hover:border-gold-500 transition-colors">
              <span className="text-gold-500 mr-2">→</span>
              <span className="text-obsidian-200">Manage Products</span>
            </Link>
            <Link href="/admin/orders" className="block p-3 rounded-card border border-obsidian-700 hover:border-gold-500 transition-colors">
              <span className="text-gold-500 mr-2">→</span>
              <span className="text-obsidian-200">View Orders</span>
            </Link>
            <Link href="/admin/discounts" className="block p-3 rounded-card border border-obsidian-700 hover:border-gold-500 transition-colors">
              <span className="text-gold-500 mr-2">→</span>
              <span className="text-obsidian-200">Create Discount</span>
            </Link>
          </div>
        </div>

        <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
          <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Store Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-obsidian-400">Products</span>
              <span className="text-obsidian-200">{stats.products}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-400">Customers</span>
              <span className="text-obsidian-200">{stats.users}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-400">Total Revenue</span>
              <span className="text-gold-400">${stats.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}