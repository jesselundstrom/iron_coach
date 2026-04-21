import { workoutStore } from '../../stores/workout-store';
import { useRuntimeStore } from '../store/runtime-store';
import { t } from './i18n';
import { callLegacyWindowFunction, readLegacyWindowValue } from './legacy-call';

type EventLike = Event | { nativeEvent?: Event } | null | undefined;

type WorkoutOverlaySnapshot = {
  rpePrompt?: Record<string, unknown> | null;
  summaryPrompt?: Record<string, unknown> | null;
  sportCheckPrompt?: Record<string, unknown> | null;
  exerciseGuidePrompt?: Record<string, unknown> | null;
};

const RPE_FEEL_KEYS: Record<number, [string, string]> = {
  6: ['rpe.feel.6', 'Easy'],
  7: ['rpe.feel.7', 'Moderate'],
  8: ['rpe.feel.8', 'Hard'],
  9: ['rpe.feel.9', 'Very Hard'],
  10: ['rpe.feel.10', 'Max'],
};

const RPE_DESC_KEYS: Record<number, [string, string]> = {
  6: ['rpe.desc.6', 'Could keep going easily'],
  7: ['rpe.desc.7', 'Comfortable effort'],
  8: ['rpe.desc.8', 'Challenging but controlled'],
  9: ['rpe.desc.9', 'Maybe 1 rep left'],
  10: ['rpe.desc.10', 'Nothing left'],
};

let pendingRpeCallback: ((value: number | null) => void) | null = null;

function setWorkoutSessionState(partial: Record<string, unknown>) {
  const current = useRuntimeStore.getState().workoutSession.session;
  useRuntimeStore.getState().syncWorkoutSession({
    ...current,
    ...partial,
  });
}

function getRpePromptSnapshot() {
  const prompt = useRuntimeStore.getState().workoutSession.session.rpePrompt;
  return prompt && typeof prompt === 'object' ? { ...prompt } : null;
}

export function getWorkoutOverlaySnapshot() {
  return {
    rpePrompt: getRpePromptSnapshot(),
  };
}

export function installWorkoutOverlayBridge() {
  if (typeof window === 'undefined') return;
  const runtimeWindow = window as Window & {
    getWorkoutOverlaySnapshot?: () => WorkoutOverlaySnapshot;
    showRPEPicker?: typeof showRPEPicker;
    selectRPE?: typeof selectRPE;
    skipRPE?: typeof skipRPE;
  };
  const legacyGetWorkoutOverlaySnapshot =
    typeof runtimeWindow.getWorkoutOverlaySnapshot === 'function'
      ? runtimeWindow.getWorkoutOverlaySnapshot.bind(runtimeWindow)
      : null;

  runtimeWindow.getWorkoutOverlaySnapshot = () => ({
    ...(legacyGetWorkoutOverlaySnapshot?.() || {}),
    rpePrompt: getRpePromptSnapshot(),
  });
  runtimeWindow.showRPEPicker = showRPEPicker;
  runtimeWindow.selectRPE = selectRPE;
  runtimeWindow.skipRPE = skipRPE;
}

export function openExerciseCatalogForAdd() {
  callLegacyWindowFunction('openExerciseCatalogForAdd');
}

export function quickLogSport() {
  callLegacyWindowFunction('quickLogSport');
}

export function setPendingSportReadinessLevel(value: string) {
  callLegacyWindowFunction('setPendingSportReadinessLevel', value);
}

export function setPendingSportReadinessTiming(value: string) {
  callLegacyWindowFunction('setPendingSportReadinessTiming', value);
}

export function setPendingEnergyLevel(value: string) {
  callLegacyWindowFunction('setPendingEnergyLevel', value);
}

export function setPendingSessionMode(
  value: string,
  options?: Record<string, unknown>
) {
  callLegacyWindowFunction('setPendingSessionMode', value, options);
}

export function getSelectedBonusDuration() {
  const getter = readLegacyWindowValue<() => string>('getSelectedBonusDuration');
  return getter?.();
}

export function setSelectedWorkoutStartOption(value: string) {
  callLegacyWindowFunction('setSelectedWorkoutStartOption', value);
}

export function setProgramDayOption(value: string) {
  callLegacyWindowFunction('setProgramDayOption', value);
}

export function setSelectedBonusDuration(value: string) {
  callLegacyWindowFunction('setSelectedBonusDuration', value);
}

export function swapAuxExercise(exerciseIndex: number) {
  callLegacyWindowFunction('swapAuxExercise', exerciseIndex);
}

export function swapBackExercise(exerciseIndex: number) {
  callLegacyWindowFunction('swapBackExercise', exerciseIndex);
}

export function collapseCompletedExercise(exerciseUiKey: string) {
  callLegacyWindowFunction('collapseCompletedExercise', exerciseUiKey);
}

export function expandCompletedExercise(exerciseUiKey: string) {
  callLegacyWindowFunction('expandCompletedExercise', exerciseUiKey);
}

export function openExerciseGuide(exerciseRef: string) {
  callLegacyWindowFunction('openExerciseGuide', exerciseRef);
}

export function closeExerciseGuide(event?: EventLike) {
  callLegacyWindowFunction(
    'closeExerciseGuide',
    event && 'nativeEvent' in event ? event.nativeEvent : event
  );
}

export function handleSetInputKey(
  event: KeyboardEvent,
  exerciseUiKey: string,
  setIndex: number,
  field: string
) {
  callLegacyWindowFunction(
    'handleSetInputKey',
    event,
    exerciseUiKey,
    setIndex,
    field
  );
}

export function clearLogActiveFocusTarget(token: number) {
  callLegacyWindowFunction('clearLogActiveFocusTarget', token);
}

export function clearLogActiveSetSignal(token: number) {
  callLegacyWindowFunction('clearLogActiveSetSignal', token);
}

export function clearLogActiveCollapseSignal(token: number) {
  callLegacyWindowFunction('clearLogActiveCollapseSignal', token);
}

export function applyQuickWorkoutAdjustment(mode: string) {
  callLegacyWindowFunction('applyQuickWorkoutAdjustment', mode);
}

export function undoQuickWorkoutAdjustment() {
  callLegacyWindowFunction('undoQuickWorkoutAdjustment');
}

export function showRPEPicker(
  exerciseName: string,
  setNumber: number,
  callback: (value: number | null) => void
) {
  pendingRpeCallback = callback;
  setWorkoutSessionState({
    rpeOpen: true,
    rpePrompt: {
      open: true,
      title: t('rpe.session_title', 'How hard was this session?'),
      subtitle:
        setNumber < 0
          ? t(
              'rpe.session_prompt',
              'Rate overall session effort (6 = easy, 10 = max)'
            )
          : `${exerciseName} - ${t('rpe.set', 'Set')} ${setNumber + 1}`,
      options: [6, 7, 8, 9, 10].map((value) => ({
        value,
        feel: t(RPE_FEEL_KEYS[value][0], RPE_FEEL_KEYS[value][1]),
        description: t(RPE_DESC_KEYS[value][0], RPE_DESC_KEYS[value][1]),
      })),
    },
  });
}

export function selectRPE(value: number) {
  const callback = pendingRpeCallback;
  pendingRpeCallback = null;
  setWorkoutSessionState({
    rpeOpen: false,
    rpePrompt: null,
  });
  callback?.(value);
}

export function skipRPE() {
  const callback = pendingRpeCallback;
  pendingRpeCallback = null;
  setWorkoutSessionState({
    rpeOpen: false,
    rpePrompt: null,
  });
  callback?.(null);
}

export function showSportReadinessCheck(
  callback: (context: Record<string, unknown> | null) => void
) {
  return callLegacyWindowFunction('showSportReadinessCheck', callback);
}

export function selectSportReadiness(signal: string) {
  callLegacyWindowFunction('selectSportReadiness', signal);
}

export function cancelSportReadinessCheck() {
  callLegacyWindowFunction('cancelSportReadinessCheck');
}

export function showSessionSummary(summaryData: Record<string, unknown>) {
  return callLegacyWindowFunction<Promise<unknown> | unknown>(
    'showSessionSummary',
    summaryData
  );
}

export function updateSummaryNotes(value: string) {
  callLegacyWindowFunction('updateSummaryNotes', value);
}

export function setSummaryFeedback(value: string) {
  callLegacyWindowFunction('setSummaryFeedback', value);
}

export function closeSummaryModal(goToNutrition?: boolean) {
  callLegacyWindowFunction('closeSummaryModal', goToNutrition);
}

export function runPageActivationSideEffects(page: string) {
  callLegacyWindowFunction('runPageActivationSideEffects', page);
}

export function prefersReducedMotionUI() {
  return callLegacyWindowFunction<boolean>('prefersReducedMotionUI') === true;
}

export function startSessionSummaryCelebration(
  modal: HTMLElement | null,
  summaryData: Record<string, unknown> | null
) {
  callLegacyWindowFunction('startSessionSummaryCelebration', modal, summaryData);
}

export function startWorkout() {
  workoutStore.getState().startWorkout();
}

export function updateRestDuration(nextValue?: string | number | null) {
  workoutStore.getState().updateRestDuration(nextValue);
}

export function addSet(exerciseIndex: number) {
  workoutStore.getState().addSet(exerciseIndex);
}

export function removeExercise(exerciseIndex: number) {
  workoutStore.getState().removeExercise(exerciseIndex);
}

export function toggleSet(exerciseIndex: number, setIndex: number) {
  workoutStore.getState().toggleSet(exerciseIndex, setIndex);
}

export function updateSet(
  exerciseIndex: number,
  setIndex: number,
  field: string,
  value: string | number
) {
  workoutStore.getState().updateSet(exerciseIndex, setIndex, field, value);
}

export function finishWorkout() {
  return workoutStore.getState().finishWorkout();
}

export function cancelWorkout() {
  workoutStore.getState().cancelWorkout();
}
