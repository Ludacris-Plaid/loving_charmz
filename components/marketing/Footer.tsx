import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-cream-300 bg-cream-100">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <Logo size="md" />
            <p className="mt-3 max-w-sm text-sm leading-7 text-ink-600">
              Symbolic jewelry for women who want to carry meaning, memories, and connection — especially with their pets.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-plum-700">Shop</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/shop" className="nav-link text-sm">All Jewelry</Link></li>
              <li><Link href="/collections" className="nav-link text-sm">Collections</Link></li>
              <li><Link href="/custom-orders" className="nav-link text-sm">Custom Orders</Link></li>
              <li><Link href="/stories" className="nav-link text-sm">Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-plum-700">Company</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/about" className="nav-link text-sm">About</Link></li>
              <li><Link href="/account" className="nav-link text-sm">My Account</Link></li>
              <li>
                <a href="mailto:hello@lovingcharmz.com" className="nav-link text-sm">
                  Contact
                </a>
              </li>
              <li><Link href="/account/orders" className="nav-link text-sm">Orders</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-cream-300 pt-6 text-center text-xs uppercase tracking-[0.18em] text-ink-500">
          © {new Date().getFullYear()} Loving Charmz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
