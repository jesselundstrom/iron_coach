import { normalizeWorkoutStartSnapshot } from '../../domain/workout-helpers';

type MutableRecord = Record<string, unknown>;

export type WorkoutToastPlan = {
  text: string;
  color: string;
  delay?: number;
};

export type PostWorkoutSummaryResult = {
  feedback?: string;
  notes?: string;
  goToNutrition?: boolean;
};

export type PostWorkoutOutcomeInput = {
  savedWorkout?: MutableRecord | null;
  summaryResult?: PostWorkoutSummaryResult | null;
  summaryData?: MutableRecord | null;
};

export type PostWorkoutOutcomeResult = {
  shouldSaveWorkouts: boolean;
  tmAdjustmentToast: string;
  goToNutrition: boolean;
  nutritionContext: MutableRecord | null;
  durationSignal?: string | null;
};

export type WorkoutStartPresentationInput = {
  activeWorkout?: MutableRecord | null;
  isBonus?: boolean;
  title?: string;
  programLabel?: string;
  programName?: string;
  sessionDescription?: string;
  effectiveDecision?: MutableRecord | null;
  planningContext?: MutableRecord | null;
  startSnapshot?: MutableRecord | null;
  schedule?: MutableRecord | null;
  legLifts?: Array<unknown>;
  isSportDay?: boolean;
  hadSportRecently?: boolean;
  isDeload?: boolean;
};

export type WorkoutStartPresentationResult = {
  title: string;
  descriptionText: string;
  descriptionVisible: boolean;
  immediateToast: WorkoutToastPlan;
  queuedToasts: WorkoutToastPlan[];
};

export type WorkoutSummaryPromptInput = {
  summaryData?: MutableRecord | null;
  canLogNutrition?: boolean;
  seed?: number;
};

export type WorkoutSummaryPromptState = {
  open: boolean;
  seed: number;
  kicker: string;
  title: string;
  programLabel: string;
  coachNote: string;
  notesLabel: string;
  notesPlaceholder: string;
  feedbackLabel: string;
  feedbackOptions: Array<{
    value: string;
    label: string;
  }>;
  nutritionLabel: string;
  doneLabel: string;
  notes: string;
  feedback: string | null;
  canLogNutrition: boolean;
  stats: Array<{
    key: string;
    accent: string;
    label: string;
    initialText: string;
  }>;
  summaryData: Record<string, unknown>;
};

export type WorkoutRestTimerInput = {
  restDuration?: unknown;
  restTotal?: unknown;
  restEndsAt?: unknown;
  restSecondsLeft?: unknown;
  profileDefaultRest?: unknown;
  now?: unknown;
};

export type WorkoutRestTimerResult = {
  restDuration: number;
  restTotal: number;
  restEndsAt: number;
  restSecondsLeft: number;
  restBarActive: boolean;
  shouldSkip: boolean;
  isComplete: boolean;
};

export type WorkoutRestDisplayInput = {
  restSecondsLeft?: unknown;
  restTotal?: unknown;
};

export type WorkoutRestDisplayResult = {
  text: string;
  className: string;
  arcOffset: number;
};

export type WorkoutRestLifecycleInput = WorkoutRestTimerInput & {
  mode?: 'sync' | 'complete' | 'skip' | string;
};

export type WorkoutRestLifecyclePlan = {
  timerState: WorkoutRestTimerResult;
  displayState: WorkoutRestDisplayResult;
  shouldComplete: boolean;
  shouldPlayBeep: boolean;
  hideDelayMs: number;
};

export type WorkoutRestHostDeps = {
  setInterval?: (callback: () => void, delay?: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  setTimeout?: (callback: () => void, delay?: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
};

export type WorkoutSessionSnapshotInput = {
  activeWorkout?: unknown;
  restDuration?: unknown;
  restEndsAt?: unknown;
  restSecondsLeft?: unknown;
  restTotal?: unknown;
  currentUser?: unknown;
  restBarActive?: unknown;
  rpePrompt?: Record<string, unknown> | null;
  summaryPrompt?: Record<string, unknown> | null;
  sportCheckPrompt?: Record<string, unknown> | null;
  exerciseGuidePrompt?: Record<string, unknown> | null;
};

export type WorkoutSessionSnapshotResult = {
  activeWorkout: unknown;
  restDuration: number;
  restEndsAt: number;
  restSecondsLeft: number;
  restTotal: number;
  currentUser: unknown;
  restBarActive: boolean;
  rpeOpen: boolean;
  rpePrompt: Record<string, unknown> | null;
  summaryOpen: boolean;
  summaryPrompt: Record<string, unknown> | null;
  sportCheckOpen: boolean;
  sportCheckPrompt: Record<string, unknown> | null;
  exerciseGuideOpen: boolean;
  exerciseGuidePrompt: Record<string, unknown> | null;
};

export type WorkoutTeardownPlanInput = {
  mode?: 'finish' | 'cancel' | string;
};

export type WorkoutTeardownPlanResult = {
  showNotStarted: boolean;
  hideActive: boolean;
  resetNotStartedView: boolean;
  notifyLogActive: boolean;
  updateDashboard: boolean;
  discardToast: string;
};

export type WorkoutSessionBootstrapInput = {
  programId?: string;
  selectedOption?: string;
  programMode?: string | null;
  programLabel?: string;
  sportContext?: MutableRecord | null;
  trainingDecision?: MutableRecord | null;
  planningContext?: MutableRecord | null;
  commentary?: MutableRecord | null;
  effectiveDecision?: MutableRecord | null;
  selectedSessionMode?: string;
  effectiveSessionMode?: string;
  sportAwareLowerBody?: boolean;
  sessionDescription?: string;
  sessionSnapshot?: MutableRecord | null;
  exercises?: Array<Record<string, unknown>>;
  startTime?: number;
  isBonus?: boolean;
};

export type WorkoutSessionBootstrapResult = {
  program: string;
  type: string;
  programOption?: string;
  programDayNum?: number;
  programMode?: unknown;
  programLabel: string;
  sportContext?: MutableRecord;
  planningDecision?: MutableRecord;
  planningContext?: MutableRecord;
  commentary?: MutableRecord;
  runnerState?: MutableRecord;
  sessionDescription: string;
  sessionSnapshot?: ReturnType<typeof normalizeWorkoutStartSnapshot> | null;
  rewardState: Record<string, unknown>;
  exercises: Array<Record<string, unknown>>;
  startTime: number;
  isBonus?: boolean;
};

export type WorkoutStartPlanInput = {
  prog?: MutableRecord | null;
  state?: MutableRecord | null;
  selectedOption?: string;
  sportContext?: MutableRecord | null;
  workouts?: Array<Record<string, unknown>> | null;
  schedule?: MutableRecord | null;
  profile?: MutableRecord | null;
  pendingSessionMode?: string | null;
  pendingEnergyLevel?: string | null;
};

export type WorkoutStartPlanResult = {
  activeWorkout: WorkoutSessionBootstrapResult | null;
  startSnapshot: ReturnType<typeof normalizeWorkoutStartSnapshot> | null;
  startPresentation: WorkoutStartPresentationResult | null;
};

export type WorkoutMutationInput = {
  exercise?: MutableRecord | null;
  exercises?: Array<Record<string, unknown>> | null;
  setIndex?: number | string | null;
  exerciseIndex?: number | string | null;
  field?: string | null;
  rawValue?: unknown;
};

export type WorkoutMutationResult = {
  exercise?: MutableRecord | null;
  exercises?: Array<Record<string, unknown>> | null;
  set?: MutableRecord | null;
  sanitizedValue?: string | number;
  shouldRefreshDoneSet?: boolean;
  propagatedSetIndexes?: number[];
  isNowDone?: boolean;
  newSetIndex?: number;
  removed?: Record<string, unknown> | null;
} | null;

export type WorkoutProgramMetaInput = {
  prog?: MutableRecord | null;
  progressionSourceState?: MutableRecord | null;
  buildContext?: MutableRecord | null;
};

export type WorkoutProgramMetaResult = {
  programMeta: Record<string, unknown>;
  error?: unknown;
};

export type WorkoutProgressionToastInput = {
  activeWorkout?: MutableRecord | null;
  prog?: MutableRecord | null;
  programName?: string;
  advancedState?: MutableRecord | null;
  newState?: MutableRecord | null;
  programHookFailed?: boolean;
  buildContext?: MutableRecord | null;
};

export type WorkoutFinishPlanInput = {
  prog?: MutableRecord | null;
  activeWorkout?: MutableRecord | null;
  state?: MutableRecord | null;
  workouts?: Array<Record<string, unknown>> | null;
  sessionRPE?: unknown;
  duration?: unknown;
  prCount?: unknown;
  workoutId?: unknown;
  workoutDate?: unknown;
  programName?: string;
};

export type WorkoutFinishPlanResult = {
  savedWorkout: WorkoutSavePlan;
  summaryData: Record<string, unknown>;
  progressionResult: WorkoutProgressionResult;
  finishTeardownPlan: WorkoutTeardownPlanResult;
  progressionToast: WorkoutToastPlan | null;
  advancedState: Record<string, unknown>;
  newState: Record<string, unknown>;
  programHookFailed: boolean;
  tmAdjustments: Array<Record<string, unknown>>;
  totalSets: number;
  stateBeforeSession: Record<string, unknown> | null;
  progressionSourceState: Record<string, unknown> | null;
  programMetaError?: unknown;
};

export type WorkoutFinishPersistenceInput = {
  prog?: MutableRecord | null;
  finishPlan?: WorkoutFinishPlanResult | null;
  workouts?: Array<Record<string, unknown>> | null;
};

export type WorkoutPostOutcomeEffectsInput = {
  postWorkoutOutcome?: PostWorkoutOutcomeResult | null;
  summaryData?: MutableRecord | null;
};

export type WorkoutSavePlan = Record<string, unknown>;
export type WorkoutProgressionResult = Record<string, unknown>;

export type WorkoutRuntimeApi = {
  getWorkoutStartSnapshotSignature: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => string;
  getCachedWorkoutStartSnapshot: () => ReturnType<
    typeof normalizeWorkoutStartSnapshot
  > | null;
  setCachedWorkoutStartSnapshot: (
    snapshot?: Record<string, unknown> | null
  ) => ReturnType<typeof normalizeWorkoutStartSnapshot> | null;
  clearWorkoutStartSnapshot: () => void;
  resolveWorkoutStartSnapshot: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => ReturnType<typeof normalizeWorkoutStartSnapshot> | null;
  buildWorkoutStartSnapshot: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => Record<string, unknown> | null;
  buildWorkoutStartPlan: (
    input?: WorkoutStartPlanInput,
    deps?: Record<string, unknown>
  ) => WorkoutStartPlanResult;
  buildSessionSummaryStats: (
    summaryData?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => Array<Record<string, unknown>>;
  buildSavedWorkoutRecord: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => Record<string, unknown>;
  buildSessionSummaryData: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => Record<string, unknown>;
  buildBonusActiveWorkout: (
    input?: WorkoutSessionBootstrapInput,
    deps?: Record<string, unknown>
  ) => WorkoutSessionBootstrapResult;
  buildPlannedActiveWorkout: (
    input?: WorkoutSessionBootstrapInput,
    deps?: Record<string, unknown>
  ) => WorkoutSessionBootstrapResult;
  sanitizeSetValue: (field: unknown, raw: unknown) => string | number;
  applySetUpdateMutation: (
    input?: WorkoutMutationInput,
    deps?: Record<string, unknown>
  ) => WorkoutMutationResult;
  toggleWorkoutSetCompletion: (
    input?: WorkoutMutationInput,
    deps?: Record<string, unknown>
  ) => WorkoutMutationResult;
  appendWorkoutSet: (
    input?: WorkoutMutationInput,
    deps?: Record<string, unknown>
  ) => WorkoutMutationResult;
  removeWorkoutExercise: (
    input?: WorkoutMutationInput,
    deps?: Record<string, unknown>
  ) => WorkoutMutationResult;
  sanitizeWorkoutExercisesForSave: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => Array<Record<string, unknown>>;
  buildProgramTmAdjustments: (
    stateBefore?: Record<string, unknown> | null,
    stateAfter?: Record<string, unknown> | null
  ) => Array<Record<string, unknown>>;
  resolveWorkoutProgramMeta: (
    input?: WorkoutProgramMetaInput,
    deps?: Record<string, unknown>
  ) => WorkoutProgramMetaResult;
  buildWorkoutProgressionResult: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => WorkoutProgressionResult;
  buildWorkoutProgressionToast: (
    input?: WorkoutProgressionToastInput,
    deps?: Record<string, unknown>
  ) => WorkoutToastPlan | null;
  buildWorkoutFinishPlan: (
    input?: WorkoutFinishPlanInput,
    deps?: Record<string, unknown>
  ) => WorkoutFinishPlanResult | null;
  commitWorkoutFinishPersistence: (
    input?: WorkoutFinishPersistenceInput,
    deps?: Record<string, unknown>
  ) => Promise<void>;
  buildCoachNote: (
    input?: Record<string, unknown>,
    deps?: Record<string, unknown>
  ) => string;
  buildTmAdjustmentToast: (
    adjustments?: Array<Record<string, unknown>> | null,
    deps?: Record<string, unknown>
  ) => string;
  buildPostWorkoutOutcome: (
    input?: PostWorkoutOutcomeInput,
    deps?: Record<string, unknown>
  ) => PostWorkoutOutcomeResult;
  applyPostWorkoutOutcomeEffects: (
    input?: WorkoutPostOutcomeEffectsInput,
    deps?: Record<string, unknown>
  ) => Promise<void>;
  buildWorkoutStartPresentation: (
    input?: WorkoutStartPresentationInput,
    deps?: Record<string, unknown>
  ) => WorkoutStartPresentationResult;
  buildSessionSummaryPromptState: (
    input?: WorkoutSummaryPromptInput,
    deps?: Record<string, unknown>
  ) => WorkoutSummaryPromptState;
  clearWorkoutRestIntervalHost: (deps?: WorkoutRestHostDeps) => void;
  clearWorkoutRestHideHost: (deps?: WorkoutRestHostDeps) => void;
  scheduleWorkoutRestIntervalHost: (
    callback: () => void,
    deps?: WorkoutRestHostDeps
  ) => void;
  scheduleWorkoutRestHideHost: (
    callback: () => void,
    delay?: number,
    deps?: WorkoutRestHostDeps
  ) => void;
  buildWorkoutRestLifecyclePlan: (
    input?: WorkoutRestLifecycleInput,
    deps?: Record<string, unknown>
  ) => WorkoutRestLifecyclePlan;
  buildWorkoutRestDisplayState: (
    input?: WorkoutRestDisplayInput,
    deps?: Record<string, unknown>
  ) => WorkoutRestDisplayResult;
  buildWorkoutSessionSnapshot: (
    input?: WorkoutSessionSnapshotInput
  ) => WorkoutSessionSnapshotResult;
  resolveWorkoutRestDuration: (input?: WorkoutRestTimerInput) => number;
  restoreWorkoutRestTimer: (
    input?: WorkoutRestTimerInput
  ) => WorkoutRestTimerResult;
  startWorkoutRestTimer: (
    input?: WorkoutRestTimerInput
  ) => WorkoutRestTimerResult;
  syncWorkoutRestTimer: (
    input?: WorkoutRestTimerInput
  ) => WorkoutRestTimerResult;
  completeWorkoutRestTimer: (
    input?: WorkoutRestTimerInput
  ) => WorkoutRestTimerResult;
  skipWorkoutRestTimer: (
    input?: WorkoutRestTimerInput
  ) => WorkoutRestTimerResult;
  buildWorkoutTeardownPlan: (
    input?: WorkoutTeardownPlanInput,
    deps?: Record<string, unknown>
  ) => WorkoutTeardownPlanResult;
};

type WorkoutRuntimeWindow = Window & {
  __IRONFORGE_WORKOUT_RUNTIME__?: WorkoutRuntimeApi;
};

let workoutRestIntervalHost: unknown = null;
let workoutRestHideHost: unknown = null;

function getRuntimeWindow(): WorkoutRuntimeWindow | null {
  if (typeof window === 'undefined') return null;
  return window as WorkoutRuntimeWindow;
}

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readPositiveInt(value: unknown, fallback = 0) {
  return Math.max(0, Math.floor(readNumber(value, fallback)));
}

function readTimerFunction<T extends (...args: any[]) => any>(
  deps: WorkoutRestHostDeps | undefined,
  key: keyof WorkoutRestHostDeps
) {
  const target = deps?.[key];
  return typeof target === 'function' ? (target as T) : null;
}

function readFunction<T extends (...args: any[]) => any>(
  deps: Record<string, unknown> | undefined,
  key: string
) {
  const target = deps?.[key];
  return typeof target === 'function' ? (target as T) : null;
}

function normalizeProgramBuildContext(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  return cloneJson(value as MutableRecord);
}

function resolveProgramRuntimeWeekStart(
  buildContext: MutableRecord | null,
  getWeekStart?: ((date: Date) => Date) | null,
  fallbackDate?: Date
) {
  const runtime =
    buildContext?.programRuntime &&
    typeof buildContext.programRuntime === 'object'
      ? (buildContext.programRuntime as MutableRecord)
      : null;
  const runtimeWeekStart = String(runtime?.weekStartDate || '');
  if (runtimeWeekStart) {
    const parsed = new Date(runtimeWeekStart);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }
  const anchor =
    fallbackDate && Number.isFinite(fallbackDate.getTime())
      ? fallbackDate
      : new Date();
  return getWeekStart?.(anchor) || anchor;
}

export function sanitizeSetValue(field: unknown, raw: unknown) {
  if (field === 'weight') {
    const n = parseFloat(String(raw ?? ''));
    return Number.isNaN(n)
      ? ''
      : Math.max(0, Math.min(999, Math.round(n * 10) / 10));
  }
  if (field === 'reps') {
    const n = parseInt(String(raw ?? ''), 10);
    return Number.isNaN(n) ? '' : Math.max(0, Math.min(999, n));
  }
  if (field === 'rir')
    return typeof raw === 'string' || typeof raw === 'number' ? raw : '';
  return typeof raw === 'string' || typeof raw === 'number' ? raw : '';
}

export function applySetUpdateMutation(
  input?: WorkoutMutationInput
): WorkoutMutationResult {
  const next = input || {};
  const exercise =
    next.exercise && typeof next.exercise === 'object'
      ? (next.exercise as MutableRecord)
      : null;
  const setIndex = parseInt(String(next.setIndex ?? -1), 10);
  const field = String(next.field || '');
  if (!exercise || !Array.isArray(exercise.sets)) return null;
  if (setIndex < 0 || setIndex >= exercise.sets.length) return null;
  const set =
    exercise.sets[setIndex] && typeof exercise.sets[setIndex] === 'object'
      ? (exercise.sets[setIndex] as MutableRecord)
      : null;
  if (!set) return null;

  const sanitizedValue = sanitizeSetValue(field, next.rawValue);
  const shouldRefreshDoneSet =
    set.done === true &&
    set.isWarmup !== true &&
    (field === 'weight' || field === 'reps');
  set[field] = sanitizedValue;

  const propagatedSetIndexes: number[] = [];
  if (field === 'weight' && set.isWarmup !== true) {
    for (
      let nextIndex = setIndex + 1;
      nextIndex < exercise.sets.length;
      nextIndex++
    ) {
      const nextSet =
        exercise.sets[nextIndex] && typeof exercise.sets[nextIndex] === 'object'
          ? (exercise.sets[nextIndex] as MutableRecord)
          : null;
      if (!nextSet || nextSet.done === true || nextSet.isWarmup === true)
        continue;
      nextSet.weight = sanitizedValue;
      propagatedSetIndexes.push(nextIndex);
    }
  }

  return {
    exercise,
    set,
    sanitizedValue,
    shouldRefreshDoneSet,
    propagatedSetIndexes,
  };
}

export function toggleWorkoutSetCompletion(
  input?: WorkoutMutationInput
): WorkoutMutationResult {
  const next = input || {};
  const exercise =
    next.exercise && typeof next.exercise === 'object'
      ? (next.exercise as MutableRecord)
      : null;
  const setIndex = parseInt(String(next.setIndex ?? -1), 10);
  if (!exercise || !Array.isArray(exercise.sets)) return null;
  if (setIndex < 0 || setIndex >= exercise.sets.length) return null;
  const set =
    exercise.sets[setIndex] && typeof exercise.sets[setIndex] === 'object'
      ? (exercise.sets[setIndex] as MutableRecord)
      : null;
  if (!set) return null;

  const isNowDone = set.done !== true;
  set.done = isNowDone;
  if (!isNowDone) {
    set.rir = undefined;
  }

  return {
    exercise,
    set,
    isNowDone,
  };
}

export function appendWorkoutSet(
  input?: WorkoutMutationInput
): WorkoutMutationResult {
  const next = input || {};
  const exercise =
    next.exercise && typeof next.exercise === 'object'
      ? (next.exercise as MutableRecord)
      : null;
  if (!exercise) return null;
  if (!Array.isArray(exercise.sets)) {
    exercise.sets = [];
  }
  const sets = exercise.sets as Array<Record<string, unknown>>;
  const lastSet =
    sets.length > 0 &&
    sets[sets.length - 1] &&
    typeof sets[sets.length - 1] === 'object'
      ? (sets[sets.length - 1] as MutableRecord)
      : null;
  sets.push({
    weight: lastSet?.weight || '',
    reps: lastSet?.reps || 5,
    done: false,
    rpe: null,
  });

  return {
    exercise,
    newSetIndex: sets.length - 1,
  };
}

export function removeWorkoutExercise(
  input?: WorkoutMutationInput
): WorkoutMutationResult {
  const next = input || {};
  const exercises = Array.isArray(next.exercises)
    ? (next.exercises as Array<Record<string, unknown>>)
    : null;
  const exerciseIndex = parseInt(String(next.exerciseIndex ?? -1), 10);
  if (!exercises || exerciseIndex < 0 || exerciseIndex >= exercises.length) {
    return null;
  }

  const removed = exercises.splice(exerciseIndex, 1)[0] || null;
  return {
    exercises,
    removed,
  };
}

function sanitizeWorkoutExercisesForSave(input?: Record<string, unknown>) {
  const next = input || {};
  const rawExercises = Array.isArray(next.exercises)
    ? (next.exercises as Array<Record<string, unknown>>)
    : [];
  const resolveExerciseId =
    typeof next.withResolvedExerciseId === 'function'
      ? (next.withResolvedExerciseId as (
          exercise: Record<string, unknown>
        ) => Record<string, unknown>)
      : null;

  return rawExercises.map((exercise) => {
    const resolved = resolveExerciseId?.(exercise) || exercise;
    const nextExercise =
      resolved && typeof resolved === 'object'
        ? (resolved as MutableRecord)
        : ({} as MutableRecord);
    const sets = Array.isArray(nextExercise.sets) ? nextExercise.sets : [];
    nextExercise.sets = sets.map((setLike) => {
      const set =
        setLike && typeof setLike === 'object'
          ? ({ ...(setLike as MutableRecord) } as MutableRecord)
          : ({} as MutableRecord);
      set.weight = sanitizeSetValue('weight', set.weight);
      if (set.reps !== 'AMRAP') {
        set.reps = sanitizeSetValue('reps', set.reps);
      }
      return set;
    });
    return nextExercise as Record<string, unknown>;
  });
}

function buildProgramTmAdjustments(
  stateBefore?: Record<string, unknown> | null,
  stateAfter?: Record<string, unknown> | null
) {
  const adjustments: Array<Record<string, unknown>> = [];
  if (!stateBefore || !stateAfter) return adjustments;
  const beforeLifts =
    stateBefore.lifts && typeof stateBefore.lifts === 'object'
      ? (stateBefore.lifts as MutableRecord)
      : null;
  const afterLifts =
    stateAfter.lifts && typeof stateAfter.lifts === 'object'
      ? (stateAfter.lifts as MutableRecord)
      : null;
  const beforeMain = Array.isArray(beforeLifts?.main)
    ? (beforeLifts.main as Array<MutableRecord>)
    : [];
  const afterMain = Array.isArray(afterLifts?.main)
    ? (afterLifts.main as Array<MutableRecord>)
    : [];
  beforeMain.forEach((lift, index) => {
    const after = afterMain[index];
    if (!after || lift.name !== after.name) return;
    const delta = readNumber(after.tm) - readNumber(lift.tm);
    if (delta === 0) return;
    adjustments.push({
      lift: lift.name,
      oldTM: lift.tm,
      newTM: after.tm,
      delta,
      direction: delta > 0 ? 'up' : 'down',
    });
  });

  const beforeAux = Array.isArray(beforeLifts?.aux)
    ? (beforeLifts.aux as Array<MutableRecord>)
    : [];
  const afterAux = Array.isArray(afterLifts?.aux)
    ? (afterLifts.aux as Array<MutableRecord>)
    : [];
  beforeAux.forEach((lift, index) => {
    const after = afterAux[index];
    if (!after || lift.name !== after.name) return;
    const delta = readNumber(after.tm) - readNumber(lift.tm);
    if (delta === 0) return;
    adjustments.push({
      lift: lift.name,
      oldTM: lift.tm,
      newTM: after.tm,
      delta,
      direction: delta > 0 ? 'up' : 'down',
    });
  });

  if (beforeLifts && !Array.isArray(beforeLifts.main)) {
    Object.keys(beforeLifts).forEach((key) => {
      const before = beforeLifts[key];
      const after = afterLifts?.[key];
      if (
        !before ||
        !after ||
        typeof before !== 'object' ||
        typeof after !== 'object'
      ) {
        return;
      }
      const beforeRecord = before as MutableRecord;
      const afterRecord = after as MutableRecord;
      const beforeValue =
        beforeRecord.tm !== undefined ? beforeRecord.tm : beforeRecord.weight;
      const afterValue =
        afterRecord.tm !== undefined ? afterRecord.tm : afterRecord.weight;
      if (beforeValue === undefined || afterValue === undefined) return;
      const delta = readNumber(afterValue) - readNumber(beforeValue);
      if (delta === 0) return;
      adjustments.push({
        lift: key.charAt(0).toUpperCase() + key.slice(1),
        oldTM: beforeValue,
        newTM: afterValue,
        delta,
        direction: delta > 0 ? 'up' : 'down',
      });
    });
  }

  return adjustments;
}

export function buildWorkoutProgressionResult(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
): WorkoutProgressionResult {
  const next = input || {};
  const prog =
    next.prog && typeof next.prog === 'object'
      ? (next.prog as MutableRecord)
      : null;
  const activeWorkout =
    next.activeWorkout && typeof next.activeWorkout === 'object'
      ? (next.activeWorkout as MutableRecord)
      : null;
  const state =
    next.state && typeof next.state === 'object'
      ? (next.state as MutableRecord)
      : null;
  const progressionSourceState =
    next.progressionSourceState &&
    typeof next.progressionSourceState === 'object'
      ? (next.progressionSourceState as MutableRecord)
      : null;
  const workouts = Array.isArray(next.workouts)
    ? (next.workouts as Array<Record<string, unknown>>)
    : [];
  const stripWarmupSetsFromExercises = readFunction<
    (
      exercises: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>
  >(deps, 'stripWarmupSetsFromExercises');
  const getWeekStart = readFunction<(date: Date) => Date>(deps, 'getWeekStart');
  const buildContext =
    normalizeProgramBuildContext(
      next.buildContext ||
        (activeWorkout?.sessionSnapshot as MutableRecord | undefined)
          ?.buildContext
    ) || null;

  if (!prog || !activeWorkout || !state || !progressionSourceState) {
    return {
      advancedState: state || {},
      newState: state || {},
      programStateAfter: state ? cloneJson(state) : {},
      tmAdjustments: [],
      programHookFailed: false,
    };
  }

  if (activeWorkout.isBonus === true) {
    return {
      advancedState: state,
      newState: state,
      programStateAfter: cloneJson(state),
      tmAdjustments: [],
      programHookFailed: false,
    };
  }

  try {
    const sourceExercises = Array.isArray(activeWorkout.exercises)
      ? (activeWorkout.exercises as Array<Record<string, unknown>>)
      : [];
    const exercisesForProgression =
      stripWarmupSetsFromExercises?.(sourceExercises) ||
      sourceExercises.map((exercise) => ({
        ...exercise,
        sets: Array.isArray(exercise.sets)
          ? exercise.sets.filter((set) => set?.isWarmup !== true)
          : [],
      }));
    const newState =
      typeof prog.adjustAfterSession === 'function'
        ? (prog.adjustAfterSession(
            exercisesForProgression,
            progressionSourceState,
            activeWorkout.programOption,
            buildContext
          ) as Record<string, unknown>)
        : progressionSourceState;
    const tmAdjustments = buildProgramTmAdjustments(
      progressionSourceState,
      newState
    );
    const progressionDate = new Date(String(next.workoutDate || Date.now()));
    const sow = resolveProgramRuntimeWeekStart(
      buildContext,
      getWeekStart || null,
      progressionDate
    );
    const sessionsThisWeek = workouts.filter((workout) => {
      const programId = String(workout.program || workout.type || '');
      return (
        programId === String(prog.id || '') &&
        new Date(String(workout.date || '')) >= sow &&
        workout.isBonus !== true
      );
    }).length;
    const advancedState =
      typeof prog.advanceState === 'function'
        ? (prog.advanceState(
            newState,
            sessionsThisWeek,
            buildContext
          ) as Record<string, unknown>)
        : newState;

    return {
      advancedState,
      newState,
      programStateAfter: cloneJson(advancedState),
      tmAdjustments,
      programHookFailed: false,
    };
  } catch (error) {
    return {
      advancedState: state,
      newState: state,
      programStateAfter: cloneJson(state),
      tmAdjustments: [],
      programHookFailed: true,
      error,
    };
  }
}

export function resolveWorkoutProgramMeta(
  input?: WorkoutProgramMetaInput
): WorkoutProgramMetaResult {
  const next = input || {};
  const prog =
    next.prog && typeof next.prog === 'object'
      ? (next.prog as MutableRecord)
      : null;
  const progressionSourceState =
    next.progressionSourceState &&
    typeof next.progressionSourceState === 'object'
      ? (next.progressionSourceState as MutableRecord)
      : {};
  const fallback = {
    week: progressionSourceState.week,
    cycle: progressionSourceState.cycle,
  };
  const buildContext = normalizeProgramBuildContext(next.buildContext);

  if (!prog || typeof prog.getWorkoutMeta !== 'function') {
    return {
      programMeta: fallback,
    };
  }

  try {
    const programMeta = prog.getWorkoutMeta(
      progressionSourceState,
      buildContext
    ) as Record<string, unknown> | null;
    return {
      programMeta:
        programMeta && typeof programMeta === 'object'
          ? cloneJson(programMeta)
          : fallback,
    };
  } catch (error) {
    return {
      programMeta: fallback,
      error,
    };
  }
}

export function buildWorkoutProgressionToast(
  input?: WorkoutProgressionToastInput,
  deps?: Record<string, unknown>
): WorkoutToastPlan | null {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const activeWorkout =
    next.activeWorkout && typeof next.activeWorkout === 'object'
      ? (next.activeWorkout as MutableRecord)
      : null;
  const prog =
    next.prog && typeof next.prog === 'object'
      ? (next.prog as MutableRecord)
      : null;
  const advancedState =
    next.advancedState && typeof next.advancedState === 'object'
      ? (next.advancedState as MutableRecord)
      : null;
  const newState =
    next.newState && typeof next.newState === 'object'
      ? (next.newState as MutableRecord)
      : null;
  const programName = String(next.programName || prog?.name || 'Training');
  const buildContext =
    normalizeProgramBuildContext(
      next.buildContext ||
        (activeWorkout?.sessionSnapshot as MutableRecord | undefined)
          ?.buildContext
    ) || null;

  if (!prog || !advancedState || !newState) return null;
  if (activeWorkout?.isBonus === true || next.programHookFailed === true) {
    return null;
  }

  if (
    advancedState.cycle !== undefined &&
    advancedState.cycle !== newState.cycle
  ) {
    return {
      text:
        t?.('workout.next_cycle', '{program} - cycle {cycle} starts now.', {
          program: programName,
          cycle: advancedState.cycle,
        }) || '',
      color: 'var(--purple)',
      delay: 500,
    };
  }

  if (
    advancedState.week !== undefined &&
    advancedState.week !== newState.week
  ) {
    let label = `Week ${advancedState.week}`;
    try {
      const blockInfo =
        typeof prog.getBlockInfo === 'function'
          ? (prog.getBlockInfo(advancedState, buildContext) as Record<
              string,
              unknown
            > | null)
          : null;
      if (blockInfo?.name) {
        label = String(blockInfo.name);
      }
    } catch (_error) {
      label = `Week ${advancedState.week}`;
    }
    return {
      text:
        t?.('workout.next_week', '{program} - {label} up next!', {
          program: programName,
          label,
        }) || '',
      color: 'var(--purple)',
      delay: 500,
    };
  }

  return null;
}

export function buildWorkoutFinishPlan(
  input?: WorkoutFinishPlanInput,
  deps?: Record<string, unknown>
): WorkoutFinishPlanResult | null {
  const next = input || {};
  const activeWorkout =
    next.activeWorkout && typeof next.activeWorkout === 'object'
      ? (next.activeWorkout as MutableRecord)
      : null;
  const prog =
    next.prog && typeof next.prog === 'object'
      ? (next.prog as MutableRecord)
      : null;
  const state =
    next.state && typeof next.state === 'object'
      ? (next.state as MutableRecord)
      : {};
  const workouts = Array.isArray(next.workouts) ? next.workouts : [];
  const duration = Math.max(0, parseInt(String(next.duration || 0), 10) || 0);
  const prCount = Math.max(0, parseInt(String(next.prCount || 0), 10) || 0);
  const totalSets = Array.isArray(activeWorkout?.exercises)
    ? activeWorkout.exercises.reduce((sum, exercise) => {
        const sets = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
        return sum + sets;
      }, 0)
    : 0;

  if (!activeWorkout || !prog) return null;

  const sessionSnapshot = normalizeWorkoutStartSnapshot(
    activeWorkout.sessionSnapshot
  );
  const buildContext = normalizeProgramBuildContext(
    sessionSnapshot?.buildContext
  );
  const stateBeforeSession = cloneJson(state || {});
  const progressionSourceState = sessionSnapshot?.buildState
    ? cloneJson(sessionSnapshot.buildState)
    : stateBeforeSession;
  const programMetaResult = resolveWorkoutProgramMeta({
    prog,
    progressionSourceState,
    buildContext,
  });
  const savedWorkout = buildSavedWorkoutRecord(
    {
      workoutId: next.workoutId || Date.now(),
      workoutDate: next.workoutDate || new Date().toISOString(),
      programId: prog.id,
      activeWorkout,
      programMeta: programMetaResult.programMeta,
      prCount,
      stateBeforeSession,
      progressionSourceState,
      duration,
      exercises: activeWorkout.exercises,
      sessionRPE: next.sessionRPE,
      totalSets,
    },
    {
      cloneTrainingDecision: deps?.cloneTrainingDecision,
    }
  );
  const workoutsIncludingCurrent = workouts.concat(savedWorkout);
  const progressionResult = buildWorkoutProgressionResult(
    {
      prog,
      activeWorkout,
      state,
      progressionSourceState,
      workouts: workoutsIncludingCurrent,
      buildContext,
      workoutDate: next.workoutDate,
    },
    {
      stripWarmupSetsFromExercises: deps?.stripWarmupSetsFromExercises,
      getWeekStart: deps?.getWeekStart,
    }
  );
  const advancedState =
    progressionResult?.advancedState &&
    typeof progressionResult.advancedState === 'object'
      ? (progressionResult.advancedState as Record<string, unknown>)
      : cloneJson(state || {});
  const newState =
    progressionResult?.newState &&
    typeof progressionResult.newState === 'object'
      ? (progressionResult.newState as Record<string, unknown>)
      : cloneJson(state || {});
  const tmAdjustments = Array.isArray(progressionResult?.tmAdjustments)
    ? progressionResult.tmAdjustments
    : [];
  const programHookFailed = progressionResult?.programHookFailed === true;

  savedWorkout.programStateAfter =
    progressionResult?.programStateAfter || cloneJson(advancedState);
  if (tmAdjustments.length) {
    savedWorkout.tmAdjustments = tmAdjustments;
  }

  const summaryData = buildSessionSummaryData(
    {
      activeWorkout,
      exercises: activeWorkout.exercises,
      duration,
      sessionRPE: next.sessionRPE,
      prCount,
      isBonus: activeWorkout.isBonus === true,
      programLabel: String(activeWorkout.programLabel || ''),
      tmAdjustments,
      stateBeforeSession,
      advancedState,
      totalSets,
    },
    {
      parseLoggedRepCount: deps?.parseLoggedRepCount,
      buildCoachNote: (
        summaryMeta: Record<string, unknown>,
        stateBefore: Record<string, unknown> | null,
        stateAfter: Record<string, unknown> | null,
        workout: Record<string, unknown> | null
      ) =>
        buildCoachNote(
          {
            summaryData: summaryMeta,
            stateBeforeSession: stateBefore,
            advancedState: stateAfter,
            workout,
          },
          { t: deps?.t }
        ),
    }
  );
  const finishTeardownPlan = buildWorkoutTeardownPlan(
    {
      mode: 'finish',
    },
    {
      t: deps?.t,
    }
  );
  const progressionToast = buildWorkoutProgressionToast(
    {
      activeWorkout,
      prog,
      programName: String(next.programName || prog.name || 'Training'),
      advancedState: advancedState as MutableRecord,
      newState: newState as MutableRecord,
      programHookFailed,
      buildContext,
    },
    {
      t: deps?.t,
    }
  );

  return {
    savedWorkout,
    summaryData,
    progressionResult,
    finishTeardownPlan,
    progressionToast,
    advancedState,
    newState,
    programHookFailed,
    tmAdjustments,
    totalSets,
    stateBeforeSession,
    progressionSourceState,
    programMetaError: programMetaResult.error,
  };
}

function formatWorkoutWeightValue(value: unknown) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  if (!Number.isFinite(rounded)) return '0';
  return String(rounded)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

function buildTmAdjustmentCoachSummary(
  adjustments?: Array<Record<string, unknown>> | null,
  deps?: Record<string, unknown>
) {
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const formatWeight = readFunction<(value: unknown) => string>(
    deps,
    'formatWorkoutWeight'
  );
  const items = Array.isArray(adjustments) ? adjustments.slice(0, 2) : [];
  if (!items.length) return '';
  return items
    .map(
      (adj) =>
        t?.(
          adj.direction === 'up'
            ? 'workout.coach_note.tm_adjustment_up'
            : 'workout.coach_note.tm_adjustment_down',
          adj.direction === 'up'
            ? '{lift} TM ↑ {tm} kg (+{delta})'
            : '{lift} TM ↓ {tm} kg (-{delta})',
          {
            lift: adj.lift,
            tm:
              formatWeight?.(adj.newTM) || formatWorkoutWeightValue(adj.newTM),
            delta:
              formatWeight?.(Math.abs(readNumber(adj.delta))) ||
              formatWorkoutWeightValue(Math.abs(readNumber(adj.delta))),
          }
        ) || ''
    )
    .join(' · ');
}

function buildCoachNote(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  let note = '';

  const summaryData =
    next.summaryData && typeof next.summaryData === 'object'
      ? (next.summaryData as MutableRecord)
      : {};
  const stateBeforeSession =
    next.stateBeforeSession && typeof next.stateBeforeSession === 'object'
      ? (next.stateBeforeSession as MutableRecord)
      : null;
  const advancedState =
    next.advancedState && typeof next.advancedState === 'object'
      ? (next.advancedState as MutableRecord)
      : null;
  const workout =
    next.workout && typeof next.workout === 'object'
      ? (next.workout as MutableRecord)
      : null;

  const rewardState =
    workout?.rewardState && typeof workout.rewardState === 'object'
      ? (workout.rewardState as MutableRecord)
      : null;
  const prs = Array.isArray(rewardState?.detectedPrs)
    ? (rewardState.detectedPrs as Array<Record<string, unknown>>)
    : [];
  if (prs.length > 0) {
    const names = [...new Set(prs.map((pr) => String(pr.exerciseName || '')))]
      .filter(Boolean)
      .slice(0, 2);
    const label = names.join(' & ');
    note =
      prs.length === 1
        ? t?.(
            'workout.coach_note.pr_single',
            'New PR on {exercise}! Keep going.',
            { exercise: label }
          ) || ''
        : t?.(
            'workout.coach_note.pr_multi',
            'New PRs on {exercises}! Great session.',
            { exercises: label }
          ) || '';
  }

  if (
    !note &&
    advancedState?.week !== undefined &&
    stateBeforeSession?.week !== undefined &&
    advancedState.week !== stateBeforeSession.week
  ) {
    note =
      t?.(
        'workout.coach_note.week_advance',
        'Week {week} starts now. Build on it.',
        { week: advancedState.week }
      ) || '';
  }

  if (
    !note &&
    advancedState?.cycle !== undefined &&
    stateBeforeSession?.cycle !== undefined &&
    advancedState.cycle !== stateBeforeSession.cycle
  ) {
    note =
      t?.(
        'workout.coach_note.cycle_advance',
        'Cycle {cycle} starts — new progression block.',
        { cycle: advancedState.cycle }
      ) || '';
  }

  const completionRate =
    readNumber(summaryData.totalSets, 0) > 0
      ? readNumber(summaryData.completedSets, 0) /
        readNumber(summaryData.totalSets, 0)
      : 1;
  const rpe = readNumber(summaryData.rpe, 0);

  if (!note && rpe >= 9 && completionRate < 0.9) {
    note =
      t?.(
        'workout.coach_note.tough_session',
        'Tough session — rest well and come back strong.'
      ) || '';
  }

  if (!note && completionRate < 0.7) {
    note =
      t?.(
        'workout.coach_note.partial_session',
        'Partial session logged. Any training counts — consistency wins.'
      ) || '';
  }

  if (!note) {
    note =
      t?.('workout.coach_note.clean', 'All sets done. Solid work.') ||
      'All sets done. Solid work.';
  }

  const tmSummary = buildTmAdjustmentCoachSummary(
    Array.isArray(summaryData.tmAdjustments)
      ? (summaryData.tmAdjustments as Array<Record<string, unknown>>)
      : [],
    deps
  );
  return tmSummary ? `${note} ${tmSummary}` : note;
}

function buildTmAdjustmentToast(
  adjustments?: Array<Record<string, unknown>> | null,
  deps?: Record<string, unknown>
) {
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const formatWeight = readFunction<(value: unknown) => string>(
    deps,
    'formatWorkoutWeight'
  );
  const items = Array.isArray(adjustments) ? adjustments : [];
  if (!items.length) return '';
  if (items.length === 1) {
    const adj = items[0];
    return (
      t?.('workout.tm_updated_single', '{lift} TM updated: {old} → {next} kg', {
        lift: adj.lift,
        old: formatWeight?.(adj.oldTM) || formatWorkoutWeightValue(adj.oldTM),
        next: formatWeight?.(adj.newTM) || formatWorkoutWeightValue(adj.newTM),
      }) || ''
    );
  }
  const changes = items
    .map(
      (adj) =>
        `${adj.lift} ${adj.direction === 'up' ? '\u2191' : '\u2193'} ${
          formatWeight?.(adj.newTM) || formatWorkoutWeightValue(adj.newTM)
        } kg`
    )
    .join(', ');
  return (
    t?.('workout.tm_updated_multi', 'TMs updated: {changes}', {
      changes,
    }) || ''
  );
}

export function buildPostWorkoutOutcome(
  input?: PostWorkoutOutcomeInput,
  deps?: Record<string, unknown>
): PostWorkoutOutcomeResult {
  const next = input || {};
  const savedWorkout =
    next.savedWorkout && typeof next.savedWorkout === 'object'
      ? (next.savedWorkout as MutableRecord)
      : null;
  const summaryResult =
    next.summaryResult && typeof next.summaryResult === 'object'
      ? (next.summaryResult as MutableRecord)
      : null;
  const summaryData =
    next.summaryData && typeof next.summaryData === 'object'
      ? (next.summaryData as MutableRecord)
      : null;
  const inferDurationSignal = readFunction<
    (workout: Record<string, unknown>) => string | null | undefined
  >(deps, 'inferDurationSignal');

  if (!savedWorkout) {
    return {
      shouldSaveWorkouts: false,
      tmAdjustmentToast: '',
      goToNutrition: false,
      nutritionContext: summaryData || null,
    };
  }

  if (summaryResult?.feedback) {
    savedWorkout.sessionFeedback = summaryResult.feedback;
  }
  if (summaryResult?.notes) {
    savedWorkout.sessionNotes = summaryResult.notes;
  }

  const durationSignal = inferDurationSignal?.(savedWorkout) || null;
  if (durationSignal) {
    savedWorkout.durationSignal = durationSignal;
  }

  const tmAdjustmentToast = buildTmAdjustmentToast(
    Array.isArray(savedWorkout.tmAdjustments)
      ? (savedWorkout.tmAdjustments as Array<Record<string, unknown>>)
      : [],
    deps
  );

  return {
    shouldSaveWorkouts:
      !!summaryResult?.feedback ||
      !!summaryResult?.notes ||
      !!savedWorkout.durationSignal,
    tmAdjustmentToast,
    goToNutrition: summaryResult?.goToNutrition === true,
    nutritionContext: summaryData || null,
    durationSignal,
  };
}

export async function commitWorkoutFinishPersistence(
  input?: WorkoutFinishPersistenceInput,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const prog =
    next.prog && typeof next.prog === 'object'
      ? (next.prog as MutableRecord)
      : null;
  const finishPlan =
    next.finishPlan && typeof next.finishPlan === 'object'
      ? (next.finishPlan as WorkoutFinishPlanResult)
      : null;
  const workouts = Array.isArray(next.workouts) ? next.workouts : null;
  const logWarn = readFunction<(scope: string, error: unknown) => void>(
    deps,
    'logWarn'
  );
  const showToast = readFunction<(text: string, color?: string) => void>(
    deps,
    'showToast'
  );
  const setTimer = readFunction<
    (callback: () => void, delay?: number) => unknown
  >(deps, 'setTimer');
  const setProgramState = readFunction<
    (programId: string, state: Record<string, unknown>) => void
  >(deps, 'setProgramState');
  const saveProfileData = readFunction<
    (input?: Record<string, unknown>) => void
  >(deps, 'saveProfileData');
  const upsertWorkoutRecord = readFunction<
    (workout: Record<string, unknown>) => Promise<unknown>
  >(deps, 'upsertWorkoutRecord');
  const saveWorkouts = readFunction<() => Promise<unknown>>(
    deps,
    'saveWorkouts'
  );
  const buildExerciseIndex = readFunction<() => void>(
    deps,
    'buildExerciseIndex'
  );
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');

  if (!prog || !finishPlan) return;

  if (finishPlan.programMetaError) {
    logWarn?.('getWorkoutMeta', finishPlan.programMetaError);
  }

  if (workouts) {
    workouts.push(finishPlan.savedWorkout);
  }

  if (finishPlan.progressionToast?.text) {
    const schedule =
      setTimer ||
      ((callback: () => void, delay?: number) => setTimeout(callback, delay));
    schedule(
      () =>
        showToast?.(
          finishPlan.progressionToast?.text || '',
          finishPlan.progressionToast?.color
        ),
      parseInt(String(finishPlan.progressionToast.delay || 0), 10) || 0
    );
  }

  const programId = String(prog.id || finishPlan.savedWorkout.program || '');
  if (programId) {
    setProgramState?.(programId, finishPlan.advancedState || {});
    saveProfileData?.({ programIds: [programId] });
  }

  if (upsertWorkoutRecord) {
    await upsertWorkoutRecord(finishPlan.savedWorkout);
  }
  if (saveWorkouts) {
    await saveWorkouts();
  }
  buildExerciseIndex?.();

  if (finishPlan.programHookFailed) {
    showToast?.(
      t?.(
        'workout.program_error',
        'Session saved, but program state may need review.'
      ) || 'Session saved, but program state may need review.',
      'var(--orange)'
    );
  }
}

export async function applyPostWorkoutOutcomeEffects(
  input?: WorkoutPostOutcomeEffectsInput,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const postWorkoutOutcome =
    next.postWorkoutOutcome && typeof next.postWorkoutOutcome === 'object'
      ? (next.postWorkoutOutcome as PostWorkoutOutcomeResult)
      : null;
  const summaryData =
    next.summaryData && typeof next.summaryData === 'object'
      ? (next.summaryData as MutableRecord)
      : null;
  const saveWorkouts = readFunction<() => Promise<unknown>>(
    deps,
    'saveWorkouts'
  );
  const showToast = readFunction<(text: string, color?: string) => void>(
    deps,
    'showToast'
  );
  const setTimer = readFunction<
    (callback: () => void, delay?: number) => unknown
  >(deps, 'setTimer');
  const setNutritionSessionContext = readFunction<
    (value?: Record<string, unknown> | null) => void
  >(deps, 'setNutritionSessionContext');
  const getRuntimeBridge = readFunction<() => Record<string, unknown> | null>(
    deps,
    'getRuntimeBridge'
  );
  const showPage = readFunction<(page: string) => void>(deps, 'showPage');

  if (!postWorkoutOutcome) return;

  if (postWorkoutOutcome.shouldSaveWorkouts) {
    await saveWorkouts?.();
  }
  if (postWorkoutOutcome.tmAdjustmentToast) {
    const schedule =
      setTimer ||
      ((callback: () => void, delay?: number) => setTimeout(callback, delay));
    schedule(
      () => showToast?.(postWorkoutOutcome.tmAdjustmentToast, 'var(--blue)'),
      600
    );
  }
  if (!postWorkoutOutcome.goToNutrition) return;

  setNutritionSessionContext?.(
    postWorkoutOutcome.nutritionContext || summaryData
  );
  const bridge = getRuntimeBridge?.();
  if (bridge && typeof bridge.navigateToPage === 'function') {
    bridge.navigateToPage('nutrition');
    return;
  }
  showPage?.('nutrition');
}

function buildWorkoutStartPresentation(
  input?: WorkoutStartPresentationInput,
  deps?: Record<string, unknown>
): WorkoutStartPresentationResult {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const getWorkoutCommentaryState = readFunction<
    (workoutLike: Record<string, unknown>) => Record<string, unknown> | null
  >(deps, 'getWorkoutCommentaryState');
  const presentTrainingCommentary = readFunction<
    (
      commentaryState: Record<string, unknown>,
      surface: string
    ) => Record<string, unknown> | null
  >(deps, 'presentTrainingCommentary');
  const getWorkoutDecisionSummary = readFunction<
    (
      effectiveDecision?: Record<string, unknown> | null,
      planningContext?: Record<string, unknown> | null
    ) => Record<string, unknown> | null
  >(deps, 'getWorkoutDecisionSummary');
  const getTrainingToastColor = readFunction<
    (value?: Record<string, unknown> | null) => string
  >(deps, 'getTrainingToastColor');

  const activeWorkout =
    next.activeWorkout && typeof next.activeWorkout === 'object'
      ? (next.activeWorkout as MutableRecord)
      : null;
  const isBonus = next.isBonus === true;
  const title = String(next.title || next.programLabel || '');
  const sessionDescription = String(next.sessionDescription || '');
  const effectiveDecision =
    next.effectiveDecision && typeof next.effectiveDecision === 'object'
      ? (next.effectiveDecision as MutableRecord)
      : null;
  const planningContext =
    next.planningContext && typeof next.planningContext === 'object'
      ? (next.planningContext as MutableRecord)
      : null;
  const startSnapshot =
    next.startSnapshot && typeof next.startSnapshot === 'object'
      ? (next.startSnapshot as MutableRecord)
      : null;
  const schedule =
    next.schedule && typeof next.schedule === 'object'
      ? (next.schedule as MutableRecord)
      : null;
  const legLifts = Array.isArray(next.legLifts)
    ? (next.legLifts as Array<unknown>)
    : [];

  if (isBonus) {
    return {
      title,
      descriptionText: sessionDescription,
      descriptionVisible: !!sessionDescription,
      immediateToast: {
        text:
          t?.('workout.bonus.toast_started', 'Bonus workout started!') ||
          'Bonus workout started!',
        color: 'var(--purple)',
      },
      queuedToasts: [],
    };
  }

  const isDeload = next.isDeload === true;
  const programName = String(next.programName || title || 'Training');
  const commentaryState = activeWorkout
    ? getWorkoutCommentaryState?.(activeWorkout)
    : null;
  const decisionSummary = getWorkoutDecisionSummary?.(
    effectiveDecision,
    planningContext
  );
  const startToast =
    commentaryState && presentTrainingCommentary
      ? presentTrainingCommentary(commentaryState, 'workout_start_toast')
      : null;
  const decisionToastColor = getTrainingToastColor?.(
    startToast || commentaryState || null
  );
  const avoidHeavyLegs =
    Array.isArray(effectiveDecision?.restrictionFlags) &&
    effectiveDecision.restrictionFlags.includes('avoid_heavy_legs');
  const changeToastColor = avoidHeavyLegs
    ? 'var(--orange)'
    : decisionToastColor || 'var(--purple)';
  const queuedToasts: WorkoutToastPlan[] = [];
  const decisionToastNeeded =
    !!effectiveDecision &&
    (effectiveDecision.action !== 'train' || avoidHeavyLegs);
  if (decisionToastNeeded && decisionSummary?.title) {
    queuedToasts.push({
      text: String(startToast?.text || decisionSummary.title || ''),
      color: decisionToastColor || 'var(--purple)',
      delay: 700,
    });
  }

  const sessionChanges = Array.isArray(startSnapshot?.changes)
    ? (startSnapshot.changes as Array<unknown>)
    : [];
  if (sessionChanges.length && sessionChanges[0]) {
    queuedToasts.push({
      text: String(sessionChanges[0]),
      color: changeToastColor,
      delay: decisionToastNeeded ? 1800 : 900,
    });
  }

  const equipmentHint = String(startSnapshot?.equipmentHint || '');
  if (equipmentHint) {
    const baseDelay = sessionChanges.length ? 2600 : 900;
    const decisionDelay = decisionToastNeeded ? 900 : 0;
    queuedToasts.push({
      text: equipmentHint,
      color: 'var(--blue)',
      delay: baseDelay + decisionDelay,
    });
  }

  const isSportDay = next.isSportDay === true;
  const hadSportRecently = next.hadSportRecently === true;
  const sportLegsHeavy = schedule?.sportLegsHeavy !== false;
  const sportName = String(schedule?.sportName || 'Sport');
  const activeExerciseNames = Array.isArray(activeWorkout?.exercises)
    ? (activeWorkout?.exercises as Array<Record<string, unknown>>).map(
        (exercise) => String(exercise.name || '').toLowerCase()
      )
    : [];
  const hasLegs = legLifts.some((lift) =>
    activeExerciseNames.includes(String(lift || '').toLowerCase())
  );
  if (
    (isSportDay || hadSportRecently) &&
    !isDeload &&
    sportLegsHeavy &&
    hasLegs
  ) {
    queuedToasts.push({
      text:
        t?.(
          'workout.sport_legs_warning',
          '{sport} legs - consider fewer sets or swapping day order',
          { sport: sportName }
        ) || `${sportName} legs - consider fewer sets or swapping day order`,
      color: 'var(--orange)',
      delay: 1500,
    });
  }

  return {
    title,
    descriptionText: sessionDescription
      ? `${t?.('session.description', 'Session focus') || 'Session focus'}: ${sessionDescription}`
      : '',
    descriptionVisible: !!sessionDescription,
    immediateToast: {
      text: isDeload
        ? t?.('workout.deload_light', 'Deload - keep it light') ||
          'Deload - keep it light'
        : programName,
      color: isDeload ? 'var(--blue)' : 'var(--purple)',
    },
    queuedToasts,
  };
}

function buildWorkoutTeardownPlan(
  input?: WorkoutTeardownPlanInput,
  deps?: Record<string, unknown>
): WorkoutTeardownPlanResult {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const mode = String(next.mode || 'cancel');
  return {
    showNotStarted: true,
    hideActive: true,
    resetNotStartedView: true,
    notifyLogActive: true,
    updateDashboard: mode === 'finish',
    discardToast:
      mode === 'cancel'
        ? t?.('workout.session_discarded', 'Workout discarded.') ||
          'Workout discarded.'
        : '',
  };
}

export function resolveWorkoutRestDuration(input?: WorkoutRestTimerInput) {
  const next = input || {};
  const parsed = readPositiveInt(next.restDuration, -1);
  if (parsed > 0 || parsed === 0) return parsed;
  return readPositiveInt(next.profileDefaultRest, 120) || 120;
}

export function restoreWorkoutRestTimer(
  input?: WorkoutRestTimerInput
): WorkoutRestTimerResult {
  const next = input || {};
  const restDuration = resolveWorkoutRestDuration(next);
  const restTotal = readPositiveInt(next.restTotal, 0);
  const restEndsAt = readPositiveInt(next.restEndsAt, 0);
  const now = readPositiveInt(next.now, Date.now());
  if (restEndsAt > 0) {
    const restSecondsLeft = Math.max(0, Math.ceil((restEndsAt - now) / 1000));
    if (restSecondsLeft > 0) {
      return {
        restDuration,
        restTotal,
        restEndsAt,
        restSecondsLeft,
        restBarActive: true,
        shouldSkip: false,
        isComplete: false,
      };
    }
  }

  return {
    restDuration,
    restTotal: 0,
    restEndsAt: 0,
    restSecondsLeft: 0,
    restBarActive: false,
    shouldSkip: false,
    isComplete: false,
  };
}

export function buildWorkoutRestDisplayState(
  input?: WorkoutRestDisplayInput,
  deps?: Record<string, unknown>
): WorkoutRestDisplayResult {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const restSecondsLeft = readPositiveInt(next.restSecondsLeft, 0);
  const restTotal = readPositiveInt(next.restTotal, 0);
  if (restSecondsLeft <= 0) {
    return {
      text: t?.('dashboard.badge.go', 'GO') || 'GO',
      className: 'rest-timer-count done',
      arcOffset: 119.4,
    };
  }

  const minutes = Math.floor(restSecondsLeft / 60);
  const seconds = restSecondsLeft % 60;
  const arcOffset = restTotal
    ? 119.4 * (1 - restSecondsLeft / Math.max(1, restTotal))
    : 119.4;
  return {
    text: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
    className: 'rest-timer-count' + (restSecondsLeft <= 10 ? ' warning' : ''),
    arcOffset,
  };
}

export function buildWorkoutSessionSnapshot(
  input?: WorkoutSessionSnapshotInput
): WorkoutSessionSnapshotResult {
  const next = input || {};
  const rpePrompt =
    next.rpePrompt && typeof next.rpePrompt === 'object'
      ? { ...(next.rpePrompt as Record<string, unknown>) }
      : null;
  const summaryPrompt =
    next.summaryPrompt && typeof next.summaryPrompt === 'object'
      ? { ...(next.summaryPrompt as Record<string, unknown>) }
      : null;
  const sportCheckPrompt =
    next.sportCheckPrompt && typeof next.sportCheckPrompt === 'object'
      ? { ...(next.sportCheckPrompt as Record<string, unknown>) }
      : null;
  const exerciseGuidePrompt =
    next.exerciseGuidePrompt && typeof next.exerciseGuidePrompt === 'object'
      ? { ...(next.exerciseGuidePrompt as Record<string, unknown>) }
      : null;

  return {
    activeWorkout: next.activeWorkout ?? null,
    restDuration: readPositiveInt(next.restDuration, 0),
    restEndsAt: readPositiveInt(next.restEndsAt, 0),
    restSecondsLeft: readPositiveInt(next.restSecondsLeft, 0),
    restTotal: readPositiveInt(next.restTotal, 0),
    currentUser: next.currentUser ?? null,
    restBarActive: next.restBarActive === true,
    rpeOpen: rpePrompt?.open === true,
    rpePrompt,
    summaryOpen: summaryPrompt?.open === true,
    summaryPrompt,
    sportCheckOpen: sportCheckPrompt?.open === true,
    sportCheckPrompt,
    exerciseGuideOpen: exerciseGuidePrompt?.open === true,
    exerciseGuidePrompt,
  };
}

export function clearWorkoutRestIntervalHost(deps?: WorkoutRestHostDeps) {
  if (!workoutRestIntervalHost) return;
  readTimerFunction<(handle: unknown) => void>(
    deps,
    'clearInterval'
  )?.(workoutRestIntervalHost);
  workoutRestIntervalHost = null;
}

export function clearWorkoutRestHideHost(deps?: WorkoutRestHostDeps) {
  if (!workoutRestHideHost) return;
  readTimerFunction<(handle: unknown) => void>(
    deps,
    'clearTimeout'
  )?.(workoutRestHideHost);
  workoutRestHideHost = null;
}

export function scheduleWorkoutRestIntervalHost(
  callback: () => void,
  deps?: WorkoutRestHostDeps
) {
  clearWorkoutRestIntervalHost(deps);
  workoutRestIntervalHost =
    readTimerFunction<(fn: () => void, delay?: number) => unknown>(
      deps,
      'setInterval'
    )?.(callback, 250) ?? null;
}

export function scheduleWorkoutRestHideHost(
  callback: () => void,
  delay = 3000,
  deps?: WorkoutRestHostDeps
) {
  clearWorkoutRestHideHost(deps);
  workoutRestHideHost =
    readTimerFunction<(fn: () => void, delay?: number) => unknown>(
      deps,
      'setTimeout'
    )?.(callback, delay) ?? null;
}

export function buildWorkoutRestLifecyclePlan(
  input?: WorkoutRestLifecycleInput,
  deps?: Record<string, unknown>
): WorkoutRestLifecyclePlan {
  const next = input || {};
  const mode = String(next.mode || 'sync');
  const resolvedState =
    mode === 'complete'
      ? completeWorkoutRestTimer(next)
      : mode === 'skip'
        ? skipWorkoutRestTimer(next)
        : syncWorkoutRestTimer(next);
  const shouldComplete = mode === 'sync' && resolvedState.isComplete === true;
  const timerState = shouldComplete
    ? completeWorkoutRestTimer({
        ...next,
        restDuration: resolvedState.restDuration,
        restTotal: resolvedState.restTotal,
      })
    : resolvedState;
  const displayState = buildWorkoutRestDisplayState(
    {
      restSecondsLeft: timerState.restSecondsLeft,
      restTotal: timerState.restTotal,
    },
    deps
  );

  return {
    timerState,
    displayState,
    shouldComplete,
    shouldPlayBeep: shouldComplete || mode === 'complete',
    hideDelayMs: shouldComplete || mode === 'complete' ? 3000 : 0,
  };
}

export function startWorkoutRestTimer(
  input?: WorkoutRestTimerInput
): WorkoutRestTimerResult {
  const next = input || {};
  const restDuration = resolveWorkoutRestDuration(next);
  const now = readPositiveInt(next.now, Date.now());
  if (!restDuration) {
    return {
      restDuration: 0,
      restTotal: 0,
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: false,
      shouldSkip: true,
      isComplete: false,
    };
  }

  return {
    restDuration,
    restTotal: restDuration,
    restEndsAt: now + restDuration * 1000,
    restSecondsLeft: restDuration,
    restBarActive: true,
    shouldSkip: false,
    isComplete: false,
  };
}

export function syncWorkoutRestTimer(
  input?: WorkoutRestTimerInput
): WorkoutRestTimerResult {
  const next = input || {};
  const restDuration = resolveWorkoutRestDuration(next);
  const restTotal = readPositiveInt(next.restTotal, 0);
  const restEndsAt = readPositiveInt(next.restEndsAt, 0);
  const now = readPositiveInt(next.now, Date.now());
  if (!restEndsAt) {
    return {
      restDuration,
      restTotal,
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: false,
      shouldSkip: false,
      isComplete: false,
    };
  }

  const restSecondsLeft = Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  return {
    restDuration,
    restTotal,
    restEndsAt: restSecondsLeft > 0 ? restEndsAt : 0,
    restSecondsLeft,
    restBarActive: true,
    shouldSkip: false,
    isComplete: restSecondsLeft <= 0,
  };
}

export function completeWorkoutRestTimer(
  input?: WorkoutRestTimerInput
): WorkoutRestTimerResult {
  const next = input || {};
  return {
    restDuration: resolveWorkoutRestDuration(next),
    restTotal: readPositiveInt(next.restTotal, 0),
    restEndsAt: 0,
    restSecondsLeft: 0,
    restBarActive: true,
    shouldSkip: false,
    isComplete: true,
  };
}

export function skipWorkoutRestTimer(
  input?: WorkoutRestTimerInput
): WorkoutRestTimerResult {
  const next = input || {};
  return {
    restDuration: resolveWorkoutRestDuration(next),
    restTotal: 0,
    restEndsAt: 0,
    restSecondsLeft: 0,
    restBarActive: false,
    shouldSkip: true,
    isComplete: false,
  };
}

export function buildSessionSummaryPromptState(
  input?: WorkoutSummaryPromptInput,
  deps?: Record<string, unknown>
): WorkoutSummaryPromptState {
  const next = input || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const summaryData =
    next.summaryData && typeof next.summaryData === 'object'
      ? (next.summaryData as MutableRecord)
      : {};
  const stats = buildSessionSummaryStats(summaryData, deps);

  return {
    open: true,
    seed: Math.max(
      0,
      parseInt(String(next.seed || Date.now()), 10) || Date.now()
    ),
    kicker:
      t?.('workout.session_complete', 'Session Complete') || 'Session Complete',
    title: 'SESSION FORGED',
    programLabel: String(summaryData.programLabel || ''),
    coachNote: String(summaryData.coachNote || ''),
    notesLabel:
      t?.('workout.summary.notes_label', 'Session notes') || 'Session notes',
    notesPlaceholder:
      t?.(
        'workout.summary.notes_placeholder',
        'Any notes about this session?'
      ) || 'Any notes about this session?',
    feedbackLabel:
      t?.('workout.summary.feedback_label', 'How did it feel?') ||
      'How did it feel?',
    feedbackOptions: [
      {
        value: 'too_hard',
        label:
          t?.('workout.summary.feedback_too_hard', 'Too hard') || 'Too hard',
      },
      {
        value: 'good',
        label: t?.('workout.summary.feedback_good', 'Good') || 'Good',
      },
      {
        value: 'too_easy',
        label:
          t?.('workout.summary.feedback_too_easy', 'Too easy') || 'Too easy',
      },
    ],
    nutritionLabel:
      t?.('workout.summary.log_post_workout_meal', 'Log post-workout meal') ||
      'Log post-workout meal',
    doneLabel: t?.('common.done', 'Done') || 'Done',
    notes: '',
    feedback: null,
    canLogNutrition: next.canLogNutrition === true,
    stats: stats.map((stat) => ({
      key: String(stat.key || ''),
      accent: String(stat.accent || ''),
      label: String(stat.label || ''),
      initialText: stat.formatter(0),
    })),
    summaryData: { ...summaryData },
  };
}

let workoutStartSnapshotCache: ReturnType<
  typeof normalizeWorkoutStartSnapshot
> | null = null;

export function getCachedWorkoutStartSnapshot() {
  return normalizeWorkoutStartSnapshot(workoutStartSnapshotCache);
}

export function setCachedWorkoutStartSnapshot(
  snapshot?: Record<string, unknown> | null
) {
  workoutStartSnapshotCache = normalizeWorkoutStartSnapshot(snapshot || null);
  return getCachedWorkoutStartSnapshot();
}

export function clearWorkoutStartSnapshot() {
  workoutStartSnapshotCache = null;
}

function getWorkoutStartSnapshotSignature(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const normalizeTrainingPreferences = readFunction<
    (profileLike?: Record<string, unknown> | null) => Record<string, unknown>
  >(deps, 'normalizeTrainingPreferences');
  const getProfile = readFunction<() => Record<string, unknown> | null>(
    deps,
    'getProfile'
  );
  const getActiveProgram = readFunction<() => Record<string, unknown> | null>(
    deps,
    'getActiveProgram'
  );
  const getActiveProgramState = readFunction<
    () => Record<string, unknown> | null
  >(deps, 'getActiveProgramState');
  const getProgramSessionBuildContext = readFunction<
    (value?: Record<string, unknown>) => Record<string, unknown> | null
  >(deps, 'getProgramSessionBuildContext');
  const normalizeEnergyLevel = readFunction<(value?: unknown) => string>(
    deps,
    'normalizeEnergyLevel'
  );

  const prefs = normalizeTrainingPreferences?.(
    (next.profile as MutableRecord | null) || getProfile?.() || null
  ) || {
    warmupSetsEnabled: false,
    goal: '',
    sessionMinutes: 0,
    sportReadinessCheckEnabled: false,
  };
  const sportContext =
    next.sportContext && typeof next.sportContext === 'object'
      ? {
          sportLoadLevel: String(
            (next.sportContext as MutableRecord).sportLoadLevel || 'none'
          ),
          legsStress: String(
            (next.sportContext as MutableRecord).legsStress || 'none'
          ),
          sportName: String(
            (next.sportContext as MutableRecord).sportName || ''
          ),
        }
      : null;

  const prog =
    (next.prog as MutableRecord | null) || getActiveProgram?.() || null;
  const state =
    (next.state as MutableRecord | null) || getActiveProgramState?.() || {};
  const decisionBundle = (next.decisionBundle as MutableRecord | null) || null;
  const buildContext =
    getProgramSessionBuildContext?.({
      prog,
      state,
      sessionModeBundle: decisionBundle,
    }) || null;

  return JSON.stringify({
    programId: String(prog?.id || ''),
    selectedOption: String(next.selectedOption || ''),
    state: cloneJson(state),
    sportContext,
    selectedSessionMode:
      (next.decisionBundle as MutableRecord | undefined)?.selectedSessionMode ||
      next.pendingSessionMode ||
      'auto',
    effectiveSessionMode:
      (next.decisionBundle as MutableRecord | undefined)
        ?.effectiveSessionMode || 'normal',
    energyLevel:
      (next.decisionBundle as MutableRecord | undefined)?.energyLevel ||
      normalizeEnergyLevel?.(next.pendingEnergyLevel) ||
      'normal',
    preferences: {
      warmupSetsEnabled: !!prefs.warmupSetsEnabled,
      goal: String(prefs.goal || ''),
      sessionMinutes: readNumber(prefs.sessionMinutes, 0),
      sportReadinessCheckEnabled: !!prefs.sportReadinessCheckEnabled,
    },
    programRuntime:
      buildContext && typeof buildContext === 'object'
        ? cloneJson(
            ((buildContext as MutableRecord)
              .programRuntime as MutableRecord | null) || {}
          )
        : null,
  });
}

export function resolveWorkoutStartSnapshot(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const signature = getWorkoutStartSnapshotSignature(input, deps);
  if (workoutStartSnapshotCache?.signature === signature) {
    return getCachedWorkoutStartSnapshot();
  }
  const snapshot = buildWorkoutStartSnapshot(input, deps);
  workoutStartSnapshotCache = normalizeWorkoutStartSnapshot(snapshot);
  return getCachedWorkoutStartSnapshot();
}

function buildWorkoutStartSnapshot(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const getActiveProgram = readFunction<() => Record<string, unknown> | null>(
    deps,
    'getActiveProgram'
  );
  const getActiveProgramState = readFunction<
    () => Record<string, unknown> | null
  >(deps, 'getActiveProgramState');
  const getWorkoutStartDecisionBundle = readFunction<
    (value?: Record<string, unknown>) => Record<string, unknown> | null
  >(deps, 'getWorkoutStartDecisionBundle');
  const getProgramSessionBuildContext = readFunction<
    (value?: Record<string, unknown>) => Record<string, unknown> | null
  >(deps, 'getProgramSessionBuildContext');
  const getProgramSessionStateForBuild = readFunction<
    (
      prog: Record<string, unknown>,
      state: Record<string, unknown> | null,
      buildContext: Record<string, unknown> | null
    ) => Record<string, unknown> | null
  >(deps, 'getProgramSessionStateForBuild');
  const cloneWorkoutExercises = readFunction<
    (value?: unknown) => Array<Record<string, unknown>>
  >(deps, 'cloneWorkoutExercises');
  const withResolvedExerciseId = readFunction<
    (value?: Record<string, unknown>) => Record<string, unknown>
  >(deps, 'withResolvedExerciseId');
  const applyTrainingPreferencesToExercises = readFunction<
    (
      exercises: Array<Record<string, unknown>>,
      sportContext?: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Record<string, unknown>
  >(deps, 'applyTrainingPreferencesToExercises');
  const normalizeTrainingPreferences = readFunction<
    (profileLike?: Record<string, unknown> | null) => Record<string, unknown>
  >(deps, 'normalizeTrainingPreferences');
  const injectWarmupSets = readFunction<
    (exercises: Array<Record<string, unknown>>) => void
  >(deps, 'injectWarmupSets');
  const getProfile = readFunction<() => Record<string, unknown> | null>(
    deps,
    'getProfile'
  );

  const prog =
    (next.prog as MutableRecord | null) || getActiveProgram?.() || null;
  if (!prog || typeof prog.buildSession !== 'function') {
    return normalizeWorkoutStartSnapshot({ exercises: [] });
  }

  const state =
    (next.state as MutableRecord | null) || getActiveProgramState?.() || null;
  const decisionBundle =
    (next.decisionBundle as MutableRecord | null) ||
    getWorkoutStartDecisionBundle?.({
      prog,
      state,
      sportContext: next.sportContext,
    }) ||
    null;
  const planningContext =
    (next.planningContext as MutableRecord | null) ||
    (decisionBundle?.planningContext as MutableRecord | null) ||
    null;
  const trainingDecision =
    (next.trainingDecision as MutableRecord | null) ||
    (decisionBundle?.trainingDecision as MutableRecord | null) ||
    null;
  const effectiveDecision =
    (decisionBundle?.effectiveDecision as MutableRecord | null) ||
    trainingDecision;
  let selectedOption = String(next.selectedOption || '');
  if (
    !selectedOption &&
    typeof trainingDecision?.recommendedSessionOption === 'string'
  ) {
    selectedOption = trainingDecision.recommendedSessionOption;
  }

  const buildContext =
    getProgramSessionBuildContext?.({
      prog,
      state,
      sessionModeBundle: decisionBundle,
    }) || null;
  const buildState =
    getProgramSessionStateForBuild?.(prog, state, buildContext) || state || {};
  const rawExercises =
    (
      prog.buildSession as (
        option: string,
        state: Record<string, unknown>,
        context: Record<string, unknown> | null
      ) => Array<Record<string, unknown>>
    )(selectedOption, buildState, buildContext) || [];
  const builtExercises =
    cloneWorkoutExercises?.(
      rawExercises.map(
        (exercise) => withResolvedExerciseId?.(exercise) || exercise
      )
    ) || [];
  const sessionPrefs =
    applyTrainingPreferencesToExercises?.(
      builtExercises,
      next.sportContext as Record<string, unknown> | undefined,
      {
        planningContext,
        decision: effectiveDecision,
        effectiveSessionMode: decisionBundle?.effectiveSessionMode,
      }
    ) || {};
  const exercises =
    cloneWorkoutExercises?.(
      (sessionPrefs.exercises as Array<Record<string, unknown>> | undefined) ||
        builtExercises
    ) || [];
  const prefs =
    normalizeTrainingPreferences?.(
      (next.profile as MutableRecord | null) || getProfile?.() || null
    ) || {};
  if (prefs.warmupSetsEnabled) {
    injectWarmupSets?.(exercises);
  }

  const blockInfo =
    typeof prog.getBlockInfo === 'function'
      ? prog.getBlockInfo(buildState, buildContext)
      : { isDeload: false };
  const sessionDescription =
    typeof prog.getSessionDescription === 'function'
      ? String(
          prog.getSessionDescription(
            selectedOption,
            buildState,
            buildContext
          ) || ''
        )
      : String(blockInfo?.modeDesc || blockInfo?.name || '');

  return normalizeWorkoutStartSnapshot({
    signature: getWorkoutStartSnapshotSignature(next, deps),
    programId: String(prog.id || ''),
    selectedOption,
    buildContext,
    buildState: cloneJson(buildState),
    exercises,
    sessionDescription,
    programLabel:
      typeof prog.getSessionLabel === 'function'
        ? prog.getSessionLabel(selectedOption, buildState, buildContext)
        : '',
    effectiveDecision,
    trainingDecision,
    changes: Array.isArray(sessionPrefs.changes)
      ? sessionPrefs.changes.slice()
      : [],
    equipmentHint: String(sessionPrefs.equipmentHint || ''),
    commentary:
      sessionPrefs.commentary && typeof sessionPrefs.commentary === 'object'
        ? sessionPrefs.commentary
        : undefined,
  });
}

export function buildWorkoutStartPlan(
  input?: WorkoutStartPlanInput,
  deps?: Record<string, unknown>
): WorkoutStartPlanResult {
  const next = input || {};
  const prog =
    next.prog && typeof next.prog === 'object'
      ? next.prog
      : readFunction<() => Record<string, unknown> | null>(
          deps,
          'getActiveProgram'
        )?.() || null;
  const state =
    next.state && typeof next.state === 'object'
      ? next.state
      : readFunction<() => Record<string, unknown> | null>(
          deps,
          'getActiveProgramState'
        )?.() || null;
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const buildWorkoutRewardState = readFunction<() => Record<string, unknown>>(
    deps,
    'buildWorkoutRewardState'
  );
  const ensureWorkoutExerciseUiKeys = readFunction<
    (
      exercises: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>
  >(deps, 'ensureWorkoutExerciseUiKeys');
  const getProgramSessionBuildContext = readFunction<
    (value?: Record<string, unknown>) => Record<string, unknown> | null
  >(deps, 'getProgramSessionBuildContext');
  const getProgramSessionStateForBuild = readFunction<
    (
      prog: Record<string, unknown>,
      state: Record<string, unknown> | null,
      buildContext: Record<string, unknown> | null
    ) => Record<string, unknown> | null
  >(deps, 'getProgramSessionStateForBuild');
  const cloneWorkoutExercises = readFunction<
    (value?: unknown) => Array<Record<string, unknown>>
  >(deps, 'cloneWorkoutExercises');
  const wasSportRecently = readFunction<(hours?: number) => boolean>(
    deps,
    'wasSportRecently'
  );
  const buildBonusSession = readFunction<
    (
      prog: Record<string, unknown>,
      state: Record<string, unknown> | null,
      workouts: Array<Record<string, unknown>>,
      schedule: Record<string, unknown> | null,
      duration: string
    ) => Array<Record<string, unknown>>
  >(deps, 'buildBonusSession');
  const getSelectedBonusDuration = readFunction<() => string>(
    deps,
    'getSelectedBonusDuration'
  );

  if (!prog) {
    return {
      activeWorkout: null,
      startSnapshot: null,
      startPresentation: null,
    };
  }

  const selectedOption = String(next.selectedOption || '');
  const schedule =
    next.schedule && typeof next.schedule === 'object' ? next.schedule : null;
  const workouts = Array.isArray(next.workouts) ? next.workouts : [];
  const sportContext =
    next.sportContext && typeof next.sportContext === 'object'
      ? next.sportContext
      : null;
  const cachedSnapshot = getCachedWorkoutStartSnapshot();
  const canReuseCachedSnapshot =
    cachedSnapshot &&
    String(cachedSnapshot.programId || '') === String(prog.id || '') &&
    (!selectedOption ||
      String(cachedSnapshot.selectedOption || '') === selectedOption);

  if (selectedOption === 'bonus' && buildBonusSession) {
    const bonusExercises =
      buildBonusSession(
        prog,
        state,
        workouts,
        schedule,
        getSelectedBonusDuration?.() || 'standard'
      ) || [];
    const bonusLabel =
      t?.('workout.bonus.label', 'Bonus Workout') || 'Bonus Workout';
    const activeWorkout = buildBonusActiveWorkout(
      {
        programId: String(prog.id || ''),
        programLabel: bonusLabel,
        sportContext,
        sessionDescription:
          t?.(
            'workout.bonus.subtitle',
            'Extra session for undertrained areas'
          ) || 'Extra session for undertrained areas',
        exercises: bonusExercises,
        startTime: Date.now(),
      },
      {
        buildWorkoutRewardState,
        ensureWorkoutExerciseUiKeys,
      }
    );
    return {
      activeWorkout,
      startSnapshot: null,
      startPresentation: buildWorkoutStartPresentation(
        {
          isBonus: true,
          title: bonusLabel,
          sessionDescription: activeWorkout.sessionDescription || '',
          activeWorkout,
        },
        {
          t,
        }
      ),
    };
  }

  const decisionBundle =
    readFunction<
      (value?: Record<string, unknown>) => Record<string, unknown> | null
    >(
      deps,
      'getWorkoutStartDecisionBundle'
    )?.({
      prog,
      state,
      sportContext,
    }) || null;
  const planningContext =
    (decisionBundle?.planningContext as MutableRecord | null) || null;
  const trainingDecision =
    (decisionBundle?.trainingDecision as MutableRecord | null) || null;
  const resolvedSelectedOption =
    selectedOption ||
    String(cachedSnapshot?.selectedOption || '') ||
    (typeof trainingDecision?.recommendedSessionOption === 'string'
      ? trainingDecision.recommendedSessionOption
      : '');
  const startSnapshotInput = {
    prog,
    state,
    selectedOption: resolvedSelectedOption,
    sportContext,
    decisionBundle,
    planningContext,
    trainingDecision,
    profile: next.profile,
    pendingSessionMode: next.pendingSessionMode,
    pendingEnergyLevel: next.pendingEnergyLevel,
  };
  const expectedSnapshotSignature = getWorkoutStartSnapshotSignature(
    startSnapshotInput,
    deps
  );
  const startSnapshot =
    canReuseCachedSnapshot &&
    String(cachedSnapshot?.signature || '') === expectedSnapshotSignature
      ? cachedSnapshot
      : resolveWorkoutStartSnapshot(startSnapshotInput, deps);
  const resolvedOption = String(
    startSnapshot?.selectedOption || selectedOption
  );
  const effectiveDecision =
    startSnapshot?.effectiveDecision ||
    (decisionBundle?.effectiveDecision as MutableRecord | null) ||
    trainingDecision;
  const buildContext =
    startSnapshot?.buildContext ||
    getProgramSessionBuildContext?.({
      prog,
      state,
      sessionModeBundle: decisionBundle,
    }) ||
    null;
  const buildState =
    startSnapshot?.buildState ||
    getProgramSessionStateForBuild?.(prog, state, buildContext) ||
    state ||
    {};
  const exercises = startSnapshot?.exercises
    ? cloneWorkoutExercises?.(startSnapshot.exercises) ||
      startSnapshot.exercises
    : [];
  const programLabel =
    String(startSnapshot?.programLabel || '') ||
    (typeof prog.getSessionLabel === 'function'
      ? String(
          prog.getSessionLabel(resolvedOption, buildState, buildContext) || ''
        )
      : '');
  const blockInfo =
    typeof prog.getBlockInfo === 'function'
      ? prog.getBlockInfo(buildState, buildContext)
      : { isDeload: false };
  const sessionDescription =
    String(startSnapshot?.sessionDescription || '') ||
    (typeof prog.getSessionDescription === 'function'
      ? String(
          prog.getSessionDescription(
            resolvedOption,
            buildState,
            buildContext
          ) || ''
        )
      : String(blockInfo?.modeDesc || blockInfo?.name || ''));
  const activeWorkout = buildPlannedActiveWorkout(
    {
      programId: String(prog.id || ''),
      selectedOption: resolvedOption,
      programMode:
        state && typeof state === 'object' && typeof state.mode === 'string'
          ? state.mode
          : undefined,
      programLabel,
      sportContext,
      trainingDecision: trainingDecision || undefined,
      planningContext: planningContext || undefined,
      commentary: startSnapshot?.commentary || undefined,
      effectiveDecision: effectiveDecision || undefined,
      selectedSessionMode:
        String(decisionBundle?.selectedSessionMode || 'auto') || 'auto',
      effectiveSessionMode:
        String(decisionBundle?.effectiveSessionMode || 'normal') || 'normal',
      sportAwareLowerBody: decisionBundle?.sportAwareLowerBody === true,
      sessionDescription,
      sessionSnapshot: startSnapshot || undefined,
      exercises,
      startTime: Date.now(),
    },
    {
      buildWorkoutRewardState,
      ensureWorkoutExerciseUiKeys,
    }
  );
  const todayDow = new Date().getDay();
  const isSportDay =
    Array.isArray(schedule?.sportDays) && schedule.sportDays.includes(todayDow);
  const programName =
    t?.(
      'program.' + String(prog.id || '') + '.name',
      String(prog.name || 'Training')
    ) || String(prog.name || 'Training');

  return {
    activeWorkout,
    startSnapshot,
    startPresentation: buildWorkoutStartPresentation(
      {
        activeWorkout,
        title: programLabel,
        programName,
        sessionDescription,
        effectiveDecision,
        planningContext,
        startSnapshot,
        schedule,
        legLifts: Array.isArray(prog.legLifts) ? prog.legLifts : [],
        isSportDay,
        hadSportRecently: wasSportRecently?.() === true,
        isDeload: blockInfo?.isDeload === true,
      },
      {
        t,
        getWorkoutCommentaryState: deps?.getWorkoutCommentaryState,
        presentTrainingCommentary: deps?.presentTrainingCommentary,
        getWorkoutDecisionSummary: deps?.getWorkoutDecisionSummary,
        getTrainingToastColor: deps?.getTrainingToastColor,
      }
    ),
  };
}

function buildSessionSummaryStats(
  summaryData?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = summaryData || {};
  const t = readFunction<
    (key: string, fallback: string, params?: Record<string, unknown>) => string
  >(deps, 't');
  const formatDuration = readFunction<(value: number) => string>(
    deps,
    'formatDuration'
  );
  const formatTonnage = readFunction<(value: number) => string>(
    deps,
    'formatTonnage'
  );

  return [
    {
      key: 'duration',
      accent: '',
      label: t?.('workout.summary_duration', 'Duration') || 'Duration',
      value: Math.max(0, Math.round(readNumber(next.duration, 0)) || 0),
      formatter: (value: number) => formatDuration?.(value) || String(value),
    },
    {
      key: 'sets',
      accent: 'green',
      label: t?.('workout.summary_sets', 'Sets Done') || 'Sets Done',
      value: Math.max(0, parseInt(String(next.completedSets || 0), 10) || 0),
      formatter: (value: number) =>
        `${Math.round(value)}/${Math.max(0, parseInt(String(next.totalSets || 0), 10) || 0)}`,
    },
    {
      key: 'volume',
      accent: 'gold',
      label: t?.('workout.summary_volume', 'Volume') || 'Volume',
      value: Math.max(0, parseFloat(String(next.tonnage || 0)) || 0),
      formatter: (value: number) => formatTonnage?.(value) || String(value),
    },
    {
      key: 'rpe',
      accent: 'purple',
      label: t?.('workout.summary_rpe', 'RPE') || 'RPE',
      value: Math.max(0, parseFloat(String(next.rpe || 0)) || 0),
      formatter: (value: number) =>
        value > 0 ? String(Math.round(value * 10) / 10) : '--',
    },
    {
      key: 'prs',
      accent: 'gold',
      label: t?.('workout.summary_prs', 'PRs') || 'PRs',
      value: Math.max(0, parseInt(String(next.prCount || 0), 10) || 0),
      formatter: (value: number) => String(Math.round(value)),
    },
  ];
}

function buildSessionCompletionMetrics(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const parseLoggedRepCount = readFunction<(value: unknown) => number>(
    deps,
    'parseLoggedRepCount'
  );
  const exercises = Array.isArray(next.exercises)
    ? (next.exercises as Array<Record<string, unknown>>)
    : [];

  let completedSets = 0;
  let tonnage = 0;
  exercises.forEach((exercise) => {
    const sets = Array.isArray(exercise?.sets)
      ? (exercise.sets as Array<Record<string, unknown>>)
      : [];
    sets.forEach((set) => {
      if (set.done !== true || set.isWarmup === true) return;
      completedSets += 1;
      tonnage +=
        (parseFloat(String(set.weight || 0)) || 0) *
        (parseLoggedRepCount?.(set.reps) || 0);
    });
  });

  return {
    completedSets,
    tonnage,
    totalSets: Math.max(
      0,
      parseInt(String(next.totalSets ?? 0), 10) ||
        exercises.reduce((sum, exercise) => {
          const sets = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
          return sum + sets;
        }, 0)
    ),
  };
}

export function buildSavedWorkoutRecord(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
): WorkoutSavePlan {
  const next = input || {};
  const cloneTrainingDecision = readFunction<
    (value?: Record<string, unknown> | null) => Record<string, unknown> | null
  >(deps, 'cloneTrainingDecision');
  const activeWorkout =
    next.activeWorkout && typeof next.activeWorkout === 'object'
      ? (next.activeWorkout as MutableRecord)
      : {};
  const runnerState =
    activeWorkout.runnerState && typeof activeWorkout.runnerState === 'object'
      ? (activeWorkout.runnerState as MutableRecord)
      : null;

  return {
    id: next.workoutId,
    date: next.workoutDate,
    program: String(next.programId || activeWorkout.program || ''),
    type: String(next.programId || activeWorkout.type || ''),
    programOption: activeWorkout.programOption,
    programDayNum: activeWorkout.programDayNum,
    programLabel: String(activeWorkout.programLabel || ''),
    sportContext: activeWorkout.sportContext || undefined,
    programMeta: cloneJson(next.programMeta),
    sessionDescription: String(activeWorkout.sessionDescription || ''),
    commentary: activeWorkout.commentary
      ? cloneJson(activeWorkout.commentary)
      : undefined,
    planningDecision: activeWorkout.planningDecision || undefined,
    runnerState: runnerState
      ? {
          mode: runnerState.mode,
          adjustments: Array.isArray(runnerState.adjustments)
            ? runnerState.adjustments.slice()
            : [],
          initialDecision: runnerState.initialDecision
            ? cloneTrainingDecision?.(
                runnerState.initialDecision as Record<string, unknown>
              ) || cloneJson(runnerState.initialDecision)
            : undefined,
          selectedSessionMode: runnerState.selectedSessionMode || undefined,
          effectiveSessionMode: runnerState.effectiveSessionMode || undefined,
          sportAwareLowerBody: runnerState.sportAwareLowerBody === true,
        }
      : undefined,
    sessionSnapshot:
      activeWorkout.sessionSnapshot &&
      typeof activeWorkout.sessionSnapshot === 'object'
        ? normalizeWorkoutStartSnapshot(activeWorkout.sessionSnapshot)
        : undefined,
    isBonus: activeWorkout.isBonus === true,
    prCount: Math.max(0, parseInt(String(next.prCount || 0), 10) || 0),
    programStateBefore: cloneJson(next.stateBeforeSession),
    programStateUsedForBuild: cloneJson(next.progressionSourceState),
    duration: Math.max(0, parseInt(String(next.duration || 0), 10) || 0),
    exercises: cloneJson(next.exercises),
    rpe: readNumber(next.sessionRPE, 0),
    sets: Math.max(0, parseInt(String(next.totalSets || 0), 10) || 0),
  };
}

export function buildSessionSummaryData(
  input?: Record<string, unknown>,
  deps?: Record<string, unknown>
) {
  const next = input || {};
  const metrics = buildSessionCompletionMetrics(next, deps);
  const buildCoachNote = readFunction<
    (
      summaryMeta: Record<string, unknown>,
      stateBefore: Record<string, unknown> | null,
      stateAfter: Record<string, unknown> | null,
      activeWorkout: Record<string, unknown> | null
    ) => string
  >(deps, 'buildCoachNote');

  return {
    duration: Math.max(0, parseInt(String(next.duration || 0), 10) || 0),
    exerciseCount: Array.isArray(next.exercises) ? next.exercises.length : 0,
    completedSets: metrics.completedSets,
    totalSets: metrics.totalSets,
    tonnage: metrics.tonnage,
    rpe: readNumber(next.sessionRPE, 0),
    prCount: Math.max(0, parseInt(String(next.prCount || 0), 10) || 0),
    isBonus: next.isBonus === true,
    programLabel: String(next.programLabel || ''),
    coachNote:
      buildCoachNote?.(
        {
          completedSets: metrics.completedSets,
          totalSets: metrics.totalSets,
          rpe: readNumber(next.sessionRPE, 0),
          prCount: Math.max(0, parseInt(String(next.prCount || 0), 10) || 0),
          tmAdjustments: Array.isArray(next.tmAdjustments)
            ? next.tmAdjustments
            : [],
        },
        (next.stateBeforeSession as Record<string, unknown> | null) || null,
        (next.advancedState as Record<string, unknown> | null) || null,
        (next.activeWorkout as Record<string, unknown> | null) || null
      ) || '',
  };
}

export function buildBonusActiveWorkout(
  input?: WorkoutSessionBootstrapInput,
  deps?: Record<string, unknown>
): WorkoutSessionBootstrapResult {
  const next = input || {};
  const buildWorkoutRewardState = readFunction<() => Record<string, unknown>>(
    deps,
    'buildWorkoutRewardState'
  );
  const ensureWorkoutExerciseUiKeys = readFunction<
    (
      exercises: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>
  >(deps, 'ensureWorkoutExerciseUiKeys');

  return {
    program: String(next.programId || ''),
    type: String(next.programId || ''),
    isBonus: true,
    programOption: 'bonus',
    programDayNum: 0,
    programLabel: String(next.programLabel || ''),
    sportContext: next.sportContext || undefined,
    runnerState: {
      mode: 'train',
      adjustments: [],
      selectedSessionMode: 'normal',
      effectiveSessionMode: 'normal',
    },
    sessionDescription: String(next.sessionDescription || ''),
    rewardState: buildWorkoutRewardState?.() || {},
    exercises:
      ensureWorkoutExerciseUiKeys?.(
        Array.isArray(next.exercises)
          ? (next.exercises as Array<Record<string, unknown>>)
          : []
      ) || [],
    startTime: readNumber(next.startTime, Date.now()),
  };
}

export function buildPlannedActiveWorkout(
  input?: WorkoutSessionBootstrapInput,
  deps?: Record<string, unknown>
): WorkoutSessionBootstrapResult {
  const next = input || {};
  const buildWorkoutRewardState = readFunction<() => Record<string, unknown>>(
    deps,
    'buildWorkoutRewardState'
  );
  const ensureWorkoutExerciseUiKeys = readFunction<
    (
      exercises: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>
  >(deps, 'ensureWorkoutExerciseUiKeys');

  return {
    program: String(next.programId || ''),
    type: String(next.programId || ''),
    programOption: String(next.selectedOption || ''),
    programDayNum: parseInt(String(next.selectedOption || ''), 10) || 1,
    programMode:
      next.programMode === null || next.programMode === undefined
        ? undefined
        : next.programMode,
    programLabel: String(next.programLabel || ''),
    sportContext: next.sportContext || undefined,
    planningDecision: next.trainingDecision || undefined,
    planningContext: next.planningContext || undefined,
    commentary: next.commentary || undefined,
    runnerState: {
      mode:
        (next.effectiveDecision as MutableRecord | undefined)?.action ||
        (next.trainingDecision as MutableRecord | undefined)?.action ||
        'train',
      adjustments: [],
      initialDecision: next.trainingDecision || undefined,
      selectedSessionMode: next.selectedSessionMode || 'auto',
      effectiveSessionMode: next.effectiveSessionMode || 'normal',
      sportAwareLowerBody: next.sportAwareLowerBody === true,
    },
    sessionDescription: String(next.sessionDescription || ''),
    sessionSnapshot:
      next.sessionSnapshot && typeof next.sessionSnapshot === 'object'
        ? normalizeWorkoutStartSnapshot(next.sessionSnapshot)
        : undefined,
    rewardState: buildWorkoutRewardState?.() || {},
    exercises:
      ensureWorkoutExerciseUiKeys?.(
        Array.isArray(next.exercises)
          ? (next.exercises as Array<Record<string, unknown>>)
          : []
      ) || [],
    startTime: readNumber(next.startTime, Date.now()),
  };
}

export function installWorkoutRuntimeBridge() {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) return null;
  if (runtimeWindow.__IRONFORGE_WORKOUT_RUNTIME__) {
    return runtimeWindow.__IRONFORGE_WORKOUT_RUNTIME__;
  }

  const api: WorkoutRuntimeApi = {
    getWorkoutStartSnapshotSignature,
    getCachedWorkoutStartSnapshot,
    setCachedWorkoutStartSnapshot,
    clearWorkoutStartSnapshot,
    resolveWorkoutStartSnapshot,
    buildWorkoutStartSnapshot,
    buildWorkoutStartPlan,
    buildSessionSummaryStats,
    buildSavedWorkoutRecord,
    buildSessionSummaryData,
    buildBonusActiveWorkout,
    buildPlannedActiveWorkout,
    sanitizeSetValue,
    applySetUpdateMutation,
    toggleWorkoutSetCompletion,
    appendWorkoutSet,
    removeWorkoutExercise,
    sanitizeWorkoutExercisesForSave,
    buildProgramTmAdjustments,
    resolveWorkoutProgramMeta,
    buildWorkoutProgressionResult,
    buildWorkoutProgressionToast,
    buildWorkoutFinishPlan,
    commitWorkoutFinishPersistence,
    buildCoachNote,
    buildTmAdjustmentToast,
    buildPostWorkoutOutcome,
    applyPostWorkoutOutcomeEffects,
    buildWorkoutStartPresentation,
    buildSessionSummaryPromptState,
    clearWorkoutRestIntervalHost,
    clearWorkoutRestHideHost,
    scheduleWorkoutRestIntervalHost,
    scheduleWorkoutRestHideHost,
    buildWorkoutRestLifecyclePlan,
    buildWorkoutRestDisplayState,
    buildWorkoutSessionSnapshot,
    resolveWorkoutRestDuration,
    restoreWorkoutRestTimer,
    startWorkoutRestTimer,
    syncWorkoutRestTimer,
    completeWorkoutRestTimer,
    skipWorkoutRestTimer,
    buildWorkoutTeardownPlan,
  };

  runtimeWindow.__IRONFORGE_WORKOUT_RUNTIME__ = api;
  return api;
}
