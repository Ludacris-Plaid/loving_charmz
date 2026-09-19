import { getSubscribers } from '@/lib/subscribers/data';
import { AdminEmailClient } from '@/components/admin/AdminEmailClient';
import { getSession } from '@/components/admin/AdminGuard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin · Send email — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminEmailPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect('/login?next=/admin/email');

  const subscribers = await getSubscribers();

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Communications</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Send email</h1>
        <p className="text-sm text-ink-600 mt-1">
          Send a message to your mailing list. {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} will receive it.
        </p>
      </div>
      <AdminEmailClient
        subscribers={subscribers.map((s) => s.email)}
      />
    </div>
  );
}
