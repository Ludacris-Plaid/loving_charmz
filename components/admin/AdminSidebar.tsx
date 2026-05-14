import Link from 'next/link';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard' },
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

export function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-24 flex flex-col gap-1">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition"
          >
            {item.label}
          </Link>
        ))}
        <hr className="my-2 border-brand-400/12" />
        <Link
          href="/shop"
          className="rounded-card px-4 py-2.5 text-sm font-medium text-brand-500 hover:bg-brand-100 transition"
        >
          View Storefront
        </Link>
      </nav>
    </aside>
  );
}