import { getDisplayName } from '../domain/exercise-library';
import type {
  ProgramPlugin,
  ProgramSessionBuildContext,
} from '../domain/program-plugin';
import type {
  SessionOption,
  SportSchedule,
  WorkoutExercise,
  WorkoutRecord,
} from '../domain/types';

type W531Season = 'off' | 'in';
type W531LiftCategory = 'legs' | 'upper';
type W531Readiness = 'default' | 'light' | 'none';
type W531Triumvirate = Record<number, [string, string]>;

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
  triumvirate: W531Triumvirate;
  rpeLog?: Record<string, Array<Record<string, unknown>>>;
};

type W531SwapInfo = {
  category: string;
  filters: Record<string, unknown>;
  options: string[];
};

type W531SessionCharacter = {
  tone: string;
  icon: string;
  labelKey: string;
  labelFallback: string;
  labelParams: Record<string, unknown>;
};

type W531ExerciseSet = WorkoutExercise['sets'][number] & {
  isTestSet?: boolean;
  isLastHeavySet?: boolean;
  isEnergyBoostSet?: boolean;
};

type W531WorkoutExercise = WorkoutExercise & {
  liftIdx?: number;
  sets: W531ExerciseSet[];
};

type W531Plugin = Omit<
  ProgramPlugin<W531State>,
  'getAuxSwapOptions' | 'getBackSwapOptions' | 'onAuxSwap'
> & {
  getWorkoutMeta?: (
    state: W531State,
    context?: ProgramSessionBuildContext
  ) => Record<string, unknown>;
  getSessionModeRecommendation?: (
    state: W531State,
    context?: ProgramSessionBuildContext
  ) => string;
  getSessionCharacter?: (
    selectedOption: string,
    state: W531State
  ) => W531SessionCharacter;
  getPreSessionNote?: (selectedOption: string, state: W531State) => string;
  getAuxSwapOptions?: (exercise?: WorkoutExercise) => W531SwapInfo | string[] | null;
  getBackSwapOptions?: () => string[] | Array<Record<string, unknown>>;
  onAuxSwap?: (slotIdx: number, newName: string, state: W531State) => W531State;
  onBackSwap?: (_slotIdx: number, state: W531State) => W531State;
};

type ExerciseSelectionResult = {
  name?: string;
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
  getTrainingDaysPerWeekLabel?: (value: number) => string;
  getWeekStart?: (date?: Date) => Date;
  createTrainingCommentaryEvent?: (
    code: string,
    params?: Record<string, unknown>
  ) => Record<string, unknown> | null;
  resolveExerciseSelection?: (input: unknown) => ExerciseSelectionResult | null;
  _w531SetReadiness?: (mode: W531Readiness) => void;
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
  } as W531Triumvirate,
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
        '45 Hip Extensions',
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
  } as Record<string, W531SwapInfo>,
  recoveryCircuit: [
    { name: 'Band Pull-Aparts', sets: 3, reps: 20 },
    { name: 'Bodyweight Squats', sets: 3, reps: 15 },
    { name: 'Push-ups', sets: 3, reps: 15 },
    { name: 'Dead Hangs', sets: 3, reps: '30s' },
  ],
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

let readinessMode: W531Readiness = 'default';
let warnedMissingW531Runtime = false;

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getW531Window(): W531Window | null {
  if (typeof window === 'undefined') return null;
  return window as W531Window;
}

function trW531(key: string, fallback: string, params?: Record<string, unknown>) {
  return getW531Window()?.I18N?.t?.(key, params, fallback) || fallback;
}

function getW531ProgramRuntime(context?: ProgramSessionBuildContext | null) {
  const runtime =
    context?.programRuntime && typeof context.programRuntime === 'object'
      ? (context.programRuntime as Record<string, unknown>)
      : null;
  if (!runtime && import.meta.env.DEV && !warnedMissingW531Runtime) {
    warnedMissingW531Runtime = true;
    console.warn(
      '[wendler531] Missing explicit programRuntime context; falling back to legacy runtime globals.'
    );
  }
  const daysPerWeek = Number(runtime?.daysPerWeek);
  const weekStartDate = String(runtime?.weekStartDate || '');
  const sessionReadiness = String(runtime?.sessionReadiness || '');
  const parsedWeekStart = weekStartDate ? new Date(weekStartDate) : null;
  return {
    daysPerWeek:
      Number.isFinite(daysPerWeek) && daysPerWeek > 0
        ? daysPerWeek
        : getW531DaysPerWeek(),
    weekStart:
      parsedWeekStart && Number.isFinite(parsedWeekStart.getTime())
        ? parsedWeekStart
        : getWeekStart(new Date()),
    sessionReadiness:
      sessionReadiness === 'light' || sessionReadiness === 'none'
        ? sessionReadiness
        : 'default',
  } as const;
}

function normalizeW531Week(rawWeek: unknown) {
  const week = parseInt(String(rawWeek || ''), 10);
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(4, week);
}

function getLoggedRepCount(rawValue: unknown) {
  const reps = parseInt(String(rawValue || ''), 10);
  return Number.isFinite(reps) && reps >= 0 ? reps : null;
}

function getW531DaysPerWeek() {
  return Number(getW531Window()?.getProgramTrainingDaysPerWeek?.('wendler531')) || 4;
}

function getTrainingDaysPerWeekLabel(value: number) {
  return getW531Window()?.getTrainingDaysPerWeekLabel?.(value) || `${value} sessions / week`;
}

function getWeekStart(date: Date) {
  return getW531Window()?.getWeekStart?.(date) || date;
}

function roundToIncrement(value: number, increment: number) {
  const step = increment || 2.5;
  return Math.round(value / step) * step;
}

function estimate1RM(weight: number, reps: number) {
  return reps === 1 ? weight : Math.round((weight * reps * 0.0333 + weight) * 10) / 10;
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

function cloneTriumvirateState(source: W531Triumvirate | null | undefined): W531Triumvirate {
  return {
    0: [
      String(source?.[0]?.[0] || INTERNAL.defaultTriumvirate[0][0]),
      String(source?.[0]?.[1] || INTERNAL.defaultTriumvirate[0][1]),
    ],
    1: [
      String(source?.[1]?.[0] || INTERNAL.defaultTriumvirate[1][0]),
      String(source?.[1]?.[1] || INTERNAL.defaultTriumvirate[1][1]),
    ],
    2: [
      String(source?.[2]?.[0] || INTERNAL.defaultTriumvirate[2][0]),
      String(source?.[2]?.[1] || INTERNAL.defaultTriumvirate[2][1]),
    ],
    3: [
      String(source?.[3]?.[0] || INTERNAL.defaultTriumvirate[3][0]),
      String(source?.[3]?.[1] || INTERNAL.defaultTriumvirate[3][1]),
    ],
  };
}

function migrateW531State(
  rawState: Record<string, unknown> | null | undefined,
  context?: ProgramSessionBuildContext | null
): W531State {
  const initial = createInitialState();
  const state = cloneJson(rawState || {}) as Partial<W531State>;
  const main = Array.isArray(state.lifts?.main) ? state.lifts.main : initial.lifts.main;
  const runtime = getW531ProgramRuntime(context);

  return {
    week: normalizeW531Week(state.week),
    cycle: Number.isFinite(Number(state.cycle)) ? Number(state.cycle) : 1,
    daysPerWeek: runtime.daysPerWeek,
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
    triumvirate: cloneTriumvirateState(
      state.triumvirate && typeof state.triumvirate === 'object'
        ? (state.triumvirate as W531Triumvirate)
        : null
    ),
    rpeLog:
      state.rpeLog && typeof state.rpeLog === 'object' ? cloneJson(state.rpeLog) : undefined,
  };
}

function getTriumvirateSlot(slotIdx: number) {
  return { liftIdx: Math.floor(slotIdx / 2), slot: slotIdx % 2 };
}

function getTriumvirateSwapInfo(slotIdx: number, currentName?: string | null) {
  const { liftIdx, slot } = getTriumvirateSlot(slotIdx);
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

function readInputValue(id: string) {
  if (typeof document === 'undefined') return '';
  return String(
    (
      document.getElementById(id) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null
    )?.value || ''
  );
}

function readCheckedValue(id: string) {
  if (typeof document === 'undefined') return false;
  return (document.getElementById(id) as HTMLInputElement | null)?.checked === true;
}

function resolveExerciseSelectionName(input: unknown) {
  const rawName =
    typeof input === 'string'
      ? input
      : typeof input === 'object' && input !== null
        ? String((input as { name?: unknown }).name || '')
        : '';
  return String(
    getW531Window()?.resolveExerciseSelection?.(input)?.name || rawName || ''
  ).trim();
}

function installW531WindowHelpers() {
  const runtimeWindow = getW531Window();
  if (!runtimeWindow) return;
  runtimeWindow._w531SetReadiness = (mode: W531Readiness) => {
    readinessMode = mode;
    ['default', 'light', 'none'].forEach((value) => {
      const button = document.getElementById(`w531-r-${value}`);
      if (!button) return;
      button.className = `btn btn-sm ${
        value === mode ? 'btn-primary' : 'btn-secondary'
      }`;
      button.setAttribute('style', 'font-size:11px;padding:4px 8px');
    });
  };
}

installW531WindowHelpers();

function buildSelectOptions(
  options: Array<{ value: string; label: string }>,
  selectedValue: string
) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${
          option.value === selectedValue ? ' selected' : ''
        }>${escapeHtml(option.label)}</option>`
    )
    .join('');
}

function buildLiftTmRows(
  state: W531State,
  prefix: 'w531-basic' | 'w531-advanced',
  includeStalled: boolean
) {
  const liftLabels = [
    trW531('program.w531.lift.sq', 'Squat (SQ)'),
    trW531('program.w531.lift.bp', 'Bench Press (BP)'),
    trW531('program.w531.lift.dl', 'Deadlift (DL)'),
    trW531('program.w531.lift.ohp', 'Overhead Press (OHP)'),
  ];

  return state.lifts.main
    .map((lift, index) => {
      const stalledBadge =
        includeStalled && state.stalledLifts?.[index]
          ? ` <span style="color:var(--orange);font-size:11px">${escapeHtml(
              trW531('program.w531.settings.plateau_badge', 'plateaued')
            )}</span>`
          : '';
      return `
        <div class="lift-row">
          <span class="lift-label">${escapeHtml(liftLabels[index] || `#${index + 1}`)}</span>
          <span style="flex:1;font-size:13px;color:var(--text)">${escapeHtml(
            getDisplayName(lift.name)
          )}${stalledBadge}</span>
          <input
            id="${prefix}-tm-${index}"
            min="0"
            step="0.1"
            type="number"
            value="${escapeHtml(String(lift.tm || 0))}"
          >
        </div>
      `;
    })
    .join('');
}

function buildTriumvirateRows(state: W531State) {
  const dayLabels = [
    trW531('program.w531.day.sq', 'Squat Day'),
    trW531('program.w531.day.bp', 'Bench Day'),
    trW531('program.w531.day.dl', 'Deadlift Day'),
    trW531('program.w531.day.ohp', 'OHP Day'),
  ];

  return [0, 1, 2, 3]
    .map((liftIdx) => {
      const currentRow = state.triumvirate?.[liftIdx] || INTERNAL.defaultTriumvirate[liftIdx];
      const slotMarkup = [0, 1]
        .map((slotIdx) => {
          const selectedName = currentRow?.[slotIdx] || '';
          const swapInfo =
            getTriumvirateSwapInfo(liftIdx * 2 + slotIdx, selectedName) ||
            INTERNAL.triumvirateSwapOptions[`${liftIdx}-${slotIdx}`];
          const options = buildSelectOptions(
            (swapInfo?.options || []).map((name) => ({
              value: name,
              label: getDisplayName(name),
            })),
            selectedName
          );
          return `
            <label>${escapeHtml(
              trW531('program.w531.settings.exercise_slot', 'Exercise')
            )} ${slotIdx + 1}</label>
            <select id="w531-advanced-tri-${liftIdx}-${slotIdx}">${options}</select>
          `;
        })
        .join('');

      return `
        <div class="settings-section-card" style="margin-top:10px">
          <div class="settings-section-title">${escapeHtml(dayLabels[liftIdx])}</div>
          <div class="settings-section-sub">${escapeHtml(
            trW531(
              'program.w531.settings.in_season_help',
              'Pick 2 accessory exercises per in-season session (3 sets x 10-15 reps each).'
            )
          )}</div>
          ${slotMarkup}
        </div>
      `;
    })
    .join('');
}

export const wendler531Program: W531Plugin = {
  id: 'wendler531',
  name: '5/3/1 (Wendler)',
  description: '4-week strength cycles with automatic weight progression.',
  icon: '💪',
  legLifts: LEG_LIFTS,
  getInitialState: () => createInitialState(),
  migrateState: (state: Record<string, unknown>, context?: ProgramSessionBuildContext) =>
    migrateW531State(state, context),
  getCapabilities: () => ({
    difficulty: 'intermediate',
    frequencyRange: { min: 2, max: 4 },
    recommendationScore: (days: number, prefs?: Record<string, unknown>) => {
      let score = prefs?.goal === 'strength' ? 6 : 2;
      if (days < 2 || days > 4) score -= 10;
      if (days === 3 || days === 4) score += 2;
      return score;
    },
  }),
  getTrainingDaysRange: () => ({ min: 2, max: 4 }),
  getSessionOptions: (
    rawState: W531State,
    workouts: WorkoutRecord[],
    _schedule: SportSchedule,
    context?: ProgramSessionBuildContext
  ): SessionOption[] => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const week = state.week || 1;
    const runtime = getW531ProgramRuntime(context);
    const freq = runtime.daysPerWeek;
    const season = state.season || 'off';
    const lifts = state.lifts.main || createInitialState().lifts.main;
    const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
    const sow = runtime.weekStart;
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
          label: `${done ? '✅ ' : isNext ? '⭐ ' : ''}${names} · ${pct}%x${topRep}`,
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
          )} · ${pct}%x${topRep}`,
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
        )} · ${pct}%x${topRep}`,
        isRecommended,
        done,
        liftIdx: index,
        category: lift.category,
      };
    });
  },
  buildSession: (
    selectedOption: string,
    rawState: W531State,
    context?: ProgramSessionBuildContext
  ): WorkoutExercise[] => {
    installW531WindowHelpers();
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const dayNum = parseInt(String(selectedOption || '1'), 10) || 1;
    const week = state.week || 1;
    const runtime = getW531ProgramRuntime(context);
    const freq = runtime.daysPerWeek;
    const season = state.season || 'off';
    const rounding = state.rounding || 2.5;
    const requestedSessionMode = String(context?.sessionMode || 'auto');
    const effectiveSessionMode =
      context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
    const energyBoost = context?.energyBoost === true;
    const suppressProgramDeload =
      effectiveSessionMode === 'normal' &&
      (INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1])?.isDeload &&
      !state.testWeekPending;
    const schemeWeek = suppressProgramDeload ? Math.max(1, week - 1) : week;
    const scheme = INTERNAL.weekScheme[schemeWeek] || INTERNAL.weekScheme[1];
    const isDeload = scheme.isDeload && !state.testWeekPending;
    const isTest = week === 4 && !!state.testWeekPending;
    const previewMode = context?.preview === true;
    let readiness = runtime.sessionReadiness || readinessMode;
    if (requestedSessionMode === 'normal') readiness = 'default';
    else if (requestedSessionMode === 'light') readiness = 'light';
    if (!previewMode) readinessMode = 'default';

    const exercises: W531WorkoutExercise[] = [];

    getDayLifts(dayNum, freq).forEach((liftIdx) => {
      const lift = state.lifts.main[liftIdx];
      if (!lift) return;

      let sets: W531ExerciseSet[];
      let note = '';

      if (isTest) {
        const weight = roundToIncrement(lift.tm, rounding);
        sets = [
          {
            weight,
            reps: 'AMRAP',
            done: false,
            rpe: null,
            isAmrap: true,
            repOutTarget: 5,
            isTestSet: true,
            isLastHeavySet: false,
          },
        ];
        note = trW531(
          'program.w531.note.test',
          'TM test - {tm}kg x AMRAP. Aim for 3-5 reps; 1-2 reps recalculates the training max.',
          { tm: lift.tm }
        );
      } else {
        sets = scheme.pcts.map((pct, setIdx) => ({
          weight: roundToIncrement(lift.tm * pct, rounding),
          reps: INTERNAL.getReps(schemeWeek, season, setIdx),
          done: false,
          rpe: null,
          isLastHeavySet: setIdx === scheme.pcts.length - 1 && !isDeload,
        }));

        if (energyBoost && !isDeload) {
          sets.push({
            weight: roundToIncrement(lift.tm * 0.7, rounding),
            reps: 5,
            done: false,
            rpe: null,
            isLastHeavySet: false,
            isEnergyBoostSet: true,
          });
        }

        const pctString = scheme.pcts.map((pct) => `${Math.round(pct * 100)}%`).join('/');
        const repString = sets.map((set) => set.reps).join('/');

        if (isDeload) {
          note = trW531(
            'program.w531.note.deload',
            'Deload - {tm}kg TM - {pcts} - easy 5s for recovery.',
            { tm: lift.tm, pcts: pctString }
          );
        } else if (season === 'off') {
          note = trW531(
            'program.w531.note.off',
            '{tm}kg TM - {pcts} - {reps} (5s PRO, no AMRAP).',
            { tm: lift.tm, pcts: pctString, reps: repString }
          );
        } else {
          note = trW531(
            'program.w531.note.in',
            '{tm}kg TM - {pcts} - {reps} (minimum required reps).',
            { tm: lift.tm, pcts: pctString, reps: repString }
          );
        }
      }

      exercises.push({
        id: Date.now() + Math.random(),
        name: lift.name,
        note,
        isAux: false,
        isAccessory: false,
        tm: lift.tm,
        auxSlotIdx: -1,
        liftIdx,
        sets,
      } as W531WorkoutExercise);

      if (isDeload || readiness === 'none') return;

      if (readiness === 'light') {
        INTERNAL.recoveryCircuit.forEach((exercise) => {
          exercises.push({
            id: Date.now() + Math.random(),
            name: exercise.name,
            note: trW531('program.w531.note.recovery', 'Light recovery - {sets}x{reps}', {
              sets: exercise.sets,
              reps: exercise.reps,
            }),
            isAux: true,
            isAccessory: false,
            tm: 0,
            auxSlotIdx: -1,
            sets: Array.from({ length: exercise.sets }, () => ({
              weight: 0,
              reps: exercise.reps,
              done: false,
              rpe: null,
            })),
          } as W531WorkoutExercise);
        });
        return;
      }

      if (season === 'off') {
        const oppositeLift = state.lifts.main[INTERNAL.bbbPair[liftIdx]];
        if (!oppositeLift) return;
        const bbbWeight = roundToIncrement(oppositeLift.tm * 0.5, rounding);
        exercises.push({
          id: Date.now() + Math.random(),
          name: `${oppositeLift.name} (BBB)`,
          note: trW531(
            'program.w531.note.bbb',
            'Boring But Big - 5x10 @ {weight}kg (50% of {name} TM: {tm}kg).',
            { weight: bbbWeight, name: oppositeLift.name, tm: oppositeLift.tm }
          ),
          isAux: true,
          isAccessory: false,
          tm: oppositeLift.tm,
          auxSlotIdx: -1,
          sets: Array.from({ length: 5 }, () => ({
            weight: bbbWeight,
            reps: 10,
            done: false,
            rpe: null,
          })),
        } as W531WorkoutExercise);
        return;
      }

      const accessories =
        state.triumvirate?.[liftIdx] || INTERNAL.defaultTriumvirate[liftIdx] || [];
      accessories.slice(0, 2).forEach((name, triSlotIdx) => {
        if (!name) return;
        exercises.push({
          id: Date.now() + Math.random(),
          name,
          note: trW531(
            'program.w531.note.triumvirate',
            'Triumvirate - 3 sets x 10-15 reps.'
          ),
          isAux: true,
          isAccessory: false,
          tm: 0,
          auxSlotIdx: liftIdx * 2 + triSlotIdx,
          sets: Array.from({ length: 3 }, () => ({
            weight: '',
            reps: 12,
            done: false,
            rpe: null,
          })),
        } as W531WorkoutExercise);
      });
    });

    return exercises as WorkoutExercise[];
  },
  getSessionLabel: (
    selectedOption: string,
    rawState: W531State,
    context?: ProgramSessionBuildContext
  ) => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const dayNum = parseInt(String(selectedOption || '1'), 10) || 1;
    const week = state.week || 1;
    const cycle = state.cycle || 1;
    const freq = getW531ProgramRuntime(context).daysPerWeek;
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
  getSessionModeRecommendation: (
    rawState: W531State,
    context?: ProgramSessionBuildContext
  ) => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const scheme = INTERNAL.weekScheme[state.week] || INTERNAL.weekScheme[1];
    if (
      (scheme.isDeload && !state.testWeekPending) ||
      getW531ProgramRuntime(context).sessionReadiness !== 'default'
    ) {
      return 'light';
    }
    return 'normal';
  },
  getBlockInfo: (rawState: W531State, context?: ProgramSessionBuildContext) => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
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
  getSessionCharacter: (_selectedOption: string, rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const week = normalizeW531Week(state.week);
    const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
    const isTest = week === 4 && !!state.testWeekPending;
    const pct = Math.round((scheme.pcts[2] || 0.85) * 100);

    if (isTest) {
      return {
        tone: 'test',
        icon: '🔬',
        labelKey: 'program.w531.character.test',
        labelFallback: trW531(
          'program.w531.character.test',
          'TM test - validate your training maxes'
        ),
        labelParams: {},
      };
    }

    if (scheme.isDeload) {
      return {
        tone: 'deload',
        icon: '🌊',
        labelKey: 'program.w531.character.deload',
        labelFallback: trW531(
          'program.w531.character.deload',
          'Deload - light recovery week'
        ),
        labelParams: {},
      };
    }

    if (week === 3) {
      return {
        tone: 'amrap',
        icon: '🎯',
        labelKey: 'program.w531.character.amrap',
        labelFallback: trW531(
          'program.w531.character.amrap',
          '1+ week - push the top set at {pct}%',
          { pct }
        ),
        labelParams: { pct },
      };
    }

    if (week === 2) {
      return {
        tone: 'heavy',
        icon: '🔥',
        labelKey: 'program.w531.character.heavy',
        labelFallback: trW531(
          'program.w531.character.heavy',
          '3s week - working sets at {pct}% TM',
          { pct }
        ),
        labelParams: { pct },
      };
    }

    return {
      tone: 'volume',
      icon: '📈',
      labelKey: 'program.w531.character.volume',
      labelFallback: trW531(
        'program.w531.character.volume',
        '5s week - moderate volume at {pct}% TM',
        { pct }
      ),
      labelParams: { pct },
    };
  },
  getPreSessionNote: (_selectedOption: string, rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const week = normalizeW531Week(state.week);
    const cycle = state.cycle || 1;
    const isTest = week === 4 && !!state.testWeekPending;
    const schemeName = getW531SchemeName(week);

    if (isTest) {
      return trW531(
        'program.w531.note.test',
        'Cycle {cycle}, TM test - push for max reps to validate training maxes.',
        { cycle }
      );
    }

    if ((INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1]).isDeload) {
      return trW531(
        'program.w531.note.deload',
        'Cycle {cycle}, deload - easy sets and recovery focus.',
        { cycle }
      );
    }

    if (week === 3) {
      return trW531(
        'program.w531.note.amrap',
        'Cycle {cycle}, {scheme} - push the top set hard.',
        { cycle, scheme: schemeName }
      );
    }

    return trW531(
      'program.w531.note.default',
      'Cycle {cycle}, {scheme} - complete all prescribed sets cleanly.',
      { cycle, scheme: schemeName }
    );
  },
  adjustAfterSession: (
    exercises: WorkoutExercise[],
    rawState: W531State,
    _selectedOption?: string,
    context?: ProgramSessionBuildContext
  ) => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const nextState = cloneJson(state);
    const week = normalizeW531Week(state.week);
    const season = state.season || 'off';
    const scheme = INTERNAL.weekScheme[week] || INTERNAL.weekScheme[1];
    const isTest = week === 4 && !!state.testWeekPending;

    if (scheme.isDeload && !isTest) return nextState;

    (exercises as W531WorkoutExercise[]).forEach((exercise) => {
      if (exercise.isAccessory || exercise.isAux) return;
      const liftIdx = Number(exercise.liftIdx);
      if (!Number.isFinite(liftIdx) || liftIdx < 0) return;
      const lift = nextState.lifts.main[liftIdx];
      if (!lift) return;

      if (isTest) {
        const testSet = exercise.sets.find((set: W531ExerciseSet) => set.isTestSet && set.done);
        if (testSet) {
          const reps = getLoggedRepCount(testSet.reps) || 0;
          if (reps >= 1 && reps <= 2) {
            lift.tm = Math.round(estimate1RM(Number(testSet.weight) || 0, reps) * 0.9 * 10) / 10;
          }
        }
        nextState.testWeekPending = false;
        nextState.tmTestedThisCycle = true;
        return;
      }

      const lastHeavySet = exercise.sets.find((set: W531ExerciseSet) => set.isLastHeavySet);
      if (!lastHeavySet) return;

      const minimumReps = INTERNAL.getReps(week, season, 2);
      const repsHit = getLoggedRepCount(lastHeavySet.reps) || 0;
      const stalled = !lastHeavySet.done || repsHit < minimumReps;
      if (stalled) {
        nextState.stalledLifts = nextState.stalledLifts || {};
        nextState.stalledLifts[liftIdx] = true;
      }

      const rpe = lastHeavySet.rpe;
      if (rpe !== null && rpe !== undefined) {
        if (!nextState.rpeLog) nextState.rpeLog = {};
        if (!nextState.rpeLog[liftIdx]) nextState.rpeLog[liftIdx] = [];
        nextState.rpeLog[liftIdx].push({
          week,
          cycle: state.cycle || 1,
          rpe,
          date: new Date().toISOString(),
        });
        if (nextState.rpeLog[liftIdx].length > 24) nextState.rpeLog[liftIdx].shift();
      }
    });

    return nextState;
  },
  advanceState: (
    rawState: W531State,
    sessionsThisWeek?: number,
    context?: ProgramSessionBuildContext
  ): W531State => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    const freq = getW531ProgramRuntime(context).daysPerWeek;
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
  dateCatchUp: (rawState: W531State) =>
    migrateW531State(cloneJson(rawState) as Record<string, unknown>),
  getWorkoutMeta: (rawState: W531State, context?: ProgramSessionBuildContext) => {
    const state = migrateW531State(
      cloneJson(rawState) as Record<string, unknown>,
      context
    );
    return {
      week: state.week || 1,
      cycle: state.cycle || 1,
      season: state.season || 'off',
      testWeekPending: !!state.testWeekPending,
      weekSessionIndex: normalizeWeekSessionIndex(state.weekSessionIndex),
      daysPerWeek: getW531ProgramRuntime(context).daysPerWeek,
    };
  },
  getSessionReadiness: () => readinessMode,
  getAuxSwapOptions: (exercise) => {
    if (!exercise || exercise.auxSlotIdx === undefined || Number(exercise.auxSlotIdx) < 0) {
      return null;
    }
    return getTriumvirateSwapInfo(Number(exercise.auxSlotIdx), exercise.name);
  },
  getBackSwapOptions: () => [],
  onAuxSwap: (slotIdx, newName, rawState) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const { liftIdx, slot } = getTriumvirateSlot(slotIdx);
    const nextState = cloneJson(state);
    if (!Array.isArray(nextState.triumvirate[liftIdx])) {
      nextState.triumvirate[liftIdx] = cloneJson(INTERNAL.defaultTriumvirate[liftIdx]);
    }
    nextState.triumvirate[liftIdx][slot] = String(newName || '').trim();
    return nextState;
  },
  onBackSwap: (_slotIdx, rawState) =>
    migrateW531State(cloneJson(rawState) as Record<string, unknown>),
  getProgramConstraints: (rawState: W531State) => {
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
        options: [
          'Deadlift',
          'Trap Bar Deadlift',
          'Romanian Deadlift',
          'Back Extensions',
          'Hamstring Curls',
        ],
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

    state.lifts.main.forEach((lift, index) => {
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
        if (!currentName || !info) return;
        overrides[String(currentName).trim().toLowerCase()] = {
          filters: info.filters,
          options: info.options,
          clearWeightOnSwap: true,
        };
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
      ? limitations.jointFlags.includes('shoulder')
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
  getDashboardTMs: (rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const stalled = state.stalledLifts || {};
    return (state.lifts.main || []).map((lift, index) => ({
      name: lift.name,
      value: `${lift.tm}kg`,
      stalled: !!stalled[index],
    }));
  },
  getBannerHTML: (
    options: SessionOption[],
    rawState: W531State,
    schedule: SportSchedule,
    workouts: WorkoutRecord[]
  ) => {
    installW531WindowHelpers();
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const week = state.week || 1;
    const cycle = state.cycle || 1;
    const freq = getW531DaysPerWeek();
    const season = state.season || 'off';
    const isTest = week === 4 && !!state.testWeekPending;
    const needed = getWeekSessions(freq);
    const doneCount = options.filter((option) => option.done).length;
    const left = needed - doneCount;
    const bestOption = options.find((option) => option.isRecommended) || options[0];
    const stalledCount = Object.keys(state.stalledLifts || {}).length;
    const stalledString = stalledCount
      ? trW531(
          stalledCount > 1
            ? 'program.w531.banner.stalled_pl'
            : 'program.w531.banner.stalled',
          ' · Warning: {count} lift stalled',
          { count: stalledCount }
        )
      : '';

    if (doneCount >= needed) {
      const nextWeek = week >= 4 ? 1 : week + 1;
      const nextLabel =
        week >= 4
          ? trW531(
              'program.w531.next_cycle',
              'Cycle {cycle} starts next and TMs update.',
              { cycle: cycle + 1 }
            ) + stalledString
          : trW531('program.w531.next_week', 'Week {week} ({label}) is next.', {
              week: nextWeek,
              label: getW531SchemeName(nextWeek),
            });
      return {
        style: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
        color: 'var(--green)',
        html: trW531('program.w531.week_done', 'Week {week} done. {next}', {
          week,
          next: nextLabel,
        }),
      };
    }

    const todayDow = new Date().getDay();
    const sportDays = schedule?.sportDays || [];
    const legsHeavy = schedule?.sportLegsHeavy !== false;
    const recentHours =
      ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
        String(schedule?.sportIntensity || 'hard')
      ] || 30;
    const sportName = schedule?.sportName || trW531('common.sport', 'Sport');
    const isSportDay = sportDays.includes(todayDow);
    const hadSportRecently = workouts?.some(
      (workout) =>
        (workout.type === 'sport' || workout.type === 'hockey') &&
        (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
    );

    if ((isSportDay || hadSportRecently) && legsHeavy && bestOption) {
      const liftIndexes = getDayLifts(parseInt(bestOption.value, 10), freq);
      const hasLegs = liftIndexes.some(
        (index) => state.lifts?.main?.[index]?.category === 'legs'
      );
      if (hasLegs) {
        const upperOption = options.find(
          (option) =>
            !option.done &&
            getDayLifts(parseInt(option.value, 10), freq).every(
              (index) => state.lifts?.main?.[index]?.category === 'upper'
            )
        );
        const sportLabel = isSportDay
          ? `${sportName} day`
          : `Post-${String(sportName).toLowerCase()}`;
        return {
          style: 'rgba(59,130,246,0.1)',
          border: 'rgba(59,130,246,0.25)',
          color: 'var(--blue)',
          html:
            `🏃 ${escapeHtml(sportLabel)} - ` +
            trW531(
              'program.w531.banner_leg_heavy',
              'the recommended session is leg-heavy. '
            ) +
            (upperOption
              ? trW531(
                  'program.w531.banner_consider_upper',
                  'Consider <strong>{label}</strong> instead.',
                  { label: upperOption.label }
                )
              : trW531(
                  'program.w531.banner_only_legs',
                  'Only leg sessions remain, so go lighter or rest today.'
                )),
        };
      }
    }

    const readinessButtons = [
      ['default', trW531('program.w531.readiness.default', 'Full session')],
      ['light', trW531('program.w531.readiness.light', 'Light recovery')],
      ['none', trW531('program.w531.readiness.none', 'Lifts only')],
    ]
      .map(([mode, label]) => {
        const active = readinessMode === mode;
        return `<button class="btn btn-sm ${
          active ? 'btn-primary' : 'btn-secondary'
        }" id="w531-r-${mode}" onclick="window._w531SetReadiness('${mode}')" style="font-size:11px;padding:4px 8px">${escapeHtml(
          label
        )}</button>`;
      })
      .join('');

    const seasonLabel =
      season === 'off'
        ? `🏗️ ${trW531('program.season.off', 'Off-Season')}`
        : `🏒 ${trW531('program.season.in', 'In-Season')}`;
    const testLabel = isTest
      ? ` · 🔬 ${trW531('program.w531.tm_test_week', 'TM Test Week')}`
      : '';
    const cycleWeek = trW531('program.w531.banner.cycleweek', 'C{cycle} W{week}', {
      cycle,
      week,
    });
    const nextText = bestOption
      ? trW531('program.w531.banner.next', ' · Next: <strong>{label}</strong>', {
          label: bestOption.label,
        })
      : '';
    const leftText =
      left === 1
        ? trW531('program.w531.banner.session_left', ' · {left} session left', { left })
        : trW531('program.w531.banner.sessions_left', ' · {left} sessions left', { left });

    return {
      style: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.15)',
      color: 'var(--purple)',
      html:
        `💪 ${seasonLabel}${testLabel} · ${cycleWeek}${nextText}${leftText}${stalledString}` +
        '<div style="margin-top:8px">' +
        `<div style="font-size:11px;color:var(--muted);margin-bottom:4px">${escapeHtml(
          trW531('program.w531.banner.readiness', 'Session readiness:')
        )}</div>` +
        `<div style="display:flex;gap:6px;flex-wrap:wrap">${readinessButtons}</div>` +
        '</div>',
    };
  },
  renderSettings: (rawState: W531State, container: HTMLElement) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const roundingOptions = buildSelectOptions(
      ['1', '2.5', '5'].map((value) => ({ value, label: `${value} kg` })),
      String(state.rounding || 2.5)
    );
    const seasonOptions = buildSelectOptions(
      [
        {
          value: 'off',
          label: trW531('program.w531.settings.off_label', 'Off-Season'),
        },
        {
          value: 'in',
          label: trW531('program.w531.settings.in_label', 'In-Season'),
        },
      ],
      state.season || 'off'
    );
    const stalledAlerts = Object.keys(state.stalledLifts || {})
      .map((index) => {
        const lift = state.lifts.main[Number(index)];
        if (!lift) return '';
        return `<div style="color:var(--orange);font-size:11px;margin-top:2px">${escapeHtml(
          trW531(
            'program.w531.settings.stalled',
            '{name} plateaued and will drop 10% at cycle end.',
            { name: getDisplayName(lift.name) }
          )
        )}</div>`;
      })
      .join('');

    container.innerHTML = `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;background:rgba(167,139,250,0.08);padding:8px 12px;border-radius:8px">
        ${escapeHtml(
          trW531(
            'program.w531.settings.overview',
            '4-week cycles, +5kg lower / +2.5kg upper each cycle, with plateau tracking.'
          )
        )}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:6px;line-height:1.5">
        ${trW531(
          'program.w531.settings.terms',
          '<strong>Terms:</strong> TM = Training Max. 1RM = one-rep max. AMRAP = as many reps as possible.'
        )}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${escapeHtml(
        trW531('program.w531.settings.cycle_week', 'Cycle {cycle} · Week {week} of 4', {
          cycle: state.cycle || 1,
          week: state.week || 1,
        })
      )}</div>
      ${stalledAlerts}
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trW531('program.w531.simple.overview_title', 'Cycle rhythm')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trW531(
              'program.w531.simple.overview',
              'Adjust the season mode, current week, and training maxes. In-season accessory choices stay here in Advanced Setup.'
            )
          )}</div>
          <label>${escapeHtml(
            trW531('program.w531.settings.season', 'Season Mode')
          )}</label>
          <select id="w531-advanced-season">${seasonOptions}</select>
          <div class="settings-row-note">${escapeHtml(
            trW531('program.global_frequency_hint', 'Uses your Training preference: {value}.', {
              value: getTrainingDaysPerWeekLabel(getW531DaysPerWeek()),
            })
          )}</div>
          <label style="margin-top:12px">${escapeHtml(
            trW531('program.w531.settings.rounding', 'Weight Rounding (kg)')
          )}</label>
          <select id="w531-advanced-rounding">${roundingOptions}</select>
          <label style="margin-top:12px">${escapeHtml(
            trW531('program.w531.settings.week_current', 'Current Week in Cycle (1-4)')
          )}</label>
          <input id="w531-advanced-week" min="1" max="4" type="number" value="${escapeHtml(
            String(state.week || 1)
          )}">
          <label class="toggle-row settings-toggle-block" for="w531-advanced-test-week">
            <div>
              <div class="toggle-row-title">${escapeHtml(
                trW531('program.w531.tm_test_enable', 'Enable TM Test Week instead of Deload')
              )}</div>
              <div class="toggle-row-sub">${escapeHtml(
                trW531(
                  'program.w531.settings.tm_test_help',
                  'Replaces the next deload with a 100% TM AMRAP test.'
                )
              )}</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="w531-advanced-test-week"${
                state.testWeekPending ? ' checked' : ''
              }>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </div>
          </label>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trW531('program.w531.settings.training_max', 'Training Max (kg)')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trW531(
              'program.w531.settings.tm_hint',
              'Set to about 90% of your 1RM. Auto increases and resets apply each cycle.'
            )
          )}</div>
          ${buildLiftTmRows(state, 'w531-advanced', true)}
        </div>
      </div>
      <div class="divider-label" style="margin-top:18px"><span>${escapeHtml(
        trW531('program.w531.settings.in_season_accessories', 'In-Season Accessory Exercises')
      )}</span></div>
      ${buildTriumvirateRows(state)}
      <button class="btn btn-purple" style="margin-top:16px" onclick="saveProgramSetup()">
        ${escapeHtml(trW531('program.w531.save_setup', 'Save Program Setup'))}
      </button>
    `;
  },
  renderSimpleSettings: (rawState: W531State, container: HTMLElement) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const roundingOptions = buildSelectOptions(
      ['1', '2.5', '5'].map((value) => ({ value, label: `${value} kg` })),
      String(state.rounding || 2.5)
    );
    const seasonOptions = buildSelectOptions(
      [
        {
          value: 'off',
          label: trW531('program.w531.settings.off_label', 'Off-Season'),
        },
        {
          value: 'in',
          label: trW531('program.w531.settings.in_label', 'In-Season'),
        },
      ],
      state.season || 'off'
    );

    container.innerHTML = `
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trW531('program.w531.simple.overview_title', 'Cycle rhythm')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trW531(
              'program.w531.simple.overview',
              'Set the season mode and current cycle week here. Weekly frequency comes from Training Preferences, and accessory exercise choices stay in Advanced Setup.'
            )
          )}</div>
          <label>${escapeHtml(
            trW531('program.w531.settings.season', 'Season Mode')
          )}</label>
          <select id="w531-basic-season">${seasonOptions}</select>
          <div class="settings-row-note">${escapeHtml(
            trW531('program.global_frequency_hint', 'Uses your Training preference: {value}.', {
              value: getTrainingDaysPerWeekLabel(getW531DaysPerWeek()),
            })
          )}</div>
          <label style="margin-top:12px">${escapeHtml(
            trW531('program.w531.settings.rounding', 'Weight Rounding (kg)')
          )}</label>
          <select id="w531-basic-rounding">${roundingOptions}</select>
          <label style="margin-top:12px">${escapeHtml(
            trW531('program.w531.settings.week_current', 'Current Week in Cycle (1-4)')
          )}</label>
          <input id="w531-basic-week" min="1" max="4" type="number" value="${escapeHtml(
            String(state.week || 1)
          )}">
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trW531('program.w531.settings.training_max', 'Training Max (kg)')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trW531(
              'program.w531.simple.tm_help',
              'Update the current training maxes for the four main lifts. Assistance work stays in Advanced Setup.'
            )
          )}</div>
          ${buildLiftTmRows(state, 'w531-basic', false)}
        </div>
      </div>
    `;
  },
  getSimpleSettingsSummary: (rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const seasonLabel =
      state.season === 'in'
        ? trW531('program.w531.settings.in_label', 'In-Season')
        : trW531('program.w531.settings.off_label', 'Off-Season');
    return trW531(
      'program.w531.simple.summary',
      '{season} · {freq} sessions/week · Week {week}',
      {
        season: seasonLabel,
        freq: getW531DaysPerWeek(),
        week: state.week || 1,
      }
    );
  },
  saveSettings: (rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const nextState = cloneJson(state);
    nextState.season = readInputValue('w531-advanced-season') === 'in' ? 'in' : 'off';
    nextState.rounding = Number(readInputValue('w531-advanced-rounding')) || nextState.rounding;
    nextState.week = normalizeW531Week(readInputValue('w531-advanced-week'));
    nextState.testWeekPending = readCheckedValue('w531-advanced-test-week');
    nextState.lifts.main = nextState.lifts.main.map((lift, index) => ({
      ...lift,
      tm: Number(readInputValue(`w531-advanced-tm-${index}`)) || 0,
    }));
    nextState.triumvirate = cloneTriumvirateState(
      [0, 1, 2, 3].reduce((acc, liftIdx) => {
        const row: [string, string] = [0, 1].map((slotIdx) =>
          resolveExerciseSelectionName(readInputValue(`w531-advanced-tri-${liftIdx}-${slotIdx}`))
        ) as [string, string];
        acc[liftIdx] = row;
        return acc;
      }, {} as W531Triumvirate)
    );
    return nextState;
  },
  saveSimpleSettings: (rawState: W531State) => {
    const state = migrateW531State(cloneJson(rawState) as Record<string, unknown>);
    const nextState = cloneJson(state);
    nextState.season = readInputValue('w531-basic-season') === 'in' ? 'in' : 'off';
    nextState.rounding = Number(readInputValue('w531-basic-rounding')) || nextState.rounding;
    nextState.week = normalizeW531Week(readInputValue('w531-basic-week'));
    nextState.lifts.main = nextState.lifts.main.map((lift, index) => ({
      ...lift,
      tm: Number(readInputValue(`w531-basic-tm-${index}`)) || 0,
    }));
    return nextState;
  },
};
