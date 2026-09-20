/**
 * Broadcast probe: renders a sample mailing-list email through the REAL
 * broadcast pipeline (renderBroadcastHtml → sendBroadcast) and sends it to
 * one address, so the branded template can be eyeballed in an actual inbox
 * before sending to the list. Nothing is written to the database and no
 * subscriber is affected; the recipient is unsubscribed-URL-only.
 *
 * Run: NODE_OPTIONS="--require /tmp/shim-server-only.cjs" npx tsx scripts/broadcast-probe.ts [to@address]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sendBroadcast } from '../lib/email/transactional';

const TO = process.argv[2];
if (!TO || !TO.includes('@')) {
  console.error('usage: npx tsx scripts/broadcast-probe.ts <to@address>');
  process.exit(1);
}

const BODY = `<h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">New charms just landed ✨</h2>
<p style="margin:0 0 16px;color:#6b5b7b;font-size:14px;line-height:1.6;">
  A fresh batch of keepsake charms is now in the shop — in stainless steel or brass,
  small, medium, or large. Each one is hand-finished in our studio.
</p>
<div style="text-align:center;margin:24px 0;">
  <a href="https://lovingcharmz.com/shop"
     style="display:inline-block;background:#2d1b4e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">
    SHOP NEW CHARMS
  </a>
</div>`;

async function main() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lovingcharmz.com').replace(/\/+$/, '');
  const result = await sendBroadcast({
    recipients: [TO],
    subject: 'New charms just landed ✨ — Loving Charmz',
    htmlBody: BODY,
    unsubscribeUrl: `${site}/unsubscribe`,
  });

  if (result.errors.length > 0) {
    console.error('BATCH ERRORS:', result.errors.join(' | '));
    process.exit(1);
  }
  console.log(`✅ branded broadcast sent to ${TO} (sent=${result.sent})`);
}

main().catch((e) => {
  console.error('FAIL:', e?.message ?? e);
  process.exit(1);
});
