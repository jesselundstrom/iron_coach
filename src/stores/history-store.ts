import { create } from 'zustand';
import type { HistoryView } from '../app/constants';

type HistoryStoreState = {
  view: HistoryView | null;
  setView: (view: HistoryView | null) => void;
  syncFromLegacy: () => HistoryView | null;
};

type LegacyHistoryWindow = Window & {
  syncHistoryBridge?: () => void;
};

let bridgeInstalled = false;

function getLegacyWindow(): LegacyHistoryWindow | null {
  if (typeof window === 'undefined') return null;
  return window as LegacyHistoryWindow;
}

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  view: null,
  setView: (view) => set({ view }),
  syncFromLegacy: (): HistoryView | null => {
    getLegacyWindow()?.syncHistoryBridge?.();
    return get().view;
  },
}));

export function installLegacyHistoryStoreBridge() {
  if (bridgeInstalled || typeof window === 'undefined') return;
  bridgeInstalled = true;
  useHistoryStore.getState().syncFromLegacy();
}

export function disposeLegacyHistoryStoreBridge() {
  bridgeInstalled = false;
}

export function getHistoryStoreSnapshot() {
  return useHistoryStore.getState().view;
}
