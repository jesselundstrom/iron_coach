import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test.describe.configure({ mode: 'serial' });

async function openActiveWorkout(page: Page) {
  await page.evaluate(() => {
    window.__IRONFORGE_E2E__?.app?.navigateToPage?.('log');
    window.__IRONFORGE_STORES__?.workout?.startWorkout?.();
  });

  await page.waitForFunction(() => (window as any).getActivePageName?.() === 'log');
  await page.waitForFunction(() => {
    const shell = document.querySelector('#log-active-react-root #workout-active');
    return (
      shell instanceof HTMLElement &&
      shell.style.display !== 'none' &&
      shell.querySelectorAll('.exercise-block').length > 0
    );
  });
}

test('log active island renders the active workout editor through the legacy bridge', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  await expect(page.locator('#log-active-react-root .active-session-title')).toContainText(/\S+/);
  await expect
    .poll(() => page.locator('#log-active-react-root .exercise-block').count())
    .toBeGreaterThan(0);
});

test('log active island keeps set completion and rest timer controls working', async ({ page }) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  await expect(page.getByRole('button', { name: '3 min' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: '3 min' }).click({ force: true });

  const interactionResult = await page.evaluate(() => {
    window.__IRONFORGE_STORES__?.workout?.toggleSet?.(0, 0);
    const state = window.__IRONFORGE_STORES__?.workout?.getState?.();
    return {
      restDuration: state?.restDuration,
      restEndsAt: state?.restEndsAt,
      restSecondsLeft: state?.restSecondsLeft,
      done: state?.activeWorkout?.exercises?.[0]?.sets?.[0]?.done,
    };
  });

  expect(interactionResult.restDuration).toBe(180);
  expect(Number(interactionResult.restEndsAt)).toBeGreaterThan(0);
  expect(Number(interactionResult.restSecondsLeft)).toBeGreaterThan(0);
  expect(interactionResult.done).toBe(true);

  await page.getByRole('button', { name: 'Skip' }).click({ force: true });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.__IRONFORGE_STORES__?.workout?.getState?.();
        return {
          restEndsAt: state?.restEndsAt,
          restSecondsLeft: state?.restSecondsLeft,
        };
      })
    )
    .toEqual({
      restEndsAt: 0,
      restSecondsLeft: 0,
    });
});

test('log active island keeps weight edits and done toggles in sync with the visible UI', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  await page.evaluate(() => {
    window.showSetRIRPrompt = () => {};
  });

  const firstWeightInput = page.locator('#log-active-react-root input[data-field="weight"]').first();
  const firstToggle = page.locator('#log-active-react-root .set-check').first();

  await firstWeightInput.fill('67.5');
  await firstWeightInput.blur();
  await expect(firstWeightInput).toHaveValue('67.5');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          String(
            window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
              ?.exercises?.[0]?.sets?.[0]?.weight ?? ''
          )
      )
    )
    .toBe('67.5');

  await page.evaluate(() => {
    window.__IRONFORGE_STORES__?.workout?.toggleSet?.(0, 0);
  });
  await expect(firstToggle).toHaveClass(/done/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
            ?.exercises?.[0]?.sets?.[0]?.done
      )
    )
    .toBe(true);

  await page.evaluate(() => {
    window.__IRONFORGE_STORES__?.workout?.toggleSet?.(0, 0);
  });
  await expect(firstToggle).not.toHaveClass(/(^| )done( |$)/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
            ?.exercises?.[0]?.sets?.[0]?.done
      )
    )
    .toBe(false);
});

test('log active island keeps focus handoff inside React for enter progression and add set', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  const firstExercise = page.locator('#log-active-react-root .exercise-block').first();
  const firstWeightInput = firstExercise.locator('input[data-field="weight"]').first();
  const firstRepsInput = firstExercise.locator('input[data-field="reps"]').first();
  const addSetButton = firstExercise.locator('button[data-action="add-set"]');

  await firstWeightInput.focus();
  await firstWeightInput.press('Enter');
  await expect(firstRepsInput).toBeFocused();

  const initialSetCount = await firstExercise.locator('.set-row').count();

  await addSetButton.click();

  const newWeightInput = firstExercise
    .locator('input[data-field="weight"]')
    .nth(initialSetCount);

  await expect(newWeightInput).toBeFocused();
});

test('log active island keeps RIR saves flowing through the workout store seam', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  await page.evaluate(() => {
    window.showSetRIRPrompt?.(0, 0);
  });

  await expect(page.locator('#custom-swap-modal')).toBeVisible();
  await page.locator('#custom-swap-modal button[data-rir-value="2"]').click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        String(
          window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
            ?.exercises?.[0]?.sets?.[0]?.rir ?? ''
        )
      )
    )
    .toBe('2');
  await expect(page.locator('#custom-swap-modal')).toHaveCount(0);
});

test('log active island keeps custom modal adjustment actions working under strict CSP', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  await page.evaluate(() => {
    (
      window as Window & {
        showShortenAdjustmentOptions?: () => void;
      }
    ).showShortenAdjustmentOptions?.();
  });

  await expect(page.locator('#custom-swap-modal')).toBeVisible();
  await page
    .locator(
      '#custom-swap-modal button[data-custom-modal-action="select-shorten-adjustment"][data-adjustment-level="medium"]'
    )
    .click();

  await expect(page.locator('#custom-swap-modal')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
            ?.runnerState?.adjustments?.length || 0
      )
    )
    .toBeGreaterThan(0);
});

test('log active island keeps add exercise flowing through the workout store seam', async ({
  page,
}) => {
  await openAppShell(page);
  await openActiveWorkout(page);

  const beforeCount = await page.evaluate(
    () =>
      window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
        ?.exercises?.length || 0
  );

  await page.evaluate(() => {
    window.__IRONFORGE_STORES__?.workout?.addExerciseByName?.('Dumbbell Row');
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__IRONFORGE_STORES__?.workout?.getState?.().activeWorkout
            ?.exercises?.length || 0
      )
    )
    .toBe(beforeCount + 1);
});
