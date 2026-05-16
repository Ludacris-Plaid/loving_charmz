import { createClient } from '@/lib/supabase/client';
import type { Cart, CartItem } from '@/lib/supabase/types';

export async function getOrCreateCart(): Promise<Cart> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Must be logged in to manage cart');
  }

  const { data: existingCart } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingCart) return existingCart;

  const { data: newCart, error } = await supabase
    .from('carts')
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return newCart;
}

export async function getCartWithItems(): Promise<Cart | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cart, error } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !cart) return null;

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

export async function addToCart(productId: string, variantId?: string, quantity = 1): Promise<void> {
  const supabase = createClient();
  const cart = await getOrCreateCart();

  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .eq('variant_id', variantId || null)
    .single();

  if (existingItem) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('id', existingItem.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id: productId,
        variant_id: variantId || null,
        quantity,
      });
    if (error) throw new Error(error.message);
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  const supabase = createClient();
  
  if (quantity <= 0) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  }
}

export async function removeFromCart(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function clearCart(): Promise<void> {
  const supabase = createClient();
  const cart = await getOrCreateCart();
  
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id);
  if (error) throw new Error(error.message);
}