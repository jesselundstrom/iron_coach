export type ExerciseLibraryEntry = Record<string, unknown> & {
  id?: string;
  name?: string;
  aliases?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  displayMuscleGroups?: string[];
  movementTags?: string[];
  equipmentTags?: string[];
};

export type ExerciseGuidance = Record<string, unknown>;

type ExerciseLibraryApi = {
  resolveExerciseId?: (input: unknown) => string | null;
  getExercise?: (input: unknown) => ExerciseLibraryEntry | null;
  getExerciseMeta?: (
    input: unknown,
    locale?: string
  ) => ExerciseLibraryEntry | null;
  getDisplayName?: (input: unknown, locale?: string) => string;
  getExerciseGuidance?: (
    input: unknown,
    locale?: string
  ) => ExerciseGuidance | null;
  mapMuscleToDisplayGroup?: (muscle: unknown) => string | null;
  listExercises?: (options?: Record<string, unknown>) => ExerciseLibraryEntry[];
  searchExercises?: (
    query?: string,
    filters?: Record<string, unknown>
  ) => ExerciseLibraryEntry[];
  getRelatedExercises?: (
    exerciseId: string,
    options?: Record<string, unknown>
  ) => ExerciseLibraryEntry[];
};

type ExerciseLibraryWindow = Window & {
  EXERCISE_LIBRARY?: ExerciseLibraryApi | null;
  getExerciseLibrary?: () => ExerciseLibraryApi | null;
  hasExerciseLibrary?: () => boolean;
  resolveRegisteredExerciseId?: (input: unknown) => string | null;
  getRegisteredExercise?: (input: unknown) => ExerciseLibraryEntry | null;
  getExerciseMetadata?: (
    input: unknown,
    locale?: string
  ) => ExerciseLibraryEntry | null;
  getExerciseDisplayName?: (input: unknown, locale?: string) => string;
  getExerciseGuidanceFor?: (
    input: unknown,
    locale?: string
  ) => ExerciseGuidance | null;
  mapExerciseMuscleToDisplayGroup?: (muscle: unknown) => string | null;
  listRegisteredExercises?: (
    options?: Record<string, unknown>
  ) => ExerciseLibraryEntry[];
  searchRegisteredExercises?: (
    query?: string,
    filters?: Record<string, unknown>
  ) => ExerciseLibraryEntry[];
  getRelatedRegisteredExercises?: (
    exerciseId: string,
    options?: Record<string, unknown>
  ) => ExerciseLibraryEntry[];
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getExerciseLibraryWindow(): ExerciseLibraryWindow | null {
  if (typeof window === 'undefined') return null;
  return window as ExerciseLibraryWindow;
}

function getLegacyExerciseLibrary(): ExerciseLibraryApi | null {
  const runtimeWindow = getExerciseLibraryWindow();
  return (
    runtimeWindow?.getExerciseLibrary?.() || runtimeWindow?.EXERCISE_LIBRARY || null
  );
}

export function hasExerciseLibrary() {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.hasExerciseLibrary === 'function') {
    return runtimeWindow.hasExerciseLibrary() === true;
  }
  return !!getLegacyExerciseLibrary();
}

export function resolveExerciseId(input: unknown) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.resolveRegisteredExerciseId === 'function') {
    return runtimeWindow.resolveRegisteredExerciseId(input) || null;
  }
  const library = getLegacyExerciseLibrary();
  return library?.resolveExerciseId?.(input) || null;
}

export function getExercise(input: unknown) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.getRegisteredExercise === 'function') {
    return cloneJson(runtimeWindow.getRegisteredExercise(input) || null);
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.getExercise?.(input) || null);
}

export function getExerciseMeta(input: unknown, locale?: string) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.getExerciseMetadata === 'function') {
    return cloneJson(runtimeWindow.getExerciseMetadata(input, locale) || null);
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.getExerciseMeta?.(input, locale) || null);
}

export function getDisplayName(input: unknown, locale?: string) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.getExerciseDisplayName === 'function') {
    return runtimeWindow.getExerciseDisplayName(input, locale) || '';
  }
  const library = getLegacyExerciseLibrary();
  if (typeof library?.getDisplayName === 'function') {
    return library.getDisplayName(input, locale) || '';
  }
  if (typeof input === 'object' && input && 'name' in input) {
    return String((input as { name?: unknown }).name || '');
  }
  return String(input || '');
}

export function getExerciseGuidance(input: unknown, locale?: string) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.getExerciseGuidanceFor === 'function') {
    return cloneJson(runtimeWindow.getExerciseGuidanceFor(input, locale) || null);
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.getExerciseGuidance?.(input, locale) || null);
}

export function mapMuscleToDisplayGroup(muscle: unknown) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.mapExerciseMuscleToDisplayGroup === 'function') {
    return runtimeWindow.mapExerciseMuscleToDisplayGroup(muscle) || null;
  }
  const library = getLegacyExerciseLibrary();
  return library?.mapMuscleToDisplayGroup?.(muscle) || null;
}

export function listExercises(options?: Record<string, unknown>) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.listRegisteredExercises === 'function') {
    return cloneJson(runtimeWindow.listRegisteredExercises(options) || []);
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.listExercises?.(options) || []);
}

export function searchExercises(
  query?: string,
  filters?: Record<string, unknown>
) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.searchRegisteredExercises === 'function') {
    return cloneJson(runtimeWindow.searchRegisteredExercises(query, filters) || []);
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.searchExercises?.(query, filters) || []);
}

export function getRelatedExercises(
  exerciseId: string,
  options?: Record<string, unknown>
) {
  const runtimeWindow = getExerciseLibraryWindow();
  if (typeof runtimeWindow?.getRelatedRegisteredExercises === 'function') {
    return cloneJson(
      runtimeWindow.getRelatedRegisteredExercises(exerciseId, options) || []
    );
  }
  const library = getLegacyExerciseLibrary();
  return cloneJson(library?.getRelatedExercises?.(exerciseId, options) || []);
}
