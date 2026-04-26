import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAppRuntimeBridge } from './app-runtime';
import { useRuntimeStore } from '../store/runtime-store';
import { dataStore } from '../../stores/data-store';
import { profileStore } from '../../stores/profile-store';
import { programStore } from '../../stores/program-store';

type TestWindow = Window & Record<string, unknown>;
type FakeElement = {
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
    contains: (token: string) => boolean;
  };
  style: Record<string, string>;
  value: string;
  textContent: string;
};

let fakeElements: Record<string, FakeElement> = {};
let fakeDocument: {
  body: FakeElement;
  getElementById: (id: string) => FakeElement | null;
} | null = null;

function getTestWindow() {
  return globalThis.window as unknown as TestWindow;
}

function createFakeElement(): FakeElement {
  const classes = new Set<string>();
  return {
    classList: {
      add: (...tokens) => tokens.forEach((token) => classes.add(token)),
      remove: (...tokens) => tokens.forEach((token) => classes.delete(token)),
      contains: (token) => classes.has(token),
    },
    style: {},
    value: '',
    textContent: '',
  };
}

function installFakeDom() {
  fakeElements = {
    'page-history': createFakeElement(),
    'page-log': createFakeElement(),
    'name-modal': createFakeElement(),
  };
  fakeDocument = {
    body: createFakeElement(),
    getElementById: (id: string) => fakeElements[id] || null,
  };
  (globalThis as Record<string, unknown>).document = fakeDocument;
  (globalThis as Record<string, unknown>).window = {
    document: fakeDocument,
  };
}

function resetRuntimeStore() {
  useRuntimeStore.setState((state) => ({
    ...state,
    navigation: {
      activePage: 'dashboard',
      activeSettingsTab: 'schedule',
    },
    ui: {
      ...state.ui,
      languageVersion: 0,
    },
    pages: {
      settingsAccountView: null,
      settingsBodyView: null,
      settingsPreferencesView: null,
      settingsProgramView: null,
      settingsScheduleView: null,
    },
  }));
}

function resetDataStore() {
  dataStore.setState((state) => ({
    ...state,
    currentUser: { id: 'user-1', email: 'builder@example.com' },
    workouts: [],
    schedule: { sportName: '', sportDays: [], sportIntensity: 'hard', sportLegsHeavy: true },
    profile: {
      defaultRest: 120,
      activeProgram: 'forge',
      language: 'en',
      preferences: {
        goal: 'strength',
        trainingDaysPerWeek: 3,
        sessionMinutes: 60,
        equipmentAccess: 'full_gym',
      },
      coaching: {
        experienceLevel: 'beginner',
        guidanceMode: 'balanced',
        sportProfile: { name: '', inSeason: false, sessionsPerWeek: 0 },
        limitations: {
          jointFlags: [],
          avoidMovementTags: [],
          avoidExerciseIds: [],
        },
        exercisePreferences: {
          preferredExerciseIds: [],
          excludedExerciseIds: [],
        },
        onboardingCompleted: false,
        onboardingSeen: false,
      },
      bodyMetrics: {},
      programs: { forge: { week: 1, dayNum: 1 } },
      syncMeta: {},
    },
    activeWorkout: null,
  }));
  profileStore.setState((state) => ({
    ...state,
    profile: dataStore.getState().profile as never,
    schedule: dataStore.getState().schedule as never,
  }));
  programStore.setState((state) => ({
    ...state,
    activeProgramId: null,
    activeProgram: null,
    activeProgramState: null,
  }));
}

beforeEach(() => {
  installFakeDom();
  const runtimeWindow = getTestWindow();
  runtimeWindow.__IRONFORGE_APP_RUNTIME__ = undefined;
  runtimeWindow.__IRONFORGE_ACTIVE_SETTINGS_TAB__ = undefined;
  runtimeWindow.I18N = {
    getLanguage: () => 'en',
    setLanguage: (locale: string) => locale,
    applyTranslations: vi.fn(),
    t: (_key: string, _params?: unknown, fallback?: string) => fallback || '',
  };
  runtimeWindow.__IRONFORGE_APP_VERSION__ = '9.9.9';
  runtimeWindow.renderHistory = vi.fn();
  runtimeWindow.resetNotStartedView = vi.fn();
  resetRuntimeStore();
  resetDataStore();
});

afterEach(() => {
  const runtimeWindow = getTestWindow();
  Reflect.deleteProperty(runtimeWindow, '__IRONFORGE_APP_RUNTIME__');
  Reflect.deleteProperty(runtimeWindow, '__IRONFORGE_ACTIVE_SETTINGS_TAB__');
  Reflect.deleteProperty(runtimeWindow, 'showSettingsTab');
  Reflect.deleteProperty(runtimeWindow, 'getSettingsAccountUiStateSnapshot');
  Reflect.deleteProperty(runtimeWindow, 'getOnboardingDefaultDraft');
  Reflect.deleteProperty(runtimeWindow, 'buildOnboardingRecommendation');
  Reflect.deleteProperty(runtimeWindow, 'updateLanguageDependentUI');
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'document');
});

describe('app-runtime ownership', () => {
  it('owns settings tab selection and compatibility snapshot state', () => {
    const runtime = installAppRuntimeBridge();
    expect(runtime).toBeTruthy();

    runtime?.showSettingsTab('account');

    expect(useRuntimeStore.getState().navigation.activeSettingsTab).toBe('account');
    expect(getTestWindow().__IRONFORGE_ACTIVE_SETTINGS_TAB__).toBe('account');
  });

  it('owns the settings account danger-state snapshot', () => {
    const runtime = installAppRuntimeBridge();
    expect(runtime).toBeTruthy();

    runtime?.showDangerConfirm();
    let view = runtime?.buildSettingsAccountView() as {
      values?: Record<string, unknown>;
    };

    expect(view.values?.dangerOpen).toBe(true);
    expect(view.values?.dangerDeleteDisabled).toBe(true);

    runtime?.checkDangerConfirm('DELETE');
    view = runtime?.buildSettingsAccountView() as {
      values?: Record<string, unknown>;
    };

    expect(view.values?.dangerInput).toBe('DELETE');
    expect(view.values?.dangerDeleteDisabled).toBe(false);
  });

  it('installs the language refresh global from app-runtime and bumps runtime language state', () => {
    const runtime = installAppRuntimeBridge();
    expect(runtime).toBeTruthy();

    fakeDocument?.getElementById('page-history')?.classList.add('active');
    const languageVersionBefore = useRuntimeStore.getState().ui.languageVersion;

    expect(getTestWindow().updateLanguageDependentUI).toBe(
      runtime?.updateLanguageDependentUI
    );
    runtime?.updateLanguageDependentUI();

    expect(useRuntimeStore.getState().ui.languageVersion).toBe(
      languageVersionBefore + 1
    );
    expect(getTestWindow().renderHistory).toHaveBeenCalled();
    expect(useRuntimeStore.getState().pages.settingsAccountView).not.toBeNull();
  });

  it('waits for schedule persistence before refreshing dependent UI', async () => {
    const runtime = installAppRuntimeBridge();
    expect(runtime).toBeTruthy();

    const runtimeWindow = getTestWindow();
    const calls: string[] = [];
    let resolveSave: unknown = null;
    runtimeWindow.saveScheduleData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls.push('save-start');
          resolveSave = () => {
            calls.push('save-done');
            resolve();
          };
        })
    );
    runtimeWindow.updateProgramDisplay = vi.fn(() => calls.push('program'));
    runtimeWindow.updateDashboard = vi.fn(() => calls.push('dashboard'));
    runtimeWindow.renderSportStatusBar = vi.fn(() => calls.push('sport'));
    runtimeWindow.showToast = vi.fn(() => calls.push('toast'));

    const pendingSave = runtime?.saveSchedule({
      sportName: 'Hockey',
      sportDays: [1, 3],
      sportIntensity: 'moderate',
    });

    expect(runtimeWindow.saveScheduleData).toHaveBeenCalled();
    expect(runtimeWindow.updateProgramDisplay).not.toHaveBeenCalled();

    expect(resolveSave).toBeTypeOf('function');
    if (typeof resolveSave !== 'function') {
      throw new Error('Expected pending schedule save');
    }
    resolveSave();
    await pendingSave;

    expect(useRuntimeStore.getState().pages.settingsScheduleView).not.toBeNull();
    expect(calls).toEqual([
      'save-start',
      'save-done',
      'program',
      'dashboard',
      'sport',
      'toast',
    ]);
  });

  it('handles schedule persistence failures before dependent UI refresh', async () => {
    const runtime = installAppRuntimeBridge();
    expect(runtime).toBeTruthy();

    const runtimeWindow = getTestWindow();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    runtimeWindow.saveScheduleData = vi.fn(async () => {
      throw new Error('offline');
    });
    runtimeWindow.updateProgramDisplay = vi.fn();
    runtimeWindow.updateDashboard = vi.fn();
    runtimeWindow.renderSportStatusBar = vi.fn();
    runtimeWindow.showToast = vi.fn();

    try {
      await runtime?.saveSchedule({ sportName: 'Hockey' });
    } finally {
      warnSpy.mockRestore();
    }

    expect(runtimeWindow.updateProgramDisplay).not.toHaveBeenCalled();
    expect(runtimeWindow.updateDashboard).not.toHaveBeenCalled();
    expect(runtimeWindow.renderSportStatusBar).not.toHaveBeenCalled();
    expect(runtimeWindow.showToast).toHaveBeenCalledWith(
      'Could not save settings. Please try again.',
      'var(--orange)'
    );
  });
});
