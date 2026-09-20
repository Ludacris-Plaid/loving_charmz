import 'server-only';
import { getResendClient, FROM_EMAIL, FROM_SUPPORT } from './client';
import { formatMoney } from '@/lib/checkout/pricing';
import { shell, siteOrigin, renderBroadcastHtml, escapeHtml } from './template';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrderItem = {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
};

type ShippingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
};

/* ------------------------------------------------------------------ */
/*  Order confirmation                                                 */
/* ------------------------------------------------------------------ */

export async function sendOrderConfirmation(params: {
  to: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: ShippingAddress;
}): Promise<{ error?: string }> {
  const resend = getResendClient();
  const shortId = params.orderId.slice(0, 8).toUpperCase();

  const itemRows = params.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(item.product_name)}</strong>${item.variant_name ? ` — ${escapeHtml(item.variant_name)}` : ''}
            <br><span style="color:#6b5b7b;font-size:13px;">Qty: ${Number(item.quantity) || 0} &times; ${formatMoney(item.unit_price)}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">
            ${formatMoney(item.unit_price * item.quantity)}
          </td>
        </tr>`
    )
    .join('\n');

  const addr = params.shippingAddress;
  const countryLabel = addr.country === 'CA' ? 'Canada' : 'United States';

  const summaryRows = [
    params.discount > 0
      ? `<tr><td style="padding:4px 0;color:#6b5b7b;">Discount${params.discountCode ? ` (${params.discountCode})` : ''}</td><td style="padding:4px 0;text-align:right;color:#6b5b7b;">−${formatMoney(params.discount)}</td></tr>`
      : '',
    params.shipping === 0
      ? `<tr><td style="padding:4px 0;">Shipping</td><td style="padding:4px 0;text-align:right;">FREE</td></tr>`
      : `<tr><td style="padding:4px 0;">Shipping</td><td style="padding:4px 0;text-align:right;">${formatMoney(params.shipping)}</td></tr>`,
    `<tr><td style="padding:4px 0;">Tax</td><td style="padding:4px 0;text-align:right;">${formatMoney(params.tax)}</td></tr>`,
    `<tr><td style="padding:8px 0;font-weight:700;font-size:16px;border-top:2px solid #2d1b4e;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;border-top:2px solid #2d1b4e;">${formatMoney(params.total)}</td></tr>`,
  ].filter(Boolean).join('\n');

  const html = await shell(`
    <h2 style="margin:0 0 4px;font-size:24px;color:#2d1b4e;">Order confirmed</h2>
    <p style="margin:0 0 24px;color:#6b5b7b;font-size:14px;">Order #${shortId}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${summaryRows}
    </table>

    <div style="background:#f5f0f7;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-weight:600;color:#2d1b4e;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Shipping to</p>
      <p style="margin:0;font-size:15px;line-height:1.6;">
        ${escapeHtml(`${addr.firstName} ${addr.lastName}`)}<br>
        ${escapeHtml(addr.address)}<br>
        ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.zip)}<br>
        ${countryLabel}
      </p>
    </div>

    <p style="margin:0;color:#6b5b7b;font-size:14px;line-height:1.6;">
      We&rsquo;ll email you tracking information once your order ships. You can also check your order status anytime from
      <a href="${await siteOrigin()}/account/orders" style="color:#2d1b4e;">your account</a>.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: FROM_SUPPORT,
    to: params.to,
    subject: `Order #${shortId} confirmed — Loving Charmz`,
    html,
  });

  return error ? { error: error.message } : {};
}

/* ------------------------------------------------------------------ */
/*  Shipping notification                                              */
/* ------------------------------------------------------------------ */

export async function sendShippingNotification(params: {
  to: string;
  orderId: string;
  trackingNumber?: string;
}): Promise<{ error?: string }> {
  const resend = getResendClient();
  const shortId = params.orderId.slice(0, 8).toUpperCase();

  const trackingHtml = params.trackingNumber
    ? `<p style="margin:16px 0;font-size:15px;">Your tracking number:<br>
       <strong style="font-size:17px;letter-spacing:1px;">${escapeHtml(params.trackingNumber)}</strong></p>`
    : '';

  const html = await shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">Your order has shipped!</h2>
    <p style="margin:0 0 8px;color:#6b5b7b;font-size:14px;">Order #${shortId}</p>

    ${trackingHtml}

    <p style="margin:16px 0;color:#6b5b7b;font-size:14px;line-height:1.6;">
      Your keepsake is on its way. We hope you love it as much as we enjoyed making it.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${await siteOrigin()}/account/orders"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">
        VIEW MY ORDER
      </a>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: FROM_SUPPORT,
    to: params.to,
    subject: `Order #${shortId} has shipped — Loving Charmz`,
    html,
  });

  return error ? { error: error.message } : {};
}

/* ------------------------------------------------------------------ */
/*  Password reset                                                     */
/* ------------------------------------------------------------------ */

export async function sendPasswordReset(params: {
  to: string;
  resetUrl: string;
}): Promise<{ error?: string }> {
  const resend = getResendClient();

  const html = await shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">Reset your password</h2>
    <p style="margin:0 0 20px;color:#6b5b7b;font-size:14px;line-height:1.6;">
      We received a request to reset the password for your Loving Charmz account.
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${params.resetUrl}"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;letter-spacing:1px;">
        RESET PASSWORD
      </a>
    </div>

    <p style="margin:0;color:#6b5b7b;font-size:13px;line-height:1.6;">
      This link expires in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your password will stay the same.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_SUPPORT,
    to: params.to,
    subject: 'Reset your password — Loving Charmz',
    html,
  });

  return error ? { error: error.message } : {};
}

/* ------------------------------------------------------------------ */
/*  Mailing-list broadcast (admin composer)                            */
/* ------------------------------------------------------------------ */

export async function sendBroadcast(params: {
  recipients: string[];
  subject: string;
  htmlBody: string;
  unsubscribeUrl: string;
}): Promise<{ sent: number; errors: string[] }> {
  const resend = getResendClient();
  const errors: string[] = [];
  let sent = 0;

  // One branded render for the whole campaign — every recipient gets the
  // identical shell (logo header, wordmark, footer) the transactional
  // emails use. `renderBroadcastHtml` leaves `%%RECIPIENT_EMAIL%%` in place
  // for the per-recipient unsubscribe link below.
  const site = await siteOrigin();
  const branded = await renderBroadcastHtml({
    siteUrl: site,
    bodyHtml: params.htmlBody,
    unsubscribeUrl: params.unsubscribeUrl,
  });

  // Send in batches of 50 (Resend free-tier limit)
  const batchSize = 50;
  for (let i = 0; i < params.recipients.length; i += batchSize) {
    const batch = params.recipients.slice(i, i + batchSize);
    const results = await resend.batch.send(
      batch.map((email) => ({
        from: FROM_SUPPORT,
        to: email,
        subject: params.subject,
        html: branded.split('%%RECIPIENT_EMAIL%%').join(encodeURIComponent(email)),
      }))
    );

    if (results.error) {
      errors.push(results.error.message);
    } else {
      sent += batch.length;
    }
  }

  return { sent, errors };
}

/* ------------------------------------------------------------------ */
/*  Subscriber welcome email                                           */
/* ------------------------------------------------------------------ */

export async function sendWelcomeEmail(params: {
  to: string;
  couponCode?: string;
}): Promise<{ error?: string }> {
  const resend = getResendClient();

  const couponBlock = params.couponCode
    ? `<div style="background:#f5f0f7;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b5b7b;text-transform:uppercase;letter-spacing:1px;">Your welcome gift</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:#2d1b4e;letter-spacing:3px;">${params.couponCode}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#6b5b7b;">10% off your first order</p>
      </div>`
    : '';

  const html = await shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">Welcome to Loving Charmz</h2>
    <p style="margin:0 0 16px;color:#6b5b7b;font-size:14px;line-height:1.6;">
      Thank you for joining our community. You&rsquo;ll be the first to know about new collections, exclusive offers, and the stories behind our keepsakes.
    </p>
    ${couponBlock}
    <div style="text-align:center;margin:24px 0;">
      <a href="${await siteOrigin()}/shop"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">
        EXPLORE THE SHOP
      </a>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: FROM_SUPPORT,
    to: params.to,
    subject: 'Welcome to Loving Charmz 💜',
    html,
  });

  return error ? { error: error.message } : {};
}
