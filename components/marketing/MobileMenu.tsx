'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type MobileMenuProps = {
  cartCount: number;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  email?: string | null;
  isLoggedIn?: boolean;
};

export function MobileMenu({ cartCount, isAdmin = false, avatarUrl, email, isLoggedIn = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="motion-base inline-flex h-9 w-9 items-center justify-center rounded-pill border border-cream-300 bg-surface text-plum-700 hover:border-plum-500"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          {open ? (
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div
        data-visible={open}
        className={[
          'motion-base absolute left-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2rem))] origin-top-left rounded-block border border-cream-300 bg-surface p-2 shadow-[0_20px_50px_rgba(93,51,115,0.12)]',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0',
        ].join(' ')}
      >
        <nav className="flex flex-col gap-1">
          {isLoggedIn && (
            <div className="px-3 py-3">
              <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3">
                {avatarUrl ? (
                  <span className="relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-plum-200">
                    <Image src={avatarUrl} alt="" fill className="object-cover" sizes="40px" />
                  </span>
                ) : (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-100 text-sm font-semibold text-plum-700">
                    {(email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{email || 'Account'}</p>
                  <p className="text-xs text-ink-500">View profile</p>
                </div>
              </Link>
            </div>
          )}
          <MobileNavLink href="/shop" onClick={() => setOpen(false)}>Shop</MobileNavLink>
          <MobileNavLink href="/stories" onClick={() => setOpen(false)}>Stories</MobileNavLink>
          <MobileNavLink href="/about" onClick={() => setOpen(false)}>About</MobileNavLink>
          <MobileNavLink href="/custom-orders" onClick={() => setOpen(false)}>Custom Orders</MobileNavLink>
          <MobileNavLink href="/collections" onClick={() => setOpen(false)}>Collections</MobileNavLink>
          <div className="my-2 border-t border-cream-300" />
          <MobileNavLink href="/cart" onClick={() => setOpen(false)}>
            Cart <span className="ml-1 text-plum-600">({cartCount})</span>
          </MobileNavLink>
          <MobileNavLink href={isLoggedIn ? "/account" : "/login"} onClick={() => setOpen(false)}>
            {isLoggedIn ? 'My Account' : 'Sign in'}
          </MobileNavLink>
          {isAdmin && (
            <>
              <div className="my-2 border-t border-cream-300" />
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="motion-base flex items-center justify-between rounded-md border border-plum-200 bg-plum-50 px-4 py-3 text-sm font-medium text-plum-800 hover:border-plum-400 hover:bg-plum-100"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-xs">▸</span>
                  Admin Dash
                </span>
                <span className="text-[10px] uppercase tracking-wider text-plum-500">Staff</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="motion-base block rounded-md px-4 py-3 text-sm font-medium text-ink-700 hover:bg-cream-100 hover:text-plum-700"
    >
      {children}
    </Link>
  );
}
