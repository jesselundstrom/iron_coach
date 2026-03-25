import { getDisplayName } from '../domain/exercise-library';
import type { ProgramSessionBuildContext } from '../domain/program-plugin';
import type {
  SessionOption,
  SportSchedule,
  WorkoutExercise,
  WorkoutRecord,
} from '../domain/types';
import { createLegacyProgramAdapter } from './legacy-program';

type ForgeMode = 'sets' | 'rtf' | 'rir';
type AuxCategory = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'back';
type ForgeLift = { name: string; tm: number; isAux?: boolean };
type ForgeState = {
  week: number;
  daysPerWeek: number;
  mode: ForgeMode;
  rounding: number;
  skipPeakBlock: boolean;
  weekStartDate: string;
  backExercise: string;
  backWeight: number;
  lifts: { main: ForgeLift[]; aux: ForgeLift[] };
};

type ForgeWindow = Window & {
  I18N?: {
    t?: (
      key: string,
      params?: Record<string, unknown> | null,
      fallback?: string
    ) => string;
  };
  getProgramTrainingDaysPerWeek?: (programId?: string | null) => number;
  getWeekStart?: (date?: Date) => Date;
  resolveProgramExerciseName?: (input: unknown) => string;
  createTrainingCommentaryEvent?: (
    code: string,
    params?: Record<string, unknown>
  ) => Record<string, unknown> | null;
};

const MS_PER_DAY = 864e5;
const LEG_LIFTS = [
  'squat', 'front squat', 'paused squat', 'high bar squat', 'beltless squat',
  'wider stance squat', 'narrower stance squat', 'box squat', 'pin squat',
  'half squat', 'good morning', 'squat with slow eccentric', 'leg press',
  'deadlift', 'sumo deadlift', 'conventional deadlift', 'block pull', 'rack pull',
  'deficit deadlift', 'romanian deadlift', 'stiff leg deadlift',
  'snatch grip deadlift', 'trap bar deadlift',
];
const MAIN_SLOT_CONFIG = [
  { base: 'Squat', category: 'squat' },
  { base: 'Bench Press', category: 'bench' },
  { base: 'Deadlift', category: 'deadlift' },
  { base: 'OHP', category: 'ohp' },
] as const;
const INTERNAL = {
  mainIntensity: [0, 0.7, 0.75, 0.8, 0.725, 0.775, 0.825, 0.6, 0.75, 0.8, 0.85, 0.775, 0.825, 0.875, 0.6, 0.8, 0.85, 0.9, 0.85, 0.9, 0.95, 0.6],
  auxIntensity: [0, 0.6, 0.65, 0.7, 0.625, 0.675, 0.725, 0.5, 0.65, 0.7, 0.75, 0.675, 0.725, 0.775, 0.5, 0.7, 0.75, 0.8, 0.75, 0.8, 0.85, 0.5],
  deloadWeeks: [7, 14, 21],
  blockNames: ['', 'Hypertrophy', 'Hypertrophy', 'Hypertrophy', 'Hypertrophy', 'Hypertrophy', 'Hypertrophy', 'Deload', 'Strength', 'Strength', 'Strength', 'Strength', 'Strength', 'Strength', 'Deload', 'Peaking', 'Peaking', 'Peaking', 'Peaking', 'Peaking', 'Peaking', 'Deload'],
  setLow: 4,
  setHigh: 6,
  tmUp: 0.02,
  tmDown: -0.05,
  auxOptions: {
    squat: ['Front Squat', 'Paused Squat', 'High Bar Squat', 'Beltless Squat', 'Wider Stance Squat', 'Narrower Stance Squat', 'Box Squat', 'Pin Squat', 'Half Squat', 'Good Morning', 'Squat With Slow Eccentric', 'Leg Press'],
    bench: ['Close-Grip Bench', 'Long Pause Bench', 'Spoto Press', 'Incline Press', 'Wider Grip Bench', 'Board Press', 'Pin Press', 'Slingshot Bench', 'Bench With Feet Up', 'Bench With Slow Eccentric', 'DB Bench'],
    deadlift: ['Sumo Deadlift', 'Conventional Deadlift', 'Block Pull', 'Rack Pull', 'Deficit Deadlift', 'Romanian Deadlift', 'Stiff Leg Deadlift', 'Snatch Grip Deadlift', 'Trap Bar Deadlift'],
    ohp: ['Push Press', 'Behind The Neck OHP', 'Seated OHP', 'Incline Press', 'DB OHP'],
    back: ['Barbell Rows', 'DB Rows', 'Chest Supported Rows', 'T-Bar Rows', 'Pull-ups', 'Chin-ups', 'Neutral Grip Pull-ups', 'Pull-downs'],
  },
  getReps(pct: number) {
    if (pct <= 0.575) return 8;
    if (pct <= 0.625) return 7;
    if (pct <= 0.675) return 6;
    if (pct <= 0.725) return 5;
    if (pct <= 0.775) return 4;
    if (pct <= 0.825) return 3;
    if (pct <= 0.875) return 2;
    return 1;
  },
  getRIR(pct: number) {
    if (pct <= 0.575) return 5;
    if (pct <= 0.675) return 4;
    if (pct <= 0.775) return 3;
    if (pct <= 0.875) return 2;
    if (pct <= 0.925) return 1;
    return 0;
  },
  getAuxCategory(slotIdx: number): AuxCategory {
    return (
      ['squat', 'squat', 'bench', 'bench', 'deadlift', 'ohp'][slotIdx] || 'squat'
    ) as AuxCategory;
  },
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getForgeWindow(): ForgeWindow | null {
  if (typeof window === 'undefined') return null;
  return window as ForgeWindow;
}

function trForge(key: string, fallback: string, params?: Record<string, unknown>) {
  return getForgeWindow()?.I18N?.t?.(key, params, fallback) || fallback;
}

function getForgeDaysPerWeek() {
  return Number(getForgeWindow()?.getProgramTrainingDaysPerWeek?.('forge')) || 3;
}

function normalizeForgeWeek(rawWeek: unknown, skipPeakBlock: boolean) {
  const week = parseInt(String(rawWeek || ''), 10);
  const maxWeek = skipPeakBlock ? 14 : 21;
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(maxWeek, week);
}

function getForgeNextWeek(rawWeek: unknown, skipPeakBlock: boolean) {
  const week = normalizeForgeWeek(rawWeek, skipPeakBlock);
  const next = week + 1;
  if (skipPeakBlock && next >= 15) return 1;
  return Math.min(21, next);
}

function getForgeCatchUpWeek(rawWeek: unknown, elapsedWeeks: unknown, skipPeakBlock: boolean) {
  let week = normalizeForgeWeek(rawWeek, skipPeakBlock);
  const elapsed = Math.max(0, parseInt(String(elapsedWeeks || ''), 10) || 0);
  for (let index = 0; index < elapsed; index += 1) {
    const next = getForgeNextWeek(week, skipPeakBlock);
    if (next === week) break;
    week = next;
    if (INTERNAL.deloadWeeks.includes(week)) break;
  }
  return week;
}

function resolveProgramExerciseName(input: unknown) {
  return String(getForgeWindow()?.resolveProgramExerciseName?.(input) || input || '').trim();
}

function getWeekStart(date: Date) {
  return getForgeWindow()?.getWeekStart?.(date) || date;
}

function roundTm(value: number) {
  return Math.round(value * 100) / 100;
}

function getForgeSwapFilters(category: string) {
  const filtersByCategory: Record<string, Record<string, unknown>> = {
    squat: { movementTags: ['squat'], equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'], muscleGroups: ['quads', 'glutes'] },
    bench: { movementTags: ['horizontal_press'], equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'], muscleGroups: ['chest', 'triceps', 'shoulders'] },
    deadlift: { movementTags: ['hinge'], equipmentTags: ['barbell', 'trap_bar', 'dumbbell', 'machine', 'bodyweight'], muscleGroups: ['hamstrings', 'glutes', 'back'] },
    ohp: { movementTags: ['vertical_press'], equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'], muscleGroups: ['shoulders', 'triceps'] },
    back: { movementTags: ['horizontal_pull', 'vertical_pull'], equipmentTags: ['barbell', 'dumbbell', 'cable', 'machine', 'pullup_bar', 'bodyweight'], muscleGroups: ['back', 'biceps'] },
  };
  return filtersByCategory[category] || {};
}

function createInitialState(): ForgeState {
  return {
    week: 1,
    daysPerWeek: 3,
    mode: 'sets',
    rounding: 2.5,
    skipPeakBlock: false,
    weekStartDate: new Date().toISOString(),
    backExercise: 'Barbell Rows',
    backWeight: 0,
    lifts: {
      main: [{ name: 'Squat', tm: 100 }, { name: 'Bench Press', tm: 80 }, { name: 'Deadlift', tm: 120 }, { name: 'OHP', tm: 50 }],
      aux: [{ name: 'Front Squat', tm: 80 }, { name: 'Paused Squat', tm: 90 }, { name: 'Close-Grip Bench', tm: 70 }, { name: 'Spoto Press', tm: 75 }, { name: 'Stiff Leg Deadlift', tm: 100 }, { name: 'Push Press', tm: 50 }],
    },
  };
}

function getPrescription(tm: number, week: number, isAux: boolean, rounding: number, mode: ForgeMode) {
  const pct = isAux ? INTERNAL.auxIntensity[week] : INTERNAL.mainIntensity[week];
  const weight = Math.round((tm * pct) / (rounding || 2.5)) * (rounding || 2.5);
  const reps = INTERNAL.getReps(pct || 0.7);
  const rir = INTERNAL.getRIR(pct || 0.7);
  const isDeload = INTERNAL.deloadWeeks.includes(week);
  return { weight, reps, rir, isDeload, normalSets: 4, fixedSets: 5, repOutTarget: reps * 2 };
}

function getDayExercises(day: number, freq: number, lifts: ForgeState['lifts']) {
  const main = lifts.main || [];
  const aux = lifts.aux || [];
  const result: ForgeLift[] = [];
  const splits: Record<number, Array<Array<['m' | 'a', number]>>> = {
    2: [[['m', 0], ['m', 1], ['a', 4], ['a', 5]], [['m', 2], ['m', 3], ['a', 0], ['a', 2]]],
    3: [[['m', 0], ['a', 4], ['a', 3]], [['m', 1], ['m', 3], ['a', 0]], [['m', 2], ['a', 2], ['a', 1], ['a', 5]]],
    4: [[['m', 0], ['a', 3], ['a', 4]], [['m', 1], ['a', 0], ['a', 5]], [['m', 2], ['a', 2]], [['m', 3], ['a', 1]]],
    5: [[['m', 0], ['a', 5]], [['m', 1], ['a', 0]], [['m', 2], ['a', 2]], [['m', 3], ['a', 1]], [['a', 3], ['a', 4]]],
    6: [[['m', 0], ['a', 2]], [['a', 5], ['a', 4]], [['m', 1], ['a', 0]], [['a', 3], ['a', 1]], [['m', 2]], [['m', 3]]],
  };
  const layout = splits[freq]?.[day - 1] || splits[3][0];
  layout?.forEach(([kind, idx]) => {
    const source = kind === 'm' ? main : aux;
    if (source[idx]) result.push({ ...source[idx], isAux: kind === 'a' });
  });
  return result;
}

function migrateForgeState(rawState: Record<string, unknown> | null | undefined): ForgeState {
  if (!rawState || typeof rawState !== 'object') return createInitialState();
  const initial = createInitialState();
  const state = cloneJson(rawState) as Partial<ForgeState>;
  const skipPeakBlock = state.skipPeakBlock === true;
  return {
    week: normalizeForgeWeek(state.week, skipPeakBlock),
    daysPerWeek: getForgeDaysPerWeek(),
    mode: state.mode === 'rtf' || state.mode === 'rir' ? state.mode : 'sets',
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : 2.5,
    skipPeakBlock,
    weekStartDate: String(state.weekStartDate || new Date().toISOString()),
    backExercise: resolveProgramExerciseName(state.backExercise || initial.backExercise),
    backWeight: Number.isFinite(Number(state.backWeight)) ? Number(state.backWeight) : 0,
    lifts: {
      main: (Array.isArray(state.lifts?.main) ? state.lifts?.main : initial.lifts.main).map((lift, idx) => ({ name: resolveProgramExerciseName(lift?.name || initial.lifts.main[idx].name), tm: Number.isFinite(Number(lift?.tm)) ? Number(lift?.tm) : initial.lifts.main[idx].tm })),
      aux: (Array.isArray(state.lifts?.aux) ? state.lifts?.aux : initial.lifts.aux).map((lift, idx) => ({ name: resolveProgramExerciseName(lift?.name || initial.lifts.aux[idx].name), tm: Number.isFinite(Number(lift?.tm)) ? Number(lift?.tm) : initial.lifts.aux[idx].tm })),
    },
  };
}

export const forgeProgram = createLegacyProgramAdapter(
  {
    id: 'forge',
    name: 'Forge Protocol',
    description: '21-week strength cycle: hypertrophy, strength, and peaking.',
    icon: '⚒️',
    legLifts: LEG_LIFTS,
  },
  {
    getInitialState: () => createInitialState(),
    migrateState: (state: Record<string, unknown>) => migrateForgeState(state),
    getSessionOptions: (
      rawState: ForgeState,
      workouts: WorkoutRecord[],
      schedule: SportSchedule
    ): SessionOption[] => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const freq = getForgeDaysPerWeek();
      const week = state.week || 1;
      const todayDow = new Date().getDay();
      const sportDays = Array.isArray(schedule?.sportDays) ? schedule.sportDays : [];
      const legsHeavy = schedule?.sportLegsHeavy !== false;
      const recentHours =
        ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
          String(schedule?.sportIntensity || 'hard')
        ] || 30;
      const sportLegs =
        legsHeavy &&
        (sportDays.includes(todayDow) ||
          (workouts || []).some(
            (workout: WorkoutRecord) =>
              (workout?.type === 'sport' || workout?.type === 'hockey') &&
              (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
          ));
      const doneThisWeek = (workouts || [])
        .filter(
          (workout: WorkoutRecord) =>
            (workout.program === 'forge' || (!workout.program && workout.type === 'forge')) &&
            new Date(workout.date) >= getWeekStart(new Date())
        )
        .map((workout: WorkoutRecord) => workout.programDayNum);
      let bestDay = 1;
      let bestScore = -999;
      const scoredDays = [];
      for (let day = 1; day <= freq; day += 1) {
        const exercises = getDayExercises(day, freq, state.lifts);
        const hasLegs = exercises.some((exercise) =>
          LEG_LIFTS.includes(String(exercise.name || '').toLowerCase())
        );
        const done = doneThisWeek.includes(day);
        let score = 0;
        if (done) score -= 100;
        if (sportLegs && hasLegs) score -= 30;
        if (!done) score += 10;
        if (!hasLegs && sportLegs) score += 15;
        scoredDays.push({ day, hasLegs, done });
        if (score > bestScore) {
          bestScore = score;
          bestDay = day;
        }
      }
      return scoredDays.map(({ day, hasLegs, done }) => ({
        value: String(day),
        label: trForge('program.forge.day_label', 'Day {day}: {label}', {
          day,
          label: getDayExercises(day, freq, state.lifts)
            .map((exercise) => getDisplayName(exercise.name))
            .join(' + '),
        }),
        isRecommended: day === bestDay,
        done,
        hasLegs,
        sportLegs,
      }));
    },
    buildSession: (
      selectedOption: string,
      rawState: ForgeState,
      context?: ProgramSessionBuildContext
    ): WorkoutExercise[] => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const dayNum = parseInt(String(selectedOption || '1'), 10) || 1;
      const week = state.week || 1;
      const freq = getForgeDaysPerWeek();
      const mode = state.mode || 'sets';
      const effectiveSessionMode =
        context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
      const programDeload = INTERNAL.deloadWeeks.includes(week);
      const prescriptionWeek =
        effectiveSessionMode === 'normal' && programDeload ? Math.max(1, week - 1) : week;
      const isDeload = effectiveSessionMode === 'light' && programDeload;
      return [
        ...getDayExercises(dayNum, freq, state.lifts).map((exercise) => {
          const prescription = getPrescription(
            exercise.tm,
            prescriptionWeek,
            exercise.isAux === true,
            state.rounding || 2.5,
            mode
          );
          const auxSlotIdx =
            exercise.isAux === true
              ? state.lifts.aux.findIndex((lift) => lift.name === exercise.name)
              : -1;
          const extraSet = context?.energyBoost === true && !exercise.isAux && !isDeload ? 1 : 0;
          const setCount =
            mode === 'rtf' && !isDeload
              ? prescription.normalSets + extraSet + 1
              : mode === 'rir' && !isDeload
                ? prescription.fixedSets + extraSet
                : (isDeload ? 5 : INTERNAL.setHigh) + extraSet;
          const sets = Array.from({ length: setCount }, (_, index) => ({
            weight: prescription.weight,
            reps:
              mode === 'rtf' && !isDeload && index === setCount - 1
                ? 'AMRAP'
                : prescription.reps,
            done: false,
            rpe: null,
            isAmrap: mode === 'rtf' && !isDeload && index === setCount - 1,
            repOutTarget:
              mode === 'rtf' && !isDeload && index === setCount - 1
                ? prescription.repOutTarget
                : 0,
          }));
          return {
            id: Date.now() + Math.random(),
            name: exercise.name,
            note: trForge('program.forge.note.default', '{weight}kg x {reps}', {
              weight: prescription.weight,
              reps: prescription.reps,
            }),
            isAux: exercise.isAux === true,
            tm: exercise.tm,
            auxSlotIdx,
            prescribedWeight: prescription.weight,
            prescribedReps: prescription.reps,
            rirCutoff: INTERNAL.getRIR(
              exercise.isAux === true
                ? INTERNAL.auxIntensity[prescriptionWeek]
                : INTERNAL.mainIntensity[prescriptionWeek]
            ),
            isDeload,
            repOutTarget: prescription.repOutTarget,
            sets,
          };
        }),
        {
          id: Date.now() + Math.random(),
          name: state.backExercise || 'Barbell Rows',
          note: trForge('program.forge.back.note_weight', '{weight}kg x 3 sets of 8-10', {
            weight: state.backWeight || 0,
          }),
          isAccessory: true,
          sets: Array.from({ length: 3 }, () => ({
            weight: state.backWeight || '',
            reps: 8,
            done: false,
            rpe: null,
          })),
        },
      ];
    },
    getBlockInfo: (rawState: ForgeState) => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const week = state.week || 1;
      return {
        name: trForge(
          `program.forge.block.${String(INTERNAL.blockNames[week] || '').toLowerCase()}`,
          INTERNAL.blockNames[week] || ''
        ),
        weekLabel: trForge('program.forge.week_label', 'Week {week}', { week }),
        pct: Math.round((INTERNAL.mainIntensity[week] || 0) * 100),
        isDeload: INTERNAL.deloadWeeks.includes(week),
        totalWeeks: state.skipPeakBlock ? 14 : 21,
        mode: state.mode || 'sets',
      };
    },
    adjustAfterSession: (
      exercises: WorkoutExercise[],
      rawState: ForgeState
    ): ForgeState => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const week = normalizeForgeWeek(state.week, state.skipPeakBlock);
      if (INTERNAL.deloadWeeks.includes(week)) return state;
      (exercises || []).forEach((exercise: WorkoutExercise) => {
        if (exercise.isAccessory) return;
        const lift = [...state.lifts.main, ...state.lifts.aux].find(
          (item) => item.name === exercise.name
        );
        if (!lift) return;
        const doneSets = (exercise.sets || []).filter((set: WorkoutExercise['sets'][number]) => set.done).length;
        if (state.mode === 'rtf') {
          const amrapSet = (exercise.sets || []).find(
            (set: WorkoutExercise['sets'][number]) => set.isAmrap && set.done
          );
          const reps = parseInt(String(amrapSet?.reps || ''), 10);
          const target = Number(exercise.repOutTarget) || 10;
          if (Number.isFinite(reps) && reps >= target + 3) lift.tm = roundTm(lift.tm * 1.04);
          else if (Number.isFinite(reps) && reps >= target) lift.tm = roundTm(lift.tm * 1.02);
          else if (Number.isFinite(reps) && reps < target - 2) lift.tm = roundTm(lift.tm * 0.95);
          return;
        }
        if (state.mode === 'rir') {
          const lastDoneSet = (exercise.sets || [])
            .filter((set: WorkoutExercise['sets'][number]) => set.done)
            .pop();
          const rir = parseInt(String(lastDoneSet?.rir || ''), 10);
          if (doneSets < 5) lift.tm = roundTm(lift.tm * 0.95);
          else if (Number.isFinite(rir) && rir <= 0) lift.tm = roundTm(lift.tm * 0.97);
          else if (Number.isFinite(rir) && rir <= 2) lift.tm = roundTm(lift.tm * 1.01);
          else if (Number.isFinite(rir) && rir > 2) lift.tm = roundTm(lift.tm * 1.02);
          return;
        }
        if (doneSets < INTERNAL.setLow) lift.tm = roundTm(lift.tm * (1 + INTERNAL.tmDown));
        else if (doneSets > INTERNAL.setHigh) lift.tm = roundTm(lift.tm * (1 + INTERNAL.tmUp));
      });
      return state;
    },
    advanceState: (rawState: ForgeState, sessionsThisWeek?: number): ForgeState => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      if ((sessionsThisWeek || 0) >= getForgeDaysPerWeek()) {
        return {
          ...state,
          week: getForgeNextWeek(state.week, state.skipPeakBlock),
          weekStartDate: new Date().toISOString(),
        };
      }
      return state;
    },
    dateCatchUp: (rawState: ForgeState): ForgeState => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const daysSince =
        (Date.now() - new Date(state.weekStartDate || Date.now()).getTime()) / MS_PER_DAY;
      if (daysSince < 7 || state.week >= 21) return state;
      const nextWeek = getForgeCatchUpWeek(
        state.week,
        Math.floor(daysSince / 7),
        state.skipPeakBlock
      );
      return nextWeek === state.week
        ? state
        : { ...state, week: nextWeek, weekStartDate: new Date().toISOString() };
    },
    getProgramConstraints: (rawState: ForgeState) => {
      const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
      const overrides: Record<string, Record<string, unknown>> = {};
      (state.lifts.main || []).forEach((lift, idx) => {
        const config = MAIN_SLOT_CONFIG[idx] || MAIN_SLOT_CONFIG[0];
        overrides[String(lift.name || '').trim().toLowerCase()] = {
          filters: getForgeSwapFilters(config.category),
          options: [
            config.base,
            ...(INTERNAL.auxOptions[config.category as AuxCategory] || []),
          ],
          clearWeightOnSwap: true,
        };
      });
      (state.lifts.aux || []).forEach((lift, idx) => {
        const category = INTERNAL.getAuxCategory(idx);
        overrides[String(lift.name || '').trim().toLowerCase()] = {
          filters: getForgeSwapFilters(category),
          options: INTERNAL.auxOptions[category] || [],
          clearWeightOnSwap: true,
        };
      });
      overrides[String(state.backExercise || 'Barbell Rows').trim().toLowerCase()] = {
        filters: getForgeSwapFilters('back'),
        options: INTERNAL.auxOptions.back || [],
        clearWeightOnSwap: true,
      };
      return { exerciseOverrides: overrides };
    },
    adaptSession: (
      baseSession: WorkoutExercise[],
      planningContext?: Record<string, unknown>
    ) => ({
      exercises: cloneJson(baseSession || []),
      adaptationEvents: [],
      equipmentHint:
        planningContext?.equipmentAccess === 'home_gym' ||
        planningContext?.equipmentAccess === 'minimal'
          ? getForgeWindow()?.createTrainingCommentaryEvent?.('same_pattern_swaps', {
              programId: 'forge',
              programName: 'Forge',
            }) || null
          : null,
    }),
    getDashboardTMs: (rawState: ForgeState) =>
      migrateForgeState(cloneJson(rawState) as Record<string, unknown>).lifts.main.map((lift) => ({
        name: lift.name,
        value: `${lift.tm}kg`,
      })),
  } as Partial<Record<string, unknown>>
);
