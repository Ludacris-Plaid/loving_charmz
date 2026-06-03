import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/account/SettingsForm';

export const metadata = {
  title: 'Settings — Loving Charmz',
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account/settings');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('order_updates, marketing_emails, is_public')
    .eq('id', session.userId)
    .maybeSingle();

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-plum-900">Settings</h1>

      <SettingsForm
        defaultOrderUpdates={Boolean((profile as any)?.order_updates ?? true)}
        defaultMarketingEmails={Boolean((profile as any)?.marketing_emails ?? false)}
      />

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-4">Security</h2>
        <p className="text-sm text-ink-600 mb-4">
          To change your password, use the password reset link from the sign-in page.
        </p>
        <Link href="/login" className="btn-outline px-5 py-2 text-xs">
          Reset password
        </Link>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-plum-900 mb-2">Sign out</h2>
        <p className="text-sm text-ink-600 mb-4">
          You can sign out of your account at any time.
        </p>
        <Link href="/logout" className="text-sm text-ink-600 hover:text-plum-700 motion-base">
          Sign out of your account →
        </Link>
      </section>
    </div>
  );
}
