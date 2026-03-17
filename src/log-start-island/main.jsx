import { mountIsland, useIslandSnapshot } from '../island-runtime/index.jsx';

const LOG_START_EVENT =
  window.__IRONFORGE_LOG_START_ISLAND_EVENT__ ||
  'ironforge:log-start-updated';
const LANGUAGE_EVENT = 'ironforge:language-changed';

const initialSnapshot = (() => {
  const notStarted = document.getElementById('workout-not-started');
  return {
    values: {
      html: notStarted?.innerHTML || '',
      visible: notStarted ? notStarted.style.display !== 'none' : true,
    },
  };
})();

function getSnapshot() {
  const liveShell = document.getElementById('workout-not-started');
  if (typeof window.getLogStartReactSnapshot === 'function') {
    const snapshot = window.getLogStartReactSnapshot();
    if (snapshot && liveShell) return snapshot;
  }

  return initialSnapshot;
}

function LogStartIsland() {
  const snapshot = useIslandSnapshot(
    [LOG_START_EVENT, LANGUAGE_EVENT],
    getSnapshot
  );

  return (
    <div
      id="workout-not-started"
      style={{ display: snapshot.values.visible ? '' : 'none' }}
      dangerouslySetInnerHTML={{ __html: snapshot.values.html }}
    />
  );
}

mountIsland({
  mountId: 'log-start-react-root',
  legacyShellId: 'log-start-legacy-shell',
  mountedFlag: '__IRONFORGE_LOG_START_ISLAND_MOUNTED__',
  eventName: LOG_START_EVENT,
  Component: LogStartIsland,
});
