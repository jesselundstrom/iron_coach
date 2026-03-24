function getWindowExerciseLibrary() {
  if (typeof window === 'undefined') return null;
  if (typeof window.getExerciseLibrary === 'function') {
    return window.getExerciseLibrary() || null;
  }
  return window.EXERCISE_LIBRARY || null;
}

export function hasExerciseLibrary() {
  if (typeof window !== 'undefined' && typeof window.hasExerciseLibrary === 'function') {
    return window.hasExerciseLibrary() === true;
  }
  return !!getWindowExerciseLibrary();
}

export function resolveExerciseId(input) {
  if (
    typeof window !== 'undefined' &&
    typeof window.resolveRegisteredExerciseId === 'function'
  ) {
    return window.resolveRegisteredExerciseId(input) || null;
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.resolveExerciseId !== 'function') return null;
  return library.resolveExerciseId(input) || null;
}

export function getExercise(input) {
  if (
    typeof window !== 'undefined' &&
    typeof window.getRegisteredExercise === 'function'
  ) {
    return window.getRegisteredExercise(input) || null;
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.getExercise !== 'function') return null;
  return library.getExercise(input) || null;
}

export function getExerciseMeta(input, locale) {
  if (
    typeof window !== 'undefined' &&
    typeof window.getExerciseMetadata === 'function'
  ) {
    return window.getExerciseMetadata(input, locale) || null;
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.getExerciseMeta !== 'function') return null;
  return library.getExerciseMeta(input, locale) || null;
}

export function getDisplayName(input, locale) {
  if (
    typeof window !== 'undefined' &&
    typeof window.getExerciseDisplayName === 'function'
  ) {
    return window.getExerciseDisplayName(input, locale) || '';
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.getDisplayName !== 'function') {
    return String(typeof input === 'object' ? input?.name || '' : input || '');
  }
  return library.getDisplayName(input, locale) || '';
}

export function getExerciseGuidance(input, locale) {
  if (
    typeof window !== 'undefined' &&
    typeof window.getExerciseGuidanceFor === 'function'
  ) {
    return window.getExerciseGuidanceFor(input, locale) || null;
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.getExerciseGuidance !== 'function') return null;
  return library.getExerciseGuidance(input, locale) || null;
}

export function mapMuscleToDisplayGroup(muscle) {
  if (
    typeof window !== 'undefined' &&
    typeof window.mapExerciseMuscleToDisplayGroup === 'function'
  ) {
    return window.mapExerciseMuscleToDisplayGroup(muscle) || null;
  }
  const library = getWindowExerciseLibrary();
  if (!library || typeof library.mapMuscleToDisplayGroup !== 'function') return null;
  return library.mapMuscleToDisplayGroup(muscle) || null;
}
