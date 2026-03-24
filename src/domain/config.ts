export const LOCAL_CACHE_KEYS = {
  workouts: 'ic_workouts',
  schedule: 'ic_schedule',
  profile: 'ic_profile',
  activeWorkout: 'ic_active_workout',
  syncState: 'ic_sync_state',
  nutritionHistory: 'ic_nutrition_history',
  nutritionDayPrefix: 'ic_nutrition_day',
  nutritionTrace: 'ic_nutrition_trace',
} as const;

export const PROFILE_DOCUMENT_KEYS = {
  core: 'profile_core',
  schedule: 'schedule',
  programPrefix: 'program:',
} as const;

export const FATIGUE_CONFIG = {
  lookbackDays: 10,
  muscularHalfLifeDays: 4.5,
  cnsHalfLifeDays: 3.25,
  lift: {
    muscularBase: 8,
    muscularSetWeight: 1.9,
    muscularRpeWeight: 4,
    cnsBase: 10,
    cnsSetWeight: 1.05,
    cnsRpeWeight: 7,
    loadFactorDivisor: 200,
    loadFactorMaxBonus: 0.35,
    repFactorPerRepFromFive: 0.05,
    repFactorMin: 0.9,
    repFactorMax: 1.25,
    sessionCap: 70,
  },
  sport: {
    easy: { muscular: 6, cns: 5 },
    moderate: { muscular: 11, cns: 9 },
    hard: { muscular: 17, cns: 14 },
    durationMin: 0.75,
    durationMax: 1.5,
    effortBase: 0.85,
    effortPerRpeAboveSix: 0.12,
    effortMax: 1.33,
    extraSubtypeCnsMultiplier: 1.15,
  },
} as const;

export const MUSCLE_LOAD_CONFIG = {
  lookbackDays: 7,
  halfLifeDays: 3.5,
  displayLimit: 3,
  thresholds: { high: 8, moderate: 4, light: 1.5 },
  liftPrimaryWeight: 1,
  liftSecondaryWeight: 0.5,
  liftRpeScaleBase: 0.8,
  liftRpeScalePerPoint: 0.16,
  liftRpeScaleMax: 1.6,
} as const;

export const SPORT_RECENT_HOURS = {
  easy: 18,
  moderate: 24,
  hard: 30,
} as const;

export type LocalCacheKey = keyof typeof LOCAL_CACHE_KEYS;
export type ProfileDocumentKey =
  (typeof PROFILE_DOCUMENT_KEYS)[keyof typeof PROFILE_DOCUMENT_KEYS];
