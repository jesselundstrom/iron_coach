import type {
  ActiveWorkout,
  ExerciseSet,
  PlanningDecision,
  WorkoutCommentary,
  WorkoutExercise,
  WorkoutStartSnapshot,
} from './types';

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeExerciseSet(rawSet: unknown): ExerciseSet {
  const set =
    rawSet && typeof rawSet === 'object'
      ? (rawSet as Record<string, unknown>)
      : {};
  return {
    weight:
      typeof set.weight === 'number' || typeof set.weight === 'string'
        ? (set.weight as number | string)
        : '',
    reps:
      typeof set.reps === 'number' || typeof set.reps === 'string'
        ? (set.reps as number | string)
        : '',
    done: set.done === true,
    isWarmup: set.isWarmup === true,
    rpe: Number.isFinite(Number(set.rpe)) ? Number(set.rpe) : null,
    rir:
      typeof set.rir === 'number' || typeof set.rir === 'string'
        ? (set.rir as number | string)
        : null,
    loggedReps: Number.isFinite(Number(set.loggedReps))
      ? Number(set.loggedReps)
      : null,
    notes: typeof set.notes === 'string' ? set.notes : undefined,
    isAmrap: set.isAmrap === true,
    repOutTarget: Number.isFinite(Number(set.repOutTarget))
      ? Number(set.repOutTarget)
      : undefined,
  };
}

function normalizeWorkoutExercise(rawExercise: unknown): WorkoutExercise {
  const exercise =
    rawExercise && typeof rawExercise === 'object'
      ? (rawExercise as Record<string, unknown>)
      : {};
  return {
    ...cloneJson(exercise),
    name: String(exercise.name || ''),
    exerciseId:
      exercise.exerciseId === null || exercise.exerciseId === undefined
        ? null
        : String(exercise.exerciseId),
    note: typeof exercise.note === 'string' ? exercise.note : undefined,
    notes: typeof exercise.notes === 'string' ? exercise.notes : undefined,
    sets: Array.isArray(exercise.sets)
      ? exercise.sets.map(normalizeExerciseSet)
      : [],
    isAux: exercise.isAux === true,
    isAccessory: exercise.isAccessory === true,
    auxSlotIdx: Number.isFinite(Number(exercise.auxSlotIdx))
      ? Number(exercise.auxSlotIdx)
      : undefined,
    tm: Number.isFinite(Number(exercise.tm)) ? Number(exercise.tm) : undefined,
    prescribedWeight: Number.isFinite(Number(exercise.prescribedWeight))
      ? Number(exercise.prescribedWeight)
      : undefined,
    prescribedReps:
      typeof exercise.prescribedReps === 'number' ||
      typeof exercise.prescribedReps === 'string'
        ? (exercise.prescribedReps as number | string)
        : undefined,
    rirCutoff: Number.isFinite(Number(exercise.rirCutoff))
      ? Number(exercise.rirCutoff)
      : null,
    isDeload: exercise.isDeload === true,
    repOutTarget: Number.isFinite(Number(exercise.repOutTarget))
      ? Number(exercise.repOutTarget)
      : undefined,
  };
}

function normalizePlanningDecision(
  rawDecision: unknown
): PlanningDecision | null {
  if (!rawDecision || typeof rawDecision !== 'object') return null;
  const decision = rawDecision as Record<string, unknown>;
  return {
    action: String(decision.action || ''),
    restrictionFlags: Array.isArray(decision.restrictionFlags)
      ? decision.restrictionFlags.map((flag) => String(flag || ''))
      : [],
    reasonCodes: Array.isArray(decision.reasonCodes)
      ? decision.reasonCodes.map((code) => String(code || ''))
      : [],
    decisionCode:
      typeof decision.decisionCode === 'string'
        ? decision.decisionCode
        : undefined,
  };
}

export function normalizeActiveWorkout(
  rawWorkout: unknown
): ActiveWorkout | null {
  if (!rawWorkout || typeof rawWorkout !== 'object') return null;
  const workout = rawWorkout as Record<string, unknown>;
  return {
    ...cloneJson(workout),
    id:
      typeof workout.id === 'number' || typeof workout.id === 'string'
        ? (workout.id as string | number)
        : '',
    date: String(workout.date || ''),
    program:
      workout.program === null || workout.program === undefined
        ? null
        : String(workout.program),
    type: String(workout.type || ''),
    subtype:
      workout.subtype === null || workout.subtype === undefined
        ? null
        : String(workout.subtype),
    programDayNum: Number.isFinite(Number(workout.programDayNum))
      ? Number(workout.programDayNum)
      : undefined,
    programLabel:
      typeof workout.programLabel === 'string'
        ? workout.programLabel
        : undefined,
    programOption:
      typeof workout.programOption === 'string'
        ? workout.programOption
        : undefined,
    programStateBefore:
      workout.programStateBefore &&
      typeof workout.programStateBefore === 'object'
        ? cloneJson(workout.programStateBefore as Record<string, unknown>)
        : null,
    planningDecision: normalizePlanningDecision(workout.planningDecision),
    notes: typeof workout.notes === 'string' ? workout.notes : undefined,
    exercises: Array.isArray(workout.exercises)
      ? workout.exercises.map(normalizeWorkoutExercise)
      : [],
    startTime: Number.isFinite(Number(workout.startTime))
      ? Number(workout.startTime)
      : undefined,
    startedAt:
      typeof workout.startedAt === 'number' || typeof workout.startedAt === 'string'
        ? (workout.startedAt as number | string)
        : undefined,
    sessionDescription:
      typeof workout.sessionDescription === 'string'
        ? workout.sessionDescription
        : undefined,
    sessionSnapshot: normalizeWorkoutStartSnapshot(workout.sessionSnapshot),
  };
}

export function normalizeWorkoutStartSnapshot(
  rawSnapshot: unknown
): WorkoutStartSnapshot | null {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null;
  const snapshot = rawSnapshot as Record<string, unknown>;
  return {
    ...cloneJson(snapshot),
    signature:
      typeof snapshot.signature === 'string' ? snapshot.signature : undefined,
    programId:
      snapshot.programId === null || snapshot.programId === undefined
        ? null
        : String(snapshot.programId),
    selectedOption:
      typeof snapshot.selectedOption === 'string'
        ? snapshot.selectedOption
        : '',
    buildContext:
      snapshot.buildContext && typeof snapshot.buildContext === 'object'
        ? cloneJson(snapshot.buildContext as Record<string, unknown>)
        : null,
    buildState:
      snapshot.buildState && typeof snapshot.buildState === 'object'
        ? cloneJson(snapshot.buildState as Record<string, unknown>)
        : null,
    exercises: Array.isArray(snapshot.exercises)
      ? snapshot.exercises.map(normalizeWorkoutExercise)
      : [],
    sessionDescription:
      typeof snapshot.sessionDescription === 'string'
        ? snapshot.sessionDescription
        : undefined,
    programLabel:
      typeof snapshot.programLabel === 'string'
        ? snapshot.programLabel
        : undefined,
    effectiveDecision: normalizePlanningDecision(snapshot.effectiveDecision),
    trainingDecision: normalizePlanningDecision(snapshot.trainingDecision),
    changes: Array.isArray(snapshot.changes)
      ? snapshot.changes
          .filter(
            (
              change
            ): change is Record<string, unknown> | string =>
              !!change &&
              (typeof change === 'object' || typeof change === 'string')
          )
          .map((change) =>
            typeof change === 'string' ? change : cloneJson(change)
          )
      : [],
    equipmentHint:
      typeof snapshot.equipmentHint === 'string'
        ? snapshot.equipmentHint
        : '',
    commentary:
      snapshot.commentary && typeof snapshot.commentary === 'object'
        ? (cloneJson(snapshot.commentary) as
            | WorkoutCommentary
            | Record<string, unknown>)
        : null,
  };
}
