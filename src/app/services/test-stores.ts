import { IS_E2E_TEST_ENV } from '../utils/env';
import { dataStore } from '../../stores/data-store';
import { workoutStore } from '../../stores/workout-store';
import { useRuntimeStore } from '../store/runtime-store';

type TestStoreBridge = {
  data: {
    getState: () => ReturnType<typeof dataStore.getState>;
    getActiveWorkoutDraftCache: () => ReturnType<
      ReturnType<typeof dataStore.getState>['getActiveWorkoutDraftCache']
    >;
  };
  workout: {
    getState: () => ReturnType<typeof workoutStore.getState>;
    startWorkout: () => void;
    resumeActiveWorkoutUI: (options?: Record<string, unknown>) => unknown;
    updateRestDuration: (
      nextValue?: string | number | null
    ) => void;
    addExerciseByName: (name: string) => void;
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
    finishWorkout: () => Promise<unknown> | unknown;
    cancelWorkout: () => void;
  };
  runtime: {
    getState: () => ReturnType<typeof useRuntimeStore.getState>;
  };
};

export function installTestStoresBridge() {
  if (typeof window === 'undefined' || !IS_E2E_TEST_ENV) return;
  const testWindow = window as Window & {
    __IRONFORGE_STORES__?: TestStoreBridge;
  };
  if (testWindow.__IRONFORGE_STORES__) return;

  testWindow.__IRONFORGE_STORES__ = {
    data: {
      getState: () => dataStore.getState(),
      getActiveWorkoutDraftCache: () =>
        dataStore.getState().getActiveWorkoutDraftCache(),
    },
    workout: {
      getState: () => workoutStore.getState(),
      startWorkout: () => workoutStore.getState().startWorkout(),
      resumeActiveWorkoutUI: (options) =>
        workoutStore.getState().resumeActiveWorkoutUI(options),
      updateRestDuration: (nextValue) =>
        workoutStore.getState().updateRestDuration(nextValue),
      addExerciseByName: (name) =>
        workoutStore.getState().addExerciseByName(name),
      applySetRIR: (exerciseIndex, setIndex, rirValue) =>
        workoutStore.getState().applySetRIR(exerciseIndex, setIndex, rirValue),
      toggleSet: (exerciseIndex, setIndex) =>
        workoutStore.getState().toggleSet(exerciseIndex, setIndex),
      updateSet: (exerciseIndex, setIndex, field, value) =>
        workoutStore.getState().updateSet(exerciseIndex, setIndex, field, value),
      addSet: (exerciseIndex) => workoutStore.getState().addSet(exerciseIndex),
      finishWorkout: () => workoutStore.getState().finishWorkout(),
      cancelWorkout: () => workoutStore.getState().cancelWorkout(),
    },
    runtime: {
      getState: () => useRuntimeStore.getState(),
    },
  };
}
