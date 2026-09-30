import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSlug, normalizeSlug } from '@/lib/shop/slug';

/**
 * The catalog shipped one product with a space in its slug
 * (`forever pawprints`). The product page must keep resolving every
 * reasonable spelling of a slug to that product and then 308 to the real
 * one, so old links and hand-typed URLs never 404.
 */
describe('normalizeSlug', () => {
  it('folds the legacy spaced slug onto the house style', () => {
    expect(normalizeSlug('forever pawprints')).toBe('foreverpawprints');
  });

  it('is insensitive to separators, case and spacing', () => {
    const expected = 'foreverpawprints';
    for (const variant of [
      'foreverpawprints',
      'ForeverPawPrints',
      'forever-paw-prints',
      'forever_paw_prints',
      'forever%20pawprints',
      '  forever   paw   prints  ',
    ]) {
      expect(normalizeSlug(variant), variant).toBe(expected);
    }
  });

  it('leaves already-clean slugs untouched', () => {
    expect(normalizeSlug('bestfriend')).toBe('bestfriend');
    expect(normalizeSlug('unconditionallove')).toBe('unconditionallove');
  });

  it('treats missing input as no match rather than throwing', () => {
    expect(normalizeSlug('')).toBe('');
    expect(normalizeSlug(null)).toBe('');
    expect(normalizeSlug(undefined)).toBe('');
  });

  it('cannot be tricked into matching by a separator-only slug', () => {
    // The key is lossy by design; a slug of pure separators must normalize to
    // empty so it can never be treated as a match for a real product.
    expect(normalizeSlug('---')).toBe('');
  });
});

describe('encodeSlug', () => {
  it('percent-encodes a raw space so the emitted URL is legal', () => {
    expect(encodeSlug('forever pawprints')).toBe('forever%20pawprints');
  });

  it('leaves an already-safe slug byte-identical', () => {
    expect(encodeSlug('foreverpawprints')).toBe('foreverpawprints');
    expect(encodeSlug('bestfriend')).toBe('bestfriend');
  });

  it('never emits a raw space, which is what a sitemap <loc> requires', () => {
    for (const slug of ['forever pawprints', 'a b c', 'plain']) {
      expect(encodeSlug(slug)).not.toMatch(/\s/);
    }
  });
});

// ---------------------------------------------------------------
// getProductByAnySlug: exact match wins; a miss falls back to
// comparing normalized slugs so legacy URLs still resolve.
// ---------------------------------------------------------------

const rows: Record<string, unknown>[] = [
  { id: 'p1', slug: 'bestfriend', name: 'Best Friend', is_active: true },
  { id: 'p2', slug: 'companion', name: 'Companion Charm', is_active: true },
  { id: 'p3', slug: 'foreverpawprints', name: 'Forever Paw prints', is_active: true },
];

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const filters: [string, unknown][] = [];
    const matches = (r: Record<string, unknown>) =>
      filters.every(([c, v]) => r[c] === v);
    const builder: any = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return builder;
      },
      then(resolve: any, reject: any) {
        const filtered = rows.filter(matches);
        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
      },
      single() {
        const filtered = rows.filter(matches);
        if (!filtered.length) {
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        return Promise.resolve({ data: filtered[0], error: null });
      },
    };
    return { from: () => builder };
  },
}));

describe('getProductByAnySlug', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves an exact slug', async () => {
    const { getProductByAnySlug } = await import('@/lib/supabase/queries/products');
    const product = await getProductByAnySlug('bestfriend');
    expect(product?.slug).toBe('bestfriend');
  });

  it('resolves the legacy spaced spelling to the product with the clean slug', async () => {
    const { getProductByAnySlug } = await import('@/lib/supabase/queries/products');
    const product = await getProductByAnySlug('forever pawprints');
    expect(product).not.toBeNull();
    // The caller compares `product.slug` to the request and redirects, so it
    // must be handed back the *real* slug, never the one that was requested.
    expect(product!.slug).toBe('foreverpawprints');
    expect(product!.slug).not.toBe('forever pawprints');
  });

  it('resolves hyphenated and percent-encoded spellings too', async () => {
    const { getProductByAnySlug } = await import('@/lib/supabase/queries/products');
    for (const variant of ['forever-paw-prints', 'forever%20pawprints', 'ForeverPawPrints']) {
      const product = await getProductByAnySlug(variant);
      expect(product?.slug, variant).toBe('foreverpawprints');
    }
  });

  it('returns null for a slug that matches nothing', async () => {
    const { getProductByAnySlug } = await import('@/lib/supabase/queries/products');
    expect(await getProductByAnySlug('no-such-charm')).toBeNull();
  });

  it('returns null for an empty or separator-only slug rather than matching', async () => {
    const { getProductByAnySlug } = await import('@/lib/supabase/queries/products');
    expect(await getProductByAnySlug('')).toBeNull();
    expect(await getProductByAnySlug('---')).toBeNull();
  });
});
