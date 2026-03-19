export {};

declare global {
  interface Window {
    __IRONFORGE_APP_SHELL_READY__?: boolean;
    syncRuntimeStoreFromLegacy?: () => void;
    loadData?: (options?: {
      allowCloudSync?: boolean;
      userId?: string;
    }) => Promise<void> | void;
  }
}
