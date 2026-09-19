'use server';

import { randomUUID } from 'node:crypto';
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
import { readPaymentEnv } from '@/lib/payments/config';

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

export type SquarePaymentResult = {
  success: boolean;
  orderId?: string;
  error?: string;
  transactionId?: string;
};

/**
 * Processes a Square payment using the Web Payments SDK token.
 * This is used for the embedded card form (no redirect needed).
 */
export async function processSquarePayment(params: {
  sourceId: string;
  orderId: string;
  amount: number;
  currency: string;
}): Promise<SquarePaymentResult> {
  const { sourceId, orderId, amount, currency } = params;

  // Verify the order exists and belongs to the current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Please sign in to complete payment.' };
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, payment_status, total')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orderErr || !order) {
    return { success: false, error: 'Order not found.' };
  }

  if (order.payment_status === 'paid') {
    return { success: true, orderId: order.id };
  }

  // Initialize Square SDK
  const accessToken = readPaymentEnv('SQUARE_ACCESS_TOKEN');
  const locationId = readPaymentEnv('SQUARE_LOCATION_ID');
  const mode = readPaymentEnv('SQUARE_MODE') === 'live' ? 'production' : 'sandbox';

  if (!accessToken || !locationId) {
    return { success: false, error: 'Payment processing is not configured.' };
  }

  try {
    // Dynamic import to avoid client-side bundling
    const { SquareClient, SquareEnvironment, Currency } = await import('square');
    
    const client = new SquareClient({
      token: accessToken,
      environment: mode === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    const idempotencyKey = randomUUID();
    const amountMinor = Math.round(amount * 100);

    // Cast currency to the expected type
    const currencyCode = currency as any;

    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountMinor),
        currency: currencyCode,
      },
      locationId,
      note: `Order ${orderId}`,
    });

    const payment = response.payment;
    if (payment?.status === 'COMPLETED') {
      // Record the successful payment
      const admin = createAdminClient();
      
      await admin.from('payment_transactions').insert({
        order_id: orderId,
        provider: 'square',
        provider_transaction_id: payment.id,
        amount: amount,
        currency: currency,
        status: 'completed',
        provider_data: payment,
      });

      // Update order status
      await admin.from('orders').update({
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      // Clear the cart
      const { data: orderData } = await admin
        .from('orders')
        .select('user_id, shipping_address, subtotal, shipping_cost, tax, discount, discount_code, total')
        .eq('id', orderId)
        .single();

      if (orderData?.user_id) {
        const { data: cart } = await admin
          .from('carts')
          .select('id')
          .eq('user_id', orderData.user_id)
          .maybeSingle();

        if (cart) {
          await admin.from('cart_items').delete().eq('cart_id', cart.id);
        }
      }

      // Send order confirmation email
      try {
        const { sendOrderConfirmation } = await import('@/lib/email/transactional');
        const { data: orderItems } = await admin
          .from('order_items')
          .select('product_name, variant_name, quantity, unit_price')
          .eq('order_id', orderId);

        const shippingAddr = orderData?.shipping_address as any;
        if (orderItems && shippingAddr?.email) {
          await sendOrderConfirmation({
            to: shippingAddr.email,
            orderId,
            items: orderItems,
            subtotal: Number(orderData?.subtotal ?? 0),
            discount: Number(orderData?.discount ?? 0),
            discountCode: orderData?.discount_code ?? null,
            shipping: Number(orderData?.shipping_cost ?? 0),
            tax: Number(orderData?.tax ?? 0),
            total: Number(orderData?.total ?? 0),
            shippingAddress: shippingAddr,
          });
        }
      } catch (emailErr) {
        console.error('[processSquarePayment] Failed to send confirmation email:', emailErr);
        // Don't fail the order over email
      }

      revalidatePath('/account/orders');
      revalidatePath('/admin/orders');
      revalidatePath('/admin/analytics');

      return { success: true, orderId: order.id, transactionId: payment.id ?? undefined };
    } else {
      return { success: false, error: 'Payment was not completed. Please try again.' };
    }
  } catch (error: any) {
    console.error('[processSquarePayment]', error);
    const message = error?.body?.errors?.[0]?.detail || error?.message || 'Payment processing failed.';
    return { success: false, error: message };
  }
}
