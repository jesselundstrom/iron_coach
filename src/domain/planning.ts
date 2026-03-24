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

type PlanningWindow = Window & {
  FATIGUE_CONFIG?: typeof DEFAULT_FATIGUE_CONFIG;
  MUSCLE_LOAD_CONFIG?: typeof DEFAULT_MUSCLE_LOAD_CONFIG;
  computeFatigue?: () => FatigueResult | null;
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

export function computeFatigue() {
  const runtimeWindow = getPlanningWindow();
  return (
    cloneJson(runtimeWindow?.computeFatigue?.() || null) || {
      muscular: 0,
      cns: 0,
      overall: 0,
    }
  );
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
