/**
 * One-off verification: prove that payment session URLs and transactional
 * email links carry the canonical domain (lovingcharmz.com) now that
 * NEXT_PUBLIC_SITE_URL is set in production — and locally here, mirroring it.
 *
 *   Part A  Square sandbox session: create a real hosted-checkout session via
 *           the app's adapter with a lovingcharmz.com return URL.
 *   Part B  Email links: send the app's real welcome + password-reset emails
 *           to the smoke-test inbox, read them back through Resend's API, and
 *           assert every http(s) link starts with https://lovingcharmz.com.
 *
 * Run: NODE_OPTIONS="--require /tmp/shim-server-only.cjs" npx tsx scripts/verify-new-domain-urls.ts
 * (The shim stands in for Next's 'server-only' guard outside a Next runtime.)
 *
 * Nothing is charged: the Square session is never completed; the emails are
 * informational sends to the project's own test address.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSquareConfig } from '../lib/payments/config';
import { createSquareSession } from '../lib/payments/square';
import { sendWelcomeEmail, sendPasswordReset } from '../lib/email/transactional';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lovingcharmz.com').replace(/\/+$/, '');
const TO = process.env.SMOKE_TEST_EMAIL || 'hello@lovingcharmz.com';
let failures = 0;

function check(label: string, ok: boolean, detail = '') {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

async function squareProbe() {
  console.log('\nA. Square sandbox session with new-domain return URL');
  const config = getSquareConfig();
  if (!config) {
    check('square config', false, 'SQUARE_* not configured — skipped');
    return;
  }
  const orderId = crypto.randomUUID();
  const session = await createSquareSession(config, {
    orderId,
    reference: 'LC-DOMAIN-PROBE',
    amount: { currency: 'CAD', value: '1.00' },
    returnUrl: `${SITE}/api/payments/square/return/${orderId}`,
    cancelUrl: `${SITE}/api/payments/square/cancel/${orderId}`,
  });
  check('session created', Boolean(session.redirectUrl), session.redirectUrl.slice(0, 60));
  const res = await fetch(session.redirectUrl, { redirect: 'manual' });
  check('hosted checkout reachable', res.status < 500, `HTTP ${res.status}`);
}

async function emailProbe() {
  console.log('\nB. Transactional email links');
  if (!TO || !process.env.RESEND_API_KEY) {
    check('email probe', false, 'SMOKE_TEST_EMAIL / RESEND_API_KEY missing — skipped');
    return;
  }
  const w = await sendWelcomeEmail({ to: TO, couponCode: 'DOMAIN-PROBE' });
  check('welcome email accepted by Resend', !w.error, w.error ?? '');

  const r = await sendPasswordReset({
    to: TO,
    resetUrl: `${SITE}/reset-password?token=domain-probe`,
  });
  check('password-reset email accepted', !r.error, r.error ?? '');

  // Read the two newest messages for this address back from Resend.
  await new Promise((res) => setTimeout(res, 6000));
  const list = await fetch('https://api.resend.com/emails?limit=20', {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!list.ok) {
    check('resend read-back', false, `list HTTP ${list.status}`);
    return;
  }
  const { data = [] } = (await list.json()) as { data: { id: string; to: string[] }[] };
  const mine = data.filter((m) => m.to.includes(TO)).slice(0, 2);
  check('resend read-back', mine.length >= 2, `${mine.length} message(s) found`);

  for (const m of mine) {
    const detail = await fetch(`https://api.resend.com/emails/${m.id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!detail.ok) {
      check(`links in ${m.id}`, false, `HTTP ${detail.status}`);
      continue;
    }
    const { html = '', subject = '' } = (await detail.json()) as { html?: string; subject?: string };
    const links = [...new Set((html.match(/https?:\/\/[^"'\s<>]+/g) ?? []).filter((l) => !l.includes('resend')))];
    const bad = links.filter((l) => !l.startsWith(SITE));
    check(`links in "${subject}"`, bad.length === 0, bad.length ? `non-canonical: ${bad.join(', ')}` : `${links.length} link(s), all canonical`);
  }
}

async function main() {
  await squareProbe();
  await emailProbe();

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FAIL:', err?.message ?? err);
  process.exit(1);
});
