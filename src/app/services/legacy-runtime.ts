import { startTransition } from 'react';
import {
  type AppPage,
  type ConfirmSnapshot,
  type DashboardView,
  type HistoryView,
  type LogActiveView,
  type LogStartView,
  type SessionSnapshot,
  isAppPage,
} from '../constants';
import { useRuntimeStore } from '../store/runtime-store';

const APP_SHELL_EVENT =
  window.__IRONFORGE_APP_SHELL_EVENT__ || 'ironforge:app-shell-updated';
const LANGUAGE_EVENT = 'ironforge:language-changed';

type RuntimeBridge = {
  navigateToPage: (page: AppPage) => void;
  openConfirm: (confirm: Partial<ConfirmSnapshot>) => void;
  closeConfirm: () => void;
  showToast: (toast: {
    message: string;
    color?: string;
    variant?: string;
    undoLabel?: string;
    undoAction?: (() => void) | null;
    durationMs?: number;
  }) => void;
  hideToast: () => void;
  setWorkoutSessionState: (partial: Partial<SessionSnapshot>) => void;
  setLogStartView: (view: LogStartView | null) => void;
  setLogActiveView: (view: LogActiveView | null) => void;
  setHistoryView: (view: HistoryView | null) => void;
  setDashboardView: (view: DashboardView | null) => void;
};

function detectInitialActivePage(): AppPage {
  const hashPage = window.location.hash
    ? window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]?.trim()
    : '';
  if (isAppPage(hashPage)) return hashPage;
  const activePage = document.querySelector('.page.active[id^="page-"]');
  const pageName = activePage?.id?.replace(/^page-/, '') || 'dashboard';
  return isAppPage(pageName) ? pageName : 'dashboard';
}

function createDefaultConfirm(confirm?: Partial<ConfirmSnapshot>): ConfirmSnapshot {
  return {
    open: confirm?.open !== false,
    title: String(confirm?.title || 'Confirm'),
    message: String(confirm?.message || 'Are you sure?'),
    confirmLabel: String(confirm?.confirmLabel || 'Confirm'),
    cancelLabel: String(confirm?.cancelLabel || 'Cancel'),
  };
}

function registerRuntimeBridge(): RuntimeBridge {
  const bridge: RuntimeBridge = {
    navigateToPage: (page) => {
      if (!isAppPage(page)) return;
      useRuntimeStore.getState().navigateToPage(page);
    },
    openConfirm: (confirm) => {
      useRuntimeStore.getState().openConfirm(createDefaultConfirm(confirm));
    },
    closeConfirm: () => {
      useRuntimeStore.getState().closeConfirm();
    },
    showToast: (toast) => {
      useRuntimeStore.getState().showToast({
        message: String(toast?.message || ''),
        variant: String(toast?.variant || ''),
        background: String(toast?.color || ''),
        undoLabel: String(toast?.undoLabel || 'Undo'),
        undoAction:
          typeof toast?.undoAction === 'function' ? toast.undoAction : null,
        durationMs:
          Number.isFinite(toast?.durationMs) && Number(toast.durationMs) > 0
            ? Number(toast.durationMs)
            : typeof toast?.undoAction === 'function'
              ? 5000
              : 2800,
      });
    },
    hideToast: () => {
      useRuntimeStore.getState().hideToast();
    },
    setWorkoutSessionState: (partial) => {
      const current = useRuntimeStore.getState().workoutSession.session;
      useRuntimeStore.getState().syncWorkoutSession({
        ...current,
        ...partial,
      });
    },
    setLogStartView: (view) => {
      useRuntimeStore.getState().setLogStartView(view);
    },
    setLogActiveView: (view) => {
      useRuntimeStore.getState().setLogActiveView(view);
    },
    setHistoryView: (view) => {
      useRuntimeStore.getState().setHistoryView(view);
    },
    setDashboardView: (view) => {
      useRuntimeStore.getState().setDashboardView(view);
    },
  };

  (window as Window & { __IRONFORGE_RUNTIME_BRIDGE__?: RuntimeBridge }).__IRONFORGE_RUNTIME_BRIDGE__ =
    bridge;
  return bridge;
}

export function syncRuntimeStoreFromLegacy() {
  useRuntimeStore.getState().navigateToPage(detectInitialActivePage());
  const runtimeWindow = window as Window & {
    syncWorkoutSessionBridge?: () => void;
    syncHistoryBridge?: () => void;
    syncDashboardBridge?: () => void;
  };
  if (typeof runtimeWindow.syncWorkoutSessionBridge === 'function') {
    runtimeWindow.syncWorkoutSessionBridge();
  }
  if (typeof runtimeWindow.syncHistoryBridge === 'function') {
    runtimeWindow.syncHistoryBridge();
  }
  if (typeof runtimeWindow.syncDashboardBridge === 'function') {
    runtimeWindow.syncDashboardBridge();
  }
}

export function startLegacyRuntimeBridge() {
  registerRuntimeBridge();
  syncRuntimeStoreFromLegacy();

  const onLanguage = () => {
    startTransition(() => {
      useRuntimeStore.getState().bumpLanguageVersion();
      const runtimeWindow = window as Window & {
        syncWorkoutSessionBridge?: () => void;
        syncHistoryBridge?: () => void;
        syncDashboardBridge?: () => void;
      };
      if (typeof runtimeWindow.syncWorkoutSessionBridge === 'function') {
        runtimeWindow.syncWorkoutSessionBridge();
      }
      if (typeof runtimeWindow.syncHistoryBridge === 'function') {
        runtimeWindow.syncHistoryBridge();
      }
      if (typeof runtimeWindow.syncDashboardBridge === 'function') {
        runtimeWindow.syncDashboardBridge();
      }
    });
  };

  window.addEventListener(LANGUAGE_EVENT, onLanguage);
  window.__IRONFORGE_APP_SHELL_READY__ = true;

  return () => {
    window.removeEventListener(LANGUAGE_EVENT, onLanguage);
    const runtimeWindow = window as Window & {
      __IRONFORGE_RUNTIME_BRIDGE__?: RuntimeBridge;
    };
    delete runtimeWindow.__IRONFORGE_RUNTIME_BRIDGE__;
  };
}

export function prepareLegacyShellMount() {
  [
    'toast',
    'name-modal',
    'confirm-modal',
    'rpe-modal',
    'summary-modal',
    'sport-check-modal',
    'onboarding-modal',
    'exercise-guide-modal',
    'program-setup-sheet',
    'legacy-bottom-nav',
  ].forEach((id) => document.getElementById(id)?.remove());

  window.__IRONFORGE_APP_SHELL_MOUNTED__ = true;
  window.__IRONFORGE_APP_SHELL_READY__ = false;
  window.dispatchEvent(new CustomEvent(APP_SHELL_EVENT));
}

window.syncRuntimeStoreFromLegacy = syncRuntimeStoreFromLegacy;
