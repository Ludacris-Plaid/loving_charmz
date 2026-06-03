import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product, ProductVariant } from '@/lib/supabase/types';

export type AdminProduct = Product & { variant_count?: number; total_stock?: number };

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('products')
    .select('*, product_variants(id, stock_quantity, is_active)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => {
    const variants = p.product_variants || [];
    return {
      ...p,
      variant_count: variants.length,
      total_stock: variants
        .filter((v: any) => v.is_active)
        .reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0),
    };
  });
}

export async function getAdminProduct(id: string) {
  const admin = createAdminClient();
  const [{ data: product }, { data: variants }] = await Promise.all([
    admin.from('products').select('*').eq('id', id).maybeSingle(),
    admin.from('product_variants').select('*').eq('product_id', id).order('created_at'),
  ]);
  return { product, variants: (variants || []) as ProductVariant[] };
}
