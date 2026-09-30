import { createClient } from '@/lib/supabase/server';
import { normalizeSlug } from '@/lib/shop/slug';
import type { Product, ProductVariant } from '@/lib/supabase/types';

/**
 * A catalog row plus the lowest price any version sells for. Cards show
 * "From $X" using `from_price`, so a version priced below the base price can
 * never leave the card advertising a price a shopper cannot get.
 */
export type ProductWithPricing = Product & { from_price: number };

export async function getProducts(limit = 50): Promise<ProductWithPricing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(price_adjustment, is_active)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).map((p: any) => {
    const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
    const active = variants.filter((v: any) => v.is_active);
    const lowest = active.length
      ? Math.min(...active.map((v: any) => Number(p.base_price) + Number(v.price_adjustment || 0)))
      : Number(p.base_price);
    return { ...p, from_price: Math.max(0, lowest) } as ProductWithPricing;
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

/**
 * Find a product by any reasonable spelling of its slug.
 *
 * An exact match always wins. Only when it misses do we fall back to comparing
 * normalized slugs, so `forever pawprints`, `forever-paw-prints` and
 * `forever%20pawprints` all still reach the product whose stored slug is
 * `foreverpawprints`. The catalog is small (a handful of products), so
 * comparing in memory is cheaper than a second round trip that would need an
 * unindexed SQL expression.
 *
 * The caller is expected to compare `product.slug` against the requested slug
 * and permanently redirect when they differ — this function resolves the
 * product, it does not pretend the requested URL was the right one.
 */
export async function getProductByAnySlug(slug: string): Promise<Product | null> {
  const exact = await getProductBySlug(slug);
  if (exact) return exact;

  const wanted = normalizeSlug(slug);
  if (!wanted) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  const match = (data || []).find((p: any) => normalizeSlug(p.slug) === wanted);
  return match ?? null;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getProductsByCollection(collectionSlug: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, collection_products!inner(collections!inner(slug))')
    .eq('collection_products.collections.slug', collectionSlug)
    .eq('is_active', true)
    .order('collection_products.sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function searchProducts(query: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}