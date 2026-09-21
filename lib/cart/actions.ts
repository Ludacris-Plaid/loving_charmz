'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCartCount as countServer } from '@/lib/cart/server';
import {
  ensureGuestCartToken,
  findGuestCartByToken,
  getOrCreateGuestCart,
  readGuestCartToken,
} from '@/lib/cart/guest';

export type CartActionResult = { error?: string; success?: boolean; count?: number };

async function getOrCreateCart(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: existing } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created;
}

/**
 * Resolves the actor's cart: the member cart when signed in, otherwise the
 * guest cart behind the cookie token (created on demand — Server Actions may
 * set cookies). Returns null only when the caller has no cart at all.
 */
async function resolveCart(): Promise<
  { kind: 'member'; cartId: string } | { kind: 'guest'; cartId: string } | null
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const cart = await getOrCreateCart(supabase, user.id);
    return { kind: 'member', cartId: cart.id };
  }
  const token = await ensureGuestCartToken();
  const cart = await getOrCreateGuestCart(token);
  return { kind: 'guest', cartId: cart.id };
}

export async function addToCartAction(
  productId: string,
  variantId: string | null,
  quantity: number = 1
): Promise<CartActionResult> {
  const resolved = await resolveCart();
  if (!resolved) return { error: 'Please sign in to add items to your cart.' };

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();

  const { data: existing } = await admin
    .from('cart_items')
    .select('*')
    .eq('cart_id', resolved.cartId)
    .eq('product_id', productId)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from('cart_items')
      .insert({ cart_id: resolved.cartId, product_id: productId, variant_id: variantId, quantity });
    if (error) return { error: error.message };
  }

  const count = await countServer();
  revalidatePath('/', 'layout');
  return { success: true, count };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<CartActionResult> {
  const resolved = await resolveCart();
  if (!resolved) return { error: 'Not authenticated' };
  const admin = (await import('@/lib/supabase/admin')).createAdminClient();

  // Ownership check: the row must belong to the caller's cart.
  const { data: item } = await admin
    .from('cart_items')
    .select('cart_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item || item.cart_id !== resolved.cartId) return { error: 'Item not found in your cart.' };

  if (quantity <= 0) {
    const { error } = await admin.from('cart_items').delete().eq('id', itemId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from('cart_items').update({ quantity }).eq('id', itemId);
    if (error) return { error: error.message };
  }
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function removeFromCartAction(itemId: string): Promise<CartActionResult> {
  const resolved = await resolveCart();
  if (!resolved) return { error: 'Not authenticated' };
  const admin = (await import('@/lib/supabase/admin')).createAdminClient();

  const { data: item } = await admin
    .from('cart_items')
    .select('cart_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item || item.cart_id !== resolved.cartId) return { error: 'Item not found in your cart.' };

  const { error } = await admin.from('cart_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function clearCartAction(): Promise<CartActionResult> {
  const resolved = await resolveCart();
  if (!resolved) return { error: 'Not authenticated' };
  const admin = (await import('@/lib/supabase/admin')).createAdminClient();

  const { error } = await admin.from('cart_items').delete().eq('cart_id', resolved.cartId);
  if (error) return { error: error.message };
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function toggleWishlistAction(productId: string): Promise<CartActionResult & { wished?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to use your wishlist.' };

  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('wishlists').delete().eq('id', existing.id);
    if (error) return { error: error.message };
    revalidatePath('/account/wishlist');
    revalidatePath('/', 'layout');
    return { success: true, wished: false };
  } else {
    const { error } = await supabase
      .from('wishlists')
      .insert({ user_id: user.id, product_id: productId });
    if (error) return { error: error.message };
    revalidatePath('/account/wishlist');
    revalidatePath('/', 'layout');
    return { success: true, wished: true };
  }
}

/** Count helper used by the header for both members and guests. */
export async function currentCartCount(): Promise<number> {
  const token = await readGuestCartToken();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return countServer();

  const guestCart = await findGuestCartByToken(token);
  if (!guestCart) return 0;
  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  const { data: items } = await admin
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', guestCart.id);
  return (items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0);
}
