import Link from 'next/link';
import { MobileMenu } from '@/components/marketing/MobileMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-obsidian-800 bg-obsidian-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-pill px-2 py-1 transition-all duration-300 hover:bg-obsidian-800/50"
        >
          <span className="font-display text-xl font-semibold gold-gradient-text">Loving Charmz</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/shop" className="nav-link text-sm font-medium text-obsidian-300 hover:text-gold-500 transition-colors">
            Shop
          </Link>
          <Link href="/stories" className="nav-link text-sm font-medium text-obsidian-300 hover:text-gold-500 transition-colors">
            Stories
          </Link>
          <Link href="/about" className="nav-link text-sm font-medium text-obsidian-300 hover:text-gold-500 transition-colors">
            About
          </Link>
          <Link href="/custom-orders" className="nav-link text-sm font-medium text-obsidian-300 hover:text-gold-500 transition-colors">
            Custom Orders
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <MobileMenu />
          <Link
            href="/cart"
            className="hidden rounded-pill border border-obsidian-700 px-3 py-1.5 text-xs font-medium text-obsidian-300 hover:border-gold-500/50 hover:text-gold-500 transition-all sm:inline-flex"
            aria-label="View cart"
          >
            Cart (0)
          </Link>
          <Link
            href="/account"
            className="btn-outline-gold hidden px-4 py-2 text-xs font-medium uppercase tracking-wider sm:inline-flex"
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}