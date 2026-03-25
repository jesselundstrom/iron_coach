import { create } from 'zustand';
import type { DashboardView } from '../app/constants';

type DashboardStoreState = {
  view: DashboardView | null;
  setView: (view: DashboardView | null) => void;
  syncFromLegacy: () => DashboardView | null;
};

type LegacyDashboardWindow = Window & {
  syncDashboardBridge?: () => void;
};

let bridgeInstalled = false;

function getLegacyWindow(): LegacyDashboardWindow | null {
  if (typeof window === 'undefined') return null;
  return window as LegacyDashboardWindow;
}

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  view: null,
  setView: (view) => set({ view }),
  syncFromLegacy: (): DashboardView | null => {
    getLegacyWindow()?.syncDashboardBridge?.();
    return get().view;
  },
}));

export function installLegacyDashboardStoreBridge() {
  if (bridgeInstalled || typeof window === 'undefined') return;
  bridgeInstalled = true;
  useDashboardStore.getState().syncFromLegacy();
}

export function disposeLegacyDashboardStoreBridge() {
  bridgeInstalled = false;
}

export function getDashboardStoreSnapshot() {
  return useDashboardStore.getState().view;
}
