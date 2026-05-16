import Link from 'next/link';

export function Footer() {
  return (
    <section className="border-t border-obsidian-800 bg-obsidian-950/90">
      <footer className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-semibold gold-gradient-text">Loving Charmz</h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-obsidian-400">
              Symbolic jewelry for women who want to carry meaning, memories, and connection—especially with their pets.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gold-500">Shop</h4>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/shop" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  All Jewelry
                </Link>
              </li>
              <li>
                <Link href="/collections" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/custom-orders" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  Custom Orders
                </Link>
              </li>
              <li>
                <Link href="/stories" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  Stories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gold-500">Company</h4>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  About
                </Link>
              </li>
              <li>
                <Link href="/account" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/contact" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="nav-link text-sm text-obsidian-400 hover:text-gold-500">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-obsidian-800 pt-6 text-center text-xs uppercase tracking-[0.18em] text-obsidian-500">
          © {new Date().getFullYear()} Loving Charmz. All rights reserved.
        </div>
      </footer>
    </section>
  );
}