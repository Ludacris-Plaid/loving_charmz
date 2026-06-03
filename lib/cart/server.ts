import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getCartCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity, carts!inner(user_id)')
      .eq('carts.user_id', user.id);

    if (error || !data) return 0;
    return data.reduce((sum, item) => sum + (item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

export async function getCartWithItemsServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cart } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!cart) return null;

  const { data: items } = await supabase
    .from('cart_items')
    .select(`
      *,
      product:products (*),
      variant:product_variants (*)
    `)
    .eq('cart_id', cart.id);

  return { ...cart, items: items || [] };
}
