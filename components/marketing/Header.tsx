import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-400/12 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold text-brand-700">Loving Charmz</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/shop" className="text-sm font-medium text-brand-700 hover:text-brand-500 transition">
            Shop
          </Link>
          <Link href="/stories" className="text-sm font-medium text-brand-700 hover:text-brand-500 transition">
            Stories
          </Link>
          <Link href="/about" className="text-sm font-medium text-brand-700 hover:text-brand-500 transition">
            About
          </Link>
          <Link href="/custom-orders" className="text-sm font-medium text-brand-700 hover:text-brand-500 transition">
            Custom Orders
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="rounded-pill border border-brand-400/20 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-500 transition"
            aria-label="View cart"
          >
            Cart (0)
          </Link>
          <Button variant="outline" size="sm" href="/account">
            Account
          </Button>
        </div>
      </div>
    </header>
  );
}