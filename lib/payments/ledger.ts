import 'server-only';

import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PaymentProviderId } from './types';

/**
 * The payment ledger.
 *
 * Orders and `payment_transactions` are written with the service-role client:
 * `payment_transactions` grants members read-only access by design, and a
 * shopper must never be able to write their own "paid" state.
 *
 * Every transition here is written to be idempotent — provider webhooks retry,
 * and shoppers refresh return URLs.
 */

export type PaymentTransactionRecord = {
  id: string;
  order_id: string | null;
  provider: string;
  provider_transaction_id: string | null;
  amount: number;
  currency: string;
  status: string;
  provider_data: Record<string, unknown> | null;
  created_at: string;
};

export type LedgerResult = { ok: true; alreadySettled?: boolean } | { ok: false; error: string };

export async function recordPaymentAttempt(params: {
  orderId: string;
  provider: PaymentProviderId;
  amount: number;
  currency: string;
}): Promise<PaymentTransactionRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payment_transactions')
    .insert({
      order_id: params.orderId,
      provider: params.provider,
      amount: params.amount,
      currency: params.currency,
      status: 'created',
      provider_data: { stage: 'session_created' },
    })
    .select('*')
    .single();

  if (error || !data) return null;
  return data as PaymentTransactionRecord;
}

/** Stores the provider's own id for the attempt created by `recordPaymentAttempt`. */
export async function attachProviderSession(params: {
  transactionId: string;
  providerOrderId: string;
  status: string;
  mode: string;
  redirectUrl: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('payment_transactions')
    .update({
      provider_transaction_id: params.providerOrderId,
      status: 'requires_action',
      provider_data: {
        stage: 'awaiting_shopper',
        mode: params.mode,
        provider_status: params.status,
        redirect_url: params.redirectUrl,
      },
    })
    .eq('id', params.transactionId);
}

export async function markPaymentAttemptFailed(params: {
  transactionId: string | null;
  reason: string;
}): Promise<void> {
  if (!params.transactionId) return;
  const admin = createAdminClient();
  await admin
    .from('payment_transactions')
    .update({ status: 'failed', provider_data: { stage: 'failed', reason: params.reason } })
    .eq('id', params.transactionId);
}

export async function findLatestTransaction(
  orderId: string,
  provider: PaymentProviderId,
): Promise<PaymentTransactionRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_transactions')
    .select('*')
    .eq('order_id', orderId)
    .eq('provider', provider)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PaymentTransactionRecord | null) ?? null;
}

/** Resolves one of our orders from a provider order id (used by webhooks). */
export async function findOrderIdByProviderOrderId(
  provider: PaymentProviderId,
  providerOrderId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_transactions')
    .select('order_id')
    .eq('provider', provider)
    .eq('provider_transaction_id', providerOrderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.order_id as string | null) ?? null;
}

/** Resolves one of our orders from a capture/payment id stored in provider_data. */
export async function findOrderIdByProviderPaymentId(
  provider: PaymentProviderId,
  paymentId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_transactions')
    .select('order_id')
    .eq('provider', provider)
    .contains('provider_data', { payment_id: paymentId })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.order_id as string | null) ?? null;
}

/**
 * Marks an order paid.
 *
 * Settlement also carries two side effects — discount usage counting and stock
 * decrement — applied exactly once via the `order_settlements` guard row in
 * `apply_order_settlement_effects` (migration 00011). Webhooks, return routes
 * and retries may all call this for the same order; the side effects run only
 * for the first caller.
 */
export async function markPaymentConfirmed(params: {
  orderId: string;
  provider: PaymentProviderId;
  providerTransactionId?: string | null;
  paymentId?: string | null;
  payerEmail?: string | null;
  raw?: unknown;
}): Promise<LedgerResult> {
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, payment_status, status')
    .eq('id', params.orderId)
    .maybeSingle();

  if (orderError || !order) return { ok: false, error: orderError?.message || 'Order not found.' };
  if (order.payment_status === 'paid') return { ok: true, alreadySettled: true };

  const now = new Date().toISOString();
  const nextOrderStatus = order.status === 'pending' ? 'processing' : order.status;

  const { error: updateError } = await admin
    .from('orders')
    .update({ payment_status: 'paid', status: nextOrderStatus, updated_at: now })
    .eq('id', params.orderId);
  if (updateError) return { ok: false, error: updateError.message };

  await applySettlementEffects(params.orderId);

  // Sold-out alerts: settlement decrements stock; if a variant just hit zero,
  // email the owner. Runs after the response is sent (never blocks or fails
  // the shopper's payment return).
  after(async () => {
    try {
      const { flushStockAlerts } = await import('@/lib/email/stock-alerts');
      await flushStockAlerts();
    } catch (error) {
      console.error('[ledger] stock alert flush failed', error);
    }
  });

  const transaction = await findLatestTransaction(params.orderId, params.provider);
  if (transaction) {
    const providerData: Record<string, unknown> = {
      ...(transaction.provider_data ?? {}),
      stage: 'settled',
      payment_id: params.paymentId ?? transaction.provider_data?.payment_id ?? null,
      payer_email: params.payerEmail ?? null,
      settled_at: now,
    };
    await admin
      .from('payment_transactions')
      .update({
        status: 'captured',
        provider_transaction_id: transaction.provider_transaction_id ?? params.providerTransactionId ?? null,
        provider_data: providerData,
      })
      .eq('id', transaction.id);
  }

  await clearCartForUser(order.user_id as string | null);
  return { ok: true };
}

export async function markPaymentFailed(params: {
  orderId: string;
  provider: PaymentProviderId;
  reason: string;
}): Promise<LedgerResult> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from('orders')
    .select('id, payment_status')
    .eq('id', params.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, error: error?.message || 'Order not found.' };
  if (order.payment_status === 'paid') return { ok: true, alreadySettled: true };

  await admin
    .from('orders')
    .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', params.orderId);

  const transaction = await findLatestTransaction(params.orderId, params.provider);
  if (transaction) {
    await admin
      .from('payment_transactions')
      .update({
        status: 'failed',
        provider_data: { ...(transaction.provider_data ?? {}), stage: 'failed', reason: params.reason },
      })
      .eq('id', transaction.id);
  }

  return { ok: true };
}

export async function markPaymentRefunded(params: {
  orderId: string;
  provider: PaymentProviderId;
  reason: string;
}): Promise<LedgerResult> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from('orders')
    .select('id')
    .eq('id', params.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, error: error?.message || 'Order not found.' };

  await admin
    .from('orders')
    .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', params.orderId);

  const transaction = await findLatestTransaction(params.orderId, params.provider);
  if (transaction) {
    await admin
      .from('payment_transactions')
      .update({
        status: 'refunded',
        provider_data: { ...(transaction.provider_data ?? {}), stage: 'refunded', reason: params.reason },
      })
      .eq('id', transaction.id);
  }

  return { ok: true };
}

/**
 * Applies the once-per-order settlement side effects (discount usage, stock).
 * Failure is logged but does not fail the settlement: the captured payment is
 * the source of truth, and the effects can be reconciled afterwards.
 */
async function applySettlementEffects(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('apply_order_settlement_effects', { p_order_id: orderId });
  if (error) {
    console.error(`[ledger] settlement effects for order ${orderId} failed`, error.message);
  } else if (data === false) {
    console.info(`[ledger] settlement effects for order ${orderId} already applied`);
  }
}

/**
 * Records a completed direct card charge (embedded Square flow) in the ledger,
 * then settles the order through the same path as every other provider.
 *
 * `amount` and `currency` must be the server-side order totals — the action
 * that calls this is responsible for never trusting client-supplied amounts.
 */
export async function recordDirectCharge(params: {
  orderId: string;
  provider: PaymentProviderId;
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  raw: unknown;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('user_id')
    .eq('id', params.orderId)
    .maybeSingle();

  await admin.from('payment_transactions').insert({
    order_id: params.orderId,
    provider: params.provider,
    provider_transaction_id: params.providerTransactionId,
    amount: params.amount,
    currency: params.currency,
    status: 'captured',
    provider_data: {
      stage: 'settled',
      payment_id: params.providerTransactionId,
      settled_at: new Date().toISOString(),
      raw: params.raw,
    },
  });

  const settled = await markPaymentConfirmed({
    orderId: params.orderId,
    provider: params.provider,
    providerTransactionId: params.providerTransactionId,
    paymentId: params.providerTransactionId,
    raw: params.raw,
  });

  if (!settled.ok) {
    console.error(`[ledger] direct charge settle failed for order ${params.orderId}`, settled.error);
  }

  // Send the confirmation email. The cart was already cleared by
  // markPaymentConfirmed; nothing else may depend on the caller.
  await sendDirectChargeConfirmation({
    orderId: params.orderId,
    userId: (order?.user_id as string | null) ?? null,
  });
}

/** Best-effort confirmation email for a settled direct charge. */
async function sendDirectChargeConfirmation(params: {
  orderId: string;
  userId: string | null;
}): Promise<void> {
  try {
    const { sendOrderConfirmation } = await import('@/lib/email/transactional');
    const admin = createAdminClient();

    const [{ data: order }, { data: items }] = await Promise.all([
      admin
        .from('orders')
        .select('shipping_address, subtotal, shipping_cost, tax, discount, discount_code, total')
        .eq('id', params.orderId)
        .single(),
      admin
        .from('order_items')
        .select('product_name, variant_name, quantity, unit_price')
        .eq('order_id', params.orderId),
    ]);

    const shippingAddress = order?.shipping_address as { email?: string } | null;
    if (!order || !items || items.length === 0 || !shippingAddress?.email) return;

    await sendOrderConfirmation({
      to: shippingAddress.email,
      orderId: params.orderId,
      items: items as any,
      subtotal: Number(order.subtotal ?? 0),
      discount: Number(order.discount ?? 0),
      discountCode: (order.discount_code as string | null) ?? null,
      shipping: Number(order.shipping_cost ?? 0),
      tax: Number(order.tax ?? 0),
      total: Number(order.total ?? 0),
      shippingAddress: shippingAddress as any,
    });
  } catch (error) {
    console.error('[ledger] confirmation email failed', error);
  }
}

/**
 * Empties the shopper's cart. Only called once money is actually captured, so an
 * abandoned or failed payment leaves the cart intact.
 */
export async function clearCartForUser(userId: string | null): Promise<void> {
  if (!userId) return;
  const admin = createAdminClient();

  const { data: cart } = await admin.from('carts').select('id').eq('user_id', userId).maybeSingle();
  if (!cart?.id) return;
  await admin.from('cart_items').delete().eq('cart_id', cart.id);
}
