import Link from 'next/link';

const navItems = [
  { href: '/account', label: 'Dashboard' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/custom-orders', label: 'Custom Orders' },
  { href: '/account/settings', label: 'Settings' },
];

export function AccountSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-24 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}