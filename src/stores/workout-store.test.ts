import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dataStore } from './data-store';
import { workoutStore } from './workout-store';
import { useRuntimeStore } from '../app/store/runtime-store';

type TestWindow = Window & {
  activeWorkout?: Record<string, unknown> | null;
  startWorkout?: () => unknown;
  resumeActiveWorkoutUI?: (options?: Record<string, unknown>) => unknown;
  showToast?: (...args: unknown[]) => unknown;
  I18N?: {
    t?: (
      key: string,
      params?: Record<string, unknown> | null,
      fallback?: string
    ) => string;
  };
};

function installTestWindow(overrides: Partial<TestWindow> = {}) {
  const testWindow = {
    location: {
      hash: '#/dashboard',
    },
    showToast: vi.fn(),
    I18N: {
      t: (_key, _params, fallback) => fallback || '',
    },
    ...overrides,
  } as TestWindow;
  (globalThis as Record<string, unknown>).window = testWindow;
  return testWindow;
}

function resetStores() {
  dataStore.setState((state) => ({
    ...state,
    activeWorkout: null,
  }));
  useRuntimeStore.setState((state) => ({
    ...state,
    navigation: {
      ...state.navigation,
      activePage: 'dashboard',
    },
    workoutSession: {
      ...state.workoutSession,
      session: {
        ...state.workoutSession.session,
        activeWorkout: null,
      },
    },
  }));
  workoutStore.setState((state) => ({
    ...state,
    activeWorkout: null,
    hasActiveWorkout: false,
  }));
}

describe('workout store start boundary', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');
    vi.restoreAllMocks();
  });

  it('does not navigate when the legacy start delegate is unavailable', () => {
    const testWindow = installTestWindow();

    const result = workoutStore.getState().startWorkout();

    expect(result).toBeUndefined();
    expect(useRuntimeStore.getState().navigation.activePage).toBe('dashboard');
    expect(testWindow.location.hash).toBe('#/dashboard');
    expect(testWindow.showToast).toHaveBeenCalledWith(
      'Workout could not be started. Please reload and try again.',
      'var(--orange)'
    );
  });

  it('navigates only after the legacy delegate creates an active workout', () => {
    const testWindow = installTestWindow({
      startWorkout: vi.fn(() => {
        testWindow.activeWorkout = {
          id: 'workout-1',
          date: '2026-04-26',
          program: 'forge',
          type: 'training',
          exercises: [],
          startTime: 123,
        };
      }),
      resumeActiveWorkoutUI: vi.fn(),
    });

    const result = workoutStore.getState().startWorkout();

    expect(result).toBe(true);
    expect(testWindow.resumeActiveWorkoutUI).toHaveBeenCalledWith({
      toast: false,
    });
    expect(useRuntimeStore.getState().navigation.activePage).toBe('log');
    expect(workoutStore.getState().hasActiveWorkout).toBe(true);
  });

  it('keeps the user in place when the legacy start delegate throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const testWindow = installTestWindow({
      startWorkout: vi.fn(() => {
        throw new Error('start failed');
      }),
    });

    const result = workoutStore.getState().startWorkout();

    expect(result).toBe(false);
    expect(useRuntimeStore.getState().navigation.activePage).toBe('dashboard');
    expect(testWindow.showToast).toHaveBeenCalledWith(
      'Workout could not be started. Please reload and try again.',
      'var(--orange)'
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
