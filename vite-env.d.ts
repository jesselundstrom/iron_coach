/// <reference types="vite/client" />

interface Window {
  showPage?: (name: string, btn?: Element | null) => void;
  showLoginScreen?: () => void;
  hideLoginScreen?: () => void;
  maybeOpenOnboarding?: (options?: unknown) => void;
}
