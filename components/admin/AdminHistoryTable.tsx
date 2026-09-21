'use client';

import { useState, useTransition, useCallback } from 'react';
import { deleteHistoryOrderAction, deleteAllHistoryAction } from '@/lib/admin/actions';
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
};

const statusStyle: Record<string, string> = {
  pending: 'badge-soft',
  processing: 'badge-mint',
  shipped: 'badge-shipped',
  delivered: 'badge-mint',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

function formatAddress(addr: ShippingAddress): string {
  if (!addr) return 'No address on file';
  return [
    addr.firstName && addr.lastName ? `${addr.firstName} ${addr.lastName}` : addr.firstName || addr.lastName || '',
    addr.address,
    [addr.city, addr.state].filter(Boolean).join(', '),
    [addr.zip, addr.country].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');
}

function toCsvRow(values: (string | number)[]): string {
  return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
}

function exportTxt(orders: Order[]): void {
  const lines = orders.map((o) => {
    const addr = o.shipping_address;
    const items = o.items.map((it) => `  - ${it.product_name}${it.variant_name ? ` (${it.variant_name})` : ''} × ${it.quantity} — $${(it.unit_price * it.quantity).toFixed(2)}`).join('\n');
    return [
      `Order #${o.id.slice(0, 8).toUpperCase()}`,
      `Status: ${o.status}`,
      `Date: ${formatDate(o.created_at)}`,
      `Payment: ${o.payment_method || 'N/A'} (${o.payment_status})`,
      addr ? `Ship to: ${formatAddress(addr)}` : '',
      addr?.email ? `Email: ${addr.email}` : '',
      items,
      `Subtotal: $${o.subtotal.toFixed(2)}`,
      o.discount > 0 ? `Discount: -$${o.discount.toFixed(2)} (${o.discount_code || 'N/A'})` : '',
      `Shipping: ${o.shipping_cost === 0 ? 'FREE' : `$${o.shipping_cost.toFixed(2)}`}`,
      `Tax: $${o.tax.toFixed(2)}`,
      `Total: $${o.total.toFixed(2)}`,
      '',
    ].filter(Boolean).join('\n');
  });
  downloadFile(lines.join('\n\n'), 'order-history.txt', 'text/plain');
}

function exportCsv(orders: Order[]): void {
  const header = toCsvRow(['Order ID', 'Status', 'Date', 'Payment Method', 'Payment Status', 'Customer Email', 'Items', 'Subtotal', 'Discount', 'Discount Code', 'Shipping', 'Tax', 'Total', 'Ship Name', 'Address', 'City', 'Province', 'Postal Code', 'Country']);
  const rows = orders.map((o) => {
    const addr = o.shipping_address;
    const itemList = o.items.map((it) => `${it.product_name}${it.variant_name ? ` (${it.variant_name})` : ''} ×${it.quantity}`).join('; ');
    return toCsvRow([
      o.id.slice(0, 8).toUpperCase(),
      o.status,
      formatDate(o.created_at),
      o.payment_method || '',
      o.payment_status,
      addr?.email || o.customer_email || '',
      itemList,
      o.subtotal.toFixed(2),
      o.discount.toFixed(2),
      o.discount_code || '',
      o.shipping_cost.toFixed(2),
      o.tax.toFixed(2),
      o.total.toFixed(2),
      addr ? `${addr.firstName || ''} ${addr.lastName || ''}`.trim() : '',
      addr?.address || '',
      addr?.city || '',
      addr?.state || '',
      addr?.zip || '',
      addr?.country || '',
    ]);
  });
  downloadFile([header, ...rows].join('\n'), 'order-history.csv', 'text/csv');
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DELETE_ALL_PHRASE = 'DELETE HISTORY';

export function AdminHistoryTable({ orders }: Props) {
  const [data, setData] = useState(orders);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = useCallback((orderId: string) => {
    if (!confirm('Delete this order from history? This cannot be undone.')) return;
    setDeletingId(orderId);
    startTransition(async () => {
      const res = await deleteHistoryOrderAction(orderId);
      if (res.success) {
        setData((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        alert(res.error || 'Failed to delete');
      }
      setDeletingId(null);
    });
  }, []);

  const handleDeleteAll = useCallback(() => {
    if (confirmText.trim().toUpperCase() !== DELETE_ALL_PHRASE) return;
    startTransition(async () => {
      const res = await deleteAllHistoryAction();
      if (res.success) {
        setData([]);
        setConfirmingDeleteAll(false);
        setConfirmText('');
      } else {
        alert(res.error || 'Failed to delete');
      }
    });
  }, [confirmText]);

  if (data.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <p className="text-ink-500">No order history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => exportCsv(data)}
          className="btn-outline px-4 py-2 text-sm"
          type="button"
        >
          📄 Export CSV
        </button>
        <button
          onClick={() => exportTxt(data)}
          className="btn-outline px-4 py-2 text-sm"
          type="button"
        >
          📝 Export TXT
        </button>
        <div className="flex-1" />
        {confirmingDeleteAll ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2">
            <span className="text-xs font-medium text-red-700">
              Type {DELETE_ALL_PHRASE} to permanently delete {data.length} order{data.length !== 1 ? 's' : ''}:
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-44 rounded border border-red-300 px-2 py-1 text-sm uppercase tracking-wider"
              placeholder={DELETE_ALL_PHRASE}
              autoFocus
              aria-label={`Type ${DELETE_ALL_PHRASE} to confirm`}
            />
            <button
              onClick={handleDeleteAll}
              disabled={pending || confirmText.trim().toUpperCase() !== DELETE_ALL_PHRASE}
              className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              type="button"
            >
              {pending ? 'Deleting…' : 'Delete forever'}
            </button>
            <button
              onClick={() => { setConfirmingDeleteAll(false); setConfirmText(''); }}
              className="text-xs text-ink-500 hover:text-ink-700"
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDeleteAll(true)}
            disabled={pending || data.length === 0}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 motion-base"
            type="button"
          >
            🗑️ Delete All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-ink-600">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium text-right sticky right-0 bg-cream-100 z-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((order) => {
              const shortId = order.id.slice(0, 8).toUpperCase();
              const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
              const style = statusStyle[order.status] || 'badge-soft';
              const isDeleting = deletingId === order.id;

              return (
                <tr key={order.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-ink-500">#{shortId}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`${style} uppercase text-xs`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-medium">${order.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white z-10">
                    <button
                      onClick={() => handleDelete(order.id)}
                      disabled={isDeleting || pending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 motion-base px-2 py-1 rounded hover:bg-red-50"
                      title="Delete from history"
                      type="button"
                    >
                      {isDeleting ? '…' : '🗑️'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-400">
        {data.length} order{data.length !== 1 ? 's' : ''} in history
      </p>
    </div>
  );
}
