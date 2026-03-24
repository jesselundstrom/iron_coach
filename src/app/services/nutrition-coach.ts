import { navigateToPage } from './navigation-actions';

export function openNutritionSettings() {
  navigateToPage('settings');
}

export function clearNutritionHistory() {
  window.clearNutritionHistory?.();
}

export function retryLastNutritionMessage() {
  window.retryLastNutritionMessage?.();
}

export function selectNutritionAction(actionId: string) {
  window.setSelectedNutritionAction?.(actionId);
}

export function submitNutritionTextMessage(
  text: string,
  isCorrection = false
) {
  const submit = window.submitNutritionTextMessage as
    | ((value: string, correction?: boolean) => void)
    | undefined;
  submit?.(text, isCorrection);
}

export function handleNutritionPhoto(event: Event) {
  window.handleNutritionPhoto?.(event);
}
