import type { AppPage, SettingsTab } from '../constants';
import { useRuntimeStore } from '../store/runtime-store';

function syncHash(page: AppPage) {
  const nextHash = `#/${page}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = `/${page}`;
  }
}

export function navigateToPage(page: AppPage) {
  useRuntimeStore.getState().navigateToPage(page);
  syncHash(page);
}

export function syncRoutePage(page: AppPage) {
  if (useRuntimeStore.getState().navigation.activePage !== page) {
    useRuntimeStore.getState().navigateToPage(page);
  }
}

export function showSettingsTab(tab: SettingsTab, trigger?: HTMLElement | null) {
  if (typeof window.showSettingsTab === 'function') {
    window.showSettingsTab(tab, trigger || undefined);
    return;
  }
  useRuntimeStore.getState().setActiveSettingsTab(tab);
}
