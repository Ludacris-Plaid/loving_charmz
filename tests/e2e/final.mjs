import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext().then(c => c.newPage());
  
  // Sign in with new user
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', 'dysthemix@abc.com');
  await page.fill('input[name="password"]', 'Fraser1984!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log('✅ Signed in, landed at:', page.url().replace(BASE, ''));
  
  // Hit a few key routes
  for (const path of ['/account', '/admin', '/admin/products', '/admin/orders', '/admin/customers']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    const onLogin = page.url().includes('/login');
    console.log(`  ${path.padEnd(25)} ${onLogin ? '❌ redirected' : '✅ ' + h1.slice(0, 30)}`);
  }
  
  await browser.close();
})();
