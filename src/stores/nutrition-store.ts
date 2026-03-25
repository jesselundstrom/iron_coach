import { create } from 'zustand';
import type { NutritionView } from '../app/constants';

type NutritionStoreState = {
  view: NutritionView | null;
  setView: (view: NutritionView | null) => void;
  syncFromLegacy: () => NutritionView | null;
};

type LegacyNutritionWindow = Window & {
  syncNutritionBridge?: () => void;
};

let bridgeInstalled = false;

function getLegacyWindow(): LegacyNutritionWindow | null {
  if (typeof window === 'undefined') return null;
  return window as LegacyNutritionWindow;
}

export const useNutritionStore = create<NutritionStoreState>((set, get) => ({
  view: null,
  setView: (view) => set({ view }),
  syncFromLegacy: (): NutritionView | null => {
    getLegacyWindow()?.syncNutritionBridge?.();
    return get().view;
  },
}));

export function installLegacyNutritionStoreBridge() {
  if (bridgeInstalled || typeof window === 'undefined') return;
  bridgeInstalled = true;
  useNutritionStore.getState().syncFromLegacy();
}

export function disposeLegacyNutritionStoreBridge() {
  bridgeInstalled = false;
}

export function getNutritionStoreSnapshot() {
  return useNutritionStore.getState().view;
}
