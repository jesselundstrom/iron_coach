import type {
  PlanningDecision,
  Profile,
  SessionOption,
  SportSchedule,
  WorkoutExercise,
  WorkoutRecord,
} from './types';

export type ProgramSettingsRenderer<TState> = (
  state: TState,
  container: HTMLElement
) => void;

export type ProgramSessionBuildContext = {
  preview?: boolean;
  planningDecision?: PlanningDecision | null;
  effectiveDecision?: PlanningDecision | null;
  effectiveSessionMode?: string | null;
  energyBoost?: boolean;
  programRuntime?: {
    daysPerWeek?: number | null;
    weekStartDate?: string | null;
    sessionReadiness?: string | null;
  } | null;
  [key: string]: unknown;
};

export type ProgramBanner = {
  style?: string;
  border?: string;
  color?: string;
  html: string;
};

export type ProgramConstraints = {
  exerciseOverrides?: Record<
    string,
    {
      filters?: Record<string, unknown>;
      options?: string[];
      clearWeightOnSwap?: boolean;
    }
  >;
};

export interface ProgramPlugin<TState extends Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  icon: string;
  legLifts?: string[];
  getInitialState: () => TState;
  getSessionOptions?: (
    state: TState,
    workouts: WorkoutRecord[],
    schedule: SportSchedule,
    context?: ProgramSessionBuildContext
  ) => SessionOption[];
  buildSession?: (
    selectedOption: string,
    state: TState,
    context?: ProgramSessionBuildContext
  ) => WorkoutExercise[];
  getSessionLabel?: (
    selectedOption: string,
    state: TState,
    context?: ProgramSessionBuildContext
  ) => string;
  getBlockInfo?: (
    state: TState,
    context?: ProgramSessionBuildContext
  ) => Record<string, unknown> | null;
  adjustAfterSession?: (
    exercises: WorkoutExercise[],
    state: TState,
    selectedOption?: string,
    context?: ProgramSessionBuildContext
  ) => TState;
  advanceState?: (
    state: TState,
    sessionsThisWeek?: number,
    context?: ProgramSessionBuildContext
  ) => TState;
  dateCatchUp?: (state: TState) => TState;
  migrateState?: (
    state: Record<string, unknown>,
    context?: ProgramSessionBuildContext
  ) => TState;
  renderSettings?: ProgramSettingsRenderer<TState>;
  renderSimpleSettings?: ProgramSettingsRenderer<TState>;
  saveSettings?: (state: TState) => TState;
  saveSimpleSettings?: (state: TState) => TState;
  getSimpleSettingsSummary?: (state: TState) => string;
  getDashboardTMs?: (state: TState) => Array<Record<string, unknown>>;
  getBannerHTML?: (
    options: SessionOption[],
    state: TState,
    schedule: SportSchedule,
    workouts: WorkoutRecord[],
    fatigue?: Record<string, unknown> | null
  ) => ProgramBanner | null;
  getProgramConstraints?: (state: TState) => ProgramConstraints;
  adaptSession?: (
    baseSession: WorkoutExercise[],
    planningContext?: Record<string, unknown>,
    decision?: PlanningDecision | null
  ) => {
    exercises: WorkoutExercise[];
    adaptationEvents?: Array<Record<string, unknown>>;
    equipmentHint?: Record<string, unknown> | null;
  };
  getAuxSwapOptions?: (
    state: TState,
    exercise?: WorkoutExercise
  ) => string[] | Array<Record<string, unknown>>;
  getBackSwapOptions?: (
    state: TState,
    exercise?: WorkoutExercise
  ) => string[] | Array<Record<string, unknown>>;
  onAuxSwap?: (
    state: TState,
    payload?: Record<string, unknown>
  ) => TState | void;
  onBackSwap?: (
    state: TState,
    payload?: Record<string, unknown>
  ) => TState | void;
  getTrainingDaysRange?: () => { min: number; max: number };
  getCapabilities?: () => Record<string, unknown>;
  estimateStartingLoads?: (
    profile: Profile,
    workouts: WorkoutRecord[]
  ) => Array<Record<string, unknown>>;
  [key: string]: unknown;
}
