import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-brand-400/12 bg-brand-50/80">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-brand-700">Loving Charmz</h3>
            <p className="mt-3 text-sm leading-6 text-brand-600">
              Symbolic jewelry for women who want to carry meaning, memories, and connection—especially with their pets.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-600">Shop</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="/shop" className="text-sm text-brand-600 hover:text-brand-500 transition">All Jewelry</Link></li>
              <li><Link href="/collections" className="text-sm text-brand-600 hover:text-brand-500 transition">Collections</Link></li>
              <li><Link href="/custom-orders" className="text-sm text-brand-600 hover:text-brand-500 transition">Custom Orders</Link></li>
              <li><Link href="/stories" className="text-sm text-brand-600 hover:text-brand-500 transition">Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-600">Company</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="/about" className="text-sm text-brand-600 hover:text-brand-500 transition">About</Link></li>
              <li><Link href="/account" className="text-sm text-brand-600 hover:text-brand-500 transition">My Account</Link></li>
              <li><Link href="/contact" className="text-sm text-brand-600 hover:text-brand-500 transition">Contact</Link></li>
              <li><Link href="/faq" className="text-sm text-brand-600 hover:text-brand-500 transition">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-brand-400/12 pt-6 text-center text-xs text-brand-600">
          &copy; {new Date().getFullYear()} Loving Charmz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}