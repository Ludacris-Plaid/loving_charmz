import Image from 'next/image';
import Link from 'next/link';
import { getSession } from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/server';

const navItems = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/custom-orders', label: 'Custom Orders' },
  { href: '/account/settings', label: 'Settings' },
  { href: '/shop', label: '← Back to Shop' },
];

export async function AccountSidebar() {
  const session = await getSession();
  const supabase = await createClient();
  const { data: profile } = session
    ? await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', session.userId)
        .maybeSingle()
    : { data: null };

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24 flex flex-col gap-4">
        {session && (
          <div className="glass p-4 flex items-center gap-3 rounded-md">
            {profile?.avatar_url ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-plum-200">
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover h-full w-full"
                />
              </div>
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-full bg-plum-100 text-plum-700 flex items-center justify-center text-sm font-semibold">
                {(profile?.display_name || session.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-plum-900 truncate">
                {profile?.display_name || session.email}
              </p>
              {profile?.username && (
                <p className="text-xs text-ink-500 truncate">@{profile.username}</p>
              )}
            </div>
          </div>
        )}
        <nav className="glass rounded-md p-2 flex flex-col gap-1">
          {session?.isAdmin && (
            <>
              <Link
                href="/admin"
                className="motion-base group flex items-center justify-between rounded-md border border-plum-200 bg-plum-50 px-4 py-2.5 text-sm font-medium text-plum-800 hover:border-plum-400 hover:bg-plum-100"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-xs text-plum-500 group-hover:text-plum-700">▸</span>
                  Admin dashboard
                </span>
                <span className="text-[10px] uppercase tracking-wider text-plum-500 group-hover:text-plum-700">Staff</span>
              </Link>
              <div className="my-2 border-t border-cream-300" />
            </>
          )}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="motion-base rounded-md px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-100 hover:text-plum-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
