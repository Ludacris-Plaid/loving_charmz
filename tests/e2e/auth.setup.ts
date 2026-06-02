import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'dysthemix@abc.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Fraser1984!';

test('bootstrap admin auth state', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/(admin|account)/);
  await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
});
