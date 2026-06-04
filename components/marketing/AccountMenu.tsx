'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type AccountMenuProps = {
  avatarUrl: string;
  email: string | null;
  isAdmin: boolean;
};

export function AccountMenu({ avatarUrl, email, isAdmin }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        className={[
          'motion-base inline-flex items-center gap-1.5 rounded-pill border bg-plum-50 pl-1 pr-2 py-1 text-plum-800',
          open
            ? 'border-plum-500 shadow-[0_4px_14px_rgba(93,51,115,0.12)]'
            : 'border-plum-200 hover:border-plum-500 hover:bg-plum-100',
        ].join(' ')}
      >
        <span className="relative inline-flex h-7 w-7 overflow-hidden rounded-full ring-1 ring-plum-300/60">
          <Image
            src={avatarUrl}
            alt=""
            fill
            className="object-cover"
            sizes="28px"
          />
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
          className={[
            'transition-transform duration-200 ease-out text-plum-700',
            open ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
        >
          <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="menu"
        data-visible={open}
        className={[
          'motion-base absolute right-0 top-[calc(100%+0.5rem)] w-60 origin-top-right rounded-block border border-plum-200 bg-surface p-1.5 shadow-[0_20px_50px_rgba(93,51,115,0.14)] z-50',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0',
        ].join(' ')}
      >
        {email && (
          <div className="px-3 py-2 border-b border-cream-200">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">Signed in as</p>
            <p className="mt-0.5 truncate text-sm font-medium text-plum-900">{email}</p>
          </div>
        )}
        <nav className="flex flex-col gap-0.5 py-1">
          <MenuLink href="/account" onSelect={() => setOpen(false)}>My account</MenuLink>
          <MenuLink href="/account/profile" onSelect={() => setOpen(false)}>Profile</MenuLink>
          <MenuLink href="/account/orders" onSelect={() => setOpen(false)}>Orders</MenuLink>
          <MenuLink href="/account/wishlist" onSelect={() => setOpen(false)}>Wishlist</MenuLink>
          <MenuLink href="/account/settings" onSelect={() => setOpen(false)}>Settings</MenuLink>
          {isAdmin && (
            <>
              <div className="my-1 border-t border-cream-200" />
              <MenuLink href="/admin" onSelect={() => setOpen(false)} accent="plum">
                <span className="flex items-center justify-between">
                  <span>Admin dashboard</span>
                  <span aria-hidden className="text-[10px] uppercase tracking-wider text-plum-500">Staff</span>
                </span>
              </MenuLink>
            </>
          )}
          <div className="my-1 border-t border-cream-200" />
          <MenuLink href="/logout" onSelect={() => setOpen(false)} accent="muted">Sign out</MenuLink>
        </nav>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  children,
  onSelect,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
  accent?: 'plum' | 'muted';
}) {
  const accentClass =
    accent === 'plum'
      ? 'text-plum-800 bg-plum-50/50 hover:bg-plum-100'
      : accent === 'muted'
        ? 'text-ink-600 hover:text-plum-700 hover:bg-cream-100'
        : 'text-ink-700 hover:text-plum-700 hover:bg-cream-100';
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className={['motion-base rounded-md px-3 py-2 text-sm font-medium', accentClass].join(' ')}
    >
      {children}
    </Link>
  );
}
