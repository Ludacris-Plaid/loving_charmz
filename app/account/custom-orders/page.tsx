import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';
import { getMyPersonalizationRequestsServer } from '@/lib/orders/server';

export const metadata = {
  title: 'Custom orders — Loving Charmz',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  reviewing: 'badge-mint',
  quoted: 'badge-mint',
  in_progress: 'badge-mint',
  completed: 'badge-mint',
  cancelled: 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-pill text-xs font-medium',
};

export default async function CustomOrdersPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account/custom-orders');

  const requests = await getMyPersonalizationRequestsServer();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-plum-900">My custom orders</h1>
          <p className="text-sm text-ink-600 mt-1">Personalized keepsake requests and their status.</p>
        </div>
        <Link href="/custom-orders" className="btn-outline px-4 py-1.5 text-xs">
          New request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 surface-card">
          <span className="badge-mint mb-3">No requests yet</span>
          <h2 className="font-display text-xl text-plum-900 mt-2 mb-2">No custom orders yet</h2>
          <p className="text-ink-600 mb-6">Start a personalized keepsake — we will follow up with a design proposal.</p>
          <Link href="/custom-orders" className="btn-plum px-6 py-2.5 text-sm">Start a custom order</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((req: any) => (
            <li key={req.id} className="surface-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-800">
                    {req.product?.name || 'Custom keepsake'}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Submitted {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={statusStyle[req.status] || 'badge-soft'}>
                  {statusLabel[req.status] || req.status}
                </span>
              </div>

              {req.pet_name && (
                <p className="text-sm text-ink-600 mt-3">
                  <span className="text-ink-500">Pet name:</span> {req.pet_name}
                </p>
              )}

              {req.freeform_text && (
                <p className="text-sm text-ink-700 mt-2 line-clamp-3">{req.freeform_text}</p>
              )}

              {req.admin_notes && (
                <div className="mt-3 pt-3 border-t border-cream-300">
                  <p className="text-xs text-ink-500">Notes from the team</p>
                  <p className="text-sm text-ink-700">{req.admin_notes}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
