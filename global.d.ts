export {};

declare global {
  interface Window {
    __IRONFORGE_APP_SHELL_READY__?: boolean;
    syncRuntimeStoreFromLegacy?: () => void;
  }
}
