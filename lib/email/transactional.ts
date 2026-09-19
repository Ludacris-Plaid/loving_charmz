import 'server-only';
import { getResendClient, FROM_EMAIL, FROM_SUPPORT } from './client';
import { formatMoney } from '@/lib/checkout/pricing';

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
/*  Shared email shell                                                 */
/* ------------------------------------------------------------------ */

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#2d1b4e;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:#e8d5f5;letter-spacing:3px;font-weight:normal;">LOVING CHARMZ</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
${content}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f5f0f7;padding:24px 32px;text-align:center;font-size:12px;color:#6b5b7b;">
    <p style="margin:0 0 8px;">Loving Charmz &mdash; Symbolic keepsake jewelry</p>
    <p style="margin:0;">
      <a href="https://loving-charmz.vercel.app" style="color:#6b5b7b;">lovingcharmz.com</a>
      &nbsp;&middot;&nbsp;
      <a href="https://loving-charmz.vercel.app/account/orders" style="color:#6b5b7b;">My Orders</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

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
            <strong>${item.product_name}</strong>${item.variant_name ? ` — ${item.variant_name}` : ''}
            <br><span style="color:#6b5b7b;font-size:13px;">Qty: ${item.quantity} &times; ${formatMoney(item.unit_price)}</span>
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

  const html = shell(`
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
        ${addr.firstName} ${addr.lastName}<br>
        ${addr.address}<br>
        ${addr.city}, ${addr.state} ${addr.zip}<br>
        ${countryLabel}
      </p>
    </div>

    <p style="margin:0;color:#6b5b7b;font-size:14px;line-height:1.6;">
      We&rsquo;ll email you tracking information once your order ships. You can also check your order status anytime from
      <a href="https://loving-charmz.vercel.app/account/orders" style="color:#2d1b4e;">your account</a>.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
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
       <strong style="font-size:17px;letter-spacing:1px;">${params.trackingNumber}</strong></p>`
    : '';

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">Your order has shipped!</h2>
    <p style="margin:0 0 8px;color:#6b5b7b;font-size:14px;">Order #${shortId}</p>

    ${trackingHtml}

    <p style="margin:16px 0;color:#6b5b7b;font-size:14px;line-height:1.6;">
      Your keepsake is on its way. We hope you love it as much as we enjoyed making it.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="https://loving-charmz.vercel.app/account/orders"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">
        VIEW MY ORDER
      </a>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
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

  const html = shell(`
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

  // Send in batches of 50 (Resend free-tier limit)
  const batchSize = 50;
  for (let i = 0; i < params.recipients.length; i += batchSize) {
    const batch = params.recipients.slice(i, i + batchSize);
    const results = await resend.batch.send(
      batch.map((email) => ({
        from: FROM_SUPPORT,
        to: email,
        subject: params.subject,
        html: params.htmlBody + `
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;">
            You're receiving this because you signed up at <a href="https://lovingcharmz.vercel.app" style="color:#999;">lovingcharmz.com</a>.
            <br><a href="${params.unsubscribeUrl}?email=${encodeURIComponent(email)}" style="color:#999;">Unsubscribe</a>
          </div>
        `,
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

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">Welcome to Loving Charmz</h2>
    <p style="margin:0 0 16px;color:#6b5b7b;font-size:14px;line-height:1.6;">
      Thank you for joining our community. You&rsquo;ll be the first to know about new collections, exclusive offers, and the stories behind our keepsakes.
    </p>
    ${couponBlock}
    <div style="text-align:center;margin:24px 0;">
      <a href="https://loving-charmz.vercel.app/shop"
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
