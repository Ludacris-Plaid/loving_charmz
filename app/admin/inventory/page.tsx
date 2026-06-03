import { getInventoryRows } from '@/lib/admin/data';
import { AdminInventoryClient } from '@/components/admin/AdminInventoryClient';
import { getAdminProducts } from '@/lib/admin/products';

export const metadata = {
  title: 'Admin · Inventory — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const [rows, products] = await Promise.all([
    getInventoryRows(),
    getAdminProducts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Inventory</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Stock & variants</h1>
        <p className="text-sm text-ink-600 mt-1">Update stock counts, add variants, and keep your inventory honest.</p>
      </div>
      <AdminInventoryClient
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          sku: r.sku,
          stock_quantity: Number(r.stock_quantity),
          is_active: Boolean(r.is_active),
          product_name: r.product_name,
          product_slug: r.product_slug,
        }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
