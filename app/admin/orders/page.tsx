import { getAdminOrders } from '@/lib/admin/data';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Admin \u00b7 Orders \u2014 Loving Charmz',
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

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect('/login?next=/admin/orders');

  const orders = await getAdminOrders();

  // Completed and cancelled orders live in /admin/history
  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Sales</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Orders</h1>
        <p className="text-sm text-ink-600 mt-1">Update status, view contents, and keep customers in the loop.</p>
      </div>

      <AdminOrdersTable
        orders={activeOrders.map((o) => ({
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
          tracking_number: o.tracking_number || null,
          tracking_carrier: o.tracking_carrier || null,
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
