import { expect, test } from '@playwright/test';
import { confirmModal, openAppShell } from './helpers';

test('nutrition island renders the setup card when no API key is present', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(() => {
    localStorage.removeItem('ic_nutrition_key');
    localStorage.removeItem('ic_nutrition_history::e2e-user');
    window.showPage('nutrition', document.querySelectorAll('.nav-btn')[4]);
  });

  await expect(page.locator('#nutrition-legacy-shell')).toHaveCount(0);
  await expect(page.locator('#nutrition-react-root .nutrition-setup-card')).toBeVisible();
  await expect(page.locator('#nutrition-react-root #nutrition-setup-key-input')).toBeVisible();
});

test('nutrition island renders seeded history and can clear it through the existing flow', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
    localStorage.setItem(
      'ic_nutrition_history::e2e-user',
      JSON.stringify([
        {
          role: 'user',
          text: 'Rate my lunch',
          timestamp: Date.now() - 60_000,
        },
        {
          role: 'assistant',
          text: 'Protein: 40g\nCarbs: 55g\nFat: 18g\nCalories: 520',
          timestamp: Date.now() - 30_000,
          model: 'claude-haiku-4-5-20251001',
        },
      ])
    );
    window.showPage('nutrition', document.querySelectorAll('.nav-btn')[4]);
  });

  await expect(page.locator('#nutrition-react-root')).toContainText(/rate my lunch/i);
  await expect(page.locator('#nutrition-react-root')).toContainText(/protein/i);
  await expect(page.locator('#nutrition-react-root .nutrition-context-banner')).toBeVisible();

  await page.evaluate(() => {
    window.eval('clearNutritionHistory()');
  });
  await confirmModal(page);

  await expect(page.locator('#nutrition-react-root')).toContainText(/personal nutrition coach/i);
});
