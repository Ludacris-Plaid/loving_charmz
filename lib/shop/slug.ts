/**
 * Slug handling for public product and collection URLs.
 *
 * A slug is what appears in `/products/<slug>`. The house style is lowercase
 * alphanumerics with no separators (`bestfriend`, `unconditionallove`), which
 * is what the admin form's `slugify()` produces. One legacy row shipped with
 * a space in it (`forever pawprints`), which produced a URL containing a raw
 * space — a broken-looking link, a malformed `<loc>` in the sitemap, and a
 * slug that search engines are entitled to treat as two words.
 *
 * `normalizeSlug` exists so that any reasonable spelling of a slug still
 * resolves to its product: an old link, a hand-typed URL, or a `%20` pasted
 * out of a search result all fold to the same comparison key.
 */

/**
 * Fold a slug to its comparison key: lowercase, alphanumeric only.
 *
 * This is for *matching*, never for storing. `forever pawprints`,
 * `forever-paw-prints` and `ForeverPawPrints` all normalize to
 * `foreverpawprints`.
 */
export function normalizeSlug(slug: string | null | undefined): string {
  if (!slug) return '';
  // Decode first: a still-encoded `forever%20pawprints` would otherwise fold to
  // `forever20pawprints`, because the digits in the escape survive as
  // alphanumerics and silently miss the real product.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Malformed escape sequence: fall through and fold what we were given.
  }
  return decoded.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Percent-encode a slug for safe inclusion in a URL or a sitemap `<loc>`.
 *
 * A stored slug may still contain characters that are not URL-safe; encoding
 * keeps the emitted URL valid even if such a row reappears.
 */
export function encodeSlug(slug: string): string {
  return encodeURIComponent(slug);
}
