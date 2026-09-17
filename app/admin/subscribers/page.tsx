import { getSubscribers } from '@/lib/subscribers/data';
import { AdminSubscribersClient } from '@/components/admin/AdminSubscribersClient';
import { getSession } from '@/components/admin/AdminGuard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin · Mailing list — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminSubscribersPage() {
  // Pages in this layout render in parallel with AdminGuard, so verify the
  // admin here too — do not rely on the layout alone for sensitive pages.
  const session = await getSession();
  if (!session?.isAdmin) redirect('/login?next=/admin/subscribers');

  const rows = await getSubscribers();

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">People</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Mailing list</h1>
        <p className="text-sm text-ink-600 mt-1">
          Everyone who signed up through the welcome pop-up. Download the list any time.
        </p>
      </div>
      <AdminSubscribersClient rows={rows} />
    </div>
  );
}
