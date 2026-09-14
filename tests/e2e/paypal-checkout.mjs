/**
 * Full checkout walkthrough against a live site, ending in a captured PayPal payment.
 *
 * Everything up to the PayPal redirect is this app's own code; after that the
 * script is a *shopper*: it signs in to the PayPal sandbox with a test buyer
 * account, approves, and comes back. PayPal has no server-side "approve" API
 * (the two documented ways are a browser redirect or the JS SDK buttons), so a
 * real browser is the only honest way to prove the capture path.
 *
 * Usage:
 *   node tests/e2e/paypal-checkout.mjs --url=https://loving-charmz.vercel.app \
 *     --email=... --password=... --buyer-email=... --buyer-password=...
 *
 * Flags:
 *   --url          Base URL of the site under test (default http://localhost:3111)
 *   --product      Product slug to buy; defaults to the first one on /shop
 *   --email        Shopper account email; created at /signup when it does not exist
 *   --password     Shopper account password
 *   --buyer-email  PayPal *sandbox buyer* (personal) account email
 *   --buyer-password  PayPal sandbox buyer password
 *   --manual       Open a visible browser and let a human do the PayPal part
 *   --headful      Open a visible browser (automation still drives PayPal)
 *   --keep-open    Leave the browser open at the end for inspection
 *   --artifacts    Directory for screenshots (default tests/e2e/.artifacts/paypal)
 *
 * Credentials are read from the flags or from the environment
 * (E2E_EMAIL, E2E_PASSWORD, PAYPAL_SANDBOX_BUYER_EMAIL,
 * PAYPAL_SANDBOX_BUYER_PASSWORD), and .env.local is loaded for the Supabase
 * service key used by the final database assertion.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const FLAGS = parseFlags(process.argv.slice(2));
loadEnvFile('.env.local');

const BASE = (FLAGS.url || process.env.E2E_BASE_URL || 'http://localhost:3111').replace(/\/+$/, '');
const EMAIL = FLAGS.email || process.env.E2E_EMAIL || '';
const PASSWORD = FLAGS.password || process.env.E2E_PASSWORD || '';
const BUYER_EMAIL = FLAGS['buyer-email'] || process.env.PAYPAL_SANDBOX_BUYER_EMAIL || '';
const BUYER_PASSWORD = FLAGS['buyer-password'] || process.env.PAYPAL_SANDBOX_BUYER_PASSWORD || '';
const MANUAL = Boolean(FLAGS.manual);
const HEADFUL = Boolean(FLAGS.headful || FLAGS.manual || FLAGS['keep-open']);
const ARTIFACTS = FLAGS.artifacts || path.join('tests', 'e2e', '.artifacts', 'paypal');
const PRODUCT = FLAGS.product || '';
const PAYPAL_HOST = /(^|\.)paypal\.com$/i;

const results = [];
let shotIndex = 0;

function record(name, ok, note = '') {
  results.push({ name, ok, note });
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name.padEnd(42)} ${note}`);
}

function info(message) {
  console.log(`         ${message}`);
}

async function main() {
  if (!EMAIL || !PASSWORD) fatal('Missing shopper credentials: pass --email/--password or set E2E_EMAIL/E2E_PASSWORD.');
  if (!MANUAL && (!BUYER_EMAIL || !BUYER_PASSWORD)) {
    fatal('Missing PayPal sandbox buyer credentials: pass --buyer-email/--buyer-password, or use --manual to approve by hand.');
  }

  mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: !HEADFUL, slowMo: HEADFUL && !MANUAL ? 120 : 0 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-CA',
    timezoneId: 'America/Edmonton',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on('console', (message) => {
    if (message.type() === 'error') info(`browser console error: ${truncate(message.text(), 160)}`);
  });

  const context2 = { page, browser };
  try {
    await walk(context2);
  } catch (error) {
    record('walkthrough completed', false, String(error?.message || error));
    await capture(page, 'failure');
    if (await onPayPal(page)) await dumpPayPalPage(page);
  } finally {
    const failed = results.filter((result) => !result.ok).length;
    console.log(`\n${'='.repeat(64)}`);
    console.log(`PASS: ${results.length - failed}   FAIL: ${failed}   TOTAL: ${results.length}`);
    console.log(`screenshots: ${ARTIFACTS}`);
    console.log('='.repeat(64));

    if (FLAGS['keep-open']) {
      info('--keep-open: leaving the browser open. Press Ctrl+C to exit.');
      await new Promise(() => {});
    }
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

async function walk({ page }) {
  console.log(`\n=== Site under test: ${BASE} ===`);

  await ensureSignedIn(page);
  const total = await addToCartAndOpenCheckout(page);
  if (!total) throw new Error('Could not read the order total from the checkout page.');

  const baseline = await supabaseCount('payment_transactions?select=id');

  await submitCheckout(page);
  await completePayPal(page, total);

  const orderId = await settleBackOnSite(page);
  await assertCapturedPayment(page, orderId, total, baseline);
}

/* ------------------------------------------------------------------ steps */

async function ensureSignedIn(page) {
  console.log('\n=== Sign in ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  if (!page.url().includes('/login')) {
    record('signed in as shopper', true, `landed on ${shortUrl(page.url())}`);
    return;
  }

  // Existing signup or wrong password: fall back to creating the account, which
  // is also how a fresh environment gets a shopper at all.
  info('login did not stick — trying signup');
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', `e2e${Date.now().toString(36).slice(-6)}`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/signup'), { timeout: 20_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  const signedIn = !page.url().includes('/signup') && !page.url().includes('/login');
  record('signed in as shopper', signedIn, `landed on ${shortUrl(page.url())}`);
  if (!signedIn) throw new Error('Could not sign in or create an account with the supplied credentials.');
}

async function addToCartAndOpenCheckout(page) {
  console.log('\n=== Cart -> checkout ===');
  if (PRODUCT) {
    await page.goto(`${BASE}/products/${PRODUCT}`, { waitUntil: 'domcontentloaded' });
    if (!page.url().includes(`/products/${PRODUCT}`)) throw new Error(`Product /products/${PRODUCT} did not load.`);
  } else {
    await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
    const productLink = page.locator('a[href^="/products/"]').first();
    await productLink.waitFor();
    await productLink.click();
    await page.waitForURL(/\/products\//, { timeout: 20_000 });
  }

  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('status').filter({ hasText: 'Added to cart' }).waitFor({ timeout: 15_000 });
  record('added a keepsake to the cart', true, shortUrl(page.url()));

  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/checkout')) throw new Error(`Checkout redirected away to ${shortUrl(page.url())}`);

  const notice = page.getByRole('alert').filter({ hasText: 'not configured' });
  if (await notice.count()) {
    record('checkout ready for a payment provider', false, 'checkout reports no configured provider');
    throw new Error('PayPal is not configured for this environment — nothing to pay with.');
  }

  const aside = await page.locator('aside').innerText();
  const amounts = [...aside.matchAll(/\$([\d,]+\.\d{2})/g)].map((match) => match[1].replace(',', ''));
  const total = amounts.at(-1) ?? '';
  record('checkout renders a total', Boolean(total), `total $${total}`);
  return total;
}

async function submitCheckout(page) {
  console.log('\n=== Start payment ===');
  await page.fill('input[name="firstName"]', 'Ada');
  await page.fill('input[name="lastName"]', 'Walker');
  await page.fill('input[name="address"]', '12 Test Street');
  await page.fill('input[name="city"]', 'Edmonton');
  await page.fill('input[name="state"]', 'AB');
  await page.fill('input[name="zip"]', 'T5J 0N3');
  await page.fill('input[name="country"]', 'CA');

  const paypal = page.locator('input[name="paymentMethod"][value="paypal"]');
  const configured = await paypal.count();
  if (configured) await paypal.check();

  await Promise.all([
    page.waitForURL((url) => !url.host.endsWith(new URL(BASE).host) || url.pathname.includes('/checkout'), {
      timeout: 30_000,
    }).catch(() => {}),
    page.getByRole('button', { name: /continue to payment/i }).click(),
  ]);

  const error = page.locator('p.text-red-600');
  if (await error.count()) {
    const text = (await error.first().innerText()).trim();
    record('order created and payment started', false, truncate(text, 180));
    throw new Error(`Checkout action returned an error: ${text}`);
  }

  const onPayPalPage = await onPayPal(page);
  record('redirected to the payment provider', onPayPalPage, shortUrl(page.url()));
  if (!onPayPalPage) throw new Error(`Expected a PayPal redirect, landed on ${shortUrl(page.url())}`);
}

async function completePayPal(page, displayTotal) {
  console.log('\n=== PayPal sandbox ===');
  if (MANUAL) {
    info('--manual: complete the PayPal approval in the open browser (waiting up to 10 minutes).');
    await page.waitForURL((url) => !PAYPAL_HOST.test(url.hostname), { timeout: 600_000 });
    record('PayPal approval completed by hand', true, shortUrl(page.url()));
    return;
  }

  await clickFirst(page, [
    'text=/^Log ?In$/i',
    'a:has-text("Log In")',
    'button:has-text("Log In")',
    '[data-testid="login-link"]',
  ], 'open the PayPal login form', { optional: true });

  await fillFirst(page, [
    '#email',
    'input[name="login_email"]',
    'input[type="email"]',
    'input[name="email"]',
  ], BUYER_EMAIL, 'PayPal buyer email');

  await clickFirst(page, ['#btnNext', 'button:has-text("Next")'], 'advance to the password step', { optional: true });

  await fillFirst(page, [
    '#password',
    'input[name="login_password"]',
    'input[type="password"]',
  ], BUYER_PASSWORD, 'PayPal buyer password');

  await clickFirst(page, [
    '#btnLogin',
    'button:has-text("Log In")',
    'button:has-text("Log in")',
    'button[type="submit"]',
  ], 'submit the PayPal login');
  record('signed in to the PayPal sandbox', true);

  const payButton = await clickFirst(page, [
    '#payment-submit-btn',
    'button[data-testid="submit-button"]',
    'button:has-text("Pay Now")',
    'button:has-text("Complete Purchase")',
    'button:has-text("Agree & Continue")',
    'button:has-text("Continue")',
    'input[type="submit"]',
  ], 'approve the payment');
  record('approved the payment in PayPal', payButton, '«Continue/Pay» clicked');

  const amountOnPayPal = await readDisplayedAmount(page);
  if (amountOnPayPal && displayTotal) {
    const matches = normaliseMoney(amountOnPayPal) === normaliseMoney(displayTotal);
    record('provider quoted the same total as the site', matches, `site $${displayTotal} / PayPal $${normaliseMoney(amountOnPayPal)}`);
  }

  await page.waitForURL((url) => !PAYPAL_HOST.test(url.hostname), { timeout: 90_000 });
  record('returned to the site from PayPal', true, shortUrl(page.url()));
}

/** The capture route settles the order and redirects; this reads where we landed. */
async function settleBackOnSite(page) {
  console.log('\n=== Settlement ===');
  if (page.url().includes('payment=')) {
    const status = new URL(page.url()).searchParams.get('payment');
    await capture(page, `settlement-${status}`);
    record('order settled on the return route', false, `landed on /checkout?payment=${status}`);
    throw new Error(`Payment did not settle: ?payment=${status}. See ${ARTIFACTS}.`);
  }

  await page.waitForURL(/\/checkout\/confirmation/, { timeout: 30_000 });
  await page.getByText(/Your order is placed/i).waitFor({ timeout: 20_000 }).catch(() => {});
  await capture(page, 'confirmation');
  const heading = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim();
  record('confirmation page reached', /order is placed/i.test(heading), `h1="${truncate(heading, 40)}"`);
  return new URL(page.url()).searchParams.get('id');
}

async function assertCapturedPayment(page, orderId, displayTotal, baseline) {
  console.log('\n=== Database ===');
  const orders = await supabaseGet(
    `orders?select=id,status,payment_status,total,payment_method,user_id&order=created_at.desc&limit=1`,
  );
  const order = Array.isArray(orders) ? orders[0] : null;
  if (!order) {
    record('order persisted with a captured payment', false, 'no order rows found');
    return;
  }

  record('order is the one just placed', !orderId || order.id === orderId, `order ${order.id.slice(0, 8).toUpperCase()} (${shortUrl(page.url())})`);
  record('order.payment_status is paid', order.payment_status === 'paid', `payment_status=${order.payment_status}, status=${order.status}`);
  record('order advanced past pending', order.status !== 'pending', `status=${order.status}`);
  if (displayTotal) {
    const charged = Number(order.total).toFixed(2);
    record('amount charged matches the site total', charged === Number(displayTotal).toFixed(2), `site $${displayTotal} / order $${charged}`);
  }

  const transactions = await supabaseGet(
    `payment_transactions?select=status,provider,provider_transaction_id,amount,provider_data&order=created_at.desc&limit=1`,
  );
  const transaction = Array.isArray(transactions) ? transactions[0] : null;
  if (!transaction) {
    record('payment transaction recorded', false, 'no payment_transactions rows');
  } else {
    record('payment transaction captured', transaction.status === 'captured', `status=${transaction.status}, provider=${transaction.provider}`);
    record(
      'provider transaction id stored',
      Boolean(transaction.provider_transaction_id),
      transaction.provider_transaction_id || '(missing)',
    );
    const payer = transaction.provider_data?.payer_email ?? '';
    if (payer) info(`payer email recorded in the ledger: ${payer}`);
  }

  const after = await supabaseCount('payment_transactions?select=id');
  record('a new transaction was written', after > baseline, `${baseline} -> ${after}`);

  const cart = await fetchJson(`${BASE}/cart`, { method: 'GET' }).catch(() => null);
  if (cart) info(`cart page responded after settlement (HTTP ${cart.status})`);
}

/* ------------------------------------------------------------- primitives */

/**
 * PayPal's sandbox pages change shape between regions and A/B tests, so every
 * interaction hands over a list of candidate selectors and the first visible one
 * wins. `optional` steps are allowed to match nothing.
 */
async function clickFirst(page, candidates, label, { optional = false } = {}) {
  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 4_000 });
      await locator.click({ timeout: 8_000 });
      info(`clicked ${selector} — ${label}`);
      return true;
    } catch {
      /* try the next candidate */
    }
  }
  if (optional) return false;
  await capture(page, `missing-${slug(label)}`);
  await dumpPayPalPage(page);
  throw new Error(`No selector matched for "${label}". Tried: ${candidates.join(' | ')}`);
}

async function fillFirst(page, candidates, value, label) {
  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 4_000 });
      await locator.fill(value);
      info(`filled ${selector} — ${label}`);
      return selector;
    } catch {
      /* try the next candidate */
    }
  }
  await capture(page, `missing-${slug(label)}`);
  await dumpPayPalPage(page);
  throw new Error(`No field matched for "${label}". Tried: ${candidates.join(' | ')}`);
}

async function onPayPal(page) {
  try {
    return PAYPAL_HOST.test(new URL(page.url()).hostname);
  } catch {
    return false;
  }
}

async function readDisplayedAmount(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  const match = text.match(/(?:CA\$|US\$|\$)\s?([\d,]+\.\d{2})/);
  return match ? match[1] : '';
}

async function dumpPayPalPage(page) {
  const buttons = await page
    .locator('button, input[type="submit"], a[role="button"]')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.offsetParent !== null)
        .map((node) => (node.textContent || node.value || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 25),
    )
    .catch(() => []);
  const fields = await page
    .locator('input')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.type !== 'hidden' && node.offsetParent !== null)
        .map((node) => `${node.id || '(no id)'}[name=${node.name || '-'}][type=${node.type}]`)
        .slice(0, 25),
    )
    .catch(() => []);
  console.log(`         url: ${page.url()}`);
  console.log(`         visible buttons: ${buttons.join(' | ') || '(none)'}`);
  console.log(`         visible fields:  ${fields.join(' | ') || '(none)'}`);
}

async function capture(page, name) {
  const file = path.join(ARTIFACTS, `${String(++shotIndex).padStart(2, '0')}-${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  info(`screenshot -> ${file}`);
}

/* --------------------------------------------------------- supabase direct */

function serviceCredentials() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return url && key ? { url, key } : null;
}

async function supabaseGet(query) {
  const credentials = serviceCredentials();
  if (!credentials) return null;
  const response = await fetch(`${credentials.url}/rest/v1/${query}`, {
    headers: { apikey: credentials.key, Authorization: `Bearer ${credentials.key}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function supabaseCount(query) {
  const rows = await supabaseGet(query);
  return Array.isArray(rows) ? rows.length : 0;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, ok: response.ok };
}

/* ----------------------------------------------------------------- helpers */

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [key, inlineValue] = token.slice(2).split('=');
    const next = argv[index + 1];
    if (inlineValue !== undefined) flags[key] = inlineValue;
    else if (next && !next.startsWith('--')) {
      flags[key] = next;
      index += 1;
    } else flags[key] = true;
  }
  return flags;
}

/** Minimal .env loader: never overwrites variables that are already set. */
function loadEnvFile(file) {
  let contents = '';
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

function normaliseMoney(value) {
  return String(value ?? '').replace(/[^\d.]/g, '');
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function shortUrl(value) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function truncate(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function fatal(message) {
  console.error(`\n${message}\n`);
  process.exit(2);
}

main();
