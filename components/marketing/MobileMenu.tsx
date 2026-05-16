'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="motion-transition rounded-pill border border-obsidian-600 bg-obsidian-800/80 p-2 text-gold-400 hover:bg-obsidian-700 hover:text-gold-300 hover:border-gold-500/50"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
          'motion-transition absolute right-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-[1.5rem] border border-obsidian-600 bg-obsidian-900/95 p-2 shadow-card backdrop-blur-xl',
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
          <MobileNavLink href="/collections" onClick={() => setOpen(false)}>Collections</MobileNavLink>
          <div className="my-2 border-t border-obsidian-700" />
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
      className="motion-transition rounded-card px-4 py-3 text-sm font-medium text-obsidian-300 hover:bg-obsidian-800 hover:text-gold-400"
    >
      {children}
    </Link>
  );
}
