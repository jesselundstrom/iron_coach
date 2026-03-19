import { expect, test } from '@playwright/test';
import { bootstrapAppShell } from './helpers';

test('app shell respects hash-based navigation on boot', async ({ page }) => {
  await page.addInitScript(() => {
    window.__IRONFORGE_TEST_USER_ID__ = 'e2e-user';
  });

  await page.goto('/#/history', { waitUntil: 'domcontentloaded' });
  await bootstrapAppShell(page);

  await expect(page.locator('#page-history')).toHaveClass(/active/);
  await expect(
    page.locator('#app-shell-react-root .nav-btn[data-page="history"]')
  ).toHaveClass(/active/);
});

test('app shell nav buttons can switch away from dashboard', async ({ page }) => {
  await page.addInitScript(() => {
    window.__IRONFORGE_TEST_USER_ID__ = 'e2e-user';
  });

  await page.goto('/#/dashboard', { waitUntil: 'domcontentloaded' });
  await bootstrapAppShell(page);

  await page.locator('#app-shell-react-root .nav-btn[data-page="log"]').click();

  await expect(page.locator('#page-log')).toHaveClass(/active/);
  await expect(
    page.locator('#app-shell-react-root .nav-btn[data-page="log"]')
  ).toHaveClass(/active/);
  await expect
    .poll(() => page.evaluate(() => window.location.hash))
    .toBe('#/log');
});
