import Link from 'next/link';

export default function AccountPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-obsidian-50">Welcome back</h2>
        <p className="mt-2 text-obsidian-400">Manage your profile, wishlist, orders, and custom keepsakes.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/account/profile" className="block group">
          <article className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
              Profile
            </h3>
            <p className="text-sm text-obsidian-400 mt-2">
              Update your display name, avatar, bio, and pet story.
            </p>
          </article>
        </Link>
        <Link href="/account/wishlist" className="block group">
          <article className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
            <div className="text-3xl mb-3">💛</div>
            <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
              Wishlist
            </h3>
            <p className="text-sm text-obsidian-400 mt-2">
              Keep track of pieces you love.
            </p>
          </article>
        </Link>
        <Link href="/account/orders" className="block group">
          <article className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
              Orders
            </h3>
            <p className="text-sm text-obsidian-400 mt-2">
              View your order history and track shipments.
            </p>
          </article>
        </Link>
        <Link href="/account/custom-orders" className="block group">
          <article className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
              Custom Orders
            </h3>
            <p className="text-sm text-obsidian-400 mt-2">
              View your personalized keepsake requests.
            </p>
          </article>
        </Link>
        <Link href="/shop" className="block group">
          <article className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift">
            <div className="text-3xl mb-3">🏠</div>
            <h3 className="font-display text-lg font-semibold text-obsidian-50 group-hover:text-gold-400 transition-colors">
              Back to Shop
            </h3>
            <p className="text-sm text-obsidian-400 mt-2">
              Browse our full collection and find your perfect piece.
            </p>
          </article>
        </Link>
      </div>
    </div>
  );
}