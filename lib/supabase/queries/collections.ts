import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Collection } from '@/lib/supabase/types';

export async function getCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

export async function getCollectionProducts(collectionSlug: string) {
  const supabase = await createClient();
  
  // Get collection ID first
  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('slug', collectionSlug)
    .single();
  
  if (!collection) return [];
  
  // Get products in collection
  const { data, error } = await supabase
    .from('collection_products')
    .select(`
      sort_order,
      products:products (*)
    `)
    .eq('collection_id', collection.id)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}