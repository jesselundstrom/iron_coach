import { create } from 'zustand';
import type {
  AppPage,
  ConfirmSnapshot,
  LegacyIslandSnapshot,
  SessionSnapshot,
} from '../constants';

type RuntimeStore = {
  ui: {
    activePage: AppPage;
    confirm: ConfirmSnapshot;
    languageVersion: number;
  };
  session: SessionSnapshot;
  log: {
    startSnapshot: LegacyIslandSnapshot | null;
    activeSnapshot: LegacyIslandSnapshot | null;
  };
  setActivePage: (page: AppPage) => void;
  setConfirmSnapshot: (confirm: ConfirmSnapshot) => void;
  syncSessionSnapshot: (session: SessionSnapshot) => void;
  setLogStartSnapshot: (snapshot: LegacyIslandSnapshot | null) => void;
  setLogActiveSnapshot: (snapshot: LegacyIslandSnapshot | null) => void;
  bumpLanguageVersion: () => void;
};

const defaultConfirm: ConfirmSnapshot = {
  open: false,
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
};

const defaultSession: SessionSnapshot = {
  activeWorkout: null,
  restDuration: 0,
  restEndsAt: 0,
  restSecondsLeft: 0,
  restTotal: 0,
  currentUser: null,
  restBarActive: false,
  rpeOpen: false,
  rpePrompt: null,
  summaryOpen: false,
  summaryPrompt: null,
  sportCheckOpen: false,
  sportCheckPrompt: null,
};

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  ui: {
    activePage: 'dashboard',
    confirm: defaultConfirm,
    languageVersion: 0,
  },
  session: defaultSession,
  log: {
    startSnapshot: null,
    activeSnapshot: null,
  },
  setActivePage: (page) =>
    set((state) => ({
      ui: {
        ...state.ui,
        activePage: page,
      },
    })),
  setConfirmSnapshot: (confirm) =>
    set((state) => ({
      ui: {
        ...state.ui,
        confirm,
      },
    })),
  syncSessionSnapshot: (session) => set(() => ({ session })),
  setLogStartSnapshot: (startSnapshot) =>
    set((state) => ({
      log: {
        ...state.log,
        startSnapshot,
      },
    })),
  setLogActiveSnapshot: (activeSnapshot) =>
    set((state) => ({
      log: {
        ...state.log,
        activeSnapshot,
      },
    })),
  bumpLanguageVersion: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        languageVersion: state.ui.languageVersion + 1,
      },
    })),
}));
