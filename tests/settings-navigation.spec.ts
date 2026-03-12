import { expect, test } from '@playwright/test';

test('user can open settings from the bottom navigation', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    document.body.classList.remove('login-active');
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';
  });

  await page.getByRole('button', { name: /settings/i }).click();

  await expect(page.locator('#page-settings')).toHaveClass(/active/);
  await expect(page.locator('#sport-name')).toBeVisible();
  await expect(page.locator('#settings-tab-schedule')).toBeVisible();
});
