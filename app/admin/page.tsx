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

async function fetchRecentOrders() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,created_at,status,total,order_number&order=created_at.desc&limit=5`, {
      headers: { apikey: supabaseKey! }
    });
    return await res.json();
  } catch {
    return [];
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, totalRevenue: 0, pendingOrders: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStats(),
      fetchRecentOrders()
    ]).then(([s, orders]) => {
      setStats(s);
      setRecentOrders(orders);
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
            <Link href="/admin/customers" className="block p-3 rounded-card border border-obsidian-700 hover:border-gold-500 transition-colors">
              <span className="text-gold-500 mr-2">→</span>
              <span className="text-obsidian-200">Manage Customers</span>
            </Link>
          </div>
        </div>

        <div className="surface-premium rounded-card p-6 border border-obsidian-700/50">
          <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-obsidian-500 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <Link key={order.id} href="/admin/orders" className="flex justify-between items-center p-2 rounded-card hover:bg-obsidian-800/50 transition-colors">
                  <div>
                    <span className="text-obsidian-200 text-sm">#{order.order_number}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-obsidian-700 text-obsidian-400'
                    }`}>{order.status}</span>
                  </div>
                  <span className="text-gold-400 font-medium">${order.total?.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}