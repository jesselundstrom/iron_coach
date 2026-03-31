import { useHistoryStore } from '../../stores/history-store';
import { dataStore } from '../../stores/data-store';
import { useRuntimeStore } from '../store/runtime-store';
import { showConfirm } from './confirm-actions';

function interpolate(
  fallback: string,
  params?: Record<string, unknown> | null
) {
  return Object.entries(params || {}).reduce(
    (value, [key, nextValue]) =>
      value.replaceAll(`{${key}}`, String(nextValue ?? '')),
    fallback
  );
}

export function toggleHeatmap() {
  useHistoryStore.getState().toggleHeatmap();
}

export function deleteWorkout(workoutId: string) {
  const normalizedId = String(workoutId || '').trim();
  if (!normalizedId) return;
  const workout = dataStore
    .getState()
    .workouts.find((entry) => String(entry.id || '') === normalizedId);
  if (!workout) return;

  const dateLabel = new Date(String(workout.date || '')).toLocaleDateString(
    undefined,
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
  );

  showConfirm(
    'Delete Workout',
    interpolate('Remove workout from {date}?', { date: dateLabel }),
    () => {
      void dataStore.getState().deleteWorkoutById(normalizedId).then(() => {
        useRuntimeStore.getState().showToast({
          message: 'Workout deleted',
          variant: 'info',
        });
      });
    }
  );
}

export function switchHistoryStatsRange(rangeId: string) {
  useHistoryStore.getState().setStatsRange(rangeId);
}

export function switchHistoryTab(tabId: string) {
  useHistoryStore.getState().setTab(tabId);
}
