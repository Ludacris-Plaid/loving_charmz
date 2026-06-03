import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { WishlistItem } from '@/lib/supabase/types';

export async function getWishlistItemsServer(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('wishlists')
    .select('id, user_id, product_id, created_at, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return ((data || []) as unknown) as WishlistItem[];
}
