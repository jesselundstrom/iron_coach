import { getDisplayName } from '../domain/exercise-library';
import type { ProgramSessionBuildContext } from '../domain/program-plugin';
import type { SessionOption, WorkoutExercise, WorkoutRecord } from '../domain/types';
import { createLegacyProgramAdapter } from './legacy-program';

type W531Season = 'off' | 'in';
type W531LiftCategory = 'legs' | 'upper';
type W531Lift = {
  name: string;
  tm: number;
  category: W531LiftCategory;
};
type W531State = {
  week: number;
  cycle: number;
  daysPerWeek: number;
  season: W531Season;
  rounding: number;
  testWeekPending: boolean;
  tmTestedThisCycle: boolean;
  stalledLifts: Record<string, boolean>;
  weekSessionIndex: number;
  lifts: { main: W531Lift[] };
  triumvirate: Record<number, [string, string]>;
  rpeLog?: Record<string, Array<Record<string, unknown>>>;
};

type W531Window = Window & {
  I18N?: {
    t?: (
      key: string,
      params?: Record<string, unknown> | null,
      fallback?: string
    ) => string;
  };
  getProgramTrainingDaysPerWeek?: (programId?: string | null) => number;
  getWeekStart?: (date?: Date) => Date;
  createTrainingCommentaryEvent?: (
    code: string,
    params?: Record<string, unknown>
  ) => Record<string, unknown> | null;
  EXERCISE_LIBRARY?: {
    getExerciseMeta?: (
      exerciseId?: string | null
    ) => { movementTags?: string[] } | null;
  };
};

const LEG_LIFTS = [
  'squat',
  'deadlift',
  'romanian deadlifts (rdl)',
  'romanian deadlift',
  'bulgarian split squats',
  'bulgarian split squat',
];

const INTERNAL = {
  weekScheme: {
    1: { pcts: [0.65, 0.75, 0.85], label: '5s Week', isDeload: false },
    2: { pcts: [0.7, 0.8, 0.9], label: '3s Week', isDeload: false },
    3: { pcts: [0.75, 0.85, 0.95], label: '1+ Week', isDeload: false },
    4: { pcts: [0.4, 0.5, 0.6], label: 'Deload', isDeload: true },
  } as Record<number, { pcts: number[]; label: string; isDeload: boolean }>,
  bbbPair: [2, 3, 0, 1],
  defaultTriumvirate: {
    0: ['Bulgarian Split Squats', 'Weighted Planks'],
    1: ['Dumbbell Rows', 'DB Incline Press'],
    2: ['Romanian Deadlifts (RDL)', 'Ab Wheel Rollouts'],
    3: ['Chin-ups', 'Dips'],
  } as Record<number, [string, string]>,
  triumvirateSwapOptions: {
    '0-0': {
      category: 'single-leg',
      filters: {
        movementTags: ['single_leg', 'squat'],
        equipmentTags: ['dumbbell', 'bodyweight', 'machine'],
        muscleGroups: ['quads', 'glutes'],
      },
      options: [
        'Bulgarian Split Squats',
        'Walking Lunges',
        'Reverse Lunges',
        'Step-Ups',
        'Leg Press',
      ],
    },
    '0-1': {
      category: 'core',
      filters: {
        movementTags: ['core'],
        equipmentTags: ['bodyweight', 'cable', 'band', 'pullup_bar'],
        muscleGroups: ['core'],
      },
      options: [
        'Weighted Planks',
        'Ab Wheel Rollouts',
        'Hanging Leg Raises',
        'Cable Crunches',
        'Pallof Press',
      ],
    },
    '1-0': {
      category: 'upper back',
      filters: {
        movementTags: ['horizontal_pull'],
        equipmentTags: ['dumbbell', 'barbell', 'cable', 'machine'],
        muscleGroups: ['back', 'biceps'],
      },
      options: [
        'Dumbbell Rows',
        'Chest-Supported Rows',
        'Seated Cable Rows',
        'Barbell Rows',
        'Machine Rows',
      ],
    },
    '1-1': {
      category: 'pressing',
      filters: {
        movementTags: ['horizontal_press', 'vertical_press'],
        equipmentTags: ['dumbbell', 'bodyweight', 'machine', 'barbell'],
        muscleGroups: ['chest', 'triceps', 'shoulders'],
      },
      options: [
        'DB Incline Press',
        'Machine Chest Press',
        'Push-ups',
        'Close-Grip Bench Press',
        'Dips',
      ],
    },
    '2-0': {
      category: 'posterior chain',
      filters: {
        movementTags: ['hinge'],
        equipmentTags: ['barbell', 'machine', 'bodyweight'],
        muscleGroups: ['hamstrings', 'glutes', 'back'],
      },
      options: [
        'Romanian Deadlifts (RDL)',
        'Back Extensions',
        '45° Hip Extensions',
        'Hamstring Curls',
        'Good Mornings',
      ],
    },
    '2-1': {
      category: 'core',
      filters: {
        movementTags: ['core'],
        equipmentTags: ['bodyweight', 'cable', 'band', 'pullup_bar'],
        muscleGroups: ['core'],
      },
      options: [
        'Ab Wheel Rollouts',
        'Weighted Planks',
        'Hanging Leg Raises',
        'Cable Crunches',
        'Dead Bugs',
      ],
    },
    '3-0': {
      category: 'vertical pull',
      filters: {
        movementTags: ['vertical_pull'],
        equipmentTags: ['pullup_bar', 'bodyweight', 'cable', 'machine'],
        muscleGroups: ['back', 'biceps'],
      },
      options: [
        'Chin-ups',
        'Lat Pulldowns',
        'Neutral-Grip Pull-ups',
        'Assisted Chin-ups',
        'Pull-ups',
      ],
    },
    '3-1': {
      category: 'triceps',
      filters: {
        movementTags: ['isolation', 'horizontal_press', 'vertical_press'],
        equipmentTags: ['bodyweight', 'cable', 'dumbbell', 'barbell'],
        muscleGroups: ['triceps'],
      },
      options: [
        'Dips',
        'Cable Triceps Pressdowns',
        'Close-Grip Push-ups',
        'Skull Crushers',
        'Overhead Triceps Extensions',
      ],
    },
  } as Record<
    string,
    {
      category: string;
      filters: Record<string, unknown>;
      options: string[];
    }
  >,
  getReps(week: number, season: W531Season, setIdx: number) {
    if (week === 4) return 5;
    if (season === 'off') return 5;
    const table: Record<number, number[]> = {
      1: [5, 5, 5],
      2: [3, 3, 3],
      3: [5, 3, 1],
    };
    return (table[week] || [5, 5, 5])[setIdx] ?? 5;
  },
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getW531Window(): W531Window | null {
  if (typeof window === 'undefined') return null;
  return window as W531Window;
}

function trW531(key: string, fallback: string, params?: Record<string, unknown>) {
  return getW531Window()?.I18N?.t?.(key, params, fallback) || fallback;
}

function normalizeW531Week(rawWeek: unknown) {
  const week = parseInt(String(rawWeek || ''), 10);
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(4, week);
}

function getW531DaysPerWeek() {
  return Number(getW531Window()?.getProgramTrainingDaysPerWeek?.('wendler531')) || 4;
}

function getWeekStart(date: Date) {
  return getW531Window()?.getWeekStart?.(date) || date;
}

function createInitialState(): W531State {
  return {
    week: 1,
    cycle: 1,
    daysPerWeek: 4,
    season: 'off',
    rounding: 2.5,
    testWeekPending: false,
    tmTestedThisCycle: false,
    stalledLifts: {},
    weekSessionIndex: 0,
    lifts: {
      main: [
        { name: 'Squat', tm: 100, category: 'legs' },
        { name: 'Bench Press', tm: 80, category: 'upper' },
        { name: 'Deadlift', tm: 120, category: 'legs' },
        { name: 'OHP', tm: 50, category: 'upper' },
      ],
    },
    triumvirate: cloneJson(INTERNAL.defaultTriumvirate),
  };
}

function getW531SchemeName(week: number) {
  const keyMap: Record<number, string> = {
    1: 'program.w531.scheme.5s',
    2: 'program.w531.scheme.3s',
    3: 'program.w531.scheme.531',
    4: 'program.w531.scheme.deload',
  };
  const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
  return trW531(keyMap[week] || '', scheme.label);
}

function normalizeWeekSessionIndex(rawIndex: unknown) {
  const parsed = parseInt(String(rawIndex || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed % 4;
}

function getRollingLiftOrder(state: Partial<W531State>) {
  const startIdx = normalizeWeekSessionIndex(state.weekSessionIndex);
  return Array.from({ length: 4 }, (_, offset) => (startIdx + offset) % 4);
}

function getDayLifts(dayNum: number, freq: number) {
  if (freq === 2) return dayNum === 1 ? [0, 1] : [2, 3];
  return [dayNum - 1];
}

function getWeekSessions(freq: number) {
  return freq === 2 ? 2 : 4;
}

function resolveLiftCategory(name: string): W531LiftCategory {
  const lowered = String(name || '').toLowerCase();
  return lowered.includes('squat') || lowered.includes('deadlift') ? 'legs' : 'upper';
}

function migrateW531State(rawState: Record<string, unknown> | null | undefined): W531State {
  const initial = createInitialState();
  const state = cloneJson(rawState || {}) as Partial<W531State>;
  const main = Array.isArray(state.lifts?.main) ? state.lifts.main : initial.lifts.main;
  const triumvirateSource =
    state.triumvirate && typeof state.triumvirate === 'object'
      ? state.triumvirate
      : INTERNAL.defaultTriumvirate;

  return {
    week: normalizeW531Week(state.week),
    cycle: Number.isFinite(Number(state.cycle)) ? Number(state.cycle) : 1,
    daysPerWeek: getW531DaysPerWeek(),
    season: state.season === 'in' ? 'in' : 'off',
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : 2.5,
    testWeekPending: state.testWeekPending === true,
    tmTestedThisCycle: state.tmTestedThisCycle === true,
    stalledLifts:
      state.stalledLifts && typeof state.stalledLifts === 'object'
        ? cloneJson(state.stalledLifts)
        : {},
    weekSessionIndex: normalizeWeekSessionIndex(state.weekSessionIndex),
    lifts: {
      main: main.map((lift, idx) => ({
        name: String(lift?.name || initial.lifts.main[idx]?.name || '').trim(),
        tm: Number.isFinite(Number(lift?.tm))
          ? Number(lift?.tm)
          : Number(initial.lifts.main[idx]?.tm || 0),
        category:
          lift?.category === 'legs' || lift?.category === 'upper'
            ? lift.category
            : resolveLiftCategory(String(lift?.name || '')),
      })),
    },
    triumvirate: {
      0: [
        String(triumvirateSource?.[0]?.[0] || INTERNAL.defaultTriumvirate[0][0]),
        String(triumvirateSource?.[0]?.[1] || INTERNAL.defaultTriumvirate[0][1]),
      ],
      1: [
        String(triumvirateSource?.[1]?.[0] || INTERNAL.defaultTriumvirate[1][0]),
        String(triumvirateSource?.[1]?.[1] || INTERNAL.defaultTriumvirate[1][1]),
      ],
      2: [
        String(triumvirateSource?.[2]?.[0] || INTERNAL.defaultTriumvirate[2][0]),
        String(triumvirateSource?.[2]?.[1] || INTERNAL.defaultTriumvirate[2][1]),
      ],
      3: [
        String(triumvirateSource?.[3]?.[0] || INTERNAL.defaultTriumvirate[3][0]),
        String(triumvirateSource?.[3]?.[1] || INTERNAL.defaultTriumvirate[3][1]),
      ],
    },
    rpeLog:
      state.rpeLog && typeof state.rpeLog === 'object' ? cloneJson(state.rpeLog) : undefined,
  };
}

function getTriumvirateSwapInfo(slotIdx: number, currentName?: string | null) {
  const liftIdx = Math.floor(slotIdx / 2);
  const slot = slotIdx % 2;
  const key = `${liftIdx}-${slot}`;
  const swapInfo = INTERNAL.triumvirateSwapOptions[key];
  if (!swapInfo) return null;
  const options = [...swapInfo.options];
  if (currentName && !options.includes(currentName)) options.unshift(currentName);
  return {
    category: swapInfo.category,
    filters: swapInfo.filters,
    options,
  };
}

export const wendler531Program = createLegacyProgramAdapter(
  {
    id: 'wendler531',
    name: '5/3/1 (Wendler)',
    description: '4-week strength cycles with automatic weight progression.',
    icon: '💪',
    legLifts: LEG_LIFTS,
  },
  {
    getInitialState: () => createInitialState(),
    migrateState: (state: Record<string, unknown>) => migrateW531State(state),
    getSessionOptions: (
      rawState: Record<string, unknown>,
      workouts: WorkoutRecord[]
    ): SessionOption[] => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const week = state.week || 1;
      const freq = getW531DaysPerWeek();
      const season = state.season || 'off';
      const lifts = state.lifts.main || createInitialState().lifts.main;
      const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
      const now = new Date();
      const sow = getWeekStart(now);
      const doneNums = (workouts || [])
        .filter(
          (workout: WorkoutRecord) =>
            workout.program === 'wendler531' && new Date(workout.date) >= sow
        )
        .map((workout: WorkoutRecord) => workout.programDayNum);
      const pct = Math.round((scheme.pcts[2] || 0) * 100);
      const topRep = INTERNAL.getReps(week, season, 2);

      if (freq === 2) {
        return [1, 2].map((day) => {
          const names = getDayLifts(day, 2)
            .map((index) => getDisplayName(lifts[index]?.name || ''))
            .join(' + ');
          const done = doneNums.includes(day);
          const isNext = !done && doneNums.length === day - 1;
          return {
            value: String(day),
            label: `${done ? '✅ ' : isNext ? '⭐ ' : ''}${names} · ${pct}%×${topRep}`,
            isRecommended: isNext && !done,
            done,
          };
        });
      }

      if (freq === 3) {
        return getRollingLiftOrder(state).map((liftIdx, orderIdx) => {
          const lift = lifts[liftIdx];
          const isRecommended = orderIdx === 0;
          return {
            value: String(liftIdx + 1),
            label: `${isRecommended ? '⭐ ' : ''}${getDisplayName(
              lift?.name || ''
            )} · ${pct}%×${topRep}`,
            isRecommended,
            done: false,
            liftIdx,
            category: lift?.category,
          };
        });
      }

      return lifts.map((lift, index) => {
        const done = doneNums.includes(index + 1);
        const prevsDone = lifts
          .slice(0, index)
          .every((_, prevIndex) => doneNums.includes(prevIndex + 1));
        const isRecommended = !done && prevsDone;
        return {
          value: String(index + 1),
          label: `${done ? '✅ ' : isRecommended ? '⭐ ' : ''}${getDisplayName(
            lift.name
          )} · ${pct}%×${topRep}`,
          isRecommended,
          done,
          liftIdx: index,
          category: lift.category,
        };
      });
    },
    getSessionLabel: (
      selectedOption: string,
      rawState: Record<string, unknown>,
      context?: ProgramSessionBuildContext
    ) => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const dayNum = parseInt(String(selectedOption || '1'), 10) || 1;
      const week = state.week || 1;
      const cycle = state.cycle || 1;
      const freq = getW531DaysPerWeek();
      const season = state.season || 'off';
      const effectiveSessionMode =
        context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
      const suppressProgramDeload =
        effectiveSessionMode === 'normal' &&
        (INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1])?.isDeload &&
        !state.testWeekPending;
      const schemeWeek = suppressProgramDeload ? Math.max(1, week - 1) : week;
      const scheme = INTERNAL.weekScheme[schemeWeek] || INTERNAL.weekScheme[1];
      const isTest = week === 4 && !!state.testWeekPending;
      const names = getDayLifts(dayNum, freq)
        .map((index) => state.lifts.main[index]?.name || '')
        .join('+');
      const icon = isTest ? '🔬' : scheme.isDeload ? '🌊' : season === 'off' ? '🏗️' : '🏒';
      const tag = isTest ? trW531('program.w531.tm_test', 'TM Test') : getW531SchemeName(schemeWeek);
      return `${icon} C${cycle} W${schemeWeek} · ${names} [${tag}]`;
    },
    getBlockInfo: (rawState: Record<string, unknown>) => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const week = state.week || 1;
      const cycle = state.cycle || 1;
      const season = state.season || 'off';
      const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
      const isTest = week === 4 && !!state.testWeekPending;
      return {
        name: isTest
          ? trW531('program.w531.tm_test_week', 'TM Test Week')
          : getW531SchemeName(week),
        weekLabel: trW531(
          'program.w531.block.week_label',
          'Cycle {cycle} · Week {week} · {season}',
          { cycle, week, season: trW531(`program.season.${season}`, season) }
        ),
        pct: Math.round((scheme.pcts[2] || 0.85) * 100),
        isDeload: scheme.isDeload && !isTest,
        totalWeeks: null,
        stalledCount: Object.keys(state.stalledLifts || {}).length,
      };
    },
    advanceState: (
      rawState: Record<string, unknown>,
      sessionsThisWeek?: number
    ): W531State => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const freq = getW531DaysPerWeek();
      const week = state.week || 1;
      const cycle = state.cycle || 1;
      const needed = getWeekSessions(freq);

      if (freq === 3) {
        const nextIndex = normalizeWeekSessionIndex(state.weekSessionIndex) + 1;
        if (nextIndex >= needed) {
          if (week >= 4) {
            const nextState = cloneJson(state);
            if (!nextState.tmTestedThisCycle) {
              nextState.lifts.main.forEach((lift, index) => {
                if (nextState.stalledLifts?.[index]) {
                  lift.tm = Math.round(lift.tm * 0.9 * 10) / 10;
                } else {
                  lift.tm =
                    Math.round((lift.tm + (lift.category === 'legs' ? 5 : 2.5)) * 10) / 10;
                }
              });
            }
            nextState.stalledLifts = {};
            nextState.testWeekPending = false;
            nextState.tmTestedThisCycle = false;
            nextState.week = 1;
            nextState.cycle = cycle + 1;
            nextState.weekSessionIndex = 0;
            return nextState;
          }
          return { ...state, week: week + 1, weekSessionIndex: 0 };
        }
        return { ...state, weekSessionIndex: nextIndex };
      }

      if ((sessionsThisWeek || 0) >= needed) {
        if (week >= 4) {
          const nextState = cloneJson(state);
          if (!nextState.tmTestedThisCycle) {
            nextState.lifts.main.forEach((lift, index) => {
              if (nextState.stalledLifts?.[index]) {
                lift.tm = Math.round(lift.tm * 0.9 * 10) / 10;
              } else {
                lift.tm =
                  Math.round((lift.tm + (lift.category === 'legs' ? 5 : 2.5)) * 10) / 10;
              }
            });
          }
          nextState.stalledLifts = {};
          nextState.testWeekPending = false;
          nextState.tmTestedThisCycle = false;
          nextState.week = 1;
          nextState.cycle = cycle + 1;
          nextState.weekSessionIndex = 0;
          return nextState;
        }
        return { ...state, week: week + 1, weekSessionIndex: 0 };
      }

      return { ...state, weekSessionIndex: 0 };
    },
    getWorkoutMeta: (rawState: Record<string, unknown>) => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      return {
        week: state.week || 1,
        cycle: state.cycle || 1,
        season: state.season || 'off',
        testWeekPending: !!state.testWeekPending,
        weekSessionIndex: normalizeWeekSessionIndex(state.weekSessionIndex),
        daysPerWeek: getW531DaysPerWeek(),
      };
    },
    getProgramConstraints: (rawState: Record<string, unknown>) => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const overrides: Record<string, Record<string, unknown>> = {};
      const mainOptionsByIndex = {
        0: {
          filters: {
            movementTags: ['squat', 'single_leg'],
            equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
            muscleGroups: ['quads', 'glutes'],
          },
          options: ['Squat', 'Front Squat', 'Leg Press', 'Bulgarian Split Squats', 'Step-Ups'],
        },
        1: {
          filters: {
            movementTags: ['horizontal_press'],
            equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
            muscleGroups: ['chest', 'triceps', 'shoulders'],
          },
          options: ['Bench Press', 'DB Bench', 'Machine Chest Press', 'Push-ups', 'Close-Grip Bench'],
        },
        2: {
          filters: {
            movementTags: ['hinge'],
            equipmentTags: ['barbell', 'trap_bar', 'machine', 'bodyweight', 'dumbbell'],
            muscleGroups: ['hamstrings', 'glutes', 'back'],
          },
          options: ['Deadlift', 'Trap Bar Deadlift', 'Romanian Deadlift', 'Back Extensions', 'Hamstring Curls'],
        },
        3: {
          filters: {
            movementTags: ['vertical_press', 'horizontal_press'],
            equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
            muscleGroups: ['shoulders', 'triceps', 'chest'],
          },
          options: ['OHP', 'DB OHP', 'Push Press', 'Incline Press', 'Machine Chest Press'],
        },
      } as Record<number, { filters: Record<string, unknown>; options: string[] }>;

      (state.lifts?.main || []).forEach((lift, index) => {
        const info = mainOptionsByIndex[index] || mainOptionsByIndex[0];
        const baseName = String(lift?.name || '').trim().toLowerCase();
        overrides[baseName] = {
          filters: info.filters,
          options: info.options,
          clearWeightOnSwap: true,
        };
        overrides[`${baseName} (bbb)`] = {
          filters: info.filters,
          options: info.options,
          clearWeightOnSwap: true,
        };
      });

      [0, 1, 2, 3].forEach((liftIdx) => {
        [0, 1].forEach((slotIdx) => {
          const currentName = state.triumvirate?.[liftIdx]?.[slotIdx] || '';
          const info = getTriumvirateSwapInfo(liftIdx * 2 + slotIdx, currentName);
          if (currentName && info) {
            overrides[String(currentName).trim().toLowerCase()] = {
              filters: info.filters,
              options: info.options,
              clearWeightOnSwap: true,
            };
          }
        });
      });

      return { exerciseOverrides: overrides };
    },
    adaptSession: (
      baseSession: WorkoutExercise[],
      planningContext?: Record<string, unknown>
    ) => {
      const exercises = cloneJson(baseSession || []);
      const adaptationEvents: Array<Record<string, unknown>> = [];
      const limitations =
        planningContext?.limitations && typeof planningContext.limitations === 'object'
          ? (planningContext.limitations as { jointFlags?: string[] })
          : null;
      const hasShoulderLimit = Array.isArray(limitations?.jointFlags)
        ? limitations?.jointFlags.includes('shoulder')
        : false;
      if (hasShoulderLimit) {
        const kept = exercises.filter((exercise) => {
          const meta = getW531Window()?.EXERCISE_LIBRARY?.getExerciseMeta?.(
            String(exercise.exerciseId || exercise.name || '')
          );
          const tags = meta?.movementTags || [];
          return !exercise.isAux || !tags.includes('vertical_press');
        });
        if (kept.length !== exercises.length) {
          const event = getW531Window()?.createTrainingCommentaryEvent?.(
            'program_shoulder_trimmed',
            { programId: 'wendler531', programName: 'Wendler 5/3/1' }
          );
          if (event) adaptationEvents.push(event);
        }
        return {
          exercises: kept,
          adaptationEvents,
          equipmentHint:
            planningContext?.equipmentAccess === 'home_gym' ||
            planningContext?.equipmentAccess === 'minimal'
              ? getW531Window()?.createTrainingCommentaryEvent?.('same_pattern_swaps', {
                  programId: 'wendler531',
                  programName: 'Wendler 5/3/1',
                }) || null
              : null,
        };
      }

      return {
        exercises,
        adaptationEvents,
        equipmentHint:
          planningContext?.equipmentAccess === 'home_gym' ||
          planningContext?.equipmentAccess === 'minimal'
            ? getW531Window()?.createTrainingCommentaryEvent?.('same_pattern_swaps', {
                programId: 'wendler531',
                programName: 'Wendler 5/3/1',
              }) || null
            : null,
      };
    },
    getDashboardTMs: (rawState: Record<string, unknown>) => {
      const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
      const stalled = state.stalledLifts || {};
      return (state.lifts?.main || []).map((lift, index) => ({
        name: lift.name,
        value: `${lift.tm}kg`,
        stalled: !!stalled[index],
      }));
    },
  }
);
