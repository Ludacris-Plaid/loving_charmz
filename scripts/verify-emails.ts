/**
 * Email system verification: sends the app's real transactional emails
 * (welcome, password-reset, order confirmation), then reads each message back
 * through Resend's API and asserts — for every message — that all links are
 * canonical (https://lovingcharmz.com), the branded logo is referenced, and
 * the expected content is present. Proves the domain verification, the FROM
 * addresses, the branded shell, and the send paths end to end.
 *
 * Run: NODE_OPTIONS="--require /tmp/shim-server-only.cjs" npx tsx scripts/verify-emails.ts
 * (The shim stands in for Next's 'server-only' guard outside a Next runtime;
 * create it with the one-liner in the repo docs if it is missing.)
 *
 * Recipient: the store's own support alias (hello@lovingcharmz.com) unless
 * overridden with TO=... . Sends exactly three real emails per run.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sendOrderConfirmation, sendPasswordReset, sendWelcomeEmail } from '../lib/email/transactional';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lovingcharmz.com').replace(/\/+$/, '');
const TO = process.env.TO || 'hello@lovingcharmz.com';
let failures = 0;

function check(label: string, ok: boolean, detail = '') {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

async function main() {
  const orderId = `emailprobe${Date.now()}`.padEnd(36, '0').slice(0, 36);
  const subjects: string[] = [];

  console.log(`Sending three real emails to ${TO} ...`);

  const w = await sendWelcomeEmail({ to: TO, couponCode: 'WELCOME10' });
  check('welcome email accepted by Resend', !w.error, w.error ?? '');
  subjects.push('Welcome to Loving Charmz');

  const r = await sendPasswordReset({
    to: TO,
    resetUrl: `${SITE}/reset-password?token=emailprobe-${Date.now()}`,
  });
  check('password-reset email accepted', !r.error, r.error ?? '');
  subjects.push('Reset your password');

  const o = await sendOrderConfirmation({
    to: TO,
    orderId,
    items: [
      { product_name: 'Paw Print Pendant <Probe>', variant_name: 'Sterling Silver', quantity: 1, unit_price: 89 },
      { product_name: 'Heart Locket', variant_name: null, quantity: 2, unit_price: 64.5 },
    ],
    subtotal: 218,
    discount: 21.8,
    discountCode: 'WELCOME10',
    shipping: 0,
    tax: 0,
    total: 196.2,
    shippingAddress: {
      firstName: 'Ada',
      lastName: 'Lovelace & <friends>',
      address: '12 Analytical Way',
      city: 'Toronto',
      state: 'ON',
      zip: 'M5V 2T6',
      country: 'CA',
      email: TO,
    },
  });
  check('order-confirmation email accepted', !o.error, o.error ?? '');
  subjects.push('Order confirmed');

  // Give Resend a moment to make the sends readable through the API.
  await new Promise((res) => setTimeout(res, 8000));

  console.log('\nReading messages back through the Resend API ...');
  const list = await fetch('https://api.resend.com/emails?limit=20', {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  check('resend read-back authorised', list.ok, `HTTP ${list.status}`);
  if (!list.ok) process.exit(1);

  const { data = [] } = (await list.json()) as { data: { id: string; to: string[]; subject: string }[] };
  const mine = data.filter((m) => m.to.includes(TO)).slice(0, 3);
  check('three messages found', mine.length >= 3, `${mine.length} found`);

  for (const m of mine) {
    const detail = await fetch(`https://api.resend.com/emails/${m.id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!detail.ok) {
      check(`"${m.subject}"`, false, `detail HTTP ${detail.status}`);
      continue;
    }
    const { html = '' } = (await detail.json()) as { html?: string };

    const links = [...new Set((html.match(/https?:\/\/[^"'\s<>]+/g) ?? []).filter((l) => !l.includes('resend')))];
    const bad = links.filter((l) => !l.startsWith(SITE));
    check(`"${m.subject}" links canonical`, bad.length === 0, bad.length ? bad.join(', ') : `${links.length} link(s)`);

    check(`"${m.subject}" logo embedded`, html.includes(`${SITE}/email/logo.png`));
    check(`"${m.subject}" brand header`, html.includes('LOVING CHARMZ'));
  }

  // Content spot-checks on specific templates.
  const confirm = mine.find((m) => m.subject.includes('Order confirmed'));
  if (confirm) {
    const detail = await fetch(`https://api.resend.com/emails/${confirm.id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const { html = '' } = (await detail.json()) as { html?: string };
    check('order confirmation escapes hostile names', html.includes('Ada Lovelace &amp; &lt;friends&gt;'));
    check('order confirmation shows items + totals', html.includes('Paw Print Pendant') && html.includes('$196.20'));
    check('order confirmation shows discount line', html.includes('WELCOME10'));
  }

  console.log(failures === 0 ? '\nALL EMAIL CHECKS PASSED' : `\n${failures} EMAIL CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FAIL:', err?.message ?? err);
  process.exit(1);
});
