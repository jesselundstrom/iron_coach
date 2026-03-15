import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test('live PR detection flows into the summary and history views', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(() => {
    const benchId = window.eval("EXERCISE_LIBRARY.resolveExerciseId('Bench Press')");
    const forgeState = JSON.parse(JSON.stringify(window.eval('PROGRAMS.forge.getInitialState()')));

    window.eval(`
      workouts = [{
        id: 1,
        date: '2026-03-10T09:00:00.000Z',
        program: 'forge',
        type: 'forge',
        programDayNum: 1,
        programLabel: 'Forge · Day 1',
        duration: 1800,
        rpe: 7,
        sets: 1,
        exercises: [{
          name: 'Bench Press',
          exerciseId: '${benchId}',
          sets: [{ weight: 80, reps: 7, done: true, rpe: 8 }]
        }]
      }];
      profile.activeProgram = 'forge';
      profile.programs = { ...(profile.programs || {}), forge: ${JSON.stringify(forgeState)} };
      buildExerciseIndex();
      upsertWorkoutRecord = async () => {};
      saveWorkouts = async () => {};
      saveProfileData = async () => {};
    `);

    window.eval(`
      activeWorkout = {
        program: 'forge',
        type: 'forge',
        programOption: '1',
        programDayNum: 1,
        programLabel: 'Forge · Day 1',
        sessionDescription: 'Bench focus',
        rewardState: buildWorkoutRewardState(),
        exercises: ensureWorkoutExerciseUiKeys([{
          name: 'Bench Press',
          exerciseId: '${benchId}',
          sets: [{ weight: 80, reps: 8, done: false, rpe: null }]
        }]),
        startTime: Date.now()
      };
    `);

    window.showRPEPicker = (_name, _setNum, cb) => cb(8);
    window.showPage('log', document.querySelectorAll('.nav-btn')[1]);
    window.resumeActiveWorkoutUI({ toast: false });
  });

  await page.locator('.set-check').click();
  await expect(page.locator('.set-pr-badge')).toHaveText(/new pr/i);
  await expect(page.locator('#toast')).toContainText('New PR!');

  await page.evaluate(() => {
    window.finishWorkout();
  });

  await expect(page.locator('#summary-modal')).toHaveClass(/active/);
  await expect(page.locator('#summary-modal .summary-title')).toHaveText('SESSION FORGED');
  await expect(page.locator('.summary-stat-prs .summary-stat-value')).toHaveText('1');

  await page.getByRole('button', { name: /^done$/i }).click();

  await page.evaluate(() => {
    window.showPage('history', document.querySelectorAll('.nav-btn')[2]);
  });

  await expect(page.locator('.hist-pr-badge').first()).toHaveText(/new pr/i);
});

test('dashboard shows TM change state with rolling counter markers', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(() => {
    const state = JSON.parse(JSON.stringify(window.eval('PROGRAMS.forge.getInitialState()')));
    profile.activeProgram = 'forge';
    profile.programs = { ...(profile.programs || {}), forge: state };
    window.eval("_lastTmSignature = ''");
    window.eval("_lastTmValues = {}");
    updateDashboard();
    profile.programs.forge.lifts.main[1].tm = 82.5;
    updateDashboard();
  });

  const benchCard = page.locator('.lift-stat').filter({ hasText: 'Bench Press' });
  await expect(benchCard).toHaveClass(/tm-updated/);
  await expect(benchCard.locator('.tm-delta-badge')).toHaveText('+2.5');
  await expect(benchCard.locator('.tm-digit-stack.is-changing').first()).toBeVisible();
});
