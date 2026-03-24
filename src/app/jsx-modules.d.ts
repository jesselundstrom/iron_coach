declare module './AppShell.jsx' {
  import type { ComponentType } from 'react';

  const AppShell: ComponentType;
  export default AppShell;
}

declare module './OnboardingFlow.jsx' {
  import type { ComponentType } from 'react';

  const OnboardingFlow: ComponentType;
  export default OnboardingFlow;
}

declare global {
  interface Window {
    __IRONFORGE_APP_SHELL_READY__?: boolean;
    __IRONFORGE_RUNTIME_BRIDGE__?: {
      navigateToPage?: (page: string) => void;
      setActiveSettingsTab?: (tab: string) => void;
      openConfirm?: (confirm: {
        open?: boolean;
        title?: string;
        message?: string;
        confirmLabel?: string;
        cancelLabel?: string;
      }) => void;
      closeConfirm?: () => void;
      showToast?: (toast: {
        message: string;
        color?: string;
        variant?: string;
        undoLabel?: string;
        undoAction?: (() => void) | null;
        durationMs?: number;
      }) => void;
      hideToast?: () => void;
      setWorkoutSessionState?: (partial: Record<string, unknown>) => void;
      setLogStartView?: (view: Record<string, unknown> | null) => void;
      setLogActiveView?: (view: Record<string, unknown> | null) => void;
      setHistoryView?: (view: Record<string, unknown> | null) => void;
      setDashboardView?: (view: Record<string, unknown> | null) => void;
      setNutritionView?: (view: Record<string, unknown> | null) => void;
      setSettingsAccountView?: (view: Record<string, unknown> | null) => void;
      setSettingsBodyView?: (view: Record<string, unknown> | null) => void;
      setSettingsPreferencesView?: (view: Record<string, unknown> | null) => void;
      setSettingsProgramView?: (view: Record<string, unknown> | null) => void;
      setSettingsScheduleView?: (view: Record<string, unknown> | null) => void;
      setExerciseCatalogView?: (view: Record<string, unknown> | null) => void;
    };
    syncRuntimeStoreFromLegacy?: () => void;
    syncWorkoutSessionBridge?: () => void;
    syncHistoryBridge?: () => void;
    syncDashboardBridge?: () => void;
    syncSettingsBridge?: () => void;
    syncNutritionBridge?: () => void;
    getOnboardingDefaultDraft?: () => Record<string, unknown> | null;
    getProgramRegistry?: () => Record<string, unknown>;
    getRegisteredPrograms?: () => Array<Record<string, unknown>>;
    hasRegisteredPrograms?: () => boolean;
    getProgramById?: (programId: string) => Record<string, unknown> | null;
    getProgramInitialState?: (programId: string) => Record<string, unknown> | null;
    getExerciseLibrary?: () => Record<string, unknown> | null;
    hasExerciseLibrary?: () => boolean;
    resolveRegisteredExerciseId?: (input: unknown) => string | null;
    getRegisteredExercise?: (input: unknown) => Record<string, unknown> | null;
    getExerciseMetadata?: (
      input: unknown,
      locale?: string
    ) => Record<string, unknown> | null;
    getExerciseDisplayName?: (input: unknown, locale?: string) => string;
    getExerciseGuidanceFor?: (
      input: unknown,
      locale?: string
    ) => Record<string, unknown> | null;
    mapExerciseMuscleToDisplayGroup?: (muscle: unknown) => string | null;
    listRegisteredExercises?: (options?: Record<string, unknown>) => Array<Record<string, unknown>>;
    searchRegisteredExercises?: (
      query?: string,
      filters?: Record<string, unknown>
    ) => Array<Record<string, unknown>>;
    getRelatedRegisteredExercises?: (
      exerciseId: string,
      options?: Record<string, unknown>
    ) => Array<Record<string, unknown>>;
    registerCustomExercise?: (
      definition: Record<string, unknown>
    ) => Record<string, unknown> | null;
    setRestBarActiveState?: (active: boolean) => void;
    loadData?: (options?: {
      allowCloudSync?: boolean;
      userId?: string;
    }) => Promise<void> | void;
    runPageActivationSideEffects?: (page: string) => void;
    showSettingsTab?: (tab: string, trigger?: Element | null) => void;
    showConfirm?: (
      title: string,
      message: string,
      onConfirm?: (() => void) | null
    ) => void;
    confirmOk?: () => void;
    confirmCancel?: () => void;
    clearNutritionHistory?: () => void;
    retryLastNutritionMessage?: () => void;
    setSelectedNutritionAction?: (actionId: string) => void;
    submitNutritionTextMessage?: (text: string, isCorrection?: boolean) => void;
    handleNutritionPhoto?: (event: Event) => void;
    setExerciseCatalogSearch?: (value: string) => void;
    setExerciseCatalogFilter?: (group: string, value: string) => void;
    clearExerciseCatalogFilters?: () => void;
    selectExerciseCatalogExercise?: (exerciseId: string) => void;
    closeNameModal?: () => void;
  }
}

export {};
