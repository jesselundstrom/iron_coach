import { mountIsland, useIslandSnapshot } from '../island-runtime/index.jsx';

const NUTRITION_EVENT =
  window.__IRONFORGE_NUTRITION_ISLAND_EVENT__ ||
  'ironforge:nutrition-updated';
const LANGUAGE_EVENT = 'ironforge:language-changed';

const initialSnapshot = (() => {
  const shell = document.getElementById('nutrition-legacy-shell');
  return {
    values: {
      html: shell?.innerHTML || '',
    },
  };
})();

function getSnapshot() {
  const mountedShell = document.getElementById('nutrition-shell');
  if (typeof window.getNutritionReactSnapshot === 'function') {
    const snapshot = window.getNutritionReactSnapshot();
    if (snapshot && mountedShell) return snapshot;
  }

  return initialSnapshot;
}

function NutritionIsland() {
  const snapshot = useIslandSnapshot(
    [NUTRITION_EVENT, LANGUAGE_EVENT],
    getSnapshot
  );

  return (
    <div
      id="nutrition-shell"
      dangerouslySetInnerHTML={{ __html: snapshot.values.html }}
    />
  );
}

const mounted = mountIsland({
  mountId: 'nutrition-react-root',
  legacyShellId: 'nutrition-legacy-shell',
  mountedFlag: '__IRONFORGE_NUTRITION_ISLAND_MOUNTED__',
  eventName: NUTRITION_EVENT,
  Component: NutritionIsland,
});

if (mounted) {
  requestAnimationFrame(() => {
    const page = document.getElementById('page-nutrition');
    if (
      page?.classList.contains('active') &&
      typeof window.initNutritionPage === 'function'
    ) {
      window.initNutritionPage();
    }
  });
}
