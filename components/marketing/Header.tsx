import Link from 'next/link';
import { Logo } from '@/components/marketing/Logo';
import { MobileMenu } from '@/components/marketing/MobileMenu';
import { AccountMenu } from '@/components/marketing/AccountMenu';
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
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <MobileMenu
              cartCount={cartCount}
              isAdmin={isAdmin}
              avatarUrl={session?.avatarUrl}
              email={session?.email}
              isLoggedIn={!!session}
            />
          </div>
          <Logo size="md" className="motion-base" />
        </div>

        <nav className="hidden items-center justify-center gap-8 md:flex">
          <Link href="/shop" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Shop</Link>
          <Link href="/collections" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Collections</Link>
          <Link href="/stories" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Stories</Link>
          <Link href="/about" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">About</Link>
          <Link href="/custom-orders" className="nav-underline text-sm font-medium text-ink-700 hover:text-plum-700 motion-base">Custom Orders</Link>
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-3">
          <Link
            href="/cart"
            className="relative motion-base"
            aria-label={`View cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <span className="inline-flex items-center justify-center rounded-pill border border-cream-300 bg-surface p-2 text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base sm:hidden">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </span>
            <span className="hidden items-center gap-2 rounded-pill border border-cream-300 bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:border-plum-500 hover:text-plum-700 motion-base sm:inline-flex">
              <span aria-hidden>Cart</span>
            </span>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-plum-700 px-1 text-[10px] font-semibold leading-none text-cream-50 sm:-right-2 sm:-top-2 sm:h-5 sm:min-w-[1.25rem]">
                {cartCount}
              </span>
            )}
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
          {session?.avatarUrl ? (
            <AccountMenu
              avatarUrl={session.avatarUrl}
              email={session.email}
              isAdmin={isAdmin}
            />
          ) : (
            <Link
              href={session ? "/account" : "/login"}
              className="btn-outline hidden px-4 py-1.5 text-xs sm:inline-flex"
            >
              {session ? "Account" : "Sign in"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
