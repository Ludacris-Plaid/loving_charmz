'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/admin/analytics/format';
import { OrderModal } from './AdminOrdersTable';

type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
};

type ShippingAddress = {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  email?: string;
} | null;

type CustomerOrder = {
  id: string;
  user_id: string | null;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  discount: number;
  customer_email: string | null;
  discount_code: string | null;
  shipping_address: ShippingAddress;
  payment_method: string | null;
  payment_status: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  updated_at: string;
  created_at: string;
  items: OrderItem[];
};

type Customer = {
  id: string;
  username: string;
  display_name: string | null;
  is_public: boolean;
  created_at: string;
  email: string | null;
  order_count: number;
  last_sign_in_at: string | null;
  is_subscriber: boolean;
  custom_order_count: number;
};

type Props = {
  customers: Customer[];
  orders: CustomerOrder[];
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  processing: 'badge-mint',
  shipped: 'badge-shipped',
  delivered: 'badge-mint',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

function CustomerModal({
  customer,
  orders,
  onClose,
}: {
  customer: Customer;
  orders: CustomerOrder[];
  onClose: () => void;
}) {
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const viewingOrder = orders.find((o) => o.id === viewingOrderId) || null;

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    const avg = orders.length ? totalSpent / orders.length : 0;
    const last = orders.length ? orders[0] : null;
    return { totalSpent, avg, last };
  }, [orders]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[5vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Customer @${customer.username}`}
    >
      <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-2xl border border-cream-200 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-plum-900">
              @{customer.username}
            </span>
            {customer.is_public ? (
              <span className="badge-mint">Public</span>
            ) : (
              <span className="badge-soft">Private</span>
            )}
            {customer.is_subscriber && (
              <span className="badge-plum">✉ Mailing list</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-200 motion-base text-ink-500 hover:text-ink-800"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Profile */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
                Profile
              </p>
              <p className="text-sm text-ink-800">{customer.email || 'No email on file'}</p>
              {customer.display_name && (
                <p className="text-sm text-ink-600 mt-1">Display name: {customer.display_name}</p>
              )}
              <p className="text-xs text-ink-500 mt-2">
                Joined {formatDate(customer.created_at)}
              </p>
              <p className="text-xs text-ink-500">
                Last signed in {customer.last_sign_in_at ? formatDate(customer.last_sign_in_at) : 'never'}
              </p>
            </div>
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
                Lifetime
              </p>
              <p className="text-sm text-ink-800">
                {orders.length} order{orders.length !== 1 ? 's' : ''} · ${stats.totalSpent.toFixed(2)} spent
              </p>
              <p className="text-xs text-ink-600 mt-1">
                Average order ${stats.avg.toFixed(2)}
              </p>
              {stats.last && (
                <p className="text-xs text-ink-500 mt-2">
                  Last order {formatDate(stats.last.created_at)}
                </p>
              )}
              {customer.custom_order_count > 0 && (
                <p className="text-xs text-ink-600 mt-2">
                  {customer.custom_order_count} custom-order request{customer.custom_order_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Purchase history */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">
              Purchase history
            </p>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-500 bg-white rounded-xl border border-cream-200 p-4">
                No orders yet.
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between bg-white rounded-lg border border-cream-200 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-ink-500">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`${statusStyle[order.status] || 'badge-soft'} uppercase text-xs ml-2`}>
                          {order.status}
                        </span>
                        <span className="text-xs text-ink-400 ml-2">
                          {itemCount} item{itemCount !== 1 ? 's' : ''} · {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-plum-700">
                          ${order.total.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setViewingOrderId(order.id)}
                          className="rounded-pill px-3 py-1 text-xs font-medium uppercase tracking-wider bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base"
                          type="button"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-only order detail, same modal as Orders/History tabs */}
      {viewingOrder && (
        <OrderModal
          order={viewingOrder}
          statusOptions={[]}
          onClose={() => setViewingOrderId(null)}
        />
      )}
    </div>
  );
}

export function AdminCustomersClient({ customers, orders }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const selected = customers.find((c) => c.id === selectedId) || null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? customers.filter((c) =>
        `@${c.username}`.toLowerCase().includes(normalizedQuery) ||
        (c.display_name || '').toLowerCase().includes(normalizedQuery) ||
        (c.email || '').toLowerCase().includes(normalizedQuery)
      )
    : customers;

  return (
    <>
      {customers.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No customers yet.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search — matches username, display name, or email */}
          {customers.length > 5 && (
            <div className="relative max-w-sm">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                aria-label="Search customers by name or email"
                className="w-full rounded-lg border border-cream-300 bg-surface px-4 py-2.5 pr-10 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-plum-500"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label="Clear search"
                  type="button"
                >
                  ✕
                </button>
              ) : (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden>
                  🔍
                </span>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 surface-card text-sm text-ink-500">
              No customers match “{query}”.
            </div>
          ) : (
          <div className="surface-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-medium text-ink-800">
                    @{c.username}
                    {c.is_public ? (
                      <span className="badge-mint ml-2">Public</span>
                    ) : (
                      <span className="badge-soft ml-2">Private</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-ink-700">{c.order_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className="rounded-pill px-4 py-1.5 text-xs font-medium uppercase tracking-wider bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base"
                      type="button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </div>
      )}

      {selected && (
        <CustomerModal
          customer={selected}
          orders={orders.filter((o) => o.user_id === selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
