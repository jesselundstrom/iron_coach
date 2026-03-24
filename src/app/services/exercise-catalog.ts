export function setExerciseCatalogSearch(value: string) {
  window.setExerciseCatalogSearch?.(value);
}

export function setExerciseCatalogFilter(group: string, value: string) {
  window.setExerciseCatalogFilter?.(group, value);
}

export function clearExerciseCatalogFilters() {
  window.clearExerciseCatalogFilters?.();
}

export function closeExerciseCatalog() {
  window.closeNameModal?.();
}

export function selectExerciseCatalogExercise(exerciseId: string) {
  window.selectExerciseCatalogExercise?.(exerciseId);
}
