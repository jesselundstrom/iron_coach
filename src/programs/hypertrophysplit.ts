import { createLegacyProgramAdapter } from './legacy-program';

type HypertrophyLift = {
  tm: number;
  name: string;
};

type HypertrophySplitState = {
  sessionCount: number;
  nextSession: string;
  daysPerWeek: number;
  rounding: number;
  week: number;
  cycle: number;
  weekStartDate: string;
  lifts: Record<string, HypertrophyLift>;
  accessories: Record<string, string>;
};

type HypertrophyWindow = Window & {
  getProgramTrainingDaysPerWeek?: (programId?: string | null) => number;
};

const MS_PER_DAY = 864e5;
const CYCLE_LENGTH = 8;
const LEG_LIFTS = [
  'squat',
  'front squat',
  'deadlift',
  'romanian deadlift',
  'leg press',
  'bulgarian split squat',
  'walking lunges',
  'leg curl',
  'leg extension',
  'hamstring curl',
];
const LIFT_DEFAULTS: Record<string, number> = {
  bench: 60,
  ohp: 40,
  row: 55,
  lat: 45,
  squat: 70,
  rdl: 55,
  deadlift: 90,
  fsquat: 50,
  bench_b: 50,
  row_b: 45,
};
const LIFT_NAMES: Record<string, string> = {
  bench: 'Bench Press',
  ohp: 'OHP',
  row: 'Barbell Rows',
  lat: 'Lat Pulldown (Close Grip)',
  squat: 'Squat',
  rdl: 'Romanian Deadlift',
  deadlift: 'Deadlift',
  fsquat: 'Front Squat',
  bench_b: 'DB Bench',
  row_b: 'Dumbbell Rows',
};
const ACC_DEFAULTS: Record<string, string> = {
  push_chest: 'Cable Flyes',
  push_shoulder: 'Cable Lateral Raises',
  push_triceps: 'Cable Triceps Pressdowns',
  pull_back: 'Chest-Supported Rows',
  pull_biceps: 'EZ Bar Curls',
  pull_rear: 'Face Pulls',
  legs_quad: 'Leg Extensions',
  legs_ham: 'Leg Curls',
  legs_core: 'Hanging Leg Raises',
  upper_back: 'Lat Pulldowns',
  upper_arms: 'Cable Triceps Pressdowns',
  lower_glutes: 'Barbell Hip Thrusts',
  lower_calves: 'Standing Calf Raises',
};

function trHS(key: string, fallback: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return fallback;
  return window.I18N?.t?.(key, params, fallback) || fallback;
}

function getDaysPerWeek() {
  if (typeof window === 'undefined') return 3;
  return (
    Number(
      (window as HypertrophyWindow).getProgramTrainingDaysPerWeek?.(
        'hypertrophysplit'
      )
    ) || 3
  );
}

function normalizeWeek(rawWeek: unknown) {
  const week = parseInt(String(rawWeek || ''), 10);
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(CYCLE_LENGTH, week);
}

function cloneAccessories() {
  return JSON.parse(JSON.stringify(ACC_DEFAULTS)) as Record<string, string>;
}

function createInitialState(): HypertrophySplitState {
  return {
    sessionCount: 0,
    nextSession: 'push',
    daysPerWeek: getDaysPerWeek(),
    rounding: 2.5,
    week: 1,
    cycle: 1,
    weekStartDate: new Date().toISOString(),
    lifts: Object.fromEntries(
      Object.entries(LIFT_DEFAULTS).map(([key, tm]) => [key, { tm, name: LIFT_NAMES[key] }])
    ),
    accessories: cloneAccessories(),
  };
}

function getCatchUpWeek(rawWeek: unknown, elapsedWeeks: unknown) {
  const startWeek = normalizeWeek(rawWeek);
  let week = startWeek;
  const elapsed = Math.max(0, parseInt(String(elapsedWeeks || ''), 10) || 0);
  for (let index = 0; index < elapsed && week < CYCLE_LENGTH; index += 1) {
    week = Math.min(CYCLE_LENGTH, week + 1);
    if (week !== startWeek && week >= 7) break;
  }
  return week;
}

function migrateState(rawState: Record<string, unknown> | null | undefined) {
  const initial = createInitialState();
  const state = (rawState || {}) as Partial<HypertrophySplitState>;
  const nextLifts = { ...initial.lifts };
  Object.keys(nextLifts).forEach((key) => {
    const rawLift = state.lifts?.[key];
    nextLifts[key] = {
      tm: Number.isFinite(Number(rawLift?.tm))
        ? Number(rawLift?.tm)
        : initial.lifts[key].tm,
      name: String(rawLift?.name || initial.lifts[key].name),
    };
  });
  const nextAccessories = cloneAccessories();
  Object.keys(nextAccessories).forEach((key) => {
    if (state.accessories?.[key]) nextAccessories[key] = String(state.accessories[key]);
  });
  return {
    sessionCount: Number.isFinite(Number(state.sessionCount))
      ? Number(state.sessionCount)
      : 0,
    nextSession: String(state.nextSession || 'push'),
    daysPerWeek: getDaysPerWeek(),
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : 2.5,
    week: normalizeWeek(state.week),
    cycle: Number.isFinite(Number(state.cycle)) ? Number(state.cycle) : 1,
    weekStartDate: String(state.weekStartDate || new Date().toISOString()),
    lifts: nextLifts,
    accessories: nextAccessories,
  };
}

export const hypertrophySplitProgram = createLegacyProgramAdapter(
  {
    id: 'hypertrophysplit',
    name: 'Hypertrophy Split',
    description: 'Adaptive hypertrophy program that scales from 2 to 6 days per week.',
    icon: '💪',
    legLifts: LEG_LIFTS,
  },
  {
    getInitialState: () => createInitialState(),
    migrateState: (state: Record<string, unknown>) => migrateState(state),
    dateCatchUp: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      if (state.week >= CYCLE_LENGTH) return state;
      const daysSince =
        (Date.now() - new Date(state.weekStartDate || Date.now()).getTime()) / MS_PER_DAY;
      if (daysSince < 7) return state;
      const nextWeek = getCatchUpWeek(state.week, Math.floor(daysSince / 7));
      if (nextWeek === state.week) return state;
      return {
        ...state,
        week: nextWeek,
        weekStartDate: new Date().toISOString(),
      };
    },
    getBlockInfo: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      const week = state.week || 1;
      const pctByWeek: Record<number, number> = {
        1: 65,
        2: 68,
        3: 72,
        4: 75,
        5: 78,
        6: 80,
        7: 60,
        8: 60,
      };
      const blockByWeek: Record<number, string> = {
        1: 'Ramp-up',
        2: 'Ramp-up',
        3: 'Build',
        4: 'Build',
        5: 'Push',
        6: 'Push',
        7: 'Deload',
        8: 'Deload',
      };
      const isDeload = week >= 7;
      return {
        name: trHS(`program.hs.block.${isDeload ? 'deload' : blockByWeek[week].toLowerCase()}`, blockByWeek[week] || 'Ramp-up'),
        weekLabel: trHS('program.hs.week_label', 'W{week}', { week }),
        pct: pctByWeek[week] || 65,
        isDeload,
        totalWeeks: CYCLE_LENGTH,
      };
    },
    getDashboardTMs: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      const freq = getDaysPerWeek();
      const activeKeysByFreq: Record<number, string[]> = {
        2: ['bench', 'row', 'squat', 'rdl'],
        3: ['bench', 'ohp', 'row', 'lat', 'squat', 'rdl'],
        4: ['bench', 'row', 'ohp', 'lat', 'squat', 'rdl', 'deadlift', 'fsquat'],
        5: ['bench', 'ohp', 'row', 'lat', 'squat', 'rdl', 'deadlift', 'fsquat'],
        6: ['bench', 'ohp', 'row', 'lat', 'squat', 'rdl', 'deadlift', 'fsquat', 'bench_b', 'row_b'],
      };
      return (activeKeysByFreq[freq] || activeKeysByFreq[3])
        .filter((key) => state.lifts[key])
        .map((key) => ({
          name: state.lifts[key].name || LIFT_NAMES[key] || key,
          value: `${state.lifts[key].tm}kg`,
        }));
    },
  }
);
