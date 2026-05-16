'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="motion-transition rounded-pill border border-brand-400/15 bg-white/60 p-2 text-brand-700 hover:bg-brand-100"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {open ? (
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div
        data-visible={open}
        className={[
          'motion-transition absolute right-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-[1.5rem] border border-brand-400/12 bg-white/95 p-2 shadow-card backdrop-blur-xl',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0',
        ].join(' ')}
      >
        <nav className="flex flex-col gap-1">
          <MobileNavLink href="/shop" onClick={() => setOpen(false)}>Shop</MobileNavLink>
          <MobileNavLink href="/stories" onClick={() => setOpen(false)}>Stories</MobileNavLink>
          <MobileNavLink href="/about" onClick={() => setOpen(false)}>About</MobileNavLink>
          <MobileNavLink href="/custom-orders" onClick={() => setOpen(false)}>Custom Orders</MobileNavLink>
          <MobileNavLink href="/cart" onClick={() => setOpen(false)}>Cart</MobileNavLink>
          <MobileNavLink href="/account" onClick={() => setOpen(false)}>My Account</MobileNavLink>
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
      className="motion-transition rounded-card px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100 hover:text-brand-500"
    >
      {children}
    </Link>
  );
}
