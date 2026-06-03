import Link from 'next/link';
import { getDashboardStats } from '@/lib/admin/dashboard';

export const metadata = {
  title: 'Admin dashboard — Loving Charmz',
};

export const dynamic = 'force-dynamic';

const quickLinks = [
  { href: '/admin/products', title: 'Manage products' },
  { href: '/admin/orders', title: 'View orders' },
  { href: '/admin/customers', title: 'Manage customers' },
  { href: '/admin/personalization', title: 'Review personalization requests' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatMoney = (n: number) => `$${n.toFixed(0)}`;

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Active products', value: stats.products, href: '/admin/products' },
    { label: 'Total orders', value: stats.orders, href: '/admin/orders' },
    { label: 'Customers', value: stats.customers, href: '/admin/customers' },
    { label: 'Revenue', value: formatMoney(stats.revenue), href: '/admin/orders' },
    { label: 'Pending orders', value: stats.pendingOrders, href: '/admin/orders' },
    { label: 'Pending custom', value: stats.pendingPersonalizations, href: '/admin/personalization' },
    { label: 'Low stock variants', value: stats.lowStockVariants, href: '/admin/inventory' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <span className="badge-plum">Admin</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Overview</h1>
        <p className="text-sm text-ink-600 mt-1">A snapshot of your store.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="surface-card p-5 hover-lift block">
            <p className="text-xs uppercase tracking-wider text-ink-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-plum-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Quick actions</h2>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between rounded-md border border-cream-300 px-4 py-3 text-sm text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base"
                >
                  <span>{link.title}</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Recent orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-ink-500">No orders yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-ink-800">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-ink-500">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="badge-soft capitalize">{order.status}</span>
                  <span className="font-semibold text-plum-700">${Number(order.total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
