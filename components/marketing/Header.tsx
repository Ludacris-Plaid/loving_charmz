import Link from 'next/link';
import { Logo } from '@/components/marketing/Logo';
import { MobileMenu } from '@/components/marketing/MobileMenu';
import { getCartCount } from '@/lib/cart/server';
import { getSession } from '@/components/admin/AdminGuard';

export async function Header() {
  const cartCount = await getCartCount();
  const session = await getSession();
  const isAdmin = session?.isAdmin ?? false;

  return (
    <header
      data-site-header
      className="sticky top-0 z-50 border-b border-cream-300 glass"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <MobileMenu cartCount={cartCount} isAdmin={isAdmin} />
          </div>
          <Logo size="md" className="motion-base" />
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/shop" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Shop</Link>
          <Link href="/stories" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Stories</Link>
          <Link href="/about" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">About</Link>
          <Link href="/custom-orders" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Custom Orders</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            className="hidden items-center gap-2 rounded-pill border border-cream-300 bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base sm:inline-flex"
            aria-label={`View cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <span aria-hidden>Cart</span>
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-pill bg-plum-700 px-1.5 text-[10px] font-semibold text-cream-50">
              {cartCount}
            </span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-pill border border-plum-300 bg-plum-50 px-3.5 py-1.5 text-xs font-medium text-plum-800 hover:border-plum-500 hover:bg-plum-100 motion-base sm:inline-flex"
              aria-label="Open admin dashboard"
            >
              <span aria-hidden className="text-[10px]">▸</span>
              Admin Dash
            </Link>
          )}
          <Link
            href="/account"
            className="btn-outline hidden px-4 py-1.5 text-xs sm:inline-flex"
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}
