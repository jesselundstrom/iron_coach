import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { ActiveWorkout, WorkoutStartSnapshot } from '../domain/types';
import {
  normalizeActiveWorkout,
  normalizeWorkoutStartSnapshot,
} from '../domain/workout-helpers';
import type {
  WorkoutRestTimerResult,
  WorkoutRuntimeApi,
} from '../app/services/workout-runtime';
import { dataStore } from './data-store';
import { useRuntimeStore } from '../app/store/runtime-store';
import { navigateToPage } from '../app/services/navigation-actions';

type LegacyWorkoutStoreState = {
  activeWorkout: ActiveWorkout | null;
  startSnapshot: WorkoutStartSnapshot | null;
  hasActiveWorkout: boolean;
  restDuration: number;
  restEndsAt: number;
  restSecondsLeft: number;
  syncFromLegacy: () => LegacyWorkoutSnapshot;
  getStartSnapshot: (input?: Record<string, unknown>) => WorkoutStartSnapshot | null;
  getCachedStartSnapshot: () => WorkoutStartSnapshot | null;
  clearStartSnapshot: () => void;
  startWorkout: () => Promise<unknown> | unknown;
  resumeActiveWorkoutUI: (options?: Record<string, unknown>) => unknown;
  updateRestDuration: (nextValue?: string | number | null) => void;
  syncRestTimer: () => void;
  startRestTimer: () => void;
  skipRest: () => void;
  addExerciseByName: (name: string) => void;
  selectExerciseCatalogExercise: (exerciseId: string) => void;
  showSetRIRPrompt: (exerciseIndex: number, setIndex: number) => void;
  applySetRIR: (
    exerciseIndex: number,
    setIndex: number,
    rirValue: string | number
  ) => void;
  toggleSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: string,
    value: string | number
  ) => void;
  addSet: (exerciseIndex: number) => void;
  removeExercise: (exerciseIndex: number) => void;
  finishWorkout: () => Promise<unknown> | unknown;
  cancelWorkout: () => void;
};

type LegacyWorkoutSnapshot = Omit<
  LegacyWorkoutStoreState,
  | 'syncFromLegacy'
  | 'getStartSnapshot'
  | 'getCachedStartSnapshot'
  | 'clearStartSnapshot'
  | 'startWorkout'
  | 'resumeActiveWorkoutUI'
  | 'updateRestDuration'
  | 'syncRestTimer'
  | 'startRestTimer'
  | 'skipRest'
  | 'addExerciseByName'
  | 'selectExerciseCatalogExercise'
  | 'showSetRIRPrompt'
  | 'applySetRIR'
  | 'toggleSet'
  | 'updateSet'
  | 'addSet'
  | 'removeExercise'
  | 'finishWorkout'
  | 'cancelWorkout'
>;

type LegacyWorkoutWindow = Window & {
  activeWorkout?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  I18N?: {
    t?: (
      key: string,
      params?: Record<string, unknown> | null,
      fallback?: string
    ) => string;
  };
  getWorkoutStartSnapshot?: (
    input?: Record<string, unknown>
  ) => Record<string, unknown> | null;
  getCachedWorkoutStartSnapshot?: () => Record<string, unknown> | null;
  clearWorkoutStartSnapshot?: () => void;
  startWorkout?: () => Promise<unknown> | unknown;
  resumeActiveWorkoutUI?: (options?: Record<string, unknown>) => unknown;
  updateRestDuration?: (nextValue?: string | number | null) => void;
  syncRestTimer?: () => void;
  startRestTimer?: () => void;
  skipRest?: () => void;
  addExerciseByName?: (name: string) => void;
  selectExerciseCatalogExercise?: (exerciseId: string) => void;
  showSetRIRPrompt?: (exerciseIndex: number, setIndex: number) => void;
  applySetRIR?: (
    exerciseIndex: number,
    setIndex: number,
    rirValue: string | number
  ) => void;
  toggleSet?: (exerciseIndex: number, setIndex: number) => void;
  updateSet?: (
    exerciseIndex: number,
    setIndex: number,
    field: string,
    value: string | number
  ) => void;
  addSet?: (exerciseIndex: number) => void;
  removeEx?: (exerciseIndex: number) => void;
  finishWorkout?: () => Promise<unknown> | unknown;
  cancelWorkout?: () => void;
  persistActiveWorkoutDraft?: (...args: unknown[]) => unknown;
  clearActiveWorkoutDraft?: (...args: unknown[]) => unknown;
  syncWorkoutSessionBridge?: (...args: unknown[]) => unknown;
  closeCustomModal?: () => void;
  showToast?: (
    message: string,
    color?: string,
    undoAction?: (() => void) | null
  ) => void;
  __IRONFORGE_WORKOUT_RUNTIME__?: WorkoutRuntimeApi;
  __IRONFORGE_LEGACY_RUNTIME_ACCESS__?: {
    read?: (name: string) => unknown;
    write?: (name: string, value: unknown) => void;
  };
};

const WRAPPED_MARK = '__ironforgeWorkoutStoreWrapped';
const DELEGATOR_MARK = '__ironforgeWorkoutStoreDelegator';
const DELEGATED_WORKOUT_ACTIONS = [
  'startWorkout',
  'resumeActiveWorkoutUI',
  'addExerciseByName',
  'selectExerciseCatalogExercise',
  'showSetRIRPrompt',
  'applySetRIR',
  'toggleSet',
  'updateSet',
  'addSet',
  'removeEx',
  'finishWorkout',
  'cancelWorkout',
] as const;

type DelegatedWorkoutActionName = (typeof DELEGATED_WORKOUT_ACTIONS)[number];
type LegacyWorkoutAction = (...args: unknown[]) => unknown;

let bridgeInstalled = false;
let workoutStoreRef: StoreApi<LegacyWorkoutStoreState> | null = null;
let unsubscribeDataStore: (() => void) | null = null;
let unsubscribeRuntimeStore: (() => void) | null = null;
let removeRestVisibilityListener: (() => void) | null = null;
let removeRestPageShowListener: (() => void) | null = null;
const legacyWorkoutActions: Partial<
  Record<DelegatedWorkoutActionName, LegacyWorkoutAction>
> = {};

function getLegacyWindow(): LegacyWorkoutWindow | null {
  if (typeof window === 'undefined') return null;
  return window as LegacyWorkoutWindow;
}

function readRuntimeWorkoutSession() {
  return useRuntimeStore.getState().workoutSession.session;
}

function getWorkoutRuntime() {
  return getLegacyWindow()?.__IRONFORGE_WORKOUT_RUNTIME__ || null;
}

function readLegacyRuntimeValue<T>(name: string) {
  return getLegacyWindow()?.__IRONFORGE_LEGACY_RUNTIME_ACCESS__?.read?.(
    name
  ) as T | undefined;
}

function writeLegacyRuntimeValue(name: string, value: unknown) {
  getLegacyWindow()?.__IRONFORGE_LEGACY_RUNTIME_ACCESS__?.write?.(name, value);
}

function getCapturedLegacyAction(
  name: DelegatedWorkoutActionName
): LegacyWorkoutAction | null {
  const runtimeWindow = getLegacyWindow();
  const target = runtimeWindow?.[name];
  if (typeof target !== 'function') return null;
  if (
    !(target as unknown as Record<string, unknown>)[DELEGATOR_MARK] &&
    legacyWorkoutActions[name] !== target
  ) {
    legacyWorkoutActions[name] = target as LegacyWorkoutAction;
  }
  return legacyWorkoutActions[name] || captureLegacyAction(name) || null;
}

function captureLegacyAction(
  name: DelegatedWorkoutActionName
): LegacyWorkoutAction | null {
  const runtimeWindow = getLegacyWindow();
  const target = runtimeWindow?.[name];
  if (typeof target !== 'function') return null;
  if ((target as unknown as Record<string, unknown>)[DELEGATOR_MARK]) {
    return legacyWorkoutActions[name] || null;
  }
  legacyWorkoutActions[name] = target as LegacyWorkoutAction;
  return legacyWorkoutActions[name] || null;
}

function translateLegacyText(key: string, fallback: string) {
  try {
    return getLegacyWindow()?.I18N?.t?.(key, null, fallback) || fallback;
  } catch (_error) {
    return fallback;
  }
}

function showWorkoutStartFailure(error?: unknown) {
  if (error) {
    console.warn('[workout-store] startWorkout failed', error);
  }
  getLegacyWindow()?.showToast?.(
    translateLegacyText(
      'workout.start_error',
      'Workout could not be started. Please reload and try again.'
    ),
    'var(--orange)'
  );
}

function readSessionNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readProfileDefaultRest() {
  return readSessionNumber(
    getLegacyWindow()?.profile?.defaultRest,
    readSessionNumber(
      (dataStore.getState().profile as Record<string, unknown> | null)
        ?.defaultRest,
      120
    )
  );
}

function readRestRuntimeSnapshot() {
  const runtimeSession = readRuntimeWorkoutSession();
  return {
    restDuration: readSessionNumber(
      runtimeSession.restDuration,
      readSessionNumber(readLegacyRuntimeValue('restDuration'))
    ),
    restTotal: readSessionNumber(
      runtimeSession.restTotal,
      readSessionNumber(readLegacyRuntimeValue('restTotal'))
    ),
    restEndsAt: readSessionNumber(
      runtimeSession.restEndsAt,
      readSessionNumber(readLegacyRuntimeValue('restEndsAt'))
    ),
    restSecondsLeft: readSessionNumber(
      runtimeSession.restSecondsLeft,
      readSessionNumber(readLegacyRuntimeValue('restSecondsLeft'))
    ),
    restBarActive:
      runtimeSession.restBarActive === true ||
      readLegacyRuntimeValue('restBarActive') === true,
  };
}

function getWorkoutRestHostDeps() {
  return {
    setInterval: (callback: () => void, delay?: number) =>
      window.setInterval(callback, delay),
    clearInterval: (handle: unknown) =>
      window.clearInterval(handle as number | undefined),
    setTimeout: (callback: () => void, delay?: number) =>
      window.setTimeout(callback, delay),
    clearTimeout: (handle: unknown) =>
      window.clearTimeout(handle as number | undefined),
  };
}

function syncLegacyWorkoutSessionBridge() {
  getLegacyWindow()?.syncWorkoutSessionBridge?.();
}

function persistActiveWorkoutDraftIfNeeded() {
  if (!readLegacyWorkoutSnapshot().activeWorkout) return;
  getLegacyWindow()?.persistActiveWorkoutDraft?.();
}

function playWorkoutRestBeep() {
  try {
    const ContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!ContextCtor) return;
    const ctx = new ContextCtor();
    [0, 150, 300].forEach((delayMs) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delayMs / 1000);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delayMs / 1000 + 0.2
      );
      oscillator.start(ctx.currentTime + delayMs / 1000);
      oscillator.stop(ctx.currentTime + delayMs / 1000 + 0.25);
    });
  } catch (_error) {
    // Ignore audio failures so timer completion never breaks the session flow.
  }
}

function writeRestTimerState(nextState: WorkoutRestTimerResult) {
  writeLegacyRuntimeValue('restDuration', nextState.restDuration);
  writeLegacyRuntimeValue('restTotal', nextState.restTotal);
  writeLegacyRuntimeValue('restEndsAt', nextState.restEndsAt);
  writeLegacyRuntimeValue('restSecondsLeft', nextState.restSecondsLeft);
  writeLegacyRuntimeValue('restBarActive', nextState.restBarActive === true);
}

function updateLegacyRestDurationControl(nextValue: number) {
  const restSelect = document.getElementById('rest-duration') as
    | HTMLSelectElement
    | null;
  if (restSelect) {
    restSelect.value = String(nextValue);
  }
}

function syncRestTimerFromStore() {
  const runtime = getWorkoutRuntime();
  if (!runtime) return;
  const current = readRestRuntimeSnapshot();
  const restLifecyclePlan = runtime.buildWorkoutRestLifecyclePlan(
    {
      mode: 'sync',
      ...current,
      profileDefaultRest: readProfileDefaultRest(),
      now: Date.now(),
    },
    {}
  );
  if (
    !restLifecyclePlan?.timerState?.restEndsAt &&
    !restLifecyclePlan?.shouldComplete
  ) {
    return;
  }
  if (restLifecyclePlan.shouldComplete) {
    completeRestTimerFromStore();
    return;
  }
  writeRestTimerState(restLifecyclePlan.timerState);
  syncLegacyWorkoutSessionBridge();
  syncStoreFromLegacy();
}

function completeRestTimerFromStore() {
  const runtime = getWorkoutRuntime();
  if (!runtime) return;
  runtime.clearWorkoutRestIntervalHost(getWorkoutRestHostDeps());
  runtime.clearWorkoutRestHideHost(getWorkoutRestHostDeps());
  const current = readRestRuntimeSnapshot();
  const restLifecyclePlan = runtime.buildWorkoutRestLifecyclePlan(
    {
      mode: 'complete',
      ...current,
      profileDefaultRest: readProfileDefaultRest(),
      now: Date.now(),
    },
    {}
  );
  if (!restLifecyclePlan) return;
  writeRestTimerState(restLifecyclePlan.timerState);
  if (restLifecyclePlan.shouldPlayBeep) {
    playWorkoutRestBeep();
  }
  persistActiveWorkoutDraftIfNeeded();
  runtime.scheduleWorkoutRestHideHost(
    () => {
      writeLegacyRuntimeValue('restBarActive', false);
      syncLegacyWorkoutSessionBridge();
      syncStoreFromLegacy();
    },
    Number(restLifecyclePlan.hideDelayMs || 3000),
    getWorkoutRestHostDeps()
  );
  syncLegacyWorkoutSessionBridge();
  syncStoreFromLegacy();
}

function skipRestTimerFromStore() {
  const runtime = getWorkoutRuntime();
  if (!runtime) return;
  runtime.clearWorkoutRestIntervalHost(getWorkoutRestHostDeps());
  runtime.clearWorkoutRestHideHost(getWorkoutRestHostDeps());
  const current = readRestRuntimeSnapshot();
  const restLifecyclePlan = runtime.buildWorkoutRestLifecyclePlan(
    {
      mode: 'skip',
      ...current,
      profileDefaultRest: readProfileDefaultRest(),
      now: Date.now(),
    },
    {}
  );
  if (!restLifecyclePlan) return;
  writeRestTimerState(restLifecyclePlan.timerState);
  persistActiveWorkoutDraftIfNeeded();
  syncLegacyWorkoutSessionBridge();
  syncStoreFromLegacy();
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as Promise<unknown>).then === 'function';
}

function hasOwnProperty(
  value: unknown,
  key: string
): value is Record<string, unknown> {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function readLegacyWorkoutSnapshot(): LegacyWorkoutSnapshot {
  const runtimeWindow = getLegacyWindow();
  const runtimeSession = readRuntimeWorkoutSession();
  const activeWorkout =
    normalizeActiveWorkout(runtimeSession.activeWorkout) ||
    normalizeActiveWorkout(runtimeWindow?.activeWorkout) ||
    normalizeActiveWorkout(dataStore.getState().activeWorkout);
  const startSnapshot = normalizeWorkoutStartSnapshot(
    runtimeWindow?.getCachedWorkoutStartSnapshot?.() || null
  );
  return {
    activeWorkout,
    startSnapshot,
    hasActiveWorkout: !!activeWorkout,
    restDuration: readSessionNumber(runtimeSession.restDuration),
    restEndsAt: readSessionNumber(runtimeSession.restEndsAt),
    restSecondsLeft: readSessionNumber(runtimeSession.restSecondsLeft),
  };
}

function syncStoreFromLegacy() {
  const snapshot = readLegacyWorkoutSnapshot();
  workoutStoreRef?.setState((state) => ({
    ...state,
    ...snapshot,
  }));
  return snapshot;
}

function wrapLegacyMethod(name: keyof LegacyWorkoutWindow) {
  const runtimeWindow = getLegacyWindow();
  const target = runtimeWindow?.[name];
  if (typeof target !== 'function') return;
  if ((target as Record<string, unknown>)[WRAPPED_MARK]) return;

  const wrapped = function (this: unknown, ...args: unknown[]) {
    const result = target.apply(this, args);
    if (isPromiseLike(result)) {
      return result.finally(() => {
        syncStoreFromLegacy();
      });
    }
    syncStoreFromLegacy();
    return result;
  };

  (wrapped as unknown as Record<string, unknown>)[WRAPPED_MARK] = true;
  (runtimeWindow as unknown as Record<string, unknown>)[String(name)] = wrapped;
}

function installStoreDelegator(
  name: keyof LegacyWorkoutWindow,
  delegate: (...args: unknown[]) => unknown
) {
  const runtimeWindow = getLegacyWindow();
  if (!runtimeWindow) return;
  const existing = runtimeWindow[name];
  if (
    typeof existing === 'function' &&
    (existing as Record<string, unknown>)[DELEGATOR_MARK]
  ) {
    return;
  }
  const delegated = function (...args: unknown[]) {
    return delegate(...args);
  };
  (delegated as unknown as Record<string, unknown>)[DELEGATOR_MARK] = true;
  (runtimeWindow as unknown as Record<string, unknown>)[String(name)] =
    delegated;
}

export const workoutStore: StoreApi<LegacyWorkoutStoreState> =
  createStore<LegacyWorkoutStoreState>(() => ({
    ...readLegacyWorkoutSnapshot(),
    syncFromLegacy: () => syncStoreFromLegacy(),
    getStartSnapshot: (input) => {
      const snapshot = normalizeWorkoutStartSnapshot(
        getLegacyWindow()?.getWorkoutStartSnapshot?.(input) || null
      );
      syncStoreFromLegacy();
      return snapshot;
    },
    getCachedStartSnapshot: () => {
      const snapshot = normalizeWorkoutStartSnapshot(
        getLegacyWindow()?.getCachedWorkoutStartSnapshot?.() || null
      );
      syncStoreFromLegacy();
      return snapshot;
    },
    clearStartSnapshot: () => {
      getLegacyWindow()?.clearWorkoutStartSnapshot?.();
      syncStoreFromLegacy();
    },
    startWorkout: () => {
      const startAction = getCapturedLegacyAction('startWorkout');
      if (!startAction) {
        syncStoreFromLegacy();
        showWorkoutStartFailure();
        return undefined;
      }
      const finalizeStart = () => {
        const snapshot = syncStoreFromLegacy();
        if (!snapshot.activeWorkout) return false;
        // If the legacy layer set up an active workout, run resumeActiveWorkoutUI to
        // guarantee the React bridge views (logStartView, logActiveView) are updated.
        // beginWorkoutStart may skip its own notify calls if isLogActiveIslandActive()
        // returns false at the time it runs, or if an exception occurs before line 3638.
        getCapturedLegacyAction('resumeActiveWorkoutUI')?.({ toast: false });
        syncStoreFromLegacy();
        navigateToPage('log');
        return true;
      };
      try {
        const result = startAction();
        if (isPromiseLike(result)) {
          return result
            .then(finalizeStart)
            .catch((error) => {
              syncStoreFromLegacy();
              showWorkoutStartFailure(error);
              return false;
            });
        }
        return finalizeStart();
      } catch (error) {
        syncStoreFromLegacy();
        showWorkoutStartFailure(error);
        return false;
      }
    },
    resumeActiveWorkoutUI: (options) => {
      const result = getCapturedLegacyAction('resumeActiveWorkoutUI')?.(options);
      syncStoreFromLegacy();
      return result;
    },
    updateRestDuration: (nextValue) => {
      const runtime = getWorkoutRuntime();
      if (!runtime) return;
      const resolvedDuration = runtime.resolveWorkoutRestDuration({
        restDuration:
          nextValue !== undefined && nextValue !== null
            ? nextValue
            : readRestRuntimeSnapshot().restDuration || readProfileDefaultRest(),
        profileDefaultRest: readProfileDefaultRest(),
      });
      writeLegacyRuntimeValue('restDuration', resolvedDuration);
      updateLegacyRestDurationControl(resolvedDuration);
      persistActiveWorkoutDraftIfNeeded();
      syncLegacyWorkoutSessionBridge();
      syncStoreFromLegacy();
    },
    syncRestTimer: () => {
      syncRestTimerFromStore();
    },
    startRestTimer: () => {
      const runtime = getWorkoutRuntime();
      if (!runtime) return;
      const current = readRestRuntimeSnapshot();
      const nextState = runtime.startWorkoutRestTimer({
        restDuration: current.restDuration,
        profileDefaultRest: readProfileDefaultRest(),
        now: Date.now(),
      });
      if (nextState.shouldSkip) {
        skipRestTimerFromStore();
        return;
      }
      runtime.clearWorkoutRestIntervalHost(getWorkoutRestHostDeps());
      runtime.clearWorkoutRestHideHost(getWorkoutRestHostDeps());
      writeRestTimerState(nextState);
      syncRestTimerFromStore();
      persistActiveWorkoutDraftIfNeeded();
      runtime.scheduleWorkoutRestIntervalHost(
        syncRestTimerFromStore,
        getWorkoutRestHostDeps()
      );
      syncLegacyWorkoutSessionBridge();
      syncStoreFromLegacy();
    },
    skipRest: () => {
      skipRestTimerFromStore();
    },
    addExerciseByName: (name) => {
      getCapturedLegacyAction('addExerciseByName')?.(name);
      syncStoreFromLegacy();
    },
    selectExerciseCatalogExercise: (exerciseId) => {
      getCapturedLegacyAction('selectExerciseCatalogExercise')?.(exerciseId);
      syncStoreFromLegacy();
    },
    showSetRIRPrompt: (exerciseIndex, setIndex) => {
      getCapturedLegacyAction('showSetRIRPrompt')?.(exerciseIndex, setIndex);
      syncStoreFromLegacy();
    },
    applySetRIR: (exerciseIndex, setIndex, rirValue) => {
      getCapturedLegacyAction('applySetRIR')?.(exerciseIndex, setIndex, rirValue);
      syncStoreFromLegacy();
    },
    toggleSet: (exerciseIndex, setIndex) => {
      getCapturedLegacyAction('toggleSet')?.(exerciseIndex, setIndex);
      syncStoreFromLegacy();
    },
    updateSet: (exerciseIndex, setIndex, field, value) => {
      getCapturedLegacyAction('updateSet')?.(
        exerciseIndex,
        setIndex,
        field,
        value
      );
      syncStoreFromLegacy();
    },
    addSet: (exerciseIndex) => {
      getCapturedLegacyAction('addSet')?.(exerciseIndex);
      syncStoreFromLegacy();
    },
    removeExercise: (exerciseIndex) => {
      getCapturedLegacyAction('removeEx')?.(exerciseIndex);
      syncStoreFromLegacy();
    },
    finishWorkout: () => {
      const result = getCapturedLegacyAction('finishWorkout')?.();
      if (isPromiseLike(result)) {
        return result.finally(() => {
          syncStoreFromLegacy();
        });
      }
      syncStoreFromLegacy();
      return result;
    },
    cancelWorkout: () => {
      getCapturedLegacyAction('cancelWorkout')?.();
      syncStoreFromLegacy();
    },
  }));

workoutStoreRef = workoutStore;

export function installLegacyWorkoutStoreBridge() {
  if (bridgeInstalled || typeof window === 'undefined') return;
  bridgeInstalled = true;

  syncStoreFromLegacy();
  DELEGATED_WORKOUT_ACTIONS.forEach((name) => {
    captureLegacyAction(name);
  });
  unsubscribeDataStore = dataStore.subscribe(() => {
    syncStoreFromLegacy();
  });
  unsubscribeRuntimeStore = useRuntimeStore.subscribe((state, previousState) => {
    if (state.workoutSession.session !== previousState.workoutSession.session) {
      syncStoreFromLegacy();
    }
  });

  [
    'persistActiveWorkoutDraft',
    'clearActiveWorkoutDraft',
    'clearWorkoutStartSnapshot',
  ].forEach((name) => wrapLegacyMethod(name as keyof LegacyWorkoutWindow));

  installStoreDelegator('startWorkout', () =>
    workoutStore.getState().startWorkout()
  );
  installStoreDelegator('resumeActiveWorkoutUI', (options) =>
    workoutStore
      .getState()
      .resumeActiveWorkoutUI(options as Record<string, unknown> | undefined)
  );
  installStoreDelegator('updateRestDuration', (nextValue) =>
    workoutStore
      .getState()
      .updateRestDuration(nextValue as string | number | null | undefined)
  );
  installStoreDelegator('syncRestTimer', () =>
    workoutStore.getState().syncRestTimer()
  );
  const syncRestTimerOnVisible = () => {
    if (!document.hidden) {
      workoutStore.getState().syncRestTimer();
    }
  };
  const syncRestTimerOnPageShow = () => {
    workoutStore.getState().syncRestTimer();
  };
  document.addEventListener('visibilitychange', syncRestTimerOnVisible);
  window.addEventListener('pageshow', syncRestTimerOnPageShow);
  removeRestVisibilityListener = () => {
    document.removeEventListener('visibilitychange', syncRestTimerOnVisible);
  };
  removeRestPageShowListener = () => {
    window.removeEventListener('pageshow', syncRestTimerOnPageShow);
  };
  installStoreDelegator('startRestTimer', () =>
    workoutStore.getState().startRestTimer()
  );
  installStoreDelegator('skipRest', () => workoutStore.getState().skipRest());
  installStoreDelegator('addExerciseByName', (name) =>
    workoutStore.getState().addExerciseByName(String(name ?? ''))
  );
  installStoreDelegator('selectExerciseCatalogExercise', (exerciseId) =>
    workoutStore.getState().selectExerciseCatalogExercise(String(exerciseId ?? ''))
  );
  installStoreDelegator('showSetRIRPrompt', (exerciseIndex, setIndex) =>
    workoutStore
      .getState()
      .showSetRIRPrompt(Number(exerciseIndex), Number(setIndex))
  );
  installStoreDelegator('applySetRIR', (exerciseIndex, setIndex, rirValue) =>
    workoutStore
      .getState()
      .applySetRIR(Number(exerciseIndex), Number(setIndex), rirValue as string | number)
  );
  installStoreDelegator('toggleSet', (exerciseIndex, setIndex) =>
    workoutStore.getState().toggleSet(Number(exerciseIndex), Number(setIndex))
  );
  installStoreDelegator('updateSet', (exerciseIndex, setIndex, field, value) =>
    workoutStore
      .getState()
      .updateSet(Number(exerciseIndex), Number(setIndex), String(field), value as string | number)
  );
  installStoreDelegator('addSet', (exerciseIndex) =>
    workoutStore.getState().addSet(Number(exerciseIndex))
  );
  installStoreDelegator('removeEx', (exerciseIndex) =>
    workoutStore.getState().removeExercise(Number(exerciseIndex))
  );
  installStoreDelegator('finishWorkout', () =>
    workoutStore.getState().finishWorkout()
  );
  installStoreDelegator('cancelWorkout', () =>
    workoutStore.getState().cancelWorkout()
  );

}

export function disposeLegacyWorkoutStoreBridge() {
  unsubscribeDataStore?.();
  unsubscribeDataStore = null;
  unsubscribeRuntimeStore?.();
  unsubscribeRuntimeStore = null;
  removeRestVisibilityListener?.();
  removeRestVisibilityListener = null;
  removeRestPageShowListener?.();
  removeRestPageShowListener = null;
  bridgeInstalled = false;
}

export function getWorkoutStoreSnapshot() {
  return workoutStore.getState().syncFromLegacy();
}
