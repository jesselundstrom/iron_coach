export const APP_PAGES = [
  'dashboard',
  'log',
  'history',
  'settings',
  'nutrition',
] as const;

export type AppPage = (typeof APP_PAGES)[number];

export type ConfirmSnapshot = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

export type LegacyIslandSnapshot = {
  labels: Record<string, unknown>;
  values: Record<string, unknown>;
};

export type RpePromptSnapshot = {
  open: boolean;
  title: string;
  subtitle: string;
  options: Array<{
    value: number;
    feel: string;
    description: string;
  }>;
};

export type SportCheckPromptSnapshot = {
  open: boolean;
  title: string;
  subtitle: string;
};

export type SummaryPromptSnapshot = {
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
  summaryData: Record<string, unknown> | null;
};

export type SessionSnapshot = {
  activeWorkout: unknown;
  restDuration: number;
  restEndsAt: number;
  restSecondsLeft: number;
  restTotal: number;
  currentUser: unknown;
  restBarActive: boolean;
  rpeOpen: boolean;
  rpePrompt: RpePromptSnapshot | null;
  summaryOpen: boolean;
  summaryPrompt: SummaryPromptSnapshot | null;
  sportCheckOpen: boolean;
  sportCheckPrompt: SportCheckPromptSnapshot | null;
};

export function isAppPage(value: unknown): value is AppPage {
  return typeof value === 'string' && APP_PAGES.includes(value as AppPage);
}

export function getPageFromHash(hash = window.location.hash): AppPage | null {
  const normalized = String(hash || '')
    .replace(/^#\/?/, '')
    .split(/[/?]/)[0]
    .trim();
  return isAppPage(normalized) ? normalized : null;
}
