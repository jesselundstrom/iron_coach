import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test('settings program island renders program basics and switcher through the legacy bridge', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    window.__IRONFORGE_E2E__?.settings?.openProgramTab?.('forge');
  });

  await expect(page.locator('#settings-program-legacy-shell')).toHaveCount(0);
  await expect(page.locator('#settings-program-react-root #training-program-summary')).not.toBeEmpty();
  await expect(
    page.locator('#settings-program-react-root #program-switcher-container .program-card').first()
  ).toBeVisible();
  await expect(
    page.locator('#settings-program-react-root #program-switcher-container .program-card.active')
  ).toHaveCount(1);
  await expect(page.locator('#settings-program-react-root #program-advanced-panel')).toBeVisible();
});

test('settings program island still opens the advanced setup sheet', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(() => {
    window.__IRONFORGE_E2E__?.settings?.openProgramTab?.('forge');
  });

  await page.locator('#settings-program-react-root #program-advanced-panel').click();

  await expect(page.locator('#program-setup-sheet')).toHaveClass(/active/);
  await expect(page.locator('#program-settings-container')).not.toBeEmpty();
});
