declare module './AppShell.jsx' {
  import type { ComponentType } from 'react';

  const AppShell: ComponentType;
  export default AppShell;
}

declare module './OnboardingFlow.jsx' {
  import type { ComponentType } from 'react';

  const OnboardingFlow: ComponentType;
  export default OnboardingFlow;
}

declare global {
  interface Window {
    __IRONFORGE_APP_SHELL_READY__?: boolean;
    syncRuntimeStoreFromLegacy?: () => void;
  }
}
