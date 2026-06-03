'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CheckoutResult = { error?: string; orderId?: string };

export async function createCheckoutAction(formData: FormData): Promise<CheckoutResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to place an order.' };

  const cart = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle();
  if (!cart.data) return { error: 'Your cart is empty.' };

  const { data: items } = await supabase
    .from('cart_items')
    .select('id, quantity, product_id, variant_id, product:products(name, base_price), variant:product_variants(name, price_adjustment)')
    .eq('cart_id', cart.data.id);
  if (!items || items.length === 0) return { error: 'Your cart is empty.' };

  const subtotal = items.reduce((sum, item: any) => {
    const base = Number(item.product?.base_price || 0);
    const adj = Number(item.variant?.price_adjustment || 0);
    return sum + (base + adj) * Number(item.quantity || 0);
  }, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);

  const firstName = (formData.get('firstName') as string | null)?.trim() || '';
  const lastName = (formData.get('lastName') as string | null)?.trim() || '';
  const address = (formData.get('address') as string | null)?.trim() || '';
  const city = (formData.get('city') as string | null)?.trim() || '';
  const state = (formData.get('state') as string | null)?.trim() || '';
  const zip = (formData.get('zip') as string | null)?.trim() || '';
  const country = (formData.get('country') as string | null)?.trim() || 'US';
  const paymentMethod = (formData.get('paymentMethod') as string | null)?.trim() || 'paypal';
  const email = (formData.get('email') as string | null)?.trim() || user.email || '';

  if (!firstName || !lastName || !address || !city || !state || !zip || !email) {
    return { error: 'Please complete all required fields.' };
  }

  const shipping_address = { firstName, lastName, address, city, state, zip, country, email };

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'pending',
      subtotal: +subtotal.toFixed(2),
      shipping_cost: shipping,
      tax,
      discount: 0,
      total,
      shipping_address,
      payment_method: paymentMethod,
      payment_status: 'pending',
    })
    .select('id')
    .single();
  if (orderErr) return { error: orderErr.message };

  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product?.name || 'Item',
    variant_name: item.variant?.name || null,
    unit_price: +(Number(item.product?.base_price || 0) + Number(item.variant?.price_adjustment || 0)).toFixed(2),
    quantity: item.quantity,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
  if (itemsErr) return { error: itemsErr.message };

  await supabase.from('cart_items').delete().eq('cart_id', cart.data.id);

  revalidatePath('/account/orders');
  revalidatePath('/admin/orders');
  revalidatePath('/cart');
  return { orderId: order.id };
}
