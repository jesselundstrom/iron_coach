import { createLegacyProgramAdapter } from './legacy-program';

type StrongLiftsState = {
  sessionCount: number;
  nextWorkout: 'A' | 'B';
  rounding: number;
  accessories: boolean;
  accessorySwaps: {
    pull: string;
    core: string;
    iso: string;
  };
  lifts: Record<string, { weight: number; failures: number }>;
};

const ACCESSORY_DEFAULTS = {
  pull: 'Chin-ups',
  core: 'Ab Wheel Rollouts',
  iso: 'Dumbbell Lateral Raises',
};

function trSL(key: string, fallback: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return fallback;
  return window.I18N?.t?.(key, params, fallback) || fallback;
}

function createInitialState(): StrongLiftsState {
  return {
    sessionCount: 0,
    nextWorkout: 'A',
    rounding: 2.5,
    accessories: false,
    accessorySwaps: { ...ACCESSORY_DEFAULTS },
    lifts: {
      squat: { weight: 60, failures: 0 },
      bench: { weight: 50, failures: 0 },
      row: { weight: 50, failures: 0 },
      ohp: { weight: 40, failures: 0 },
      deadlift: { weight: 80, failures: 0 },
    },
  };
}

function migrateState(rawState: Record<string, unknown> | null | undefined) {
  const initial = createInitialState();
  const state = (rawState || {}) as Partial<StrongLiftsState>;
  const next = {
    ...initial,
    sessionCount: Number.isFinite(Number(state.sessionCount))
      ? Number(state.sessionCount)
      : 0,
    nextWorkout: state.nextWorkout === 'B' ? 'B' : 'A',
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : 2.5,
    accessories: state.accessories === true,
    accessorySwaps: {
      pull: String(state.accessorySwaps?.pull || ACCESSORY_DEFAULTS.pull),
      core: String(state.accessorySwaps?.core || ACCESSORY_DEFAULTS.core),
      iso: String(state.accessorySwaps?.iso || ACCESSORY_DEFAULTS.iso),
    },
    lifts: { ...initial.lifts },
  };
  Object.keys(next.lifts).forEach((key) => {
    next.lifts[key] = {
      weight: Number.isFinite(Number(state.lifts?.[key]?.weight))
        ? Number(state.lifts?.[key]?.weight)
        : initial.lifts[key].weight,
      failures: Number.isFinite(Number(state.lifts?.[key]?.failures))
        ? Number(state.lifts?.[key]?.failures)
        : 0,
    };
  });
  return next;
}

export const strongLifts5x5Program = createLegacyProgramAdapter(
  {
    id: 'stronglifts5x5',
    name: 'StrongLifts 5x5',
    description: 'Beginner strength program with steady weight increases.',
    icon: '📈',
    legLifts: ['squat', 'deadlift'],
  },
  {
    getInitialState: () => createInitialState(),
    migrateState: (state: Record<string, unknown>) => migrateState(state),
    getBlockInfo: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      return {
        name: trSL('program.sl.linear_progression', 'Linear Progression'),
        weekLabel:
          trSL('common.session', 'Session') + ' ' + String(state.sessionCount || 0),
        pct: null,
        isDeload: false,
        totalWeeks: null,
      };
    },
    getDashboardTMs: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      const lifts = state.lifts || {};
      return [
        { name: 'Squat', value: `${lifts.squat?.weight || 0}kg` },
        { name: 'Bench', value: `${lifts.bench?.weight || 0}kg` },
        { name: 'Deadlift', value: `${lifts.deadlift?.weight || 0}kg` },
        { name: 'OHP', value: `${lifts.ohp?.weight || 0}kg` },
      ];
    },
  }
);
