import { getAdminOrders } from '@/lib/admin/data';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Admin \u00b7 Order History \u2014 Loving Charmz',
};

export const dynamic = 'force-dynamic';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function AdminHistoryPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect('/login?next=/admin/history');

  const orders = await getAdminOrders();

  // Show completed and cancelled orders
  const archivedOrders = orders.filter(
    (o) => o.status === 'completed' || o.status === 'cancelled'
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Archive</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Order History</h1>
        <p className="text-sm text-ink-600 mt-1">Completed and cancelled orders. Click Manage to view full details.</p>
      </div>

      <AdminOrdersTable
        orders={archivedOrders.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          subtotal: Number(o.subtotal),
          tax: Number(o.tax),
          shipping_cost: Number(o.shipping_cost),
          discount: Number(o.discount || 0),
          customer_email: o.customer_email || null,
          discount_code: o.discount_code || null,
          shipping_address: o.shipping_address || null,
          payment_method: o.payment_method || null,
          payment_status: o.payment_status || 'pending',
          updated_at: o.updated_at || o.created_at,
          created_at: o.created_at,
          items: (o.items || []).map((it: any) => ({
            id: it.id,
            product_name: it.product_name,
            variant_name: it.variant_name,
            unit_price: Number(it.unit_price),
            quantity: it.quantity,
          })),
        }))}
        statusOptions={statusOptions}
      />
    </div>
  );
}
