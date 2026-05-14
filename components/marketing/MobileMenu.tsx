'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-pill p-2 text-brand-700 hover:bg-brand-100 transition"
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

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-brand-400/12 bg-white/95 backdrop-blur-md shadow-card">
          <nav className="flex flex-col gap-1 px-6 py-4">
            <MobileNavLink href="/shop" onClick={() => setOpen(false)}>Shop</MobileNavLink>
            <MobileNavLink href="/stories" onClick={() => setOpen(false)}>Stories</MobileNavLink>
            <MobileNavLink href="/about" onClick={() => setOpen(false)}>About</MobileNavLink>
            <MobileNavLink href="/custom-orders" onClick={() => setOpen(false)}>Custom Orders</MobileNavLink>
            <MobileNavLink href="/cart" onClick={() => setOpen(false)}>Cart</MobileNavLink>
            <MobileNavLink href="/account" onClick={() => setOpen(false)}>My Account</MobileNavLink>
          </nav>
        </div>
      )}
    </div>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-card px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100 transition"
    >
      {children}
    </Link>
  );
}