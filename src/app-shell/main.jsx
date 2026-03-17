import { mountIsland, useIslandSnapshot } from '../island-runtime/index.jsx';

const APP_SHELL_EVENT =
  window.__IRONFORGE_APP_SHELL_EVENT__ || 'ironforge:app-shell-updated';
const LANGUAGE_EVENT = 'ironforge:language-changed';

const NAV_ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  log: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="10" width="4" height="4" rx="1" />
      <rect x="19" y="10" width="4" height="4" rx="1" />
      <rect x="7" y="8" width="3" height="8" rx="1" />
      <rect x="14" y="8" width="3" height="8" rx="1" />
      <line x1="5" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="19" y2="12" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  nutrition: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 8c.7-3.4-.8-6.2-3-7.5C12.3 3 11.5 5.4 12 8" />
      <path d="M12 8c-4 0-7 2.5-7 6 0 4.5 3 8 7 8s7-3.5 7-8c0-3.5-3-6-7-6z" />
    </svg>
  ),
};

function getSnapshot() {
  if (typeof window.getAppShellReactSnapshot === 'function') {
    return window.getAppShellReactSnapshot();
  }
  return {
    activePage: 'dashboard',
    navIndicatorIndex: 0,
    navItems: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'log', label: 'Train' },
      { id: 'history', label: 'History' },
      { id: 'settings', label: 'Settings' },
      { id: 'nutrition', label: 'Nutrition' },
    ],
  };
}

function AppShellIsland() {
  const snapshot = useIslandSnapshot([APP_SHELL_EVENT, LANGUAGE_EVENT], getSnapshot);

  return (
    <nav
      className="bottom-nav"
      style={{ '--nav-indicator-x': snapshot.navIndicatorIndex }}
      aria-label="Primary"
    >
      {snapshot.navItems.map((item) => {
        const isActive = snapshot.activePage === item.id;
        return (
          <button
            key={item.id}
            className={`nav-btn${isActive ? ' active' : ''}`}
            type="button"
            data-page={item.id}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => window.showPage?.(item.id, event.currentTarget)}
          >
            {NAV_ICONS[item.id]}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

mountIsland({
  mountId: 'app-shell-react-root',
  legacyShellId: 'legacy-bottom-nav',
  mountedFlag: '__IRONFORGE_APP_SHELL_MOUNTED__',
  eventName: APP_SHELL_EVENT,
  Component: AppShellIsland,
});
