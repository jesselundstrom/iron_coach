import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test('dashboard island renders from the legacy bridge and removes the fallback shell', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    const forgeState = JSON.parse(JSON.stringify(window.eval('PROGRAMS.forge.getInitialState()')));
    window.eval(`
      workouts = [{
        id: 301,
        date: new Date().toISOString(),
        program: 'forge',
        type: 'forge',
        programDayNum: 1,
        programMeta: { week: 2 },
        programLabel: 'Forge · Day 1',
        duration: 1800,
        rpe: 7,
        exercises: [{
          name: 'Bench Press',
          sets: [{ weight: 82.5, reps: 5, done: true }]
        }]
      }];
      profile.activeProgram = 'forge';
      profile.programs = { ...(profile.programs || {}), forge: ${JSON.stringify(forgeState)} };
      updateDashboard();
      showPage('dashboard', document.querySelectorAll('.nav-btn')[0]);
    `);
  });

  await expect(page.locator('#dashboard-legacy-shell')).toHaveCount(0);
  await expect(page.locator('#dashboard-react-root .dashboard-section')).toHaveCount(4);
  await expect(page.locator('#dashboard-react-root .lift-stat').first()).toBeVisible();
  await expect(page.locator('#today-status')).toContainText(/treeni kirjattu|workout/i);
});

test('dashboard island keeps week strip detail toggling working', async ({ page }) => {
  await openAppShell(page);

  await page.evaluate(() => {
    window.eval(`
      schedule.sportDays = [new Date().getDay()];
      workouts = [];
      updateDashboard();
      showPage('dashboard', document.querySelectorAll('.nav-btn')[0]);
    `);
  });

  const firstDayPill = page.locator('#week-strip .day-pill').first();
  await firstDayPill.click();

  await expect(page.locator('#day-detail-panel')).toBeVisible();
  await expect(page.locator('#day-detail-panel')).toContainText(
    /päivä|treeni|sport|no session logged/i
  );
});
