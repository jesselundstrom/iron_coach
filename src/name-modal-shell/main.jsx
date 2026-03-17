import { mountIsland } from '../island-runtime/index.jsx';

function NameModalShell() {
  return (
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
        <div className="catalog-filter-groups" id="exercise-catalog-filters" />
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
  );
}

mountIsland({
  mountId: 'name-modal-shell-react-root',
  legacyShellId: 'name-modal',
  mountedFlag: '__IRONFORGE_NAME_MODAL_SHELL_MOUNTED__',
  eventName: 'ironforge:name-modal-shell-mounted',
  Component: NameModalShell,
});
