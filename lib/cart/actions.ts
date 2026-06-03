'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCartCount as countServer } from '@/lib/cart/server';

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

export async function addToCartAction(
  productId: string,
  variantId: string | null,
  quantity: number = 1
): Promise<CartActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to add items to your cart.' };

  const cart = await getOrCreateCart(supabase, user.id);

  const { data: existing } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ cart_id: cart.id, product_id: productId, variant_id: variantId, quantity });
    if (error) return { error: error.message };
  }

  const count = await countServer();
  revalidatePath('/', 'layout');
  return { success: true, count };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<CartActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (quantity <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
    if (error) return { error: error.message };
  }
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function removeFromCartAction(itemId: string): Promise<CartActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function clearCartAction(): Promise<CartActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const cart = await getOrCreateCart(supabase, user.id);
  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id);
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
