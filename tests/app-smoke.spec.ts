import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('app loads the shell', async ({ page }) => {
  await openApp(page);

  await expect(page).toHaveTitle(/Ironforge/i);
  // Without a signed-in session, the login screen is shown
  await expect(page.locator('#login-screen')).toBeVisible();
});
