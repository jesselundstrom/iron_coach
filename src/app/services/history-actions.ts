import { callLegacyWindowFunction } from './legacy-call';

export function toggleHeatmap() {
  callLegacyWindowFunction('toggleHeatmap');
}

export function deleteWorkout(workoutId: string) {
  callLegacyWindowFunction('deleteWorkout', workoutId);
}

export function switchHistoryStatsRange(rangeId: string) {
  callLegacyWindowFunction('switchHistoryStatsRange', rangeId);
}

export function switchHistoryTab(tabId: string) {
  callLegacyWindowFunction('switchHistoryTab', tabId);
}
