import { createClient } from '@/lib/supabase/server';

export type CatalogStats = {
  productCount: number;
  collectionCount: number;
  startingPrice: number | null;
};

/**
 * Live catalog totals for copy like "3 collections · 8 pieces · Starting
 * at $165". Counted with head-only queries so the numbers always match
 * what shoppers can actually buy — no hardcoded values to maintain.
 */
export async function getCatalogStats(): Promise<CatalogStats> {
  const supabase = await createClient();

  const [products, collections, cheapest] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('collections').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('products')
      .select('base_price, product_variants(price_adjustment, is_active)')
      .eq('is_active', true)
      .order('base_price', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // The lowest price a shopper can actually pay — a version may be priced
  // below its product's base price, and the homepage must never quote a
  // figure that is not available in the shop.
  let startingPrice: number | null = null;
  if (cheapest.data) {
    const base = Number(cheapest.data.base_price);
    const variants = Array.isArray(cheapest.data.product_variants)
      ? cheapest.data.product_variants.filter((v: any) => v.is_active)
      : [];
    startingPrice = variants.length
      ? Math.max(
          0,
          Math.min(...variants.map((v: any) => base + Number(v.price_adjustment || 0))),
        )
      : base;
  }

  return {
    productCount: products.count ?? 0,
    collectionCount: collections.count ?? 0,
    startingPrice,
  };
}
