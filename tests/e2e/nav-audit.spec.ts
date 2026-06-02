import { test, expect, type Page } from '@playwright/test';

const PUBLIC_ROUTES: Array<{ path: string; min: number; label: string }> = [
  { path: '/', min: 2, label: 'Home' },
  { path: '/shop', min: 2, label: 'Shop' },
  { path: '/collections', min: 2, label: 'Collections' },
  { path: '/about', min: 2, label: 'About' },
  { path: '/cart', min: 2, label: 'Cart' },
  { path: '/login', min: 2, label: 'Login' },
  { path: '/signup', min: 2, label: 'Signup' },
  { path: '/custom-orders', min: 2, label: 'Custom orders' },
  { path: '/stories', min: 2, label: 'Stories' },
];

const SHOP_SLUGS = ['always-with-me', 'forever-pawprint', 'loyal-companion'];
const COLLECTION_SLUGS = ['bond-collection'];
const STORY_SLUGS = ['always-with-me', 'forever-pawprint', 'loyal-companion', 'unbreakable-bond'];

async function countEscapeLinks(page: Page): Promise<number> {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const origin = window.location.origin;
    const isInternal = (href: string) => {
      if (!href) return false;
      if (href.startsWith('#')) return false;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      if (href.startsWith('/') && !href.startsWith('//')) return true;
      try {
        return new URL(href, origin).origin === origin;
      } catch {
        return false;
      }
    };
    const visible = anchors.filter((a) => {
      if (!isInternal(a.getAttribute('href') ?? '')) return false;
      const rect = a.getBoundingClientRect();
      const style = window.getComputedStyle(a);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity) === 0) return false;
      if (rect.width === 0 || rect.height === 0) return false;
      return true;
    });
    const unique = new Set(visible.map((a) => a.getAttribute('href')));
    return unique.size;
  });
}

test.describe('Navigation audit — public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.label} (${route.path}) has ≥ ${route.min} visible escape links`, async ({ page }) => {
      const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok(), `${route.path} should return a 2xx response`).toBeTruthy();
      const count = await countEscapeLinks(page);
      expect(count, `${route.path} should have ≥ ${route.min} visible internal links`).toBeGreaterThanOrEqual(
        route.min,
      );
    });
  }
});

test.describe('Navigation audit — dynamic detail routes', () => {
  for (const slug of SHOP_SLUGS) {
    test(`product /products/${slug} has ≥ 2 escape links`, async ({ page }) => {
      const res = await page.goto(`/products/${slug}`, { waitUntil: 'domcontentloaded' });
      if (!res || !res.ok()) test.skip(true, `product ${slug} not published yet`);
      const count = await countEscapeLinks(page);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  }
  for (const slug of COLLECTION_SLUGS) {
    test(`collection /collections/${slug} has ≥ 2 escape links`, async ({ page }) => {
      const res = await page.goto(`/collections/${slug}`, { waitUntil: 'domcontentloaded' });
      if (!res || !res.ok()) test.skip(true, `collection ${slug} not published yet`);
      const count = await countEscapeLinks(page);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  }
  for (const slug of STORY_SLUGS) {
    test(`story /stories/${slug} has ≥ 2 escape links`, async ({ page }) => {
      const res = await page.goto(`/stories/${slug}`, { waitUntil: 'domcontentloaded' });
      if (!res || !res.ok()) test.skip(true, `story ${slug} not published yet`);
      const count = await countEscapeLinks(page);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  }
});

test.describe('Navigation audit — auth/account/admin (logged in)', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('account routes have ≥ 2 escape links', async ({ page }) => {
    for (const path of ['/account', '/account/profile', '/account/orders', '/account/wishlist', '/account/settings']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (!res || !res.ok()) continue;
      const count = await countEscapeLinks(page);
      expect(count, `${path} should have ≥ 2 escape links`).toBeGreaterThanOrEqual(2);
    }
  });

  test('admin routes have ≥ 2 escape links', async ({ page }) => {
    for (const path of ['/admin', '/admin/products', '/admin/orders', '/admin/analytics']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (!res || !res.ok()) continue;
      const count = await countEscapeLinks(page);
      expect(count, `${path} should have ≥ 2 escape links`).toBeGreaterThanOrEqual(2);
    }
  });
});
