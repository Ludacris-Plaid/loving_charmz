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
      .select('base_price')
      .eq('is_active', true)
      .order('base_price', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    productCount: products.count ?? 0,
    collectionCount: collections.count ?? 0,
    startingPrice: cheapest.data ? Number(cheapest.data.base_price) : null,
  };
}
