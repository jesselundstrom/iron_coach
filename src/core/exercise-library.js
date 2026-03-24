import {
  getDisplayName as getExerciseDisplayName,
  getExercise as getLegacyExercise,
  getExerciseGuidance as getLegacyExerciseGuidance,
  getExerciseMeta as getLegacyExerciseMeta,
  getRelatedExercises as getLegacyRelatedExercises,
  hasExerciseLibrary as hasLegacyExerciseLibrary,
  listExercises as listLegacyExercises,
  mapMuscleToDisplayGroup as mapLegacyMuscleToDisplayGroup,
  resolveExerciseId as resolveLegacyExerciseId,
  searchExercises as searchLegacyExercises,
} from '../domain/exercise-library.ts';

export function hasExerciseLibrary() {
  return hasLegacyExerciseLibrary();
}

export function resolveExerciseId(input) {
  return resolveLegacyExerciseId(input);
}

export function getExercise(input) {
  return getLegacyExercise(input);
}

export function getExerciseMeta(input, locale) {
  return getLegacyExerciseMeta(input, locale);
}

export function getDisplayName(input, locale) {
  return getExerciseDisplayName(input, locale);
}

export function getExerciseGuidance(input, locale) {
  return getLegacyExerciseGuidance(input, locale);
}

export function mapMuscleToDisplayGroup(muscle) {
  return mapLegacyMuscleToDisplayGroup(muscle);
}

export function listExercises(options) {
  return listLegacyExercises(options);
}

export function searchExercises(query, filters) {
  return searchLegacyExercises(query, filters);
}

export function getRelatedExercises(exerciseId, options) {
  return getLegacyRelatedExercises(exerciseId, options);
}
