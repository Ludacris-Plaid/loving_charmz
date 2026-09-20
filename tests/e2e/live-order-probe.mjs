/**
 * Live end-to-end order probe: drives the REAL production checkout
 * (https://lovingcharmz.com) through signup → add to cart → checkout with a
 * discount code → embedded Square card payment (sandbox credentials, so no
 * real money) → confirmation redirect. Prints the order id for post-run
 * database/email verification.
 *
 * Usage: node tests/e2e/live-order-probe.mjs
 * Requires SQUARE_MODE=sandbox on the deployment (the test card only works there).
 */
import { chromium } from 'playwright';

const BASE = 'https://lovingcharmz.com';
const EMAIL = `liveprobe${Date.now()}@lovingcharmz.com`;
const PASSWORD = 'LiveProbe!2026x';
const DISCOUNT = process.env.DISCOUNT || 'LIVETEST';
const CARD = { number: '4111 1111 1111 1111', expiry: '12/30', cvv: '123' };
const SKU = process.env.SKU || 'companion';

function log(step, msg = '') {
  console.log(`[${step}] ${msg}`);
}

const browser = await chromium.launch();
const consoleErrors = [];
const badResponses = [];
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url().slice(0, 100)}`); });

  // 1. Sign up
  log('1/7 signup', EMAIL);
  await page.goto(`${BASE}/signup`);
  await page.getByLabel('Username').fill(`probe${String(Date.now()).slice(-6)}`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL(/\/(account|admin)/);

  // 2. Open product and add to cart
  log('2/7 add to cart', `/products/${SKU}`);
  await page.goto(`${BASE}/products/${SKU}`);
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.waitForTimeout(1500);

  // 3. Go to cart, then checkout
  log('3/7 cart → checkout');
  await page.goto(`${BASE}/cart`);
  await page.getByRole('link', { name: /checkout/i }).first().click();
  await page.waitForURL(/\/checkout/);

  // 4. Fill contact + shipping (US address: the 4111 test card is American,
  // so Square demands a US ZIP and the app's ZIP label switches with country)
  log('4/7 checkout details');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('First name').fill('Live');
  await page.getByLabel('Last name').fill('Probe');
  await page.getByLabel('Street address').fill('400 Broad Street');
  await page.getByLabel('City').fill('Seattle');
  await page.locator('select[name="country"]').selectOption('US');
  await page.getByLabel('Province / State').fill('WA');
  await page.getByLabel('ZIP Code').fill('98101');

  // 5. Apply the discount code
  log('5/7 discount', DISCOUNT);
  const discountInput = page.locator('input[name="discountCode"], input[placeholder*="code" i], input[placeholder*="discount" i]').first();
  await discountInput.fill(DISCOUNT);
  await page.getByRole('button', { name: /apply/i }).click();
  await page.waitForTimeout(1500);

  // 6. Create the order (card flow: order first, then card form appears)
  log('6/7 submitting order');
  await page.locator('button[type="submit"]').click();
  // The card form mounts after the order is created. Square's iframes are
  // zero-height until rendered, so wait for attached, not visible.
  await page.waitForSelector('iframe', { state: 'attached', timeout: 30000 });

  // 7. Pay with the sandbox card. Square renders its fields inside a nested
  // iframe pair; its inputs have stable ids. IMPORTANT: the app's own ZIP
  // input also matches /postal/, so target the Square iframe explicitly by
  // frame URL rather than scanning every frame.
  log('7/7 sandbox card payment');
  const squareFrame = page.frames().find((f) => /single-card-element-iframe/.test(f.url()))
    ?? (await (async () => { await page.waitForTimeout(3000); return page.frames().find((f) => /single-card-element-iframe/.test(f.url())); })());
  if (!squareFrame) throw new Error('Square card iframe not found');
  const byId = (id) => squareFrame.locator(`#${id}`);
  await byId('cardNumber').waitFor({ state: 'attached', timeout: 20000 });
  await byId('cardNumber').fill(CARD.number);
  await byId('expirationDate').fill(CARD.expiry);
  await byId('cvv').fill(CARD.cvv);
  await byId('postalCode').fill('98101'); // must match the US card's country
  log('card fields', 'filled');
  await page.getByRole('button', { name: /pay \$\d/i }).click();
  try {
    await page.waitForURL(/\/checkout\/confirmation/, { timeout: 60000 });
  } catch {
    // Diagnose the stall: console, network, visible errors, screenshot.
    await page.waitForTimeout(12000);
    await page.screenshot({ path: 'tests/e2e/.artifacts/live-probe-pay.png', fullPage: true });
    const texts = await page.locator('body :is(p,div,span)').allTextContents();
    console.log('error-ish text:', [...new Set(texts.filter((t) => /fail|error|invalid|declin|verif|network|unable/i.test(t)))].slice(0, 6));
    console.log('console errors:', consoleErrors.slice(-6));
    console.log('bad responses:', badResponses.slice(-6));
    throw new Error('payment did not complete');
  }

  log('DONE ✓', page.url());
  const orderId = new URL(page.url()).searchParams.get('id');
  console.log(`ORDER_ID=${orderId}`);
} finally {
  await browser.close();
}
