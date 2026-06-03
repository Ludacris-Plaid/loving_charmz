import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';
import { getMyOrdersServer } from '@/lib/orders/server';

export const metadata = {
  title: 'Orders — Loving Charmz',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  processing: 'badge-mint',
  shipped: 'badge-mint',
  delivered: 'badge-mint',
  cancelled: 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-pill text-xs font-medium',
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/account/orders');

  const orders = await getMyOrdersServer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-plum-900">My orders</h1>
        <p className="text-sm text-ink-600 mt-1">Your keepsake order history.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 surface-card">
          <span className="badge-mint mb-3">No orders yet</span>
          <h2 className="font-display text-xl text-plum-900 mt-2 mb-2">You haven’t placed an order yet</h2>
          <p className="text-ink-600 mb-6">When you place an order, it will appear here.</p>
          <Link href="/shop" className="btn-plum px-6 py-2.5 text-sm">Browse the collection</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order: any) => {
            const itemCount = (order.order_items || []).reduce(
              (sum: number, item: any) => sum + Number(item.quantity || 0),
              0
            );
            return (
              <li key={order.id} className="surface-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-800">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={statusStyle[order.status] || 'badge-soft'}>
                    {statusLabel[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-ink-600">
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                  </p>
                  <p className="font-semibold text-plum-700">${Number(order.total).toFixed(2)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
