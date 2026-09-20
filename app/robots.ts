import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Crawler rules, served at `/robots.txt`.
 *
 * The storefront is fully crawlable; session-bound and private areas are
 * excluded so the index stays clean of cart/checkout/account noise. Auth
 * pages are disallowed too — they are thin, duplicate content for every
 * visitor.
 *
 * The advertised origin is always the canonical production domain (see
 * `lib/site.ts`), never the host a preview deployment is served from —
 * search engines should only ever hear about `lovingcharmz.com`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/account',
        '/api',
        '/cart',
        '/checkout',
        '/login',
        '/signup',
        '/logout',
        '/forgot-password',
        '/reset-password',
        '/unsubscribe',
      ],
    },
    sitemap: `${SITE_URL.replace(/\/+$/, '')}/sitemap.xml`,
    host: SITE_URL,
  };
}
