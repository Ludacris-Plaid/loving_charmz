// Reproduce the login + admin access flow and capture all errors
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors = [];
  const consoleMsgs = [];
  const navHistory = [];

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));
  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('localhost:3000') && (resp.status() >= 400 || resp.status() === 307)) {
      navHistory.push(`${resp.status()} ${resp.request().method()} ${u.replace('http://localhost:3000', '')} → ${resp.headers().location || ''}`);
    }
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      navHistory.push(`NAV: ${frame.url().replace('http://localhost:3000', '')}`);
    }
  });

  console.log('=== 1. Go to /login ===');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  console.log('=== 2. Fill in form and submit ===');
  await page.fill('input[name="email"]', 'dysthemix@abc.com');
  await page.fill('input[name="password"]', 'Fraser1984!');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000); // wait for any redirects
  console.log('  URL after submit:', page.url());

  console.log('=== 3. Try to go to /admin ===');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('  URL after /admin:', page.url());
  console.log('  H1:', await page.locator('h1').first().textContent().catch(() => '(no h1)'));
  console.log('  Body snippet (first 500):', (await page.textContent('body') || '').slice(0, 500).replace(/\s+/g, ' '));

  console.log('\n=== Console errors/warnings ===');
  for (const m of consoleMsgs) console.log(' ', m);

  console.log('\n=== Page errors ===');
  for (const e of errors) console.log(' ', e);

  console.log('\n=== Navigation + redirect history ===');
  for (const n of navHistory) console.log(' ', n);

  console.log('\n=== Cookies ===');
  const cookies = await ctx.cookies();
  for (const c of cookies) {
    console.log(`  ${c.name} = ${c.value.slice(0, 40)}${c.value.length > 40 ? '...' : ''}`);
  }

  // Screenshot
  await page.screenshot({ path: '/tmp/admin-page.png', fullPage: false });
  console.log('\n  Screenshot: /tmp/admin-page.png');

  await browser.close();
})();
