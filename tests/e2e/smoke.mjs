// Real end-to-end smoke test using Playwright
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const EMAIL = 'dysthemix+test-1780435625@gmail.com';
const PASSWORD = 'TestPass123!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];
  function record(name, status, note) {
    results.push({ name, status, note });
    const mark = status === 'OK' ? 'PASS' : status === 'REDIRECT' ? 'OK' : 'FAIL';
    console.log(`  [${mark}] ${name.padEnd(40)} ${status}  ${note || ''}`);
  }

  console.log('\n=== Public routes (no auth) ===');
  for (const path of ['/', '/shop', '/stories', '/about', '/custom-orders', '/collections', '/cart', '/login', '/signup']) {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
    const status = resp.status();
    const title = await page.title();
    const bodyText = (await page.textContent('body')) || '';
    const hasError = bodyText.includes('Application error') || bodyText.includes('Internal Server Error');
    const hasLogin = bodyText.includes('Sign in') || bodyText.toLowerCase().includes('sign in');
    record(path, hasError ? 'FAIL' : 'OK', `HTTP ${status}  title="${title.slice(0,40)}"`);
  }

  console.log('\n=== Product detail pages ===');
  for (const slug of ['loyal-companion', 'forever-pawprint', 'heartbeat-pendant', 'always-with-me', 'memorial-charm-bracelet', 'unbreakable-bond']) {
    const resp = await page.goto(BASE + '/products/' + slug, { waitUntil: 'networkidle', timeout: 20000 });
    const status = resp.status();
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    record('/products/' + slug, status === 200 ? 'OK' : 'FAIL', `HTTP ${status}  H1="${(h1 || '').slice(0,40)}"`);
  }

  console.log('\n=== Story detail pages ===');
  for (const slug of ['first-love', 'beyond-the-fur', 'fifteen-years-of-loyalty', 'a-daughters-tribute', 'the-forever-puppy', 'two-hearts-one-bond']) {
    const resp = await page.goto(BASE + '/stories/' + slug, { waitUntil: 'networkidle', timeout: 20000 });
    const status = resp.status();
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    record('/stories/' + slug, status === 200 ? 'OK' : 'FAIL', `HTTP ${status}  H1="${(h1 || '').slice(0,40)}"`);
  }

  console.log('\n=== Login flow ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  const afterLoginUrl = page.url();
  record('login → redirect', afterLoginUrl.includes('/login') ? 'FAIL' : 'OK', `landed at ${afterLoginUrl.replace(BASE, '')}`);

  console.log('\n=== Authenticated account routes ===');
  for (const path of ['/account', '/account/profile', '/account/orders', '/account/wishlist', '/account/settings', '/account/custom-orders']) {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
    const status = resp.status();
    const onLogin = page.url().includes('/login');
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    record(path, onLogin ? 'FAIL' : 'OK', `HTTP ${status}  ${onLogin ? 'redirected to login' : 'H1="' + (h1||'').slice(0,30) + '"'}`);
  }

  console.log('\n=== Admin routes (user is in user_roles as admin) ===');
  for (const path of ['/admin', '/admin/products', '/admin/orders', '/admin/customers', '/admin/collections', '/admin/inventory', '/admin/personalization', '/admin/content', '/admin/discounts', '/admin/analytics']) {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
    const status = resp.status();
    const onLogin = page.url().includes('/login');
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    record(path, onLogin ? 'FAIL' : 'OK', `HTTP ${status}  ${onLogin ? 'redirected to login' : 'H1="' + (h1||'').slice(0,30) + '"'}`);
  }

  console.log('\n=== Logout flow ===');
  await page.goto(BASE + '/logout', { waitUntil: 'networkidle' });
  const logoutH1 = await page.locator('h1').first().textContent().catch(() => '');
  const hasSignoutBtn = await page.locator('button[type="submit"]').count() > 0;
  record('/logout', hasSignoutBtn ? 'OK' : 'FAIL', `H1="${(logoutH1 || '').slice(0,40)}"  hasButton=${hasSignoutBtn}`);

  await browser.close();

  const failCount = results.filter(r => r.status === 'FAIL').length;
  const passCount = results.filter(r => r.status === 'OK').length;
  console.log(`\n========================================`);
  console.log(`PASS: ${passCount}   FAIL: ${failCount}   TOTAL: ${results.length}`);
  console.log(`========================================`);
  process.exit(failCount > 0 ? 1 : 0);
})();
