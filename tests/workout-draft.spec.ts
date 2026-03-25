import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { confirmModal, openAppShell, reloadAppShell } from './helpers';

test.describe.configure({ mode: 'serial' });

async function openTrainPage(page: Page) {
  await page.evaluate(() => {
    const navButton =
      document.querySelector('.nav-btn[data-page="log"]') ||
      document.querySelectorAll('.nav-btn')[1];
    window.showPage?.('log', navButton);
    window.runPageActivationSideEffects?.('log');
    if (window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout) {
      window.__IRONFORGE_STORES__?.workout?.resumeActiveWorkoutUI?.({
        toast: false,
      });
    }
  });

  await expect(page.locator('#page-log')).toHaveClass(/active/);
}

async function startWorkout(page: Page) {
  await openTrainPage(page);
  await expect(page.getByRole('button', { name: /start workout/i })).toBeVisible();
  await page.evaluate(() => {
    window.__IRONFORGE_STORES__?.workout?.startWorkout?.();
    if (window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout) {
      window.__IRONFORGE_STORES__?.workout?.resumeActiveWorkoutUI?.({
        toast: false,
      });
    }
  });
  await expect(page.locator('#workout-active')).toBeVisible();
}

test('active workout draft restores after reload', async ({ page }) => {
  await openAppShell(page);
  await startWorkout(page);

  const firstWeightInput = page.locator('#exercises-container input[data-field="weight"]').first();
  await firstWeightInput.fill('60');
  await firstWeightInput.evaluate((input: HTMLInputElement) => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  });

  await reloadAppShell(page);
  await openTrainPage(page);

  await page.waitForFunction(
    () => !!window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
  );
  await expect(page.locator('#workout-active')).toBeVisible();
  await expect(page.locator('#exercises-container input[data-field="weight"]').first()).toHaveValue('60');
});

test('finishing a workout clears the persisted draft', async ({ page }) => {
  await openAppShell(page);
  await startWorkout(page);

  expect(
    await page.evaluate(
      () =>
        !!window.__IRONFORGE_STORES__?.data?.getActiveWorkoutDraftCache?.()
    )
  ).toBe(true);

  await page.evaluate(async () => {
    window.showRPEPicker = (_title, _index, cb) => cb(7);
    window.showSessionSummary = async () => {};
    await window.__IRONFORGE_STORES__?.workout?.finishWorkout?.();
  });

  await expect(page.locator('#workout-not-started')).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__IRONFORGE_STORES__?.data?.getActiveWorkoutDraftCache?.()
        ),
      {
        timeout: 15000,
      }
    )
    .toBeNull();
});

test('discarding a workout clears the persisted draft', async ({ page }) => {
  await openAppShell(page);
  await startWorkout(page);

  expect(
    await page.evaluate(
      () =>
        !!window.__IRONFORGE_STORES__?.data?.getActiveWorkoutDraftCache?.()
    )
  ).toBe(true);

  await page.getByRole('button', { name: /discard workout/i }).click({ force: true });
  await confirmModal(page);

  await page.waitForFunction(
    () => !window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
  );
  await expect(page.locator('#workout-not-started')).toBeVisible();
  expect(
    await page.evaluate(
      () => window.__IRONFORGE_STORES__?.data?.getActiveWorkoutDraftCache?.()
    )
  ).toBeNull();
});
