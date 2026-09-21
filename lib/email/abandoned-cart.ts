import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient, FROM_SUPPORT } from './client';
import { shell, escapeHtml } from './template';
import { formatMoney } from '@/lib/checkout/pricing';
import { siteOrigin } from './template';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AbandonedCart = {
  cart_id: string;
  email: string;
  user_id: string;
  cart_updated_at: string;
  items: {
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    image_url: string | null;
  }[];
  cart_total: number;
};

/* ------------------------------------------------------------------ */
/*  Detection                                                          */
/* ------------------------------------------------------------------ */

/**
 * Finds member carts (user_id IS NOT NULL) that:
 *  1. Have at least one item
 *  2. Were last updated > 1 hour ago (the shopper walked away)
 *  3. Have no order placed in the last 24 hours
 *  4. Haven't received an abandoned-cart email in the last 24 hours
 *  5. The user hasn't unsubscribed from abandoned cart emails
 *
 * Guest carts are excluded because they have no email address.
 * We could add email capture to the cart page later to include them.
 */
export async function findAbandonedCarts(): Promise<AbandonedCart[]> {
  const admin = createAdminClient();

  // Step 1: Find carts with items that are > 1 hour old
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: cartsWithItems, error: cartErr } = await admin
    .from('carts')
    .select(`
      id,
      user_id,
      updated_at,
      cart_items (
        product_id,
        variant_id,
        quantity,
        product:products ( name, base_price ),
        variant:product_variants ( name, price_adjustment )
      )
    `)
    .not('user_id', 'is', null)
    .lt('updated_at', oneHourAgo)
    .gt('updated_at', oneDayAgo);

  if (cartErr || !cartsWithItems || cartsWithItems.length === 0) return [];

  // Filter to carts that actually have items
  const activeCarts = cartsWithItems.filter(
    (c: any) => c.cart_items && c.cart_items.length > 0,
  );

  if (activeCarts.length === 0) return [];

  // Step 2: Exclude carts that placed an order in the last 24h
  const cartIds = activeCarts.map((c: any) => c.id);
  const { data: recentOrders } = await admin
    .from('orders')
    .select('user_id')
    .in('user_id', activeCarts.map((c: any) => c.user_id))
    .gte('created_at', oneDayAgo);

  const usersWithOrders = new Set(
    (recentOrders || []).map((o: any) => o.user_id),
  );

  const cartsWithoutOrders = activeCarts.filter(
    (c: any) => !usersWithOrders.has(c.user_id),
  );

  if (cartsWithoutOrders.length === 0) return [];

  // Step 3: Exclude carts that already got an email in the last 24h
  const { data: recentEmails } = await admin
    .from('abandoned_cart_emails')
    .select('cart_id')
    .in('cart_id', cartsWithoutOrders.map((c: any) => c.id))
    .gte('sent_at', oneDayAgo);

  const emailedCartIds = new Set(
    (recentEmails || []).map((e: any) => e.cart_id),
  );

  const needEmail = cartsWithoutOrders.filter(
    (c: any) => !emailedCartIds.has(c.id),
  );

  if (needEmail.length === 0) return [];

  // Step 4: Get emails from auth.users, excluding unsubscribed
  const userIds = needEmail.map((c: any) => c.user_id);

  // Check for unsubscribed users
  const { data: unsubscribed } = await admin
    .from('abandoned_cart_emails')
    .select('email')
    .not('unsubscribed_at', 'is', null);

  const unsubEmails = new Set(
    (unsubscribed || []).map((u: any) => u.email),
  );

  // Get user emails from auth via the admin client's RPC or profiles join.
  // Since profiles don't have email, we use a raw query approach via the
  // Supabase admin client's ability to query auth.users.
  const { data: userData } = await admin.auth.admin.listUsers();
  const emailByUserId = new Map<string, string>();
  for (const u of userData?.users || []) {
    if (u.email) emailByUserId.set(u.id, u.email);
  }

  // Assemble final list
  const result: AbandonedCart[] = [];

  for (const cart of needEmail) {
    const email = emailByUserId.get(cart.user_id);
    if (!email || unsubEmails.has(email)) continue;

    const items = (cart.cart_items || []).map((item: any) => {
      const basePrice = Number(item.product?.base_price || 0);
      const adjustment = Number(item.variant?.price_adjustment || 0);
      return {
        product_name: item.product?.name || 'Item',
        variant_name: item.variant?.name || null,
        quantity: Number(item.quantity || 1),
        unit_price: basePrice + adjustment,
        image_url: null,
      };
    });

    const cart_total = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    result.push({
      cart_id: cart.id,
      email,
      user_id: cart.user_id,
      cart_updated_at: cart.updated_at,
      items,
      cart_total,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Email template                                                     */
/* ------------------------------------------------------------------ */

async function renderAbandonedCartEmail(cart: AbandonedCart, unsubscribeToken: string): Promise<string> {
  const site = await siteOrigin();
  const unsubUrl = `${site}/api/abandoned-cart/unsubscribe?token=${unsubscribeToken}`;

  const itemRows = cart.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ecf4;">
          <strong style="color:#2d1b4e;">${escapeHtml(item.product_name)}</strong>${
            item.variant_name ? `<br><span style="color:#6b5b7b;font-size:13px;">${escapeHtml(item.variant_name)}</span>` : ''
          }
          <br><span style="color:#6b5b7b;font-size:13px;">Qty: ${item.quantity} &times; ${formatMoney(item.unit_price)}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0ecf4;text-align:right;font-weight:600;color:#2d1b4e;">
          ${formatMoney(item.unit_price * item.quantity)}
        </td>
      </tr>`,
    )
    .join('\n');

  return shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">You left something behind</h2>
    <p style="margin:0 0 24px;color:#6b5b7b;font-size:14px;line-height:1.6;">
      Your cart is waiting for you. These keepsakes were saved just for you &mdash; but stock is limited and we can&rsquo;t hold them forever.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows}
    </table>

    <div style="background:#f5f0f7;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b5b7b;text-transform:uppercase;letter-spacing:1px;">Cart total</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#2d1b4e;">${formatMoney(cart.cart_total)}</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${site}/cart"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:15px;letter-spacing:1px;">
        COMPLETE YOUR ORDER
      </a>
    </div>

    <p style="margin:0 0 20px;color:#6b5b7b;font-size:13px;line-height:1.6;text-align:center;">
      Free shipping on orders over $50 CAD &middot; Handcrafted to order &middot; Lifetime quality guarantee
    </p>

    <p style="margin:0;font-size:11px;color:#9b8fae;text-align:center;">
      You&rsquo;re receiving this because you started a cart at <a href="${site}" style="color:#9b8fae;">lovingcharmz.com</a>.
      <br><a href="${unsubUrl}" style="color:#9b8fae;">Unsubscribe from cart reminders</a>
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Send + record                                                      */
/* ------------------------------------------------------------------ */

export async function sendAbandonedCartEmails(): Promise<{
  found: number;
  sent: number;
  errors: string[];
}> {
  const carts = await findAbandonedCarts();
  if (carts.length === 0) return { found: 0, sent: 0, errors: [] };

  const admin = createAdminClient();
  const resend = getResendClient();
  const errors: string[] = [];
  let sent = 0;

  for (const cart of carts) {
    try {
      // Insert first to get the unsubscribe token
      const { data: record, error: insertErr } = await admin
        .from('abandoned_cart_emails')
        .insert({
          cart_id: cart.cart_id,
          email: cart.email,
        })
        .select('unsubscribe_token')
        .single();

      if (insertErr || !record) {
        errors.push(`${cart.email}: ${insertErr?.message || 'Failed to record'}`);
        continue;
      }

      const html = await renderAbandonedCartEmail(cart, record.unsubscribe_token);
      const { error } = await resend.emails.send({
        from: FROM_SUPPORT,
        to: cart.email,
        subject: 'Your cart is waiting — Loving Charmz',
        html,
      });

      if (error) {
        errors.push(`${cart.email}: ${error.message}`);
        continue;
      }

      sent++;
    } catch (err: any) {
      errors.push(`${cart.email}: ${err.message || 'Unknown error'}`);
    }
  }

  return { found: carts.length, sent, errors };
}
