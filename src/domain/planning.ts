import {
  FATIGUE_CONFIG as DEFAULT_FATIGUE_CONFIG,
  MUSCLE_LOAD_CONFIG as DEFAULT_MUSCLE_LOAD_CONFIG,
} from './config';
import type {
  FatigueResult,
  PlanningDecision,
  Profile,
  SportSchedule,
  WorkoutRecord,
} from './types';

export type ProgramDifficultyMeta = {
  key: string;
  labelKey: string;
  fallback: string;
};

export type ProgramCapabilities = Record<string, unknown> & {
  difficulty?: string;
  frequencyRange?: {
    min: number;
    max: number;
  };
  recommendationScore?: (
    days: number,
    preferences?: Record<string, unknown>
  ) => number;
};

export type PlanningContextInput = Record<string, unknown> & {
  profile?: Profile | Record<string, unknown> | null;
  schedule?: SportSchedule | Record<string, unknown> | null;
  workouts?: WorkoutRecord[];
  activeProgram?: Record<string, unknown> | null;
  activeProgramState?: Record<string, unknown> | null;
  fatigue?: FatigueResult | Record<string, unknown> | null;
  sportContext?: Record<string, unknown> | null;
};

export type TrainingDecision = PlanningDecision &
  Record<string, unknown> & {
    action: string;
    restrictionFlags: string[];
    reasonCodes: string[];
    timeBudgetMinutes?: number;
    recommendedSessionOption?: string;
  };

export type CoachingInsights = Record<string, unknown> & {
  recommendation?: Record<string, unknown> | null;
};

export type InitialPlanRecommendation = Record<string, unknown> & {
  programId?: string;
  why?: string[];
  fitReasons?: string[];
  weekTemplate?: Array<Record<string, unknown>>;
  initialAdjustments?: string[];
};

export type WeekPlanPreview = Record<string, unknown>;

export type ComputeFatigueInput = {
  workouts?: WorkoutRecord[];
  schedule?: SportSchedule | Record<string, unknown> | null;
};

type PlanningWindow = Window & {
  FATIGUE_CONFIG?: typeof DEFAULT_FATIGUE_CONFIG;
  MUSCLE_LOAD_CONFIG?: typeof DEFAULT_MUSCLE_LOAD_CONFIG;
  getRecentDisplayMuscleLoads?: (days?: number) => Record<string, number>;
  buildPlanningContext?: (
    input?: PlanningContextInput
  ) => Record<string, unknown> | null;
  getTodayTrainingDecision?: (
    context?: Record<string, unknown> | null
  ) => TrainingDecision | null;
  getCoachingInsights?: (
    input?: Record<string, unknown>
  ) => CoachingInsights | null;
  getInitialPlanRecommendation?: (
    input?: Record<string, unknown>
  ) => InitialPlanRecommendation | null;
  getWeekPlanPreview?: (
    planningContext?: Record<string, unknown> | null,
    workoutList?: WorkoutRecord[],
    scheduleLike?: SportSchedule | Record<string, unknown> | null,
    programLike?: Record<string, unknown> | null,
    programState?: Record<string, unknown> | null
  ) => WeekPlanPreview | null;
  buildOnboardingRecommendation?: (
    draft?: Record<string, unknown>
  ) => InitialPlanRecommendation | null;
  getProgramCapabilities?: (programId?: string | null) => ProgramCapabilities;
  getProgramDifficultyMeta?: (
    programId?: string | null
  ) => ProgramDifficultyMeta | null;
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getPlanningWindow(): PlanningWindow | null {
  if (typeof window === 'undefined') return null;
  return window as PlanningWindow;
}

export function getFatigueConfig() {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.FATIGUE_CONFIG || DEFAULT_FATIGUE_CONFIG);
}

export function getMuscleLoadConfig() {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.MUSCLE_LOAD_CONFIG || DEFAULT_MUSCLE_LOAD_CONFIG);
}

function clampPlanningValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isSportWorkout(workout: WorkoutRecord | Record<string, unknown>) {
  return workout?.type === 'sport' || workout?.type === 'hockey';
}

function getCompletedWorkSets(exercise: Record<string, unknown> | null | undefined) {
  return Array.isArray(exercise?.sets)
    ? exercise.sets.filter((set) => set?.done === true && !set.isWarmup)
    : [];
}

function getWorkoutAgeDays(workout: WorkoutRecord, now: number) {
  const ts = new Date(workout?.date).getTime();
  if (!Number.isFinite(ts)) return null;
  return (now - ts) / 86400000;
}

function getFatigueDecayWeight(ageDays: number | null, halfLifeDays: number) {
  if (ageDays === null || ageDays < 0) return 0;
  const halfLife = Math.max(0.1, Number(halfLifeDays) || 1);
  return Math.pow(0.5, ageDays / halfLife);
}

function getLiftWorkoutFatigueImpulse(
  workout: WorkoutRecord,
  config: typeof DEFAULT_FATIGUE_CONFIG
) {
  const liftConfig = config?.lift || DEFAULT_FATIGUE_CONFIG.lift;
  let completedSets = 0;
  let totalReps = 0;
  let weightCount = 0;
  let totalWeight = 0;

  (Array.isArray(workout?.exercises) ? workout.exercises : []).forEach(
    (exercise) => {
      getCompletedWorkSets(exercise).forEach((set) => {
        completedSets += 1;
        const reps = parseFloat(String(set?.reps ?? ''));
        if (Number.isFinite(reps) && reps > 0) {
          totalReps += reps;
        }
        const weight = parseFloat(String(set?.weight ?? ''));
        if (Number.isFinite(weight) && weight >= 0) {
          totalWeight += weight;
          weightCount += 1;
        }
      });
    }
  );

  if (!completedSets) return { muscular: 0, cns: 0 };

  const avgReps = totalReps > 0 ? totalReps / completedSets : 5;
  const repFactor = clampPlanningValue(
    1 + (avgReps - 5) * (liftConfig.repFactorPerRepFromFive || 0.05),
    liftConfig.repFactorMin || 0.9,
    liftConfig.repFactorMax || 1.25
  );
  const avgWeightKg = weightCount ? totalWeight / weightCount : 0;
  const loadFactor =
    1 +
    clampPlanningValue(
      avgWeightKg / (liftConfig.loadFactorDivisor || 200),
      0,
      liftConfig.loadFactorMaxBonus || 0.35
    );
  const effort = clampPlanningValue(
    (parseFloat(String(workout?.rpe ?? '7')) || 7) - 6,
    0,
    4
  );

  return {
    muscular: Math.min(
      liftConfig.sessionCap || 70,
      (liftConfig.muscularBase || 8) +
        completedSets *
          (liftConfig.muscularSetWeight || 1.9) *
          repFactor *
          loadFactor +
        effort * (liftConfig.muscularRpeWeight || 4)
    ),
    cns: Math.min(
      liftConfig.sessionCap || 70,
      (liftConfig.cnsBase || 10) +
        completedSets * (liftConfig.cnsSetWeight || 1.05) * loadFactor +
        effort * (liftConfig.cnsRpeWeight || 7)
    ),
  };
}

function getSportFatigueConfig(
  workout: WorkoutRecord,
  scheduleLike: SportSchedule | Record<string, unknown> | null | undefined,
  config: typeof DEFAULT_FATIGUE_CONFIG
) {
  const intensity =
    workout?.type === 'hockey'
      ? 'hard'
      : String(scheduleLike?.sportIntensity || 'hard');
  const sportConfig = config?.sport as unknown as Record<
    string,
    { muscular: number; cns: number }
  >;
  return sportConfig?.[intensity] || sportConfig?.hard || { muscular: 17, cns: 14 };
}

function getSportWorkoutFatigueImpulse(
  workout: WorkoutRecord,
  scheduleLike: SportSchedule | Record<string, unknown> | null | undefined,
  config: typeof DEFAULT_FATIGUE_CONFIG
) {
  const sportConfig = config?.sport || DEFAULT_FATIGUE_CONFIG.sport;
  const base = getSportFatigueConfig(workout, scheduleLike, config);
  const durationHours = Math.max(
    0,
    (parseFloat(String(workout?.duration ?? '0')) || 0) / 3600
  );
  const durationFactor = clampPlanningValue(
    durationHours || 1,
    sportConfig.durationMin || 0.75,
    sportConfig.durationMax || 1.5
  );
  const effortFactor = clampPlanningValue(
    (sportConfig.effortBase || 0.85) +
      Math.max(0, (parseFloat(String(workout?.rpe ?? '7')) || 7) - 6) *
        (sportConfig.effortPerRpeAboveSix || 0.12),
    sportConfig.effortBase || 0.85,
    sportConfig.effortMax || 1.33
  );
  const cnsMultiplier =
    workout?.subtype === 'extra'
      ? sportConfig.extraSubtypeCnsMultiplier || 1.15
      : 1;

  return {
    muscular: (base.muscular || 0) * durationFactor * effortFactor,
    cns: (base.cns || 0) * durationFactor * effortFactor * cnsMultiplier,
  };
}

function getDaysSinceMostRecent(
  workouts: WorkoutRecord[],
  predicate: (workout: WorkoutRecord) => boolean
) {
  const latest = workouts
    .filter(predicate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!latest) return 99;
  const ageDays = getWorkoutAgeDays(latest, Date.now());
  return ageDays === null ? 99 : ageDays;
}

export function computeFatigue(input?: ComputeFatigueInput) {
  const config = getFatigueConfig();
  const workouts = Array.isArray(input?.workouts) ? input.workouts : [];
  const scheduleLike = input?.schedule || null;
  const now = Date.now();
  const lookbackDays = Math.max(1, parseInt(String(config?.lookbackDays), 10) || 10);
  let muscular = 0;
  let cns = 0;
  let recentLiftSessions = 0;
  let recentSportSessions = 0;

  workouts.forEach((workout) => {
    const ageDays = getWorkoutAgeDays(workout, now);
    if (ageDays === null || ageDays < 0 || ageDays > lookbackDays) return;
    const impulse = isSportWorkout(workout)
      ? getSportWorkoutFatigueImpulse(workout, scheduleLike, config)
      : getLiftWorkoutFatigueImpulse(workout, config);
    if (!impulse.muscular && !impulse.cns) return;

    if (isSportWorkout(workout)) recentSportSessions += 1;
    else recentLiftSessions += 1;

    muscular +=
      impulse.muscular *
      getFatigueDecayWeight(ageDays, config?.muscularHalfLifeDays || 4.5);
    cns +=
      impulse.cns *
      getFatigueDecayWeight(ageDays, config?.cnsHalfLifeDays || 3.25);
  });

  const roundedMuscular = Math.round(clampPlanningValue(muscular, 0, 100));
  const roundedCns = Math.round(clampPlanningValue(cns, 0, 100));
  return {
    muscular: roundedMuscular,
    cns: roundedCns,
    overall: Math.round((roundedMuscular + roundedCns) * 0.5),
    computedAt: new Date().toISOString(),
    daysSinceLift: getDaysSinceMostRecent(workouts, (workout) => !isSportWorkout(workout)),
    daysSinceSport: getDaysSinceMostRecent(workouts, (workout) => isSportWorkout(workout)),
    recentLiftSessions,
    recentSportSessions,
  };
}

export function getRecentDisplayMuscleLoads(days?: number) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.getRecentDisplayMuscleLoads?.(days) || {});
}

export function buildPlanningContext(input?: PlanningContextInput) {
  const runtimeWindow = getPlanningWindow();
  return runtimeWindow?.buildPlanningContext?.(input) || null;
}

export function getTodayTrainingDecision(
  context?: Record<string, unknown> | null
) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.getTodayTrainingDecision?.(context) || null);
}

export function getCoachingInsights(input?: Record<string, unknown>) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.getCoachingInsights?.(input) || null);
}

export function getInitialPlanRecommendation(input?: Record<string, unknown>) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.getInitialPlanRecommendation?.(input) || null);
}

export function getWeekPlanPreview(
  planningContext?: Record<string, unknown> | null,
  workoutList?: WorkoutRecord[],
  scheduleLike?: SportSchedule | Record<string, unknown> | null,
  programLike?: Record<string, unknown> | null,
  programState?: Record<string, unknown> | null
) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(
    runtimeWindow?.getWeekPlanPreview?.(
      planningContext,
      workoutList,
      scheduleLike,
      programLike,
      programState
    ) || null
  );
}

export function buildOnboardingRecommendation(draft?: Record<string, unknown>) {
  const runtimeWindow = getPlanningWindow();
  return cloneJson(runtimeWindow?.buildOnboardingRecommendation?.(draft) || null);
}

export function getProgramCapabilities(programId?: string | null) {
  const runtimeWindow = getPlanningWindow();
  return { ...(runtimeWindow?.getProgramCapabilities?.(programId) || {}) };
}

export function getProgramDifficultyMeta(programId?: string | null) {
  const runtimeWindow = getPlanningWindow();
  return (
    cloneJson(runtimeWindow?.getProgramDifficultyMeta?.(programId) || null) || {
      key: 'intermediate',
      labelKey: 'program.difficulty.intermediate',
      fallback: 'Intermediate',
    }
  );
}
