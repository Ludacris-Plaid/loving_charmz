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
 */
export const SITE_URL = 'https://lovingcharmz.com';

/** The canonical display domain, for prose and copy. */
export const SITE_DOMAIN = 'lovingcharmz.com';
