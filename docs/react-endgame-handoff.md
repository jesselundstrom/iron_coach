# Ironforge React Endgame Handoff

Use this file as the starting context for the next conversation.

## Current Status

The React endgame is still the target architecture, but the migration is being done in staged cutovers.

Phase 1 for the workout log is now complete enough to build on:

- The active workout surface is React-rendered and legacy code no longer directly mutates React-owned title, description, timer, set-row, or plan-panel DOM when the active island is mounted.
- Rest duration no longer depends on hidden inputs inside the React active screen.
- Log start selection no longer depends on hidden inputs inside the React start screen.
- RPE, sport-check, and summary prompts render through the React app shell instead of imperative modal HTML/text injection.
- Add-set focus and Enter-key progression are now handed off through React-visible focus signals instead of legacy `setTimeout(...focus())` against React-owned nodes.

What is still not done:

- The log route still depends on legacy snapshot getters (`getLogStartReactSnapshot()` and `getLogActiveReactSnapshot()`).
- Workout session state still lives in globals and legacy helpers instead of a dedicated session service/store.
- Exercise catalog and guide flows still depend on imperative DOM rendering and global callbacks.
- The rest-timer bar outside the active-workout subtree is still legacy DOM-driven.

## Files That Matter Most Right Now

- `core/workout-layer.js`
- `core/program-layer.js`
- `app.js`
- `src/app/AppShell.jsx`
- `src/app/services/legacy-runtime.ts`
- `src/app/store/runtime-store.ts`
- `src/log-start-island/main.jsx`
- `src/log-active-island/main.jsx`
- `docs/migration-inventory.md`

## Verified State

Most relevant local checks that passed:

- `npm.cmd run test -- tests/log-active-island.spec.ts --workers=1`
- `npm.cmd run test -- tests/workout-draft.spec.ts --workers=1`
- `npm.cmd run test -- tests/log-active-island.spec.ts tests/workout-draft.spec.ts tests/workout-overlays.spec.ts tests/session-feedback.spec.ts --workers=1`
- `npm.cmd run build`

Known non-blocking repo issue:

- `npm.cmd run typecheck` still fails on pre-existing issues in `tests/settings-account-island.spec.ts`.

## Recommended Next Step

Start Phase 2: extract workout session ownership away from legacy globals.

The goal is to keep the current workout logic intact where useful, but move the log route away from snapshot getters and window state.

## Phase 2 Plan: Workout Session Service / Store

### Goal

Replace log snapshot getters and island mount coordination with direct store-backed session ownership for:

- active workout
- workout timer/rest state
- collapse state
- draft save/restore lifecycle
- RPE / summary / sport-check prompt state
- pending log-start selection state

### Entry Criteria

- Phase 1 active workout React ownership is in place.
- Workout overlays already render through the React shell.
- Current persisted data shapes must remain compatible.

### Work Breakdown

1. Create a dedicated workout session service/store layer.

- Pull session read/write responsibilities behind explicit functions/selectors.
- Keep persistence logic compatible with existing draft/profile/workout storage.
- Keep program-building logic in legacy helpers if needed, but stop exposing raw window snapshot getters to React.

2. Move log start and active workout islands off snapshot getters.

- Replace `getLogStartReactSnapshot()` and `getLogActiveReactSnapshot()` as the React data source.
- Let the islands read direct store state instead.
- Keep a thin compatibility wrapper only where non-React legacy code still needs it temporarily.

3. Move timer/rest ownership into the session service.

- Session service should own elapsed timer state and selected rest duration.
- The React active screen should render timer/rest directly from service/store state.
- The legacy rest bar can stay temporarily bridged if needed, but the log route should stop treating DOM as state.

4. Move draft lifecycle into explicit session actions.

- Start session
- resume session
- persist draft
- clear draft on finish/discard
- restore draft on reload

5. Unify transient workout prompt state.

- RPE
- sport check
- summary

These already render through React, so the next step is to stop sourcing them from ad hoc legacy globals and move them behind the same session service API.

### Main Risks

- Breaking draft restore/clear semantics
- Breaking program-day / bonus-workout selection behavior
- Accidentally changing persisted workout payload shapes
- Reintroducing mixed ownership by keeping both store state and legacy globals alive for too long

### Acceptance Criteria

- The log route renders from direct session selectors/store state, not from `getLogStartReactSnapshot()` / `getLogActiveReactSnapshot()`.
- Starting, resuming, editing, finishing, and discarding a workout still work.
- Draft restore/clear still work across reloads.
- RPE / sport-check / summary prompts still work.
- No localStorage or workout history schema migration is required.

### Tests To Keep Running

- `tests/log-start-island.spec.ts`
- `tests/log-active-island.spec.ts`
- `tests/workout-draft.spec.ts`
- `tests/workout-overlays.spec.ts`
- `tests/session-feedback.spec.ts`
- `tests/reward-moments.spec.ts`

## Later Phases

### Phase 3. Workout overlays and catalog

- Rebuild exercise catalog and remaining workout modal/control flows so they no longer depend on imperative DOM rendering.
- Remove raw HTML generation for workout-specific overlays.

### Phase 4. Collapse page islands into direct routed React pages

- Dashboard
- History
- Nutrition
- Settings

Each should move from snapshot/event bridges to direct store/service reads.

### Phase 5. Replace shell/global bridges

- `window.showPage`
- `window.showToast`
- `window.showConfirm`
- other shell-level global accessors

### Phase 6. Final cleanup

- remove island mount flags
- remove bridge events
- remove dead hybrid fallback helpers
- simplify boot/runtime path

## Working Rules For The Next Conversation

- Preserve persisted workout/profile/history data shapes unless a migration is explicit.
- Prefer deleting bridge code over layering a second bridge on top of it.
- Keep tests focused on real user flows through Playwright.
- If verification gets flaky, rerun with `--workers=1` before assuming the app code regressed.
