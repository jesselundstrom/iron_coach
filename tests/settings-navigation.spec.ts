import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test('user can open settings from the bottom navigation', async ({ page }) => {
  await openAppShell(page);

  await page
    .locator('.bottom-nav')
    .getByRole('button', { name: /^settings$/i })
    .click();

  await expect(page.locator('#page-settings')).toHaveClass(/active/);
  await expect(page.locator('#sport-name')).toBeVisible();
  await expect(page.locator('#settings-tab-schedule')).toBeVisible();
});
