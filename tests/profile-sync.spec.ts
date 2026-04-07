import { expect, test } from '@playwright/test';
import { openAppShell } from './helpers';

declare const PROFILE_CORE_DOC_KEY: string;

declare let workouts: Array<Record<string, any>>;
declare let profile: Record<string, any>;
declare let schedule: Record<string, any>;
declare let cloudSyncEnabled: boolean;

declare function clearDocKeysDirty(docKeys: string[]): void;
declare function getDirtyDocKeys(): string[];
declare function getAllProfileDocumentKeys(profileLike?: Record<string, any> | null): string[];
declare function getDefaultTrainingPreferences(): Record<string, any>;
declare function getDefaultCoachingProfile(): Record<string, any>;
declare function normalizeTrainingPreferences(
  profileLike?: Record<string, any> | null
): Record<string, any>;
declare function normalizeScheduleState(
  scheduleLike?: Record<string, any> | null
): Record<string, any> | null;
declare function buildStateFromProfileDocuments(
  rows: Array<Record<string, any>>,
  localProfile: Record<string, any>,
  localSchedule: Record<string, any>,
  workoutItems?: Array<Record<string, any>>
): {
  profile: Record<string, any>;
  schedule: Record<string, any>;
};
declare function applyRealtimeSync(reason?: string): Promise<void>;
declare function loadData(options?: Record<string, any>): Promise<void>;
declare function setupRealtimeSync(): void;
declare let pullWorkoutsFromTable: (
  fallbackWorkouts?: Array<Record<string, any>>
) => Promise<Record<string, any>>;
declare let saveProfileData: (
  options?: Record<string, any>
) => Promise<Record<string, any> | void>;
declare function saveWorkouts(): Promise<void>;
declare function saveSchedule(nextValues?: Record<string, any>): void;

test('stale profile document does not overwrite newer local training frequency', async ({ page }) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
    const localProfile = {
      ...structuredClone(profile),
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 2,
        },
      }),
      syncMeta: {
        ...(profile.syncMeta || {}),
        profileUpdatedAt: '2026-03-12T10:00:00.000Z',
      },
    };
    const rows = [
      {
        doc_key: PROFILE_CORE_DOC_KEY,
        payload: {
          defaultRest: 120,
          language: 'en',
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 3,
          },
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
        },
        client_updated_at: '2026-03-12T09:00:00.000Z',
        updated_at: '2026-03-12T09:00:00.000Z',
      },
    ];
    const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
    return merged.profile.preferences.trainingDaysPerWeek;
  });

  expect(result).toBe(2);
});

test('newer remote profile document still updates local training frequency', async ({ page }) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
    const localProfile = {
      ...structuredClone(profile),
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 2,
        },
      }),
      syncMeta: {
        ...(profile.syncMeta || {}),
        profileUpdatedAt: '2026-03-12T09:00:00.000Z',
      },
    };
    const rows = [
      {
        doc_key: PROFILE_CORE_DOC_KEY,
        payload: {
          defaultRest: 120,
          language: 'en',
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 3,
          },
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
        },
        client_updated_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T10:00:00.000Z',
      },
    ];
    const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
    return merged.profile.preferences.trainingDaysPerWeek;
  });

  expect(result).toBe(3);
});

test('remote profile document does not win solely because updated_at is newer', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
    const localProfile = {
      ...structuredClone(profile),
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 2,
        },
      }),
      syncMeta: {
        ...(profile.syncMeta || {}),
        profileUpdatedAt: '2026-03-12T10:00:00.000Z',
      },
    };
    const rows = [
      {
        doc_key: PROFILE_CORE_DOC_KEY,
        payload: {
          defaultRest: 120,
          language: 'en',
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 5,
          },
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
        },
        client_updated_at: '2026-03-12T09:00:00.000Z',
        updated_at: '2026-03-12T11:00:00.000Z',
      },
    ];
    const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
    return merged.profile.preferences.trainingDaysPerWeek;
  });

  expect(result).toBe(2);
});

test('remote profile document still wins when client_updated_at is newer but updated_at is older', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
    const localProfile = {
      ...structuredClone(profile),
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 2,
        },
      }),
      syncMeta: {
        ...(profile.syncMeta || {}),
        profileUpdatedAt: '2026-03-12T09:30:00.000Z',
      },
    };
    const rows = [
      {
        doc_key: PROFILE_CORE_DOC_KEY,
        payload: {
          defaultRest: 120,
          language: 'en',
          preferences: {
            ...getDefaultTrainingPreferences(),
            trainingDaysPerWeek: 4,
          },
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
        },
        client_updated_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T09:00:00.000Z',
      },
    ];
    const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
    return merged.profile.preferences.trainingDaysPerWeek;
  });

  expect(result).toBe(4);
});

test('saveSchedule marks only the schedule document as dirty', async ({ page }) => {
  await openAppShell(page);

  const dirtyDocKeys = await page.evaluate(() => {
    clearDocKeysDirty(getAllProfileDocumentKeys(profile));
    saveSchedule({
      sportName: 'Padel',
      sportIntensity: 'moderate',
      sportLegsHeavy: false,
      sportDays: [1, 3],
    });
    return getDirtyDocKeys().slice().sort();
  });

  expect(dirtyDocKeys).toEqual(['schedule']);
});

test('profile document merge helper stays pure and does not publish intermediate store state', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const liveBefore =
      (window as any).__IRONFORGE_STORES__?.profile?.getState?.().profile
        ?.activeProgram || null;
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY, 'program:wendler531']);
    const merged = buildStateFromProfileDocuments(
      [
        {
          doc_key: PROFILE_CORE_DOC_KEY,
          payload: {
            defaultRest: 120,
            language: 'en',
            activeProgram: 'wendler531',
            preferences: getDefaultTrainingPreferences(),
            coaching: getDefaultCoachingProfile(),
          },
          client_updated_at: '2026-03-12T10:00:00.000Z',
          updated_at: '2026-03-12T10:00:00.000Z',
        },
      ],
      structuredClone(profile),
      schedule,
      []
    );
    const liveAfter =
      (window as any).__IRONFORGE_STORES__?.profile?.getState?.().profile
        ?.activeProgram || null;
    const runtimeSnapshot =
      (window as any).__IRONFORGE_GET_LEGACY_RUNTIME_STATE__?.() || {};

    return {
      liveBefore,
      liveAfter,
      runtimeActiveProgram: runtimeSnapshot.profile?.activeProgram ?? null,
      mergedActiveProgram: merged.profile?.activeProgram ?? null,
    };
  });

  expect(result.liveBefore).toBe('forge');
  expect(result.liveAfter).toBe('forge');
  expect(result.runtimeActiveProgram).toBe('forge');
  expect(typeof result.mergedActiveProgram).toBe('string');
});

test('profile store writes publish legacy snapshots without re-importing stray legacy fields', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const runtimeAccess = (window as any).__IRONFORGE_LEGACY_RUNTIME_ACCESS__;
    const profileBridge = (window as any).__IRONFORGE_STORES__?.profile;
    const dataBridge = (window as any).__IRONFORGE_STORES__?.data;
    const currentProfile = structuredClone(profileBridge?.getState?.().profile || {});

    runtimeAccess?.write?.('profile', {
      ...currentProfile,
      legacyOnlyBridgeField: 'stale-legacy-value',
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 5,
        },
      }),
    });

    const nextProfile = profileBridge?.updateProfile?.({
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 4,
        },
      }),
    });
    const canonicalProfile = profileBridge?.getState?.().profile || null;
    const runtimeSnapshot =
      (window as any).__IRONFORGE_GET_LEGACY_RUNTIME_STATE__?.() || {};
    const mirroredProfile = dataBridge?.getState?.().profile || null;

    return {
      returnedDays: nextProfile?.preferences?.trainingDaysPerWeek ?? null,
      canonicalDays: canonicalProfile?.preferences?.trainingDaysPerWeek ?? null,
      mirroredDays: mirroredProfile?.preferences?.trainingDaysPerWeek ?? null,
      legacyDays: runtimeSnapshot.profile?.preferences?.trainingDaysPerWeek ?? null,
      canonicalHasLegacyOnly:
        Object.prototype.hasOwnProperty.call(canonicalProfile || {}, 'legacyOnlyBridgeField'),
      mirroredHasLegacyOnly:
        Object.prototype.hasOwnProperty.call(mirroredProfile || {}, 'legacyOnlyBridgeField'),
      legacyHasLegacyOnly:
        Object.prototype.hasOwnProperty.call(
          runtimeSnapshot.profile || {},
          'legacyOnlyBridgeField'
        ),
    };
  });

  expect(result.returnedDays).toBe(4);
  expect(result.canonicalDays).toBe(4);
  expect(result.mirroredDays).toBe(4);
  expect(result.legacyDays).toBe(4);
  expect(result.canonicalHasLegacyOnly).toBe(false);
  expect(result.mirroredHasLegacyOnly).toBe(false);
  expect(result.legacyHasLegacyOnly).toBe(false);
});

test('legacy runtime profile updates route through the typed owner and refresh the compatibility snapshot', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const nextProfile = {
      ...(profile || {}),
      activeProgram: 'stronglifts5x5',
      preferences: normalizeTrainingPreferences({
        preferences: {
          ...getDefaultTrainingPreferences(),
          trainingDaysPerWeek: 4,
        },
      }),
      programs: {
        ...(((profile || {}) as Record<string, any>).programs || {}),
        stronglifts5x5: {
          ...(window as any).__IRONFORGE_E2E__?.program?.getInitialState?.('stronglifts5x5'),
          testMarker: 'slice-3',
        },
      },
    };

    (window as any).__IRONFORGE_SET_LEGACY_RUNTIME_STATE__?.({
      profile: nextProfile,
    });

    const canonicalProfile =
      (window as any).__IRONFORGE_STORES__?.profile?.getState?.().profile || null;
    const programState =
      (window as any).__IRONFORGE_STORES__?.program?.getState?.() || null;
    const runtimeSnapshot =
      (window as any).__IRONFORGE_GET_LEGACY_RUNTIME_STATE__?.() || {};

    return {
      canonicalActiveProgram: canonicalProfile?.activeProgram ?? null,
      canonicalDays: canonicalProfile?.preferences?.trainingDaysPerWeek ?? null,
      canonicalMarker:
        canonicalProfile?.programs?.stronglifts5x5?.testMarker ?? null,
      programStoreActiveProgram: programState?.activeProgramId ?? null,
      programStoreMarker:
        programState?.activeProgramState?.testMarker ?? null,
      legacyActiveProgram: runtimeSnapshot.profile?.activeProgram ?? null,
      legacyMarker:
        runtimeSnapshot.profile?.programs?.stronglifts5x5?.testMarker ?? null,
    };
  });

  expect(result.canonicalActiveProgram).toBe('stronglifts5x5');
  expect(result.canonicalDays).toBe(4);
  expect(result.canonicalMarker).toBe('slice-3');
  expect(result.programStoreActiveProgram).toBe('stronglifts5x5');
  expect(result.programStoreMarker).toBe('slice-3');
  expect(result.legacyActiveProgram).toBe('stronglifts5x5');
  expect(result.legacyMarker).toBe('slice-3');
});

test('legacy runtime rejects profile-owned writes when the profile store bridge is unavailable', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const previousBridge = (window as any).__IRONFORGE_PROFILE_STORE__;
    let errorMessage = '';

    try {
      delete (window as any).__IRONFORGE_PROFILE_STORE__;
      (window as any).__IRONFORGE_SET_LEGACY_RUNTIME_STATE__?.({
        profile: {
          ...(profile || {}),
          activeProgram: 'forge',
        },
      });
    } catch (error) {
      errorMessage = String((error as Error)?.message || error || '');
    } finally {
      (window as any).__IRONFORGE_PROFILE_STORE__ = previousBridge;
    }

    return {
      errorMessage,
      canonicalActiveProgram:
        (window as any).__IRONFORGE_STORES__?.profile?.getState?.().profile
          ?.activeProgram || null,
    };
  });

  expect(result.errorMessage).toContain('Profile store bridge is required');
  expect(result.canonicalActiveProgram).toBe('forge');
});

test('legacy sync callers fail visibly when the sync runtime bridge is unavailable', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(async () => {
    const runtimeWindow = window as Window & Record<string, any>;
    const previousRuntime = runtimeWindow.__IRONFORGE_SYNC_RUNTIME__;
    const previousShowToast = runtimeWindow.showToast;
    const toastMessages: string[] = [];
    let errorMessage = '';

    runtimeWindow.showToast = (message: string) => {
      toastMessages.push(String(message || ''));
    };

    try {
      delete runtimeWindow.__IRONFORGE_SYNC_RUNTIME__;
      await loadData({ allowCloudSync: false });
    } catch (error) {
      errorMessage = String((error as Error)?.message || error || '');
    } finally {
      runtimeWindow.__IRONFORGE_SYNC_RUNTIME__ = previousRuntime;
      runtimeWindow.showToast = previousShowToast;
    }

    return {
      errorMessage,
      toastMessages,
    };
  });

  expect(result.errorMessage).toContain('Sync runtime is not ready for loadData');
  expect(result.toastMessages).toContain(
    'Sync is still starting. Please try again in a moment.'
  );
});

test('blank schedule sport name survives normalization instead of reverting to the locale default', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const nextSchedule = {
      sportName: '',
      sportDays: [1, '3', 3, 9],
      sportIntensity: 'moderate',
      sportLegsHeavy: false,
    };
    normalizeScheduleState(nextSchedule);
    return nextSchedule;
  });

  expect(result).toEqual({
    sportName: '',
    sportDays: [1, 3],
    sportIntensity: 'moderate',
    sportLegsHeavy: false,
  });
});

test('bootstrap leaves plain legacy workouts untouched when no commentary migration is needed', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    return (window as any).__IRONFORGE_APP_RUNTIME__?.bootstrapProfileRuntime?.({
      profile: structuredClone(profile),
      schedule: structuredClone(schedule),
      workouts: [
        {
          id: 'plain-legacy-workout',
          date: '2026-03-12T10:00:00.000Z',
          type: 'forge',
          program: 'forge',
          exercises: [],
        },
      ],
      applyToStore: false,
    });
  });

  expect(result.changed.workouts).toBe(false);
  expect(result.workouts[0].commentary ?? null).toBe(null);
});

test('saveWorkouts delegates workout cache persistence to the typed runtime bridge', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(async () => {
    const runtime = (window as any).__IRONFORGE_WORKOUT_PERSISTENCE_RUNTIME__;
    const originalSaveWorkouts = runtime?.saveWorkouts;
    const userId = 'workout-runtime-cache-user';
    let calls = 0;
    let delegatedUserId = '';
    let cacheKey = '';

    try {
      (window as any).__IRONFORGE_TEST_USER_ID__ = userId;
      workouts = [
        {
          id: 'bridge-workout-1',
          date: '2026-03-12T10:00:00.000Z',
          program: 'forge',
          type: 'forge',
          exercises: [],
        },
      ];

      runtime.saveWorkouts = (input?: Record<string, any>) => {
        calls += 1;
        delegatedUserId = String(input?.userId || '');
        cacheKey =
          window.getLocalCacheKey?.('ic_workouts', delegatedUserId) ||
          `ic_workouts::${delegatedUserId}`;
        if (cacheKey) {
          localStorage.removeItem(cacheKey);
        }
        return originalSaveWorkouts?.call(runtime, input) ?? false;
      };

      await saveWorkouts();

      return {
        runtimePresent: !!runtime,
        calls,
        delegatedUserId,
        cachedIds: JSON.parse(localStorage.getItem(cacheKey) || '[]').map(
          (item: Record<string, any>) => String(item?.id || '')
        ),
      };
    } finally {
      if (runtime) {
        runtime.saveWorkouts = originalSaveWorkouts;
      }
      delete (window as any).__IRONFORGE_TEST_USER_ID__;
    }
  });

  expect(result.runtimePresent).toBe(true);
  expect(result.calls).toBe(1);
  expect(result.delegatedUserId).not.toBe('');
  expect(result.cachedIds).toEqual(['bridge-workout-1']);
});

test('pullWorkoutsFromTable delegates table merge to the typed runtime and keeps the readiness side effect local', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(async () => {
    const runtime = (window as any).__IRONFORGE_WORKOUT_PERSISTENCE_RUNTIME__;
    const originalPullWorkoutsFromTable = runtime?.pullWorkoutsFromTable;
    const originalSaveProfileData = saveProfileData;
    let runtimeCalls = 0;
    let saveProfileCalls = 0;

    try {
      profile.syncMeta = {
        ...(profile.syncMeta || {}),
      };
      delete profile.syncMeta.workoutsTableReady;
      saveProfileData = async () => {
        saveProfileCalls += 1;
      };
      runtime.pullWorkoutsFromTable = async (_input?: Record<string, any>) => {
        runtimeCalls += 1;
        return {
          usedTable: true,
          didBackfill: true,
          workouts: [
            {
              id: 'table-owned-1',
              date: '2026-03-12T10:00:00.000Z',
              program: 'forge',
              type: 'forge',
              exercises: [],
            },
          ],
          shouldMarkWorkoutTableReady: true,
        };
      };

      const pullResult = await pullWorkoutsFromTable([
        {
          id: 'fallback-owned-1',
          date: '2026-03-10T10:00:00.000Z',
          program: 'forge',
          type: 'forge',
          exercises: [],
        },
      ]);

      return {
        runtimePresent: !!runtime,
        runtimeCalls,
        saveProfileCalls,
        workoutsTableReady: profile?.syncMeta?.workoutsTableReady === true,
        workoutIds: Array.isArray(pullResult.workouts)
          ? pullResult.workouts.map((item: Record<string, any>) =>
              String(item?.id || '')
            )
          : [],
      };
    } finally {
      if (runtime) {
        runtime.pullWorkoutsFromTable = originalPullWorkoutsFromTable;
      }
      saveProfileData = originalSaveProfileData;
    }
  });

  expect(result.runtimePresent).toBe(true);
  expect(result.runtimeCalls).toBe(1);
  expect(result.saveProfileCalls).toBe(1);
  expect(result.workoutsTableReady).toBe(true);
  expect(result.workoutIds).toEqual(['table-owned-1']);
});

test('loadData delegates orchestration to the typed sync runtime bridge', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(async () => {
    const runtime = (window as any).__IRONFORGE_SYNC_RUNTIME__;
    const originalLoadData = runtime?.loadData;
    let calls = 0;

    try {
      runtime.loadData = async (options?: Record<string, any>, deps?: Record<string, any>) => {
        calls += 1;
        return (
          (await originalLoadData?.call(runtime, options, deps)) ?? undefined
        );
      };

      await loadData({
        allowCloudSync: false,
        userId: (window as any).__IRONFORGE_TEST_USER_ID__ || 'e2e-user',
      });

      return {
        runtimePresent: !!runtime,
        calls,
        activeProgram:
          (window as any).__IRONFORGE_STORES__?.profile?.getState?.().profile
            ?.activeProgram || null,
      };
    } finally {
      if (runtime) {
        runtime.loadData = originalLoadData;
      }
    }
  });

  expect(result.runtimePresent).toBe(true);
  expect(result.calls).toBe(1);
  expect(result.activeProgram).toBe('forge');
});

test('setupRealtimeSync delegates subscription orchestration to the typed sync runtime bridge', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    const runtime = (window as any).__IRONFORGE_SYNC_RUNTIME__;
    const originalSetupRealtimeSync = runtime?.setupRealtimeSync;
    let calls = 0;

    try {
      runtime.setupRealtimeSync = (deps?: Record<string, any>) => {
        calls += 1;
        return originalSetupRealtimeSync?.call(runtime, deps);
      };

      setupRealtimeSync();

      return {
        runtimePresent: !!runtime,
        calls,
      };
    } finally {
      if (runtime) {
        runtime.setupRealtimeSync = originalSetupRealtimeSync;
      }
    }
  });

  expect(result.runtimePresent).toBe(true);
  expect(result.calls).toBe(1);
});

test('loadData bootstraps legacy ats and flat forge state through the typed runtime', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(async () => {
    await (window as any).__IRONFORGE_E2E__?.app?.seedData?.({
      profile: {
        defaultRest: 150,
        language: 'en',
        activeProgram: 'w531',
        atsLifts: {
          squat: { tm: 120 },
        },
        atsWeek: 3,
        atsDayNum: 2,
        atsRounding: 2.5,
        atsDaysPerWeek: 3,
        atsMode: 'sets',
        atsWeekStartDate: '2026-03-01T00:00:00.000Z',
      },
      schedule: {
        sportName: 'Hockey',
        hockeyDays: [1, 3],
        sportIntensity: 'moderate',
        sportLegsHeavy: false,
      },
      workouts: [
        {
          id: 'legacy-ats-1',
          date: '2026-03-12T10:00:00.000Z',
          type: 'ats',
          atsWeek: 3,
          atsDayNum: 2,
          exercises: [],
        },
      ],
    });

    const profileState =
      (window as any).__IRONFORGE_STORES__?.profile?.getState?.() || {};
    const dataState = (window as any).__IRONFORGE_STORES__?.data?.getState?.() || {};
    const runtimeSnapshot =
      (window as any).__IRONFORGE_GET_LEGACY_RUNTIME_STATE__?.() || {};

    return {
      activeProgram: profileState.profile?.activeProgram ?? null,
      programKeys: Object.keys(profileState.profile?.programs || {}).sort(),
      forgeWeek: profileState.profile?.programs?.forge?.week ?? null,
      forgeDayNum: profileState.profile?.programs?.forge?.dayNum ?? null,
      schedule: profileState.schedule || null,
      workout: dataState.workouts?.[0] || null,
      runtimeActiveProgram: runtimeSnapshot.profile?.activeProgram ?? null,
    };
  });

  expect(result.activeProgram).toBe('forge');
  expect(result.runtimeActiveProgram).toBe('forge');
  expect(result.programKeys).toEqual(
    expect.arrayContaining(['forge', 'stronglifts5x5', 'wendler531'])
  );
  expect(typeof result.forgeWeek).toBe('number');
  expect(result.schedule).toEqual({
    sportName: 'Cardio',
    sportDays: [1, 3],
    sportIntensity: 'moderate',
    sportLegsHeavy: false,
  });
  expect(result.workout).toEqual(
    expect.objectContaining({
      type: 'forge',
      program: 'forge',
      programDayNum: 2,
      programMeta: expect.objectContaining({ week: 3 }),
    })
  );
});

test('profile document merge canonicalizes program ids and fills typed defaults', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY, 'program:wendler531']);
    const merged = buildStateFromProfileDocuments(
      [
        {
          doc_key: PROFILE_CORE_DOC_KEY,
          payload: {
            defaultRest: 120,
            language: 'en',
            activeProgram: 'w531',
            preferences: getDefaultTrainingPreferences(),
            coaching: getDefaultCoachingProfile(),
          },
          client_updated_at: '2026-03-12T10:00:00.000Z',
          updated_at: '2026-03-12T10:00:00.000Z',
        },
        {
          doc_key: 'program:wendler531',
          payload: {
            cycle: 2,
            week: 3,
            daysPerWeek: 4,
          },
          client_updated_at: '2026-03-12T10:00:00.000Z',
          updated_at: '2026-03-12T10:00:00.000Z',
        },
      ],
      {
        ...structuredClone(profile),
        syncMeta: {
          ...(profile.syncMeta || {}),
          profileUpdatedAt: '2026-03-12T09:00:00.000Z',
          programUpdatedAt: {
            ...((profile.syncMeta || {}).programUpdatedAt || {}),
            wendler531: '2026-03-12T09:00:00.000Z',
          },
        },
      },
      schedule
    );
    return {
      activeProgram: merged.profile.activeProgram,
      programKeys: Object.keys(merged.profile.programs || {}).sort(),
      wendlerState: merged.profile.programs?.wendler531 || null,
      hasLegacyAlias: Object.prototype.hasOwnProperty.call(
        merged.profile.programs || {},
        'w531'
      ),
    };
  });

  expect(result.activeProgram).toBe('wendler531');
  expect(result.programKeys).toEqual(
    expect.arrayContaining(['forge', 'stronglifts5x5', 'wendler531'])
  );
  expect(result.wendlerState).toEqual(
    expect.objectContaining({ cycle: 2, week: 3 })
  );
  expect(result.hasLegacyAlias).toBe(false);
});

test('remote profile document normalizes malformed body metrics before applying them', async ({
  page,
}) => {
  await openAppShell(page);

  const result = await page.evaluate(() => {
    clearDocKeysDirty([PROFILE_CORE_DOC_KEY]);
    const localProfile = {
      ...structuredClone(profile),
      syncMeta: {
        ...(profile.syncMeta || {}),
        profileUpdatedAt: '2026-03-12T09:00:00.000Z',
      },
    };
    const rows = [
      {
        doc_key: PROFILE_CORE_DOC_KEY,
        payload: {
          defaultRest: 120,
          language: 'en',
          bodyMetrics: {
            sex: 'robot',
            activityLevel: 'extreme',
            weight: 500,
            height: 95,
            age: 200,
            targetWeight: 'oops',
            bodyGoal: 'bulk_forever',
          },
          preferences: getDefaultTrainingPreferences(),
          coaching: getDefaultCoachingProfile(),
          activeProgram: 'forge',
        },
        client_updated_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T09:00:00.000Z',
      },
    ];
    const merged = buildStateFromProfileDocuments(rows, localProfile, schedule);
    return merged.profile.bodyMetrics;
  });

  expect(result).toEqual({
    sex: null,
    activityLevel: null,
    weight: 300,
    height: 100,
    age: 100,
    targetWeight: null,
    bodyGoal: null,
  });
});
