import { getAdminCustomers, getAdminOrders } from '@/lib/admin/data';
import { AdminCustomersClient } from '@/components/admin/AdminCustomersClient';
import { redirect } from 'next/navigation';
import { getSession } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Admin · Customers — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  // Verify the admin in-page (layout guard runs in parallel, not first).
  const session = await getSession();
  if (!session?.isAdmin) redirect('/login?next=/admin/customers');

  const [customers, orders] = await Promise.all([
    getAdminCustomers(),
    getAdminOrders(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">People</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Customers</h1>
        <p className="text-sm text-ink-600 mt-1">
          {customers.length} customer{customers.length === 1 ? '' : 's'} total. Click View to see
          profile, stats, and purchase history.
        </p>
      </div>

      <AdminCustomersClient
        customers={customers}
        orders={orders.map((o) => ({
          id: o.id,
          user_id: o.user_id ?? null,
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
      />
    </div>
  );
}
