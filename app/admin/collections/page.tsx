import { getAdminCollections } from '@/lib/admin/data';
import { AdminCollectionsClient } from '@/components/admin/AdminCollectionsClient';

export const metadata = {
  title: 'Admin · Collections — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const collections = await getAdminCollections();
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
          product_count: Array.isArray(c.collection_products) ? c.collection_products.length : 0,
        }))}
      />
    </div>
  );
}
