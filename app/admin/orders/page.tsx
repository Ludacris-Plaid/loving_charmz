import { getAdminOrders } from '@/lib/admin/data';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';

export const metadata = {
  title: 'Admin · Orders — Loving Charmz',
};

export const dynamic = 'force-dynamic';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Sales</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Orders</h1>
        <p className="text-sm text-ink-600 mt-1">Update status, view contents, and keep customers in the loop.</p>
      </div>

      <AdminOrdersTable
        orders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          subtotal: Number(o.subtotal),
          tax: Number(o.tax),
          shipping_cost: Number(o.shipping_cost),
          customer_email: o.customer_email || null,
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
