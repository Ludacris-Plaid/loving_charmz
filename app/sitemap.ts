import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { stories } from './(marketing)/stories/page';

/**
 * Sitemap for search engines, served at `/sitemap.xml`.
 *
 * Catalog entries (products, collections) are queried straight from Supabase
 * on each render so new, renamed, or deactivated slugs are reflected without
 * a redeploy. If the database is unreachable the static and story entries
 * still ship — a partial sitemap beats a 500.
 *
 * `lastModified` is only emitted where we have a real timestamp (the catalog
 * rows' `updated_at`); fabricating one for static pages would just erode
 * crawlers' trust in the hint.
 */

type StaticRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
};

const STATIC_ROUTES: StaticRoute[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/shop', changeFrequency: 'daily', priority: 0.9 },
  { path: '/collections', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/custom-orders', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/wholesale', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/stories', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/shipping', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/refunds', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, '');

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const storyEntries: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${base}/stories/${story.slug}`,
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  const catalogEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const [products, collections] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('is_active', true),
      supabase.from('collections').select('slug, updated_at').eq('is_active', true),
    ]);

    for (const row of products.data ?? []) {
      if (!row.slug) continue;
      catalogEntries.push({
        url: `${base}/products/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
    for (const row of collections.data ?? []) {
      if (!row.slug) continue;
      catalogEntries.push({
        url: `${base}/collections/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // No database (local scripts, cold start, outage): ship static entries only.
  }

  return [...staticEntries, ...catalogEntries, ...storyEntries];
}
