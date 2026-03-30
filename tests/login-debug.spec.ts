import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('login debug handler loads and captures empty sign-in attempts', async ({
  page,
}) => {
  await openApp(page);

  await expect(page.locator('#login-screen')).toBeVisible();

  await expect(page.locator('#login-debug')).toContainText(/login debug ready/i);
  await expect(page.locator('#login-debug')).toContainText(/login handler loaded/i);

  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.locator('#login-error')).toHaveText(
    /enter your email and password\./i
  );
  await expect(page.locator('#login-debug')).toContainText(/capture click/i);
  await expect(page.locator('#login-debug')).toContainText(
    /missing credentials/i
  );
});
