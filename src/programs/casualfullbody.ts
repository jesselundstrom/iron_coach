import { createLegacyProgramAdapter } from './legacy-program';

type CasualFullBodyState = {
  sessionCount: number;
  currentStreak: number;
  lastSessionWeekKey: string | null;
  lastExercisesUsed: string[];
  daysPerWeek: number;
};

function trCFB(key: string, fallback: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return fallback;
  return window.I18N?.t?.(key, params, fallback) || fallback;
}

function createInitialState(): CasualFullBodyState {
  return {
    sessionCount: 0,
    currentStreak: 0,
    lastSessionWeekKey: null,
    lastExercisesUsed: [],
    daysPerWeek: 3,
  };
}

function migrateState(rawState: Record<string, unknown> | null | undefined) {
  const state = (rawState || {}) as Partial<CasualFullBodyState>;
  return {
    sessionCount: Number.isFinite(Number(state.sessionCount))
      ? Number(state.sessionCount)
      : 0,
    currentStreak: Number.isFinite(Number(state.currentStreak))
      ? Number(state.currentStreak)
      : 0,
    lastSessionWeekKey: state.lastSessionWeekKey
      ? String(state.lastSessionWeekKey)
      : null,
    lastExercisesUsed: Array.isArray(state.lastExercisesUsed)
      ? state.lastExercisesUsed.map((name) => String(name || ''))
      : [],
    daysPerWeek: 3,
  };
}

export const casualFullBodyProgram = createLegacyProgramAdapter(
  {
    id: 'casualfullbody',
    name: 'Gym Basics',
    description:
      'Easy gym program with rotating full-body sessions. No maxes or planning needed.',
    icon: '🎯',
    legLifts: [
      'barbell back squat',
      'dumbbell goblet squat',
      'machine leg press',
      'dumbbell lunges',
      'barbell romanian deadlift',
      'dumbbell romanian deadlift',
      'dumbbell glute bridges',
    ],
  },
  {
    getInitialState: () => createInitialState(),
    migrateState: (state: Record<string, unknown>) => migrateState(state),
    getBlockInfo: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      const streak = state.currentStreak || 0;
      const streakStr =
        streak > 0
          ? ' · ' +
            trCFB('program.cfb.week_streak_long', '{count}-week streak', {
              count: streak,
            })
          : '';
      return {
        name: trCFB('program.cfb.block_name', 'Gym Basics'),
        weekLabel:
          trCFB('program.cfb.block_label', 'Session {count}', {
            count: state.sessionCount || 0,
          }) + streakStr,
        pct: null,
        isDeload: false,
        totalWeeks: null,
      };
    },
    getDashboardTMs: (rawState: Record<string, unknown>) => {
      const state = migrateState(rawState);
      const streak = state.currentStreak || 0;
      return [
        {
          name: trCFB('program.cfb.stats.sessions', 'Sessions'),
          value: String(state.sessionCount || 0),
        },
        {
          name: trCFB('program.cfb.stats.week_streak', 'Week Streak'),
          value:
            streak > 0
              ? trCFB(
                  streak === 1
                    ? 'program.cfb.week_count_one'
                    : 'program.cfb.week_count_many',
                  streak === 1 ? '{count} week' : '{count} weeks',
                  { count: streak }
                )
              : trCFB('program.cfb.none', '—'),
        },
      ];
    },
  }
);
