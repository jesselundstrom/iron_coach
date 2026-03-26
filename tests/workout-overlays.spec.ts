import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test.describe.configure({ mode: 'serial' });

test('rpe prompt renders through the React shell and resolves the selected value', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    (window as typeof window & { __testRpeValue?: number | null }).__testRpeValue =
      undefined;
    window.__IRONFORGE_E2E__?.workout?.showRPEPicker?.(
      'Bench Press',
      0,
      (value: number | null) => {
        (
          window as typeof window & { __testRpeValue?: number | null }
        ).__testRpeValue = value;
      }
    );
  });

  await expect(page.locator('#rpe-modal')).toHaveClass(/active/);
  await expect(page.locator('#rpe-grid .rpe-btn')).toHaveCount(5);

  await page.locator('#rpe-grid .rpe-btn').filter({ hasText: '8' }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __testRpeValue?: number | null })
            .__testRpeValue
      )
    )
    .toBe(8);
  await expect(page.locator('#rpe-modal')).not.toHaveClass(/active/);
});

test('sport check prompt renders through the React shell and resolves the selected context', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    window.__IRONFORGE_E2E__?.profile?.setSportReadinessCheckEnabled?.(true);
    (
      window as typeof window & {
        __testSportContext?: Record<string, unknown> | null;
      }
    ).__testSportContext = undefined;
    window.__IRONFORGE_E2E__?.workout?.showSportReadinessCheck?.(
      (context: Record<string, unknown> | null) => {
        (
          window as typeof window & {
            __testSportContext?: Record<string, unknown> | null;
          }
        ).__testSportContext = context;
      }
    );
  });

  await expect(page.locator('#sport-check-modal')).toHaveClass(/active/);
  await expect(page.locator('#sport-check-title')).toContainText(/sport/i);
  await expect(page.locator('#sport-check-sub')).toContainText(/\?/);

  await page.locator('#sport-check-modal .sport-check-btn').nth(2).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __testSportContext?: { legsStress?: string } | null;
            }
          ).__testSportContext?.legsStress || null
      )
    )
    .toBe('tomorrow');
  await expect(page.locator('#sport-check-modal')).not.toHaveClass(/active/);
});

test('summary prompt renders through the React shell and resolves feedback plus notes', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    const runtimeWindow = window as typeof window & {
      __testSummaryResult?: {
        feedback: string | null;
        notes: string;
        goToNutrition: boolean;
      } | null;
    };
    runtimeWindow.__testSummaryResult = null;
    Promise.resolve(
      window.__IRONFORGE_E2E__?.workout?.showSessionSummary?.({
        duration: 1800,
        exerciseCount: 3,
        completedSets: 12,
        totalSets: 15,
        tonnage: 4200,
        rpe: 8,
        prCount: 1,
        isBonus: false,
        programLabel: 'Forge · Day 1',
        coachNote: 'Strong work today.',
      })
    ).then((result) => {
      runtimeWindow.__testSummaryResult = result as {
        feedback: string | null;
        notes: string;
        goToNutrition: boolean;
      } | null;
    });
  });

  await expect(page.locator('#summary-modal')).toHaveClass(/active/);
  await expect(page.locator('#summary-modal .summary-title')).toHaveText(
    'SESSION FORGED'
  );

  await page.locator('#summary-notes-textarea').fill('Felt great on bench.');
  await page.locator('.summary-feedback-btn').filter({ hasText: 'Good' }).click();
  await page.locator('.summary-action').click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __testSummaryResult?: {
                feedback: string | null;
                notes: string;
                goToNutrition: boolean;
              } | null;
            }
          ).__testSummaryResult || null
      )
    )
    .toEqual({
      feedback: 'good',
      notes: 'Felt great on bench.',
      goToNutrition: false,
    });
  await expect(page.locator('#summary-modal')).not.toHaveClass(/active/);
});
