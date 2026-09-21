import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findGuestCartByToken, getGuestCartItems, readGuestCartToken } from '@/lib/cart/guest';

export async function getCartCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('cart_items')
        .select('quantity, carts!inner(user_id)')
        .eq('carts.user_id', user.id);
      if (error || !data) return 0;
      return data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    // Guest: count through the cookie token.
    const token = await readGuestCartToken();
    const guestCart = await findGuestCartByToken(token);
    if (!guestCart) return 0;
    const items = await getGuestCartItems(guestCart.id);
    return items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

export async function getCartWithItemsServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
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

  // Guest cart via cookie token (read-only render path — no cookie writes).
  const token = await readGuestCartToken();
  const guestCart = await findGuestCartByToken(token);
  if (!guestCart) return null;
  const items = await getGuestCartItems(guestCart.id);
  return { ...guestCart, items };
}
