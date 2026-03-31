import { i18nStore } from '../../stores/i18n-store';
import { profileStore } from '../../stores/profile-store';
import { programStore } from '../../stores/program-store';
import { navigateToPage } from './navigation-actions';

type HelperWindow = Window & {
  DAY_NAMES?: string[];
  I18N?: {
    t?: (
      key: string,
      params?: Record<string, unknown> | null,
      fallback?: string
    ) => string;
    extendStrings?: (locale: string, entries: Record<string, string>) => void;
    setLanguage?: (
      locale: string,
      options?: { persist?: boolean; notify?: boolean }
    ) => string | void;
    getLanguage?: () => string;
    applyTranslations?: (root?: ParentNode) => void;
    fallbackLocale?: string;
    supportedLocales?: string[];
  };
  getWeekStart?: (date?: Date) => Date;
  getProgramTrainingDaysPerWeek?: (programId?: string | null) => number;
  getTrainingDaysPerWeekLabel?: (value: number) => string;
  parseLoggedRepCount?: (value: unknown) => number;
  resolveExerciseSelection?: (input: unknown) => { name: string };
  getExerciseDisplayName?: (input: unknown, locale?: string) => string;
  isSportWorkout?: (workout: unknown) => boolean;
  goToLog?: () => void;
};

function getWeekStart(date = new Date()) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - offset);
  return next;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getDisplayName(input: unknown) {
  if (typeof input === 'object' && input && 'name' in input) {
    return String((input as { name?: unknown }).name || '');
  }
  return titleCase(String(input || '').trim());
}

function normalizeI18nParams(
  params?: unknown
): Record<string, unknown> | null | undefined {
  if (params === undefined) return undefined;
  if (params === null) return null;
  if (typeof params === 'object') {
    return params as Record<string, unknown>;
  }
  return undefined;
}

export function installRuntimeHelpers() {
  if (typeof window === 'undefined') return;
  const runtimeWindow = window as unknown as HelperWindow;

  runtimeWindow.I18N = {
    t: (
      key: string,
      params?: unknown,
      fallback?: string
    ) => i18nStore.getState().t(key, normalizeI18nParams(params), fallback),
    extendStrings: (locale, entries) =>
      i18nStore.getState().extendStrings(locale, entries),
    setLanguage: (
      locale: string,
      options?: { persist?: boolean; notify?: boolean }
    ) =>
      i18nStore.getState().setLanguage(locale, options),
    getLanguage: () => i18nStore.getState().language,
    applyTranslations: () => {},
    fallbackLocale: i18nStore.getState().fallbackLocale,
    supportedLocales: i18nStore.getState().supportedLocales,
  };
  runtimeWindow.DAY_NAMES =
    i18nStore.getState().language === 'fi'
      ? ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  runtimeWindow.getWeekStart = (date) => getWeekStart(date || new Date());
  runtimeWindow.getProgramTrainingDaysPerWeek = (programId) => {
    const profile = profileStore.getState().profile;
    return programStore
      .getState()
      .getEffectiveProgramFrequency(programId || null, profile);
  };
  runtimeWindow.getTrainingDaysPerWeekLabel = (value) =>
    i18nStore
      .getState()
      .t(
        'training.days_per_week',
        { count: Number(value) || 0 } as Record<string, unknown>,
        '{count} sessions / week'
      );
  runtimeWindow.parseLoggedRepCount = (value) => {
    const parsed = parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  runtimeWindow.resolveExerciseSelection = (input) => ({
    name: getDisplayName(input),
  });
  runtimeWindow.getExerciseDisplayName = (input) => getDisplayName(input);
  runtimeWindow.isSportWorkout = (workout) => {
    const type = String((workout as { type?: unknown })?.type || '');
    return type === 'sport' || type === 'hockey';
  };
  runtimeWindow.goToLog = () => navigateToPage('log');
}
