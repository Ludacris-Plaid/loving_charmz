import { createClient } from '@/lib/supabase/server';
import type { Product, ProductVariant } from '@/lib/supabase/types';

export async function getProducts(limit = 50): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
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