import { Component, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { APP_PAGES } from './constants.ts';
import { useRuntimeStore } from './store/runtime-store.ts';
import { t } from '../core/i18n.js';
import OnboardingFlow from './OnboardingFlow.jsx';
import { DashboardIsland } from '../dashboard-island/main.jsx';
import { HistoryIsland } from '../history-island/main.jsx';
import { NutritionIsland } from '../nutrition-island/main.jsx';
import { LogStartIsland } from '../log-start-island/main.jsx';
import { LogActiveIsland } from '../log-active-island/main.jsx';
import { SettingsBodyIsland } from '../settings-body-island/main.jsx';
import { SettingsAccountIsland } from '../settings-account-island/main.jsx';
import { SettingsPreferencesIsland } from '../settings-preferences-island/main.jsx';
import { SettingsProgramIsland } from '../settings-program-island/main.jsx';
import { SettingsScheduleIsland } from '../settings-schedule-island/main.jsx';

const PAGE_META = [
  { id: 'dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard' },
  { id: 'log', labelKey: 'nav.train', fallbackLabel: 'Train' },
  { id: 'history', labelKey: 'nav.history', fallbackLabel: 'History' },
  { id: 'settings', labelKey: 'nav.settings', fallbackLabel: 'Settings' },
  { id: 'nutrition', labelKey: 'nav.nutrition', fallbackLabel: 'Nutrition' },
];

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

// Error boundary for individual island portals — prevents one island crash from
// taking down the entire React tree (all islands share one root now).
class IslandErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Ironforge] Island render error:', error, info);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

// PageHost manages the active class on existing #page-X divs in the HTML.
// ui-shell.js owns the primary class toggle; this keeps React store in sync.
function PageHost({ name, active }) {
  useEffect(() => {
    const node = document.getElementById(`page-${name}`);
    if (!node) return;
    node.classList.toggle('active', active);
    node.dataset.pageShell = name;
  }, [name, active]);
  return null;
}

export default function AppShell() {
  const activePage = useRuntimeStore((state) => state.ui.activePage);
  const confirm = useRuntimeStore((state) => state.ui.confirm);
  const languageVersion = useRuntimeStore((state) => state.ui.languageVersion);
  const previousPageRef = useRef(activePage);

  const navItems = useMemo(
    () =>
      PAGE_META.map((page) => ({
        id: page.id,
        label: t(page.labelKey, page.fallbackLabel),
      })),
    [languageVersion]
  );

  useLayoutEffect(() => {
    // Set island mounted flags synchronously (previously set by mountIsland() at module load time)
    const flags = [
      '__IRONFORGE_DASHBOARD_ISLAND_MOUNTED__',
      '__IRONFORGE_HISTORY_ISLAND_MOUNTED__',
      '__IRONFORGE_NUTRITION_ISLAND_MOUNTED__',
      '__IRONFORGE_LOG_START_ISLAND_MOUNTED__',
      '__IRONFORGE_LOG_ACTIVE_ISLAND_MOUNTED__',
      '__IRONFORGE_SETTINGS_BODY_ISLAND_MOUNTED__',
      '__IRONFORGE_SETTINGS_ACCOUNT_ISLAND_MOUNTED__',
      '__IRONFORGE_SETTINGS_PREFERENCES_ISLAND_MOUNTED__',
      '__IRONFORGE_SETTINGS_PROGRAM_ISLAND_MOUNTED__',
      '__IRONFORGE_SETTINGS_SCHEDULE_ISLAND_MOUNTED__',
    ];
    flags.forEach((flag) => { window[flag] = true; });

    // Dispatch initial snapshot events so islands render with data
    const events = [
      '__IRONFORGE_DASHBOARD_ISLAND_EVENT__',
      '__IRONFORGE_HISTORY_ISLAND_EVENT__',
      '__IRONFORGE_NUTRITION_ISLAND_EVENT__',
      '__IRONFORGE_LOG_START_ISLAND_EVENT__',
      '__IRONFORGE_LOG_ACTIVE_ISLAND_EVENT__',
      '__IRONFORGE_SETTINGS_BODY_ISLAND_EVENT__',
      '__IRONFORGE_SETTINGS_ACCOUNT_ISLAND_EVENT__',
      '__IRONFORGE_SETTINGS_PREFERENCES_ISLAND_EVENT__',
      '__IRONFORGE_SETTINGS_PROGRAM_ISLAND_EVENT__',
      '__IRONFORGE_SETTINGS_SCHEDULE_ISLAND_EVENT__',
    ];
    events.forEach((key) => {
      const eventName = window[key];
      if (eventName) window.dispatchEvent(new CustomEvent(eventName));
    });

    // Remove any remaining legacy shell divs (previously cleaned up by mountIsland())
    const legacyShells = [
      'dashboard-legacy-shell', 'history-legacy-shell', 'nutrition-legacy-shell',
      'log-start-legacy-shell', 'log-active-legacy-shell',
      'settings-body-legacy-shell', 'settings-account-legacy-shell',
      'settings-preferences-legacy-shell', 'settings-program-legacy-shell',
      'settings-schedule-legacy-shell',
    ];
    legacyShells.forEach((id) => document.getElementById(id)?.remove());

    // Handle nutrition init if nutrition page is active at mount time
    requestAnimationFrame(() => {
      const page = document.getElementById('page-nutrition');
      if (page?.classList.contains('active') && typeof window.initNutritionPage === 'function') {
        window.initNutritionPage();
      }
    });
  }, []);

  useEffect(() => {
    if (!confirm?.open) return;
    window.requestAnimationFrame(() =>
      document.getElementById('confirm-ok')?.focus()
    );
  }, [confirm?.open]);

  useEffect(() => {
    const contentScroller = document.querySelector('.content');
    const appRoot = document.getElementById('app-root');
    if (!contentScroller) return;

    const isNutritionActive = activePage === 'nutrition';
    contentScroller.scrollTo({ top: 0, behavior: 'auto' });
    contentScroller.classList.toggle('no-scroll', isNutritionActive);
    contentScroller.classList.toggle('nutrition-active', isNutritionActive);
    if (appRoot) {
      appRoot.classList.toggle('nutrition-active', isNutritionActive);
    }
  }, [activePage]);

  useEffect(() => {
    if (previousPageRef.current === activePage) return;
    previousPageRef.current = activePage;
    window.runPageActivationSideEffects?.(activePage);
  }, [activePage]);

  return (
    <>
      {/* Sync active class on existing #page-X HTML divs from React store */}
      {APP_PAGES.map((name) => (
        <PageHost key={name} name={name} active={activePage === name} />
      ))}
      {/* Island portals — each wrapped in an error boundary so a single island
          crash cannot unmount the entire React tree (toast, modals, nav). */}
      {(() => {
        const portals = [];
        const add = (id, IslandComponent) => {
          const node = document.getElementById(id);
          if (node) {
            portals.push(
              createPortal(
                <IslandErrorBoundary key={id}>
                  <IslandComponent />
                </IslandErrorBoundary>,
                node,
                id
              )
            );
          }
        };
        add('dashboard-react-root', DashboardIsland);
        add('history-react-root', HistoryIsland);
        add('nutrition-react-root', NutritionIsland);
        add('log-start-react-root', LogStartIsland);
        add('log-active-react-root', LogActiveIsland);
        add('settings-body-react-root', SettingsBodyIsland);
        add('settings-account-react-root', SettingsAccountIsland);
        add('settings-preferences-react-root', SettingsPreferencesIsland);
        add('settings-program-react-root', SettingsProgramIsland);
        add('settings-schedule-react-root', SettingsScheduleIsland);
        return portals;
      })()}
      <div className="toast" id="toast" />
      <div className="modal-overlay" id="name-modal">
        <div className="modal-sheet catalog-sheet">
          <div className="modal-handle" />
          <div className="catalog-header">
            <div
              className="modal-title"
              id="name-modal-title"
              data-i18n="catalog.title.add"
            >
              Add Exercise
            </div>
            <div
              className="modal-sub"
              id="exercise-catalog-sub"
              data-i18n="catalog.sub"
            >
              Pick an exercise from the library or search by name.
            </div>
          </div>
          <div className="catalog-search-wrap">
            <input
              type="text"
              id="name-modal-input"
              className="exercise-catalog-search-input"
              data-i18n-placeholder="catalog.search.placeholder"
              placeholder="Search exercises"
            />
            <button
              className="btn btn-ghost btn-sm catalog-clear-btn"
              id="catalog-clear-btn"
              type="button"
              onClick={() => window.clearExerciseCatalogFilters?.()}
              data-i18n="catalog.clear_filters"
            >
              Clear
            </button>
          </div>
          <div
            className="catalog-filter-groups"
            id="exercise-catalog-filters"
          />
          <div className="catalog-scroll" id="exercise-catalog-scroll">
            <div id="exercise-catalog-content" />
            <div
              className="catalog-empty-state"
              id="exercise-catalog-empty"
              style={{ display: 'none' }}
              data-i18n="catalog.empty"
            >
              No exercises matched your filters.
            </div>
          </div>
          <div className="catalog-footer">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => window.closeNameModal?.()}
              data-i18n="common.cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <div
        className={`confirm-modal${confirm?.open ? ' active' : ''}`}
        id="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-hidden={confirm?.open ? 'false' : 'true'}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
      >
        <div className="confirm-box">
          <h3 id="confirm-title">{confirm?.title || 'Confirm'}</h3>
          <p id="confirm-msg">{confirm?.message || 'Are you sure?'}</p>
          <div className="confirm-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => window.confirmCancel?.()}
            >
              {confirm?.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="confirm-ok"
              onClick={() => window.confirmOk?.()}
            >
              {confirm?.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-overlay" id="rpe-modal">
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title" data-i18n="rpe.session_title">
            How hard was this session?
          </div>
          <div
            className="modal-sub"
            id="rpe-modal-sub"
            data-i18n="rpe.session_prompt"
          >
            Rate overall effort (6 = easy, 10 = max)
          </div>
          <div className="rpe-grid" id="rpe-grid" />
          <div
            className="rpe-skip"
            role="button"
            tabIndex={0}
            onClick={() => window.skipRPE?.()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.skipRPE?.();
              }
            }}
            data-i18n="common.skip"
          >
            Skip
          </div>
        </div>
      </div>
      <div className="modal-overlay" id="summary-modal">
        <div className="modal-sheet summary-sheet">
          <div className="modal-handle" />
          <div id="summary-modal-content" className="summary-modal-content" />
        </div>
      </div>
      <div className="modal-overlay" id="sport-check-modal">
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div
            className="modal-title"
            id="sport-check-title"
            data-i18n="workout.sport_check.title"
          >
            Sport check-in
          </div>
          <div
            className="modal-sub"
            id="sport-check-sub"
            data-i18n="workout.sport_check.sub"
          >
            Have you had a leg-heavy sport session yesterday, or do you have one
            tomorrow?
          </div>
          <div className="sport-check-grid">
            <button
              className="btn btn-secondary sport-check-btn"
              type="button"
              onClick={() => window.selectSportReadiness?.('none')}
              data-i18n="workout.sport_check.none"
            >
              No
            </button>
            <button
              className="btn btn-secondary sport-check-btn"
              type="button"
              onClick={() => window.selectSportReadiness?.('yesterday')}
              data-i18n="workout.sport_check.yesterday"
            >
              Yes, yesterday
            </button>
            <button
              className="btn btn-secondary sport-check-btn"
              type="button"
              onClick={() => window.selectSportReadiness?.('tomorrow')}
              data-i18n="workout.sport_check.tomorrow"
            >
              Yes, tomorrow
            </button>
            <button
              className="btn btn-secondary sport-check-btn"
              type="button"
              onClick={() => window.selectSportReadiness?.('both')}
              data-i18n="workout.sport_check.both"
            >
              Yes, both
            </button>
          </div>
          <button
            className="btn btn-ghost session-secondary-action"
            type="button"
            onClick={() => window.cancelSportReadinessCheck?.()}
            data-i18n="common.cancel"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="modal-overlay" id="onboarding-modal">
        <div className="modal-sheet onboarding-sheet">
          <div className="modal-handle" />
          <div id="onboarding-content" className="onboarding-scroll">
            <OnboardingFlow />
          </div>
        </div>
      </div>
      <div
        className="modal-overlay"
        id="exercise-guide-modal"
        onClick={(event) => window.closeExerciseGuide?.(event)}
      >
        <div className="modal-sheet exercise-guide-sheet">
          <div className="modal-handle" />
          <div
            className="modal-title"
            id="exercise-guide-modal-title"
            data-i18n="guidance.title"
          >
            Movement Guide
          </div>
          <div className="modal-sub" id="exercise-guide-modal-sub" />
          <div
            className="exercise-guide-sheet-body"
            id="exercise-guide-modal-body"
          />
          <button
            className="btn btn-ghost exercise-guide-sheet-close"
            type="button"
            onClick={() => window.closeExerciseGuide?.()}
            data-i18n="common.done"
          >
            Done
          </button>
        </div>
      </div>
      <div
        className="modal-overlay"
        id="program-setup-sheet"
        onClick={(event) => window.closeProgramSetupSheet?.(event)}
      >
        <div className="modal-sheet sheet-scroll-body">
          <div className="modal-handle" />
          <div className="sheet-header">
            <div
              className="modal-title"
              id="program-setup-sheet-title"
              data-i18n="settings.program_setup"
            >
              Program Setup
            </div>
            <button
              className="sheet-close-btn"
              type="button"
              onClick={() => window.closeProgramSetupSheet?.()}
              data-i18n="common.done"
            >
              Done
            </button>
          </div>
          <div id="program-settings-container" />
        </div>
      </div>
      <nav
        className="bottom-nav"
        style={{
          '--nav-indicator-x': PAGE_META.findIndex((item) => item.id === activePage),
        }}
        aria-label="Primary"
      >
        {navItems.map((item) => {
          const isActive = activePage === item.id;
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
    </>
  );
}
