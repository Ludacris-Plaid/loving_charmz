import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/server';
import { getCartCount } from '@/lib/cart/server';

export const metadata = {
  title: 'My account — Loving Charmz',
};

const cards = [
  { href: '/account/profile', title: 'Profile', body: 'Update your display name, bio, avatar, and pet story.', badge: 'Edit profile' },
  { href: '/account/wishlist', title: 'Wishlist', body: 'Pieces you have saved to revisit later.', badge: 'View saved' },
  { href: '/account/orders', title: 'Orders', body: 'Your order history and tracking information.', badge: 'See orders' },
  { href: '/account/custom-orders', title: 'Custom orders', body: 'Personalized keepsake requests and their status.', badge: 'View requests' },
  { href: '/shop', title: 'Continue shopping', body: 'Browse all collections and new arrivals.', badge: 'Shop' },
  { href: '/account/settings', title: 'Settings', body: 'Email preferences, password, and account actions.', badge: 'Manage' },
];

export default async function AccountDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account');

  const [supabase, cartCount] = await Promise.all([createClient(), getCartCount()]);
  const [profileRes, ordersRes, customRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, username, avatar_url, is_public, created_at')
      .eq('id', session.userId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, status, total, created_at', { count: 'exact' })
      .eq('user_id', session.userId),
    supabase
      .from('personalization_requests')
      .select('id', { count: 'exact' })
      .eq('user_id', session.userId),
  ]);

  const profile = profileRes.data;
  const orders = ordersRes.data || [];
  const orderCount = ordersRes.count || 0;
  const customCount = customRes.count || 0;

  const greetingName = profile?.display_name || session.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8">
      <header className="surface-card p-6 sm:p-8">
        <span className="badge-mint">My account</span>
        <div className="flex items-center gap-4 mt-4">
          {profile?.avatar_url ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-plum-200">
              <Image
                src={profile.avatar_url}
                alt=""
                width={56}
                height={56}
                className="object-cover h-full w-full"
              />
            </div>
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-full bg-plum-100 text-plum-700 flex items-center justify-center text-lg font-semibold">
              {greetingName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-plum-900">
              Hello, {greetingName}
            </h2>
            <p className="mt-1 text-sm text-ink-600">Manage your profile, wishlist, orders, and custom keepsakes.</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="surface-soft p-3">
            <dt className="text-xs uppercase tracking-wider text-ink-500">Cart</dt>
            <dd className="text-lg font-semibold text-plum-700">{cartCount}</dd>
          </div>
          <div className="surface-soft p-3">
            <dt className="text-xs uppercase tracking-wider text-ink-500">Orders</dt>
            <dd className="text-lg font-semibold text-plum-700">{orderCount}</dd>
          </div>
          <div className="surface-soft p-3">
            <dt className="text-xs uppercase tracking-wider text-ink-500">Custom</dt>
            <dd className="text-lg font-semibold text-plum-700">{customCount}</dd>
          </div>
        </dl>
      </header>

      {orders[0] && (
        <section className="surface-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold text-plum-900">Latest order</h3>
            <Link href="/account/orders" className="text-xs font-medium text-plum-700 hover:text-plum-900 motion-base">
              View all
            </Link>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-ink-800">#{orders[0].id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-ink-500">
                {new Date(orders[0].created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="badge-soft capitalize">{orders[0].status}</span>
            <span className="font-semibold text-plum-700">${Number(orders[0].total).toFixed(2)}</span>
          </div>
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group block surface-card p-6 hover-lift">
            <h3 className="font-display text-lg font-semibold text-plum-900 group-hover:text-plum-700 motion-base">
              {card.title}
            </h3>
            <p className="text-sm text-ink-600 mt-2">{card.body}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-plum-700">
              {card.badge} →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
