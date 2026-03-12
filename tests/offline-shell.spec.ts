import { expect, test } from '@playwright/test';
import { bootstrapAppShell, openAppShell } from './helpers';

test('offline shell boots after the service worker is installed', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootstrapAppShell(page);

  await expect(page.locator('#app-root')).toBeVisible();
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.locator('#sync-status')).toContainText(/offline/i);
});
