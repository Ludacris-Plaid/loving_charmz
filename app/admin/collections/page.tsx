import { getAdminCollections } from '@/lib/admin/data';
import { getAdminProducts } from '@/lib/admin/products';
import { AdminCollectionsClient } from '@/components/admin/AdminCollectionsClient';

export const metadata = {
  title: 'Admin · Collections — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const [collections, products] = await Promise.all([
    getAdminCollections(),
    getAdminProducts(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Catalog</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Collections</h1>
        <p className="text-sm text-ink-600 mt-1">Group pieces into curated collections.</p>
      </div>
      <AdminCollectionsClient
        collections={collections.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image_url: c.image_url,
          is_active: Boolean(c.is_active),
          sort_order: Number(c.sort_order || 0),
          product_ids: Array.isArray(c.collection_products)
            ? [...c.collection_products]
                .sort((a: any, b: any) => Number(a.sort_order) - Number(b.sort_order))
                .map((m: any) => m.product_id as string)
            : [],
        }))}
        products={products.map((p: any) => ({
          id: p.id,
          name: p.name,
          base_price: Number(p.base_price || 0),
          is_active: Boolean(p.is_active),
          image: p.images?.[0] || null,
        }))}
      />
    </div>
  );
}