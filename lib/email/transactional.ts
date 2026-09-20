import 'server-only';
import { headers } from 'next/headers';
import { getResendClient, FROM_EMAIL, FROM_SUPPORT } from './client';
import { formatMoney } from '@/lib/checkout/pricing';
import { SITE_URL } from '@/lib/site';

/**
 * Escapes user/provider-supplied text before it is interpolated into email
 * HTML. Email clients render HTML with scripts disabled, but unescaped angle
 * brackets still let a crafted product name or address rewrite the layout,
 * forge links, or hide content — so everything shopper-controlled goes
 * through this.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Absolute site origin for email links.
 *
 * Emails are read in a mail client, not on our origin, so request-derived
 * hosts (preview URLs, `localhost:3000`) are wrong more often than right;
 * fall back to the canonical production domain (`SITE_URL`) when
 * `NEXT_PUBLIC_SITE_URL` is unset and no request is in scope.
 */
async function siteOrigin(): Promise<string> {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  // headers() throws outside a request scope (scripts, some webhook runtimes);
  // that is fine, we just fall back to the production domain.
  try {
    const headerList = await headers();
    const host =
      (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '').trim();
    if (host) {
      const proto =
        headerList.get('x-forwarded-proto') ??
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // Not in a request scope — fall through to the production default.
  }
  return SITE_URL;
}

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

/**
 * Web font used for the "Charmz" wordmark on the site (.logo__charmz →
 * --font-handwriting) and for brand accents in email. The <link> in the shell
 * head loads it for Apple Mail, iOS Mail, and most modern clients; Outlook
 * (Word engine) ignores web fonts and falls back to the cursive stack.
 */
const BRAND_FONT_STACK = "'Caveat', 'Segoe Script', 'Bradley Hand', cursive";

async function shell(content: string): Promise<string> {
  const site = await siteOrigin();
  // Deep-linking signed-in shoppers to My Orders beats the homepage; guests
  // just see the sign-in wall first.
  const accountHref = `${site}/account/orders`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap" rel="stylesheet">
<!--[if mso]><style>body,.charmz-script{font-family:Georgia,serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">

  <!-- Header: logo mark + wordmark, both linking to the shop -->
  <tr><td style="background:#2d1b4e;padding:26px 32px 24px;text-align:center;">
    <a href="${site}/shop" style="text-decoration:none;"><img src="${site}/email/logo.png" width="72" height="72" alt="Loving Charmz logo" style="display:block;margin:0 auto 10px;border:0;"></a>
    <a href="${site}/shop" style="text-decoration:none;">
      <span style="display:block;margin:0 0 2px;font-size:11px;color:#e8d5f5;letter-spacing:5px;text-transform:uppercase;">Loving</span>
      <span class="charmz-script" style="display:block;margin:0;font-size:34px;line-height:1.1;color:#ffffff;font-family:${BRAND_FONT_STACK};font-weight:600;">Charmz</span>
    </a>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
${content}
  </td></tr>

  <!-- Footer: links + studio note -->
  <tr><td style="background:#f5f0f7;padding:24px 32px;text-align:center;font-size:12px;color:#6b5b7b;">
    <p style="margin:0 0 8px;">Loving Charmz &mdash; Symbolic keepsake jewelry</p>
    <p style="margin:0 0 8px;">
      <a href="${site}" style="color:#6b5b7b;">lovingcharmz.com</a>
      &nbsp;&middot;&nbsp;
      <a href="${site}/shop" style="color:#6b5b7b;">Shop</a>
      &nbsp;&middot;&nbsp;
      <a href="${accountHref}" style="color:#6b5b7b;">My Orders</a>
      &nbsp;&middot;&nbsp;
      <a href="${site}/faq" style="color:#6b5b7b;">FAQ</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:hello@lovingcharmz.com" style="color:#6b5b7b;">Contact</a>
    </p>
    <p style="margin:0;color:#9b8fae;">Sent with care from the Loving Charmz studio.</p>
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

  // Send in batches of 50 (Resend free-tier limit)
  const batchSize = 50;
  for (let i = 0; i < params.recipients.length; i += batchSize) {
    const batch = params.recipients.slice(i, i + batchSize);
    const site = await siteOrigin();
    const results = await resend.batch.send(
      batch.map((email) => ({
        from: FROM_SUPPORT,
        to: email,
        subject: params.subject,
        html: params.htmlBody + `
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;">
            You're receiving this because you signed up at <a href="${site}" style="color:#999;">lovingcharmz.com</a>.
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
