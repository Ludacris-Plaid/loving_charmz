'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { updateOrderStatusAction } from '@/lib/admin/actions';
import { formatDate } from '@/lib/admin/analytics/format';

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

type Order = {
  id: string;
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
  updated_at: string;
  created_at: string;
  items: OrderItem[];
};

type Props = {
  orders: Order[];
  statusOptions: Array<{ value: string; label: string }>;
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  processing: 'badge-mint',
  shipped: 'badge-shipped',
  delivered: 'badge-mint',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

/* ── helpers ─────────────────────────────────────────────────────────── */

function formatAddress(addr: ShippingAddress): string {
  if (!addr) return 'No address on file';
  const parts = [
    addr.firstName && addr.lastName
      ? `${addr.firstName} ${addr.lastName}`
      : addr.firstName || addr.lastName || '',
    addr.address,
    [addr.city, addr.state].filter(Boolean).join(', '),
    [addr.zip, addr.country].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.join('\n');
}

/* ── Ship-to block ───────────────────────────────────────────────────── */

function AddressBlock({ address }: { address: ShippingAddress }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formatAddress(address)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  if (!address) {
    return (
      <div className="rounded-xl border border-cream-200 bg-cream-50 p-5 text-sm text-ink-500">
        No shipping address on file.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-plum-200 bg-plum-50/40 p-5 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-plum-700">
          📦 Ship To
        </h3>
        <button
          onClick={handleCopy}
          className="rounded-pill px-3 py-1 text-xs font-medium bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base"
        >
          {copied ? '✓ Copied!' : 'Copy Address'}
        </button>
      </div>
      <div className="font-display text-base text-ink-800 leading-relaxed whitespace-pre-line">
        {formatAddress(address)}
      </div>
    </div>
  );
}

/* ── Order detail modal ──────────────────────────────────────────────── */

function OrderModal({
  order,
  statusOptions,
  onClose,
}: {
  order: Order;
  statusOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleStatus = (status: string) => {
    setBusy(true);
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(order.id, status);
      if (res.error) setError(res.error);
      else setCurrentStatus(status);
      setBusy(false);
    });
  };

  const addr = order.shipping_address;
  const paymentLabel =
    order.payment_method === 'card'
      ? 'Square (Card)'
      : order.payment_method === 'paypal'
        ? 'PayPal'
        : order.payment_method || '—';

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[5vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${order.id.slice(0, 8).toUpperCase()}`}
    >
      <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-2xl border border-cream-200 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-ink-500">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={statusStyle[currentStatus] || 'badge-soft'}>
              {currentStatus}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-200 motion-base text-ink-500 hover:text-ink-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Shipping Address */}
          <AddressBlock address={addr} />

          {/* Customer + Payment row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
                Customer
              </p>
              <p className="text-sm text-ink-800">{order.customer_email || '—'}</p>
              {addr?.firstName && (
                <p className="text-sm text-ink-600 mt-1">
                  {addr.firstName} {addr.lastName}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
                Payment
              </p>
              <p className="text-sm text-ink-800">{paymentLabel}</p>
              <p className="text-xs text-ink-500 mt-1 capitalize">
                Status: {order.payment_status}
              </p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">
              Items
            </p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-cream-200 px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium text-ink-800">
                      {item.product_name}
                    </span>
                    {item.variant_name && (
                      <span className="text-xs text-ink-500 ml-2">
                        ({item.variant_name})
                      </span>
                    )}
                    <span className="text-xs text-ink-400 ml-2">
                      × {item.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-plum-700">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="text-ink-800">${order.subtotal.toFixed(2)}</dd>
              </div>
              {order.discount_code && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">
                    Discount{' '}
                    <span className="badge-mint ml-1 uppercase text-xs">
                      {order.discount_code}
                    </span>
                  </dt>
                  <dd className="text-plum-700">−${order.discount.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="text-ink-800">
                  {order.shipping_cost === 0
                    ? 'FREE'
                    : `$${order.shipping_cost.toFixed(2)}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Tax</dt>
                <dd className="text-ink-800">${order.tax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-cream-200 pt-2 mt-2">
                <dt className="font-semibold text-ink-700">Total</dt>
                <dd className="font-bold text-plum-900 text-base">
                  ${order.total.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Status controls */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">
              Update Status
            </p>
            {error && (
              <p className="text-sm text-red-600 mb-2" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatus(opt.value)}
                  disabled={busy || currentStatus === opt.value}
                  className={[
                    'rounded-pill px-4 py-2 text-xs font-medium uppercase tracking-wider motion-base',
                    currentStatus === opt.value
                      ? 'bg-plum-700 text-cream-50'
                      : 'border border-cream-300 bg-surface text-ink-700 hover:border-plum-500 hover:text-plum-700',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex justify-between text-xs text-ink-400 border-t border-cream-200 pt-4">
            <span>Created: {formatDate(order.created_at)}</span>
            <span>Updated: {formatDate(order.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main table ──────────────────────────────────────────────────────── */

export function AdminOrdersTable({ orders, statusOptions }: Props) {
  const [modalOrderId, setModalOrderId] = useState<string | null>(null);
  const modalOrder = orders.find((o) => o.id === modalOrderId) || null;

  return (
    <div className="space-y-4">
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
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-cream-200 text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {order.customer_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {formatDate(order.created_at)}
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
                      onClick={() => setModalOrderId(order.id)}
                      className="rounded-pill px-4 py-1.5 text-xs font-medium uppercase tracking-wider bg-plum-700 text-cream-50 hover:bg-plum-900 motion-base"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOrder && (
        <OrderModal
          order={modalOrder}
          statusOptions={statusOptions}
          onClose={() => setModalOrderId(null)}
        />
      )}
    </div>
  );
}
