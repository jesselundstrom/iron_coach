import { getDisplayName } from '../domain/exercise-library';
import type { ProgramPlugin } from '../domain/program-plugin';
import type {
  SessionOption,
  SportSchedule,
  WorkoutExercise,
  WorkoutRecord,
} from '../domain/types';

type StrongLiftsLiftKey = 'squat' | 'bench' | 'row' | 'ohp' | 'deadlift';
type AccessorySlotKey = 'pull' | 'core' | 'iso';

type StrongLiftsState = {
  sessionCount: number;
  nextWorkout: 'A' | 'B';
  rounding: number;
  accessories: boolean;
  accessorySwaps: Record<AccessorySlotKey, string>;
  lifts: Record<StrongLiftsLiftKey, { weight: number; failures: number }>;
};

type StrongLiftsSwapInfo = {
  category: string;
  filters: Record<string, unknown>;
  options: string[];
  note: string;
};

type StrongLiftsPlugin = Omit<
  ProgramPlugin<StrongLiftsState>,
  'getAuxSwapOptions' | 'getBackSwapOptions' | 'onAuxSwap'
> & {
  getSessionCharacter?: (selectedOption: string, state: StrongLiftsState) => {
    tone: string;
    icon: string;
    labelKey: string;
    labelFallback: string;
    labelParams: Record<string, unknown>;
  };
  getPreSessionNote?: (
    selectedOption: string,
    state: StrongLiftsState
  ) => string;
  getAuxSwapOptions?: (
    exercise?: WorkoutExercise
  ) => StrongLiftsSwapInfo | string[] | null;
  getBackSwapOptions?: () => string[] | Array<Record<string, unknown>>;
  onAuxSwap?: (
    slotIdx: number,
    newName: string,
    state: StrongLiftsState
  ) => StrongLiftsState;
};

const ACCESSORY_DEFAULTS: Record<AccessorySlotKey, string> = {
  pull: 'Chin-ups',
  core: 'Ab Wheel Rollouts',
  iso: 'Dumbbell Lateral Raises',
};

const WORKOUT_A: StrongLiftsLiftKey[] = ['squat', 'bench', 'row'];
const WORKOUT_B: StrongLiftsLiftKey[] = ['squat', 'ohp', 'deadlift'];

const LIFT_NAMES: Record<StrongLiftsLiftKey, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  row: 'Barbell Row',
  ohp: 'Overhead Press (OHP)',
  deadlift: 'Deadlift',
};

const LIFT_INCREMENTS: Record<StrongLiftsLiftKey, number> = {
  squat: 2.5,
  bench: 2.5,
  row: 2.5,
  ohp: 2.5,
  deadlift: 5,
};

const ACCESSORY_POOLS: Record<AccessorySlotKey, string[]> = {
  pull: ['Chin-ups', 'Lat Pulldowns', 'Assisted Chin-ups', 'Pull-ups', 'Neutral-Grip Pull-ups'],
  core: ['Ab Wheel Rollouts', 'Hanging Leg Raises', 'Weighted Planks', 'Dead Bugs', 'Cable Crunches'],
  iso: ['Dumbbell Lateral Raises', 'Dumbbell Bicep Curls', 'Band Pull-Aparts'],
};

const ACCESSORY_FILTERS: Record<AccessorySlotKey, Record<string, unknown>> = {
  pull: {
    movementTags: ['vertical_pull'],
    equipmentTags: ['pullup_bar', 'bodyweight', 'cable', 'machine'],
    muscleGroups: ['back', 'biceps'],
  },
  core: {
    movementTags: ['core'],
    equipmentTags: ['bodyweight', 'cable', 'band', 'pullup_bar'],
    muscleGroups: ['core'],
  },
  iso: {
    movementTags: ['isolation'],
    equipmentTags: ['dumbbell', 'cable', 'band'],
    muscleGroups: ['shoulders', 'biceps'],
  },
};

const ACCESSORY_LABELS: Record<AccessorySlotKey, string> = {
  pull: 'Vertical pull',
  core: 'Core stability',
  iso: 'Lateral delts',
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trSL(key: string, fallback: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return fallback;
  return window.I18N?.t?.(key, params, fallback) || fallback;
}

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeWeight(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(999, Math.round(parsed * 10) / 10));
}

function roundToIncrement(weight: number, increment: number) {
  const step = increment || 2.5;
  return Math.round(weight / step) * step;
}

function getAccessorySlot(slotIdx: number): AccessorySlotKey | null {
  if (slotIdx === 10) return 'pull';
  if (slotIdx === 11) return 'core';
  if (slotIdx === 12) return 'iso';
  return null;
}

function getAccessoryNote(slot: AccessorySlotKey) {
  return slot === 'pull'
    ? trSL('program.sl.acc_pull_note', 'Vertical pull - 3x8')
    : slot === 'core'
      ? trSL('program.sl.acc_core_note', 'Core stability - 3x10')
      : trSL('program.sl.acc_iso_note', 'Lateral delts - 3x12');
}

function getAccessorySwapInfo(slot: AccessorySlotKey, currentName?: string): StrongLiftsSwapInfo {
  const options = [...ACCESSORY_POOLS[slot]];
  if (currentName && !options.includes(currentName)) options.unshift(currentName);
  return {
    category: slot === 'iso' ? 'isolation' : slot,
    filters: { ...ACCESSORY_FILTERS[slot] },
    options,
    note: getAccessoryNote(slot),
  };
}

function getWorkoutKeys(workout: 'A' | 'B') {
  return workout === 'B' ? WORKOUT_B : WORKOUT_A;
}

function getWorkoutLetter(selectedOption?: string | null) {
  return selectedOption === 'B' ? 'B' : 'A';
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

function migrateState(rawState: Record<string, unknown> | null | undefined): StrongLiftsState {
  const initial = createInitialState();
  const state = (rawState || {}) as Partial<StrongLiftsState>;
  const next: StrongLiftsState = {
    ...initial,
    sessionCount: Number.isFinite(Number(state.sessionCount))
      ? Number(state.sessionCount)
      : 0,
    nextWorkout: state.nextWorkout === 'B' ? 'B' : 'A',
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : initial.rounding,
    accessories: state.accessories === true,
    accessorySwaps: {
      pull: String(state.accessorySwaps?.pull || ACCESSORY_DEFAULTS.pull),
      core: String(state.accessorySwaps?.core || ACCESSORY_DEFAULTS.core),
      iso: String(state.accessorySwaps?.iso || ACCESSORY_DEFAULTS.iso),
    },
    lifts: cloneJson(initial.lifts),
  };

  (Object.keys(initial.lifts) as StrongLiftsLiftKey[]).forEach((key) => {
    next.lifts[key] = {
      weight: sanitizeWeight(state.lifts?.[key]?.weight, initial.lifts[key].weight),
      failures: Number.isFinite(Number(state.lifts?.[key]?.failures))
        ? Math.max(0, Number(state.lifts?.[key]?.failures))
        : 0,
    };
  });

  return next;
}

function buildWorkoutLabel(workout: 'A' | 'B', state: StrongLiftsState) {
  const exercises = getWorkoutKeys(workout).map((key) => getDisplayName(LIFT_NAMES[key]));
  const accessorySuffix = state.accessories
    ? ` + ${trSL('program.sl.accessories_short', 'Accessories')}`
    : '';
  return `${trSL('program.sl.workout', 'Workout')} ${workout}: ${exercises.join(' + ')}${accessorySuffix}`;
}

function buildSelectOptions(options: Array<{ value: string; label: string }>, selectedValue: string) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${
          option.value === selectedValue ? ' selected' : ''
        }>${escapeHtml(option.label)}</option>`
    )
    .join('');
}

function readInputValue(id: string) {
  if (typeof document === 'undefined') return '';
  return String((document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || '');
}

function readCheckedValue(id: string) {
  if (typeof document === 'undefined') return false;
  return (document.getElementById(id) as HTMLInputElement | null)?.checked === true;
}

function readStateFromForm(rawState: StrongLiftsState, prefix: 'sl-basic' | 'sl-advanced') {
  const next = migrateState(rawState);
  next.rounding = Number(readInputValue(`${prefix}-rounding`)) || next.rounding || 2.5;
  next.nextWorkout = getWorkoutLetter(readInputValue(`${prefix}-next-workout`));
  next.accessories = readCheckedValue(`${prefix}-accessories`);

  (Object.keys(next.lifts) as StrongLiftsLiftKey[]).forEach((key) => {
    next.lifts[key].weight = sanitizeWeight(
      readInputValue(`${prefix}-lift-${key}`),
      next.lifts[key].weight
    );
  });

  (Object.keys(next.accessorySwaps) as AccessorySlotKey[]).forEach((slot) => {
    const value = readInputValue(`${prefix}-accessory-${slot}`);
    next.accessorySwaps[slot] = value || ACCESSORY_DEFAULTS[slot];
  });

  return next;
}

function renderLiftRows(
  state: StrongLiftsState,
  prefix: 'sl-basic' | 'sl-advanced',
  includeFailures: boolean
) {
  return (Object.keys(LIFT_NAMES) as StrongLiftsLiftKey[])
    .map((key) => {
      const lift = state.lifts[key];
      return `
        <div class="lift-row">
          <span class="lift-label" style="min-width:100px">${escapeHtml(
            getDisplayName(LIFT_NAMES[key])
          )}</span>
          <input
            id="${prefix}-lift-${key}"
            min="0"
            step="0.1"
            type="number"
            value="${escapeHtml(String(lift.weight || 0))}"
            style="flex:1"
          >
          ${
            includeFailures
              ? `<span style="font-size:11px;color:var(--muted);margin-left:8px;white-space:nowrap">${trSL(
                  'program.sl.failed_sessions',
                  'failed sessions'
                )}: ${escapeHtml(String(lift.failures || 0))}</span>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}

function renderAccessoryRows(
  state: StrongLiftsState,
  prefix: 'sl-basic' | 'sl-advanced'
) {
  return (Object.keys(ACCESSORY_DEFAULTS) as AccessorySlotKey[])
    .map((slot) => {
      const options = buildSelectOptions(
        getAccessorySwapInfo(slot).options.map((name) => ({
          value: name,
          label: getDisplayName(name),
        })),
        state.accessorySwaps[slot]
      );
      return `
        <label>${escapeHtml(
          trSL(`program.sl.accessory.${slot}`, ACCESSORY_LABELS[slot])
        )}</label>
        <select id="${prefix}-accessory-${slot}">${options}</select>
      `;
    })
    .join('');
}

export const strongLifts5x5Program: StrongLiftsPlugin = {
  id: 'stronglifts5x5',
  name: 'StrongLifts 5x5',
  description: 'Beginner strength program with steady weight increases.',
  icon: '📈',
  legLifts: ['squat', 'deadlift'],
  getInitialState: () => createInitialState(),
  migrateState: (state: Record<string, unknown>) => migrateState(state),
  getCapabilities: () => ({
    difficulty: 'beginner',
    frequencyRange: { min: 3, max: 3 },
    recommendationScore: (days: number, prefs?: Record<string, unknown>) => {
      let score = prefs?.goal === 'strength' ? 5 : 1;
      score += days === 3 ? 3 : -8;
      return score;
    },
  }),
  getTrainingDaysRange: () => ({ min: 3, max: 3 }),
  getSessionOptions: (rawState: StrongLiftsState): SessionOption[] => {
    const state = migrateState(rawState);
    const nextWorkout = state.nextWorkout || 'A';
    const otherWorkout = nextWorkout === 'A' ? 'B' : 'A';
    return [
      {
        value: nextWorkout,
        label: `⭐ ${buildWorkoutLabel(nextWorkout, state)}`,
        isRecommended: true,
        done: false,
      },
      {
        value: otherWorkout,
        label: buildWorkoutLabel(otherWorkout, state),
        isRecommended: false,
        done: false,
      },
    ];
  },
  buildSession: (
    selectedOption: string,
    rawState: StrongLiftsState
  ): WorkoutExercise[] => {
    const state = migrateState(rawState);
    const workout = getWorkoutLetter(selectedOption);
    const exercises: WorkoutExercise[] = getWorkoutKeys(workout).map((key) => {
      const currentLift = state.lifts[key];
      const weight = roundToIncrement(currentLift.weight, state.rounding || 2.5);
      const isDeadlift = key === 'deadlift';
      const setCount = isDeadlift ? 1 : 5;
      return {
        id: Date.now() + Math.random(),
        name: LIFT_NAMES[key],
        liftKey: key,
        note: `${weight}kg x ${isDeadlift ? '1x5' : '5x5'}`,
        isAux: false,
        tm: weight,
        auxSlotIdx: -1,
        sets: Array.from({ length: setCount }, () => ({
          weight,
          reps: 5,
          done: false,
          rpe: null,
        })),
      } as WorkoutExercise;
    });

    if (!state.accessories) return exercises;

    const pullName = state.accessorySwaps.pull || ACCESSORY_DEFAULTS.pull;
    exercises.push({
      id: Date.now() + Math.random(),
      name: pullName,
      note: getAccessoryNote('pull'),
      isAux: true,
      isAccessory: true,
      tm: 0,
      auxSlotIdx: 10,
      sets: Array.from({ length: 3 }, () => ({
        weight: '',
        reps: 8,
        done: false,
        rpe: null,
      })),
    });

    const secondarySlot = workout === 'A' ? 'core' : 'iso';
    const secondaryName =
      state.accessorySwaps[secondarySlot] || ACCESSORY_DEFAULTS[secondarySlot];
    exercises.push({
      id: Date.now() + Math.random(),
      name: secondaryName,
      note: getAccessoryNote(secondarySlot),
      isAux: true,
      isAccessory: true,
      tm: 0,
      auxSlotIdx: secondarySlot === 'core' ? 11 : 12,
      sets: Array.from({ length: 3 }, () => ({
        weight: '',
        reps: secondarySlot === 'core' ? 10 : 12,
        done: false,
        rpe: null,
      })),
    });

    return exercises;
  },
  getSessionLabel: (
    selectedOption: string,
    rawState: StrongLiftsState
  ) => {
    const state = migrateState(rawState);
    const workout = getWorkoutLetter(selectedOption);
    return `📈 ${trSL('program.sl.workout', 'Workout')} ${workout} - ${trSL(
      'common.session',
      'Session'
    )} ${String((state.sessionCount || 0) + 1)}`;
  },
  getBlockInfo: (rawState: StrongLiftsState) => {
    const state = migrateState(rawState);
    return {
      name: trSL('program.sl.linear_progression', 'Linear Progression'),
      weekLabel:
        `${trSL('common.session', 'Session')} ${String(state.sessionCount || 0)}`,
      pct: null,
      isDeload: false,
      totalWeeks: null,
    };
  },
  getSessionCharacter: () => ({
    tone: 'normal',
    icon: '🏋️',
    labelKey: 'program.sl.character.normal',
    labelFallback: trSL(
      'program.sl.character.normal',
      'Linear 5x5 - add weight on success'
    ),
    labelParams: {},
  }),
  getPreSessionNote: (
    selectedOption: string,
    rawState: StrongLiftsState
  ) => {
    const state = migrateState(rawState);
    return trSL(
      'program.sl.note.default',
      'Session {count} - Workout {next}. Add weight if all 5x5 completed last time.',
      {
        count: (state.sessionCount || 0) + 1,
        next: getWorkoutLetter(selectedOption),
      }
    );
  },
  adjustAfterSession: (
    exercises: WorkoutExercise[],
    rawState: StrongLiftsState,
    selectedOption?: string
  ) => {
    const state = migrateState(rawState);
    const workout = getWorkoutLetter(selectedOption);
    getWorkoutKeys(workout).forEach((key) => {
      const exercise = exercises.find(
        (item: WorkoutExercise & { liftKey?: StrongLiftsLiftKey }) =>
          item.liftKey === key
      );
      if (!exercise) return;
      const lift = state.lifts[key];
      const allDone =
        exercise.sets.length > 0 &&
        exercise.sets.every(
          (set: WorkoutExercise['sets'][number]) =>
            set.done && (parseInt(String(set.reps || ''), 10) || 0) >= 5
        );
      if (allDone) {
        lift.weight = Math.round((lift.weight + LIFT_INCREMENTS[key]) * 10) / 10;
        lift.failures = 0;
        return;
      }
      lift.failures = (lift.failures || 0) + 1;
      if (lift.failures < 3) return;
      lift.weight = roundToIncrement(lift.weight * 0.9, state.rounding || 2.5);
      lift.failures = 0;
    });
    return state;
  },
  advanceState: (rawState: StrongLiftsState) => {
    const state = migrateState(rawState);
    return {
      ...state,
      nextWorkout: state.nextWorkout === 'A' ? 'B' : 'A',
      sessionCount: (state.sessionCount || 0) + 1,
    };
  },
  dateCatchUp: (rawState: StrongLiftsState) => migrateState(rawState),
  getAuxSwapOptions: (exercise) => {
    const slot = getAccessorySlot(Number(exercise?.auxSlotIdx));
    if (!slot) return null;
    return getAccessorySwapInfo(slot, exercise?.name);
  },
  getBackSwapOptions: () => [],
  onAuxSwap: (slotIdx, newName, rawState) => {
    const state = migrateState(rawState);
    const slot = getAccessorySlot(slotIdx);
    if (!slot) return state;
    state.accessorySwaps[slot] = String(newName || '').trim() || ACCESSORY_DEFAULTS[slot];
    return state;
  },
  onBackSwap: (state: StrongLiftsState) => state,
  getDashboardTMs: (rawState: StrongLiftsState) => {
    const state = migrateState(rawState);
    return [
      { name: 'Squat', value: `${state.lifts.squat.weight}kg` },
      { name: 'Bench', value: `${state.lifts.bench.weight}kg` },
      { name: 'Deadlift', value: `${state.lifts.deadlift.weight}kg` },
      { name: 'OHP', value: `${state.lifts.ohp.weight}kg` },
    ];
  },
  getBannerHTML: (
    _options: SessionOption[],
    rawState: StrongLiftsState,
    schedule: SportSchedule,
    workouts: WorkoutRecord[]
  ) => {
    const state = migrateState(rawState);
    const todayDow = new Date().getDay();
    const sportDays = schedule?.sportDays || [];
    const legsHeavy = schedule?.sportLegsHeavy !== false;
    const recentHours =
      ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
        String(schedule?.sportIntensity || 'hard')
      ] || 30;
    const sportName = schedule?.sportName || trSL('common.sport', 'Sport');
    const isSportDay = sportDays.includes(todayDow);
    const hadSportRecently = (workouts || []).some(
      (workout: WorkoutRecord) =>
        (workout.type === 'sport' || workout.type === 'hockey') &&
        (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
    );

    if ((isSportDay || hadSportRecently) && legsHeavy) {
      const sportLabel = isSportDay
        ? trSL('dashboard.status.sport_day', '{sport} day', { sport: sportName })
        : trSL('dashboard.post_sport', 'Post-{sport}', {
            sport: String(sportName).toLowerCase(),
          });
      return {
        style: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.25)',
        color: 'var(--blue)',
        html: `🏃 ${sportLabel} - ${trSL(
          'program.sl.banner_sport_warning',
          'Both workouts include Squat. Consider going lighter or resting today.'
        )}`,
      };
    }

    return {
      style: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.15)',
      color: 'var(--purple)',
      html: `📈 ${trSL('common.session', 'Session')} ${
        (state.sessionCount || 0) + 1
      } - <strong>${trSL('program.sl.workout', 'Workout')} ${
        state.nextWorkout
      }</strong> ${trSL('program.sl.is_next', 'is next')} - ${trSL(
        'program.sl.squat',
        'Squat'
      )}: ${state.lifts.squat.weight}kg`,
    };
  },
  renderSimpleSettings: (rawState: StrongLiftsState, container: HTMLElement) => {
    const state = migrateState(rawState);
    const roundingOptions = buildSelectOptions(
      ['1', '2.5', '5'].map((value) => ({
        value,
        label: `${value} kg`,
      })),
      String(state.rounding || 2.5)
    );
    const nextWorkoutOptions = buildSelectOptions(
      [
        { value: 'A', label: trSL('program.sl.workout_a', 'Workout A') },
        { value: 'B', label: trSL('program.sl.workout_b', 'Workout B') },
      ],
      state.nextWorkout
    );

    container.innerHTML = `
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${trSL(
            'program.sl.simple.overview_title',
            'Training flow'
          )}</div>
          <div class="settings-section-sub">${trSL(
            'program.sl.simple.overview',
            'Adjust the core lift weights, rounding, and whether StrongLifts should add optional accessories after the main work.'
          )}</div>
          <label>${trSL('program.sl.weight_rounding', 'Weight Rounding (kg)')}</label>
          <select id="sl-basic-rounding">${roundingOptions}</select>
          <label style="margin-top:12px">${trSL(
            'program.sl.next_workout',
            'Next Workout'
          )}</label>
          <select id="sl-basic-next-workout">${nextWorkoutOptions}</select>
          <label class="toggle-row settings-toggle-block" for="sl-basic-accessories">
            <div>
              <div class="toggle-row-title">${trSL(
                'program.sl.acc_toggle',
                'Include accessories after main lifts'
              )}</div>
              <div class="toggle-row-sub">${trSL(
                'program.sl.acc_help',
                'Accessories are removed automatically for short sessions or sport-support goal.'
              )}</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="sl-basic-accessories"${
                state.accessories ? ' checked' : ''
              }>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </div>
          </label>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${trSL(
            'program.sl.working_weights',
            'Working Weights (kg)'
          )}</div>
          <div class="settings-section-sub">${trSL(
            'program.sl.progression_help',
            'Add +2.5kg (+5kg deadlift) after successful sessions. 3 failed sessions trigger a 10% deload.'
          )}</div>
          <div>${renderLiftRows(state, 'sl-basic', false)}</div>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${trSL(
            'program.sl.accessories_title',
            'Optional Accessories'
          )}</div>
          <div class="settings-section-sub">${trSL(
            'program.sl.acc_rationale',
            'Adds vertical pulling, core work, and lateral delts to balance the main compounds.'
          )}</div>
          ${renderAccessoryRows(state, 'sl-basic')}
        </div>
      </div>
    `;
  },
  getSimpleSettingsSummary: (rawState: StrongLiftsState) => {
    const state = migrateState(rawState);
    const accessories = state.accessories
      ? trSL('program.sl.accessories_short', 'Accessories')
      : trSL('common.off', 'Off');
    return trSL(
      'program.sl.simple.summary',
      'Workout {next} next - accessories: {acc}',
      { next: state.nextWorkout, acc: accessories }
    );
  },
  renderSettings: (rawState: StrongLiftsState, container: HTMLElement) => {
    const state = migrateState(rawState);
    const roundingOptions = buildSelectOptions(
      ['1', '2.5', '5'].map((value) => ({
        value,
        label: `${value} kg`,
      })),
      String(state.rounding || 2.5)
    );
    const nextWorkoutOptions = buildSelectOptions(
      [
        { value: 'A', label: trSL('program.sl.workout_a', 'Workout A') },
        { value: 'B', label: trSL('program.sl.workout_b', 'Workout B') },
      ],
      state.nextWorkout
    );

    container.innerHTML = `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;background:rgba(167,139,250,0.08);padding:8px 12px;border-radius:8px">
        ${trSL(
          'program.sl.split_overview',
          'A: Squat + Bench + Row - B: Squat + Overhead Press + Deadlift - alternating 3 sessions/week'
        )}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">
        ${trSL('program.sl.session_completed_next', 'Session {count} completed - Next: Workout {workout}', {
          count: state.sessionCount || 0,
          workout: state.nextWorkout,
        })}
      </div>
      <label>${trSL('program.sl.weight_rounding', 'Weight Rounding (kg)')}</label>
      <select id="sl-advanced-rounding">${roundingOptions}</select>
      <div class="divider-label" style="margin-top:18px"><span>${trSL(
        'program.sl.working_weights',
        'Working Weights (kg)'
      )}</span></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${trSL(
        'program.sl.progression_help',
        'Add +2.5kg (+5kg deadlift) after successful sessions. 3 failed sessions trigger a 10% deload.'
      )}</div>
      ${renderLiftRows(state, 'sl-advanced', true)}
      <div class="divider-label" style="margin-top:18px"><span>${trSL(
        'program.sl.accessories_title',
        'Optional Accessories'
      )}</span></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${trSL(
        'program.sl.acc_rationale',
        'Adds vertical pulling, core work, and lateral delts to balance the main compounds.'
      )}</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="sl-advanced-accessories"${
          state.accessories ? ' checked' : ''
        }>
        ${trSL('program.sl.acc_toggle', 'Include accessories after main lifts')}
      </label>
      <div style="margin-top:10px">${renderAccessoryRows(state, 'sl-advanced')}</div>
      <label style="margin-top:14px">${trSL(
        'program.sl.next_workout',
        'Next Workout'
      )}</label>
      <select id="sl-advanced-next-workout">${nextWorkoutOptions}</select>
      <button class="btn btn-purple" style="margin-top:16px" onclick="saveProgramSetup()">${trSL(
        'program.sl.save_setup',
        'Save Program Setup'
      )}</button>
    `;
  },
  saveSettings: (rawState: StrongLiftsState) =>
    readStateFromForm(migrateState(rawState), 'sl-advanced'),
  saveSimpleSettings: (rawState: StrongLiftsState) =>
    readStateFromForm(migrateState(rawState), 'sl-basic'),
};
