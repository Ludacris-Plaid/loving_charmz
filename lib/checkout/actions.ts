'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  attachProviderSession,
  markPaymentAttemptFailed,
  recordPaymentAttempt,
} from '@/lib/payments/ledger';
import { requirePaymentMethod, startPaymentSession } from '@/lib/payments';
import { isPaymentProviderError } from '@/lib/payments/types';
import { getSiteUrl } from '@/lib/payments/site';
import { CURRENCY, computeOrderTotals, formatMoney, lineUnitPrice, type DiscountInfo } from './pricing';
import { validateDiscountCode } from './discount';

export type CheckoutResult = { error?: string; orderId?: string; redirectUrl?: string };

/**
 * Turns a cart into an order *and* a live payment at PayPal or Square.
 *
 * The order is created before the provider call because the provider needs a
 * reference to quote back to us, but the two are created together and the order
 * is rolled back if the provider refuses. That is deliberate: an order row with
 * `payment_status = 'pending'` and no provider behind it is exactly the state
 * this flow no longer produces.
 *
 * Money only moves when the shopper completes the redirect, and it is confirmed
 * against the provider on the return route (or by webhook). The cart is cleared
 * at that point, not here, so abandoning payment does not empty a cart.
 */
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

  const lines = items.map((item: any) => ({
    unitPrice: lineUnitPrice({
      base_price: item.product?.base_price,
      price_adjustment: item.variant?.price_adjustment,
    }),
    quantity: Number(item.quantity || 0),
  }));
  // Validate discount code if provided. The canonical code (as stored, not as
  // typed) travels with the order so the confirmation page and admin can show
  // which promotion was used.
  const discountCode = (formData.get('discountCode') as string | null)?.trim() || '';
  let discount: DiscountInfo | null = null;
  let appliedCode: string | null = null;
  if (discountCode) {
    const result = await validateDiscountCode(discountCode);
    if (!result.valid) return { error: result.error || 'Invalid discount code.' };
    discount = { type: result.discount_type!, value: result.discount_value! };
    appliedCode = result.code ?? discountCode.toUpperCase();
  }

  const totals = computeOrderTotals(lines, discount);

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

  // Resolved before anything is written: an environment with no usable
  // provider must not be able to create an order at all.
  const option = resolveRequestedMethod(paymentMethod);
  if (typeof option === 'string') return { error: option };

  const siteUrl = await getSiteUrl();

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'pending',
      subtotal: totals.subtotal,
      shipping_cost: totals.shipping,
      tax: totals.tax,
      discount: totals.discount,
      discount_code: appliedCode,
      total: totals.total,
      shipping_address: { firstName, lastName, address, city, state, zip, country, email },
      payment_method: paymentMethod,
      // Distinct from the legacy 'pending': this order has a provider session
      // (or is being created right now), not a manual/unpaid placeholder.
      payment_status: 'awaiting_payment',
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
    unit_price: +lineUnitPrice({
      base_price: item.product?.base_price,
      price_adjustment: item.variant?.price_adjustment,
    }).toFixed(2),
    quantity: item.quantity,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
  if (itemsErr) {
    await discardUnpaidOrder(order.id);
    return { error: itemsErr.message };
  }

  const transaction = await recordPaymentAttempt({
    orderId: order.id,
    provider: option.provider,
    amount: totals.total,
    currency: CURRENCY,
  });

  try {
    const session = await startPaymentSession({
      method: option.id,
      orderId: order.id,
      amount: { value: formatMoney(totals.total), currency: CURRENCY },
      siteUrl,
    });

    if (transaction) {
      await attachProviderSession({
        transactionId: transaction.id,
        providerOrderId: session.providerOrderId,
        status: session.status,
        mode: session.mode,
        redirectUrl: session.redirectUrl,
      });
    }

    revalidatePath('/account/orders');
    revalidatePath('/admin/orders');
    return { orderId: order.id, redirectUrl: session.redirectUrl };
  } catch (error) {
    const message = isPaymentProviderError(error)
      ? error.message
      : 'We could not start the payment. Please try again.';
    await markPaymentAttemptFailed({ transactionId: transaction?.id ?? null, reason: message });
    await discardUnpaidOrder(order.id);
    return { error: `${message} No order was created and your cart is unchanged.` };
  }
}

/**
 * True when the requested method can currently be paid for. Checked before any
 * row is written so an unconfigured environment cannot create orders at all.
 */
function resolveRequestedMethod(paymentMethod: string) {
  const normalised = paymentMethod === 'card' ? 'card' : 'paypal';
  try {
    return requirePaymentMethod(normalised);
  } catch (error) {
    return isPaymentProviderError(error)
      ? error.message
      : 'That payment method is unavailable right now.';
  }
}

/** Removes an order that never reached a provider, keeping the audit row. */
async function discardUnpaidOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('orders').delete().eq('id', orderId);
}
