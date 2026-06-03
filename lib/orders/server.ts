import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PersonalizationRequest, Order } from '@/lib/supabase/types';

export async function getMyOrdersServer(): Promise<Order[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as Order[];
}

export async function getMyPersonalizationRequestsServer(): Promise<PersonalizationRequest[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('personalization_requests')
    .select('*, product:products(name, slug, base_price, images)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as PersonalizationRequest[];
}
