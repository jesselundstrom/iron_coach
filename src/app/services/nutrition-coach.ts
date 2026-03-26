import { navigateToPage } from './navigation-actions';
import { callLegacyWindowFunction } from './legacy-call';

export function openNutritionSettings() {
  navigateToPage('settings');
}

export function openNutritionLogin() {
  callLegacyWindowFunction('openNutritionLogin');
}

export function clearNutritionHistory() {
  callLegacyWindowFunction('clearNutritionHistory');
}

export function retryLastNutritionMessage() {
  callLegacyWindowFunction('retryLastNutritionMessage');
}

export function selectNutritionAction(actionId: string) {
  callLegacyWindowFunction('setSelectedNutritionAction', actionId);
}

export function submitNutritionTextMessage(
  text: string,
  isCorrection = false
) {
  callLegacyWindowFunction('submitNutritionTextMessage', text, isCorrection);
}

export function handleNutritionPhoto(event: Event) {
  callLegacyWindowFunction('handleNutritionPhoto', event);
}
