/**
 * The site's canonical production origin.
 *
 * Every "where does the public site live" fallback — SEO metadata, email
 * links, provider return URLs, password-reset redirects — must import this
 * constant instead of hardcoding a hostname, so the domain is defined in
 * exactly one place.
 *
 * Runtime code that can do better than a constant (deriving the origin from
 * the request so preview deployments and localhost keep working) still falls
 * back to this when no request is in scope or `NEXT_PUBLIC_SITE_URL` is unset.
 *
 * This is the `www` host, which is the one that actually serves the site: the
 * apex 308-redirects here. Advertising the apex to crawlers meant every URL in
 * the sitemap, robots.txt, the canonical tags and the Product JSON-LD cost a
 * redirect hop, so SEO surfaces pointed at addresses that were never the ones
 * being served. Payment return URLs and email links still prefer
 * `NEXT_PUBLIC_SITE_URL` and are unaffected by this constant.
 */
export const SITE_URL = 'https://www.lovingcharmz.com';

/**
 * The display domain, for prose and copy.
 *
 * Deliberately the short apex: this is what goes on packaging, in the footer
 * and in marketing text, where a `www.` prefix is noise.
 */
export const SITE_DOMAIN = 'lovingcharmz.com';
