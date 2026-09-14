/**
 * Production smoke test: crawls every page on the live site, collects
 * console errors, failed network requests, and broken internal links.
 *
 * Usage: node tests/prod/smoke.mjs [baseUrl]
 * Default baseUrl: https://loving-charmz.vercel.app
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'https://loving-charmz.vercel.app').replace(/\/$/, '');
const START = '/';

const consoleErrors = new Map(); // page -> messages[]
const requestFailures = new Map(); // page -> [{url, status, method}]
const brokenLinks = new Set(); // url -> where found (rendered "url (from x)")
const checked = new Set();
const queue = [START];

const SKIP = [
  /^\/api\//,
  /^\/admin/,
  /^\/account/,
  /^\/login/,
  /^\/signup/,
  /^\/checkout$/,
  /\/cart$/,
  /\.(png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2?)$/i,
];

function shouldVisit(path) {
  return !SKIP.some((re) => re.test(path));
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

  // HEAD-check collected same-origin links we deliberately do not browse.
  for (const path of [...checked].filter((p) => SKIP.some((re) => re.test(p)) && /^\/api\//.test(p))) {
    // no body — API routes verified through responses above
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Pages visited: ${[...checked].filter((p) => !SKIP.some((re) => re.test(p))).length}`);

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
