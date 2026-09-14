/**
 * Production smoke test: crawls the live site for console errors, failed
 * network requests, and broken links.
 *
 * Pass SMOKE_EMAIL / SMOKE_PASSWORD to also crawl signed-in pages (account,
 * orders, wishlist, cart, checkout) as a dedicated test customer. Without
 * them the run covers public pages only.
 *
 * Usage:
 *   node tests/prod/smoke.mjs [baseUrl]
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node tests/prod/smoke.mjs [baseUrl]
 * Default baseUrl: https://loving-charmz.vercel.app
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'https://loving-charmz.vercel.app').replace(/\/$/, '');
const START = '/';
const EMAIL = process.env.SMOKE_EMAIL || '';
const PASSWORD = process.env.SMOKE_PASSWORD || '';

const consoleErrors = new Map(); // page -> messages[]
const requestFailures = new Map(); // page -> [{url, status, error}]
const brokenLinks = new Set(); // rendered "url (from x)"
const checked = new Set();
const queue = EMAIL ? [START, '/cart', '/checkout'] : [START];

const SKIP = [
  /^\/api\//,
  /^\/admin/,
  /^\/login/,
  /^\/signup/,
  /\/logout$/,
  /\.(png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2?)$/i,
];
// Only skipped when crawling anonymously; the authed pass visits them.
const SKIP_ANON_ONLY = [/^\/account/, /^\/checkout$/, /\/cart$/];

function shouldVisit(path) {
  return ![...SKIP, ...(EMAIL ? [] : SKIP_ANON_ONLY)].some((re) => re.test(path));
}

let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      if (!consoleErrors.has(page.url())) consoleErrors.set(page.url(), []);
      consoleErrors.get(page.url()).push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    if (!consoleErrors.has(page.url())) consoleErrors.set(page.url(), []);
    consoleErrors.get(page.url()).push(`pageerror: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    const err = req.failure()?.errorText || 'unknown';
    // Next.js prefetches are routinely aborted on navigation; that is the
    // browser cancelling work, not a site failure.
    if (err === 'net::ERR_ABORTED') return;
    if (!requestFailures.has(page.url())) requestFailures.set(page.url(), []);
    requestFailures.get(page.url()).push({ url: req.url(), method: req.method(), error: err });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      if (!requestFailures.has(page.url())) requestFailures.set(page.url(), []);
      requestFailures.get(page.url()).push({ url: res.url(), status: res.status() });
    }
  });

  // ── Signed-in pass: log the test customer in before crawling ──
  if (EMAIL && PASSWORD) {
    process.stdout.write(`signing in as ${EMAIL} `);
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await Promise.all([
      page.waitForURL(`${BASE}/account**`, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    process.stdout.write('ok\n');

    // Seed one item into the cart through the UI so /cart and /checkout
    // render their real contents (line items, totals, discount field,
    // payment methods) rather than their empty states.
    try {
      process.stdout.write('seeding cart ');
      await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.locator('a[href^="/products/"]').first().click();
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await page.getByRole('status').filter({ hasText: 'Added to cart' }).waitFor({ timeout: 15_000 });
      process.stdout.write('ok\n');
    } catch (err) {
      process.stdout.write(`WARN: could not seed cart (${err.message.split('\n')[0]}) — checkout will render its empty state\n`);
    }
  }

  while (queue.length > 0) {
    const path = queue.shift();
    if (checked.has(path)) continue;
    checked.add(path);

    const url = `${BASE}${path}`;
    process.stdout.write(`visiting ${path} `);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (err) {
      process.stdout.write(`NAV FAIL: ${err.message.split('\n')[0]}\n`);
      if (!consoleErrors.has(path)) consoleErrors.set(path, []);
      consoleErrors.get(path).push(`navigation: ${err.message.split('\n')[0]}`);
      continue;
    }
    // Let client-side hydration errors surface.
    await page.waitForTimeout(1200);
    process.stdout.write('ok\n');

    // A signed-in crawl that bounced to /login means an auth or session
    // problem on that page — record it rather than silently passing.
    if (EMAIL && page.url().includes('/login')) {
      consoleErrors.set(path, [...(consoleErrors.get(path) || []), 'redirected to /login while signed in']);
      continue;
    }

    // Collect same-origin http(s) links actually present in the rendered DOM.
    // mailto:/tel:/javascript: links are excluded — their .pathname is an
    // opaque string, not a site path.
    const hrefs = await page.$$eval('a[href]', (as) =>
      as.map((a) => {
        try {
          const u = new URL(a.href, window.location.origin);
          if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
          if (u.origin !== window.location.origin) return null;
          return u.pathname;
        } catch {
          return null;
        }
      }).filter(Boolean),
    );
    for (const href of new Set(hrefs)) {
      if (shouldVisit(href) && !checked.has(href)) queue.push(href);
    }
    // Remember links we skipped so we can still HEAD-check them cheaply.
    for (const href of new Set(hrefs)) {
      if (!shouldVisit(href) && !checked.has(href)) {
        checked.add(href);
        try {
          const res = await page.request.head(`${BASE}${href}`);
          if (res.status() >= 400) brokenLinks.add(`${href} (HEAD ${res.status}, linked from ${path})`);
        } catch {
          brokenLinks.add(`${href} (HEAD failed, linked from ${path})`);
        }
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  const visitedPages = [...checked].filter((p) => !SKIP.some((re) => re.test(p)));
  console.log(`Pages visited: ${visitedPages.length}${EMAIL ? ' (signed in)' : ' (anonymous)'}`);
  console.log(visitedPages.map((p) => `  ${p}`).join('\n'));

  if (consoleErrors.size === 0) {
    console.log('Console errors: none');
  } else {
    console.log(`\nConsole errors (${consoleErrors.size} pages):`);
    for (const [pg, msgs] of consoleErrors) {
      for (const m of [...new Set(msgs)].slice(0, 5)) console.log(`  ${pg} :: ${m.slice(0, 200)}`);
      if (msgs.length > 5) console.log(`  ${pg} :: ...and ${msgs.length - 5} more`);
    }
  }

  if (requestFailures.size === 0) {
    console.log('Failed requests (4xx/5xx/network): none');
  } else {
    console.log(`\nFailed requests (${[...requestFailures.values()].flat().length} total):`);
    for (const [pg, fails] of requestFailures) {
      for (const f of fails.slice(0, 5)) {
        console.log(`  ${pg} :: ${f.status || f.error || 'network'} ${f.url}`);
      }
      if (fails.length > 5) console.log(`  ${pg} :: ...and ${fails.length - 5} more`);
    }
  }

  if (brokenLinks.size === 0) {
    console.log('Broken links (skipped-page HEAD checks): none');
  } else {
    console.log(`\nBroken links (${brokenLinks.size}):`);
    for (const l of brokenLinks) console.log(`  ${l}`);
  }
} finally {
  if (browser) await browser.close();
}
