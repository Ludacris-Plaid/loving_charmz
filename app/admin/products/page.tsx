import Link from 'next/link';
import { getAdminProducts } from '@/lib/admin/products';
import { AdminProductsClient } from '@/components/admin/AdminProductsClient';

export const metadata = {
  title: 'Admin · Products — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <span className="badge-plum">Catalog</span>
          <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Products</h1>
          <p className="text-sm text-ink-600 mt-1">Add, edit, and curate the Bond Collection.</p>
        </div>
      </div>

      <AdminProductsClient
        initialProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          base_price: Number(p.base_price),
          is_active: Boolean(p.is_active),
          is_personalizable: Boolean(p.is_personalizable),
          variant_count: p.variant_count || 0,
          total_stock: p.total_stock || 0,
          tagline: p.tagline,
          description: p.description,
          images: p.images || [],
        }))}
      />
    </div>
  );
}
