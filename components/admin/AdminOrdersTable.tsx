'use client';

import { Fragment, useState, useTransition } from 'react';
import { updateOrderStatusAction } from '@/lib/admin/actions';

type Order = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  customer_email: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    variant_name: string | null;
    unit_price: number;
    quantity: number;
  }>;
};

type Props = {
  orders: Order[];
  statusOptions: Array<{ value: string; label: string }>;
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  processing: 'badge-mint',
  shipped: 'badge-mint',
  delivered: 'badge-mint',
  cancelled: 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-pill text-xs font-medium',
};

export function AdminOrdersTable({ orders, statusOptions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatus = (id: string, status: string) => {
    setBusy(id);
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(id, status);
      if (res.error) setError(res.error);
      setBusy(null);
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {orders.length === 0 ? (
        <div className="text-center py-12 surface-card text-sm text-ink-500">
          No orders yet.
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isOpen = expanded === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr className="border-t border-cream-200 text-sm">
                      <td className="px-4 py-3 font-mono text-xs text-ink-700">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        {order.customer_email || '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusStyle[order.status] || 'badge-soft'}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-plum-700">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpanded(isOpen ? null : order.id)}
                          className="text-xs font-medium uppercase tracking-wider text-plum-700 hover:text-plum-900 motion-base"
                        >
                          {isOpen ? 'Hide' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-cream-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid sm:grid-cols-2 gap-6 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">Items</p>
                              <ul className="space-y-1 text-ink-700">
                                {order.items.map((item) => (
                                  <li key={item.id} className="flex justify-between gap-3">
                                    <span>
                                      {item.product_name}
                                      {item.variant_name ? ` (${item.variant_name})` : ''} × {item.quantity}
                                    </span>
                                    <span className="text-ink-600">
                                      ${(item.unit_price * item.quantity).toFixed(2)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <dl className="mt-3 space-y-1 text-xs text-ink-500">
                                <div className="flex justify-between"><dt>Subtotal</dt><dd>${order.subtotal.toFixed(2)}</dd></div>
                                <div className="flex justify-between"><dt>Shipping</dt><dd>${order.shipping_cost.toFixed(2)}</dd></div>
                                <div className="flex justify-between"><dt>Tax</dt><dd>${order.tax.toFixed(2)}</dd></div>
                                <div className="flex justify-between font-semibold text-ink-700"><dt>Total</dt><dd>${order.total.toFixed(2)}</dd></div>
                              </dl>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">Update status</p>
                              <div className="flex flex-wrap gap-2">
                                {statusOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleStatus(order.id, opt.value)}
                                    disabled={busy === order.id || order.status === opt.value}
                                    className={[
                                      'rounded-pill px-3 py-1.5 text-xs font-medium uppercase tracking-wider motion-base',
                                      order.status === opt.value
                                        ? 'bg-plum-700 text-cream-50'
                                        : 'border border-cream-300 bg-surface text-ink-700 hover:border-plum-500 hover:text-plum-700',
                                    ].join(' ')}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
