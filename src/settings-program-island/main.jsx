import { mountIsland, useIslandSnapshot } from '../island-runtime/index.jsx';

const SETTINGS_PROGRAM_EVENT =
  window.__IRONFORGE_SETTINGS_PROGRAM_ISLAND_EVENT__ ||
  'ironforge:settings-program-updated';
const LANGUAGE_EVENT = 'ironforge:language-changed';

function getSnapshot() {
  if (typeof window.getSettingsProgramReactSnapshot === 'function') {
    return window.getSettingsProgramReactSnapshot();
  }

  return {
    labels: {
      statusBar: '',
      basicsTitle: 'Program Basics',
      trainingProgram: 'Training Program',
      advancedTitle: 'Advanced Setup',
      advancedHelp:
        'Exercise swaps, cycle controls, peak block, and program-specific options.',
    },
    values: {
      basicsVisible: false,
      basicsSummary: '',
      basicsHtml: '',
      trainingProgramSummary: '',
      switcherHtml: '',
    },
  };
}

function SettingsProgramIsland() {
  const snapshot = useIslandSnapshot(
    [SETTINGS_PROGRAM_EVENT, LANGUAGE_EVENT],
    getSnapshot
  );

  return (
    <>
      <div className="settings-status-bar" id="program-status-bar">
        {snapshot.labels.statusBar}
      </div>

      <details
        className="settings-panel"
        id="program-basics-panel"
        style={{ display: snapshot.values.basicsVisible ? '' : 'none' }}
        open
      >
        <summary className="settings-panel-summary">
          <div>
            <div className="settings-panel-title">{snapshot.labels.basicsTitle}</div>
            <div className="settings-panel-sub" id="program-basics-summary">
              {snapshot.values.basicsSummary}
            </div>
          </div>
          <div className="settings-panel-chevron">⌄</div>
        </summary>
        <div className="settings-panel-body">
          <div
            id="program-basics-container"
            dangerouslySetInnerHTML={{ __html: snapshot.values.basicsHtml }}
          />
        </div>
      </details>

      <details className="settings-panel" id="training-program-panel" open>
        <summary className="settings-panel-summary">
          <div>
            <div className="settings-panel-title">{snapshot.labels.trainingProgram}</div>
            <div className="settings-panel-sub" id="training-program-summary">
              {snapshot.values.trainingProgramSummary}
            </div>
          </div>
          <div className="settings-panel-chevron">⌄</div>
        </summary>
        <div className="settings-panel-body">
          <div
            id="program-switcher-container"
            dangerouslySetInnerHTML={{ __html: snapshot.values.switcherHtml }}
          />
        </div>
      </details>

      <div
        className="settings-panel settings-panel-static program-advanced-card"
        id="program-advanced-panel"
        onClick={() => window.openProgramSetupSheet?.()}
        style={{ cursor: 'pointer' }}
      >
        <div className="settings-panel-summary settings-panel-summary-static">
          <div>
            <div className="settings-panel-title">{snapshot.labels.advancedTitle}</div>
            <div className="settings-panel-sub">{snapshot.labels.advancedHelp}</div>
          </div>
          <div className="program-advanced-chevron">&#8250;</div>
        </div>
      </div>
    </>
  );
}

mountIsland({
  mountId: 'settings-program-react-root',
  legacyShellId: 'settings-program-legacy-shell',
  mountedFlag: '__IRONFORGE_SETTINGS_PROGRAM_ISLAND_MOUNTED__',
  eventName: SETTINGS_PROGRAM_EVENT,
  Component: SettingsProgramIsland,
});
