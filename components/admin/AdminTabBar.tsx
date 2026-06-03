'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminNavItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/personalization', label: 'Personalization' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/discounts', label: 'Discounts' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontal scrollable tab row */}
      <nav className="mb-6 -mx-6 overflow-x-auto px-6 pb-2 lg:hidden">
        <div className="flex min-w-0 gap-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`motion-base shrink-0 rounded-pill px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-plum-700 text-cream-50 shadow-sm'
                    : 'border border-cream-300 bg-surface text-ink-700 hover:border-plum-500 hover:text-plum-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: sticky sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <nav className="glass sticky top-24 flex flex-col gap-1 rounded-md p-2">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`motion-base rounded-md px-4 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-plum-700 text-cream-50 shadow-sm'
                    : 'text-ink-700 hover:bg-cream-100 hover:text-plum-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <hr className="my-3 border-cream-300" />
          <Link
            href="/shop"
            className="motion-base rounded-md px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-plum-600 hover:bg-plum-50"
          >
            ← View Storefront
          </Link>
          <Link
            href="/account"
            className="motion-base rounded-md px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-plum-600 hover:bg-plum-50"
          >
            ← My Account
          </Link>
        </nav>
      </aside>
    </>
  );
}
