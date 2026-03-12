import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

test('stale profile document does not overwrite newer local training frequency', async ({ page }) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    return window.eval(`
      (() => {
        clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
        const localProfile = {
          ...cloneJson(profile),
          preferences: normalizeTrainingPreferences({
            preferences: {
              ...getDefaultTrainingPreferences(),
              trainingDaysPerWeek: 2
            }
          }),
          syncMeta: {
            ...(profile.syncMeta || {}),
            profileUpdatedAt: '2026-03-12T10:00:00.000Z'
          }
        };
        const rows = [{
          doc_key: PROFILE_CORE_DOC_KEY,
          payload: {
            defaultRest: 120,
            language: 'en',
            preferences: {
              ...getDefaultTrainingPreferences(),
              trainingDaysPerWeek: 3
            },
            coaching: getDefaultCoachingProfile(),
            activeProgram: 'forge'
          },
          client_updated_at: '2026-03-12T09:00:00.000Z',
          updated_at: '2026-03-12T09:00:00.000Z'
        }];
        const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
        return merged.profile.preferences.trainingDaysPerWeek;
      })()
    `);
  });

  expect(result).toBe(2);
});

test('stale legacy profile blob does not overwrite newer local training frequency', async ({ page }) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    return window.eval(`
      (() => {
        clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
        profile.preferences = normalizeTrainingPreferences({
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 2
          }
        });
        profile.syncMeta = {
          ...(profile.syncMeta || {}),
          profileUpdatedAt: '2026-03-12T10:00:00.000Z'
        };
        const remoteProfile = {
          defaultRest: 120,
          language: 'en',
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 3
          },
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
          syncMeta: {
            profileUpdatedAt: '2026-03-12T09:00:00.000Z'
          }
        };
        applyLegacyProfileBlob(remoteProfile, schedule, {});
        return profile.preferences.trainingDaysPerWeek;
      })()
    `);
  });

  expect(result).toBe(2);
});

test('newer remote profile document still updates local training frequency', async ({ page }) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    return window.eval(`
      (() => {
        clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
        const localProfile = {
          ...cloneJson(profile),
          preferences: normalizeTrainingPreferences({
            preferences: {
              ...getDefaultTrainingPreferences(),
              trainingDaysPerWeek: 2
            }
          }),
          syncMeta: {
            ...(profile.syncMeta || {}),
            profileUpdatedAt: '2026-03-12T09:00:00.000Z'
          }
        };
        const rows = [{
          doc_key: PROFILE_CORE_DOC_KEY,
          payload: {
            defaultRest: 120,
            language: 'en',
            preferences: {
              ...getDefaultTrainingPreferences(),
              trainingDaysPerWeek: 3
            },
            coaching: getDefaultCoachingProfile(),
            activeProgram: 'forge'
          },
          client_updated_at: '2026-03-12T10:00:00.000Z',
          updated_at: '2026-03-12T10:00:00.000Z'
        }];
        const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
        return merged.profile.preferences.trainingDaysPerWeek;
      })()
    `);
  });

  expect(result).toBe(3);
});
