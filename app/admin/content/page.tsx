import { getContentBlocks } from '@/lib/admin/data';
import { AdminContentClient } from '@/components/admin/AdminContentClient';

export const metadata = {
  title: 'Admin · Content — Loving Charmz',
};

export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const blocks = await getContentBlocks();
  return (
    <div className="space-y-6">
      <div>
        <span className="badge-plum">Editorial</span>
        <h1 className="font-display text-3xl font-semibold text-plum-900 mt-3">Content blocks</h1>
        <p className="text-sm text-ink-600 mt-1">Manage site-wide copy snippets and feature blocks.</p>
      </div>
      <AdminContentClient
        blocks={blocks.map((b: any) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          body: b.body,
          image_url: b.image_url,
          is_published: Boolean(b.is_published),
        }))}
      />
    </div>
  );
}
