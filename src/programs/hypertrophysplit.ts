import { getDisplayName } from '../domain/exercise-library';
import type { ProgramPlugin, ProgramSessionBuildContext } from '../domain/program-plugin';
import type {
  FatigueResult,
  SessionOption,
  SportSchedule,
  WorkoutExercise,
  WorkoutRecord,
} from '../domain/types';

type HypertrophyLiftKey =
  | 'bench'
  | 'ohp'
  | 'row'
  | 'lat'
  | 'squat'
  | 'rdl'
  | 'deadlift'
  | 'fsquat'
  | 'bench_b'
  | 'row_b';

type AccessoryKey =
  | 'push_chest'
  | 'push_shoulder'
  | 'push_triceps'
  | 'pull_back'
  | 'pull_biceps'
  | 'pull_rear'
  | 'legs_quad'
  | 'legs_ham'
  | 'legs_core'
  | 'lower_b_single'
  | 'lower_b_ham';

type HypertrophySessionKey =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'upper_b'
  | 'lower_b';

type HypertrophyLift = {
  tm: number;
  name: string;
};

type HypertrophySplitState = {
  sessionCount: number;
  nextSession: HypertrophySessionKey;
  daysPerWeek: number;
  rounding: number;
  week: number;
  cycle: number;
  weekStartDate: string;
  lifts: Record<HypertrophyLiftKey, HypertrophyLift>;
  accessories: Record<AccessoryKey, string>;
};

type TemplateLiftSlot = {
  liftKey: HypertrophyLiftKey;
  isT2: boolean;
  acc?: never;
};

type TemplateAccessorySlot = {
  acc: AccessoryKey;
  liftKey?: never;
  isT2?: never;
};

type TemplateSlot = TemplateLiftSlot | TemplateAccessorySlot;

function isLiftSlot(slot: TemplateSlot): slot is TemplateLiftSlot {
  return 'liftKey' in slot && !!slot.liftKey;
}

type HypertrophyWindow = Window & {
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

const WEEKS: Record<
  number,
  { t1: number; t2: number; block: string; deload: boolean }
> = {
  1: { t1: 0.65, t2: 0.55, block: 'Ramp-up', deload: false },
  2: { t1: 0.68, t2: 0.58, block: 'Ramp-up', deload: false },
  3: { t1: 0.72, t2: 0.62, block: 'Build', deload: false },
  4: { t1: 0.75, t2: 0.65, block: 'Build', deload: false },
  5: { t1: 0.78, t2: 0.68, block: 'Push', deload: false },
  6: { t1: 0.8, t2: 0.7, block: 'Push', deload: false },
  7: { t1: 0.6, t2: 0.5, block: 'Deload', deload: true },
  8: { t1: 0.6, t2: 0.5, block: 'Deload', deload: true },
};

const LIFT_NAMES: Record<HypertrophyLiftKey, string> = {
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

const LIFT_DEFAULTS: Record<HypertrophyLiftKey, number> = {
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

const ACC_DEFAULTS: Record<AccessoryKey, string> = {
  push_chest: 'DB Incline Press',
  push_shoulder: 'Dumbbell Lateral Raises',
  push_triceps: 'Overhead Triceps Extensions',
  pull_back: 'Seated Cable Rows',
  pull_biceps: 'Dumbbell Bicep Curls',
  pull_rear: 'Band Pull-Aparts',
  legs_quad: 'Leg Press',
  legs_ham: 'Hamstring Curls',
  legs_core: 'Ab Wheel Rollouts',
  lower_b_single: 'Bulgarian Split Squats',
  lower_b_ham: 'Back Extensions',
};

const ACC_POOLS: Record<AccessoryKey, string[]> = {
  push_chest: ['DB Incline Press', 'Machine Chest Press', 'Dips', 'Push-ups', 'DB Bench'],
  push_shoulder: ['Dumbbell Lateral Raises', 'DB OHP', 'Push Press'],
  push_triceps: ['Overhead Triceps Extensions', 'Close-Grip Bench', 'Dips'],
  pull_back: ['Seated Cable Rows', 'Machine Rows', 'Chest-Supported Rows', 'T-Bar Rows'],
  pull_biceps: ['Dumbbell Bicep Curls', 'Chin-ups', 'Assisted Chin-ups'],
  pull_rear: ['Band Pull-Aparts', 'Dumbbell Lateral Raises'],
  legs_quad: ['Leg Press', 'Bulgarian Split Squats', 'Walking Lunges', 'Dumbbell Lunges'],
  legs_ham: ['Hamstring Curls', 'Back Extensions', '45deg Hip Extensions'],
  legs_core: ['Ab Wheel Rollouts', 'Weighted Planks', 'Hanging Leg Raises', 'Cable Crunches'],
  lower_b_single: ['Bulgarian Split Squats', 'Walking Lunges', 'Reverse Lunges', 'Step-Ups'],
  lower_b_ham: ['Back Extensions', '45deg Hip Extensions', 'Good Morning'],
};

const ACC_FILTERS: Record<AccessoryKey, Record<string, unknown>> = {
  push_chest: { movementTags: ['horizontal_press'], equipmentTags: ['dumbbell', 'machine', 'bodyweight'], muscleGroups: ['chest'] },
  push_shoulder: { movementTags: ['isolation', 'vertical_press'], equipmentTags: ['dumbbell'], muscleGroups: ['shoulders'] },
  push_triceps: { movementTags: ['isolation', 'horizontal_press'], equipmentTags: ['dumbbell', 'cable', 'barbell', 'bodyweight'], muscleGroups: ['triceps'] },
  pull_back: { movementTags: ['horizontal_pull'], equipmentTags: ['cable', 'machine', 'dumbbell', 'barbell'], muscleGroups: ['back'] },
  pull_biceps: { movementTags: ['isolation', 'vertical_pull'], equipmentTags: ['dumbbell', 'pullup_bar', 'bodyweight'], muscleGroups: ['biceps'] },
  pull_rear: { movementTags: ['isolation'], equipmentTags: ['band', 'dumbbell', 'cable'], muscleGroups: ['shoulders'] },
  legs_quad: { movementTags: ['squat', 'single_leg'], equipmentTags: ['machine', 'dumbbell', 'bodyweight'], muscleGroups: ['quads', 'glutes'] },
  legs_ham: { movementTags: ['hinge'], equipmentTags: ['machine', 'bodyweight'], muscleGroups: ['hamstrings'] },
  legs_core: { movementTags: ['core'], equipmentTags: ['bodyweight', 'cable', 'pullup_bar'], muscleGroups: ['core'] },
  lower_b_single: { movementTags: ['single_leg', 'squat'], equipmentTags: ['dumbbell', 'bodyweight'], muscleGroups: ['quads', 'glutes'] },
  lower_b_ham: { movementTags: ['hinge'], equipmentTags: ['bodyweight', 'barbell'], muscleGroups: ['hamstrings', 'glutes'] },
};

const ACC_REP_SCHEME: Record<AccessoryKey, { sets: number; reps: number }> = {
  push_chest: { sets: 3, reps: 12 },
  push_shoulder: { sets: 3, reps: 15 },
  push_triceps: { sets: 3, reps: 15 },
  pull_back: { sets: 3, reps: 12 },
  pull_biceps: { sets: 3, reps: 15 },
  pull_rear: { sets: 3, reps: 15 },
  legs_quad: { sets: 3, reps: 12 },
  legs_ham: { sets: 3, reps: 12 },
  legs_core: { sets: 3, reps: 15 },
  lower_b_single: { sets: 3, reps: 12 },
  lower_b_ham: { sets: 3, reps: 12 },
};

const SESSION_ICONS: Record<HypertrophySessionKey, string> = {
  push: '🔥',
  pull: '🏋️',
  legs: '🦵',
  upper: '💪',
  lower: '🦵',
  upper_b: '💪',
  lower_b: '🦵',
};

const SESSION_I18N: Record<HypertrophySessionKey, [string, string]> = {
  push: ['program.hs.session.push', 'Push'],
  pull: ['program.hs.session.pull', 'Pull'],
  legs: ['program.hs.session.legs', 'Legs'],
  upper: ['program.hs.session.upper', 'Upper'],
  lower: ['program.hs.session.lower', 'Lower'],
  upper_b: ['program.hs.session.upper_b', 'Upper B'],
  lower_b: ['program.hs.session.lower_b', 'Lower B'],
};

const LEG_SESSIONS = new Set<HypertrophySessionKey>(['legs', 'lower', 'lower_b']);

const TEMPLATES: Record<HypertrophySessionKey, TemplateSlot[]> = {
  push: [{ liftKey: 'bench', isT2: false }, { liftKey: 'ohp', isT2: true }, { acc: 'push_chest' }, { acc: 'push_shoulder' }, { acc: 'push_triceps' }],
  pull: [{ liftKey: 'row', isT2: false }, { liftKey: 'lat', isT2: true }, { acc: 'pull_back' }, { acc: 'pull_biceps' }, { acc: 'pull_rear' }],
  legs: [{ liftKey: 'squat', isT2: false }, { liftKey: 'rdl', isT2: true }, { acc: 'legs_quad' }, { acc: 'legs_ham' }, { acc: 'legs_core' }],
  upper: [{ liftKey: 'bench', isT2: false }, { liftKey: 'row', isT2: false }, { liftKey: 'ohp', isT2: true }, { liftKey: 'lat', isT2: true }, { acc: 'push_shoulder' }],
  lower: [{ liftKey: 'squat', isT2: false }, { liftKey: 'rdl', isT2: true }, { acc: 'legs_quad' }, { acc: 'legs_ham' }, { acc: 'legs_core' }],
  upper_b: [{ liftKey: 'ohp', isT2: false }, { liftKey: 'lat', isT2: false }, { liftKey: 'bench_b', isT2: true }, { liftKey: 'row_b', isT2: true }, { acc: 'pull_biceps' }],
  lower_b: [{ liftKey: 'deadlift', isT2: false }, { liftKey: 'fsquat', isT2: true }, { acc: 'lower_b_single' }, { acc: 'lower_b_ham' }, { acc: 'legs_core' }],
};

const ROTATIONS: Record<number, HypertrophySessionKey[]> = {
  2: ['upper', 'lower'],
  3: ['push', 'pull', 'legs'],
  4: ['upper', 'lower', 'upper_b', 'lower_b'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};

const ACC_SLOT_ORDER = Object.keys(ACC_DEFAULTS) as AccessoryKey[];
const ACC_SLOT_INDEX_OFFSET = 100;

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

function getHSWindow(): HypertrophyWindow | null {
  if (typeof window === 'undefined') return null;
  return window as HypertrophyWindow;
}

function trHS(key: string, fallback: string, params?: Record<string, unknown>) {
  return getHSWindow()?.I18N?.t?.(key, params, fallback) || fallback;
}

function getHSDaysPerWeek() {
  return Number(getHSWindow()?.getProgramTrainingDaysPerWeek?.('hypertrophysplit')) || 3;
}

function getTrainingDaysLabel(value: number) {
  return getHSWindow()?.getTrainingDaysPerWeekLabel?.(value) || `${value} sessions / week`;
}

function getWeekStart(date: Date) {
  return getHSWindow()?.getWeekStart?.(date) || date;
}

function normalizeHSWeek(rawWeek: unknown) {
  const week = parseInt(String(rawWeek || ''), 10);
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(CYCLE_LENGTH, week);
}

function getHSCatchUpWeek(rawWeek: unknown, elapsedWeeks: unknown) {
  const startWeek = normalizeHSWeek(rawWeek);
  let week = startWeek;
  const elapsed = Math.max(0, parseInt(String(elapsedWeeks || ''), 10) || 0);
  for (let index = 0; index < elapsed && week < CYCLE_LENGTH; index += 1) {
    week = Math.min(CYCLE_LENGTH, week + 1);
    if (week !== startWeek && WEEKS[week]?.deload) break;
  }
  return week;
}

function getReps(pct: number) {
  if (pct <= 0.575) return 12;
  if (pct <= 0.625) return 10;
  if (pct <= 0.675) return 8;
  if (pct <= 0.725) return 7;
  if (pct <= 0.775) return 6;
  return 5;
}

function getSets(pct: number, deload: boolean) {
  if (deload) return 3;
  if (pct >= 0.75) return 4;
  return 3;
}

function roundToIncrement(value: number, increment: number) {
  const step = increment || 2.5;
  return Math.round(value / step) * step;
}

function getPrescription(tm: number, week: number, isT2: boolean, rounding: number) {
  const resolvedWeek = WEEKS[normalizeHSWeek(week)] || WEEKS[1];
  const pct = isT2 ? resolvedWeek.t2 : resolvedWeek.t1;
  return {
    weight: roundToIncrement(tm * pct, rounding || 2.5),
    reps: getReps(pct),
    sets: getSets(pct, resolvedWeek.deload),
    pct,
    isDeload: resolvedWeek.deload,
    blockName: resolvedWeek.block,
  };
}

function adjustTM(tm: number, setsCompleted: number, targetSets: number) {
  if (setsCompleted >= targetSets) return Math.round(tm * 1.025 * 100) / 100;
  if (setsCompleted >= targetSets - 1) return tm;
  return Math.round(tm * 0.95 * 100) / 100;
}

function getBlockKey(week: number) {
  const resolvedWeek = WEEKS[normalizeHSWeek(week)] || WEEKS[1];
  return resolvedWeek.deload ? 'deload' : resolvedWeek.block.toLowerCase().replace('-', '_');
}

function sessionLabel(key: HypertrophySessionKey) {
  const [labelKey, fallback] = SESSION_I18N[key] || ['', ''];
  return trHS(labelKey, fallback);
}

function cloneAccessories(source?: Partial<Record<AccessoryKey, string>> | null) {
  const next = {} as Record<AccessoryKey, string>;
  (Object.keys(ACC_DEFAULTS) as AccessoryKey[]).forEach((key) => {
    next[key] = String(source?.[key] || ACC_DEFAULTS[key]);
  });
  return next;
}

function splitDescription(freq: number) {
  const descriptions: Record<number, string> = {
    2: trHS('program.hs.split.2', 'Upper / Lower'),
    3: trHS('program.hs.split.3', 'Push / Pull / Legs'),
    4: trHS('program.hs.split.4', 'Upper / Lower x 2'),
    5: trHS('program.hs.split.5', 'PPL + Upper + Lower'),
    6: trHS('program.hs.split.6', 'Push / Pull / Legs x 2'),
  };
  return descriptions[freq] || descriptions[3];
}

function getHSFrequencyHint(freq: number) {
  return trHS('program.global_frequency_hint', 'Uses your Training preference: {value}.', {
    value: getTrainingDaysLabel(freq),
  });
}

function getHSAccessorySlotIdx(accKey: AccessoryKey) {
  const index = ACC_SLOT_ORDER.indexOf(accKey);
  return index < 0 ? -1 : ACC_SLOT_INDEX_OFFSET + index;
}

function getHSAccessorySlotKey(slotIdx: number): AccessoryKey | null {
  const index = slotIdx - ACC_SLOT_INDEX_OFFSET;
  return index >= 0 && index < ACC_SLOT_ORDER.length ? ACC_SLOT_ORDER[index] : null;
}

function activeLiftKeys(freq: number) {
  const keys = new Set<HypertrophyLiftKey>();
  (ROTATIONS[freq] || ROTATIONS[3]).forEach((session) => {
    (TEMPLATES[session] || []).forEach((slot) => {
      if (isLiftSlot(slot)) keys.add(slot.liftKey);
    });
  });
  return keys;
}

function createInitialState(): HypertrophySplitState {
  return {
    sessionCount: 0,
    nextSession: 'push',
    daysPerWeek: getHSDaysPerWeek(),
    rounding: 2.5,
    week: 1,
    cycle: 1,
    weekStartDate: new Date().toISOString(),
    lifts: Object.fromEntries(
      (Object.keys(LIFT_DEFAULTS) as HypertrophyLiftKey[]).map((key) => [
        key,
        { tm: LIFT_DEFAULTS[key], name: LIFT_NAMES[key] },
      ])
    ) as Record<HypertrophyLiftKey, HypertrophyLift>,
    accessories: cloneAccessories(),
  };
}

function migrateState(rawState: Record<string, unknown> | null | undefined): HypertrophySplitState {
  const initial = createInitialState();
  const state = (rawState || {}) as Partial<HypertrophySplitState>;
  const nextLifts = cloneJson(initial.lifts);
  (Object.keys(nextLifts) as HypertrophyLiftKey[]).forEach((key) => {
    const rawLift = state.lifts?.[key];
    nextLifts[key] = {
      tm: Number.isFinite(Number(rawLift?.tm)) ? Number(rawLift?.tm) : initial.lifts[key].tm,
      name: String(rawLift?.name || initial.lifts[key].name),
    };
  });
  return {
    sessionCount: Number.isFinite(Number(state.sessionCount)) ? Number(state.sessionCount) : 0,
    nextSession: String(state.nextSession || 'push') as HypertrophySessionKey,
    daysPerWeek: getHSDaysPerWeek(),
    rounding: Number(state.rounding) > 0 ? Number(state.rounding) : 2.5,
    week: normalizeHSWeek(state.week),
    cycle: Number.isFinite(Number(state.cycle)) ? Number(state.cycle) : 1,
    weekStartDate: String(state.weekStartDate || new Date().toISOString()),
    lifts: nextLifts,
    accessories: cloneAccessories(state.accessories || undefined),
  };
}

function buildSplitPreviewMarkup(freq: number) {
  const rotation = ROTATIONS[freq] || ROTATIONS[3];
  const html = rotation
    .map((session) => {
      const names = (TEMPLATES[session] || [])
        .map((slot) => {
          if (isLiftSlot(slot)) {
            const name = getDisplayName(LIFT_NAMES[slot.liftKey] || slot.liftKey);
            return slot.isT2
              ? `<span style="color:var(--purple)">${escapeHtml(name)}</span>`
              : `<strong>${escapeHtml(name)}</strong>`;
          }
          return `<span style="color:var(--muted)">${escapeHtml(getDisplayName(ACC_DEFAULTS[slot.acc] || ''))}</span>`;
        })
        .join(' · ');
      return `<div style="margin-bottom:4px"><span style="color:var(--accent);font-weight:700">${escapeHtml(sessionLabel(session))}:</span> ${names}</div>`;
    })
    .join('');
  return html + `<div style="margin-top:6px;font-size:11px;color:var(--muted)">${trHS('program.hs.settings.legend', '<strong>Bold</strong> = T1 · <span style="color:var(--purple)">Purple</span> = T2 · <span style="color:var(--muted)">Grey</span> = accessory')}</div>`;
}

function readNumberInput(id: string) {
  if (typeof document === 'undefined') return NaN;
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  return parseFloat(element?.value || '');
}

const hypertrophySplitProgramImpl = {
  id: 'hypertrophysplit',
  name: 'Hypertrophy Split',
  description: 'Adaptive hypertrophy program that scales from 2 to 6 days per week.',
  icon: '💪',
  legLifts: LEG_LIFTS,
  getInitialState: () => createInitialState(),
  migrateState: (state: Record<string, unknown>) => migrateState(state),
  getCapabilities: () => ({
    difficulty: 'intermediate',
    frequencyRange: { min: 2, max: 6 },
    recommendationScore: (days: number, prefs?: Record<string, unknown>) => {
      let score = prefs?.goal === 'hypertrophy' ? 7 : 2;
      score += days >= 4 ? 3 : 1;
      return score;
    },
  }),
  getTrainingDaysRange: () => ({ min: 2, max: 6 }),
  getSessionOptions: (
    rawState: HypertrophySplitState,
    workouts: WorkoutRecord[],
    schedule: SportSchedule
  ): SessionOption[] => {
    const state = migrateState(rawState);
    const freq = getHSDaysPerWeek();
    const week = state.week || 1;
    const rotation = ROTATIONS[freq] || ROTATIONS[3];
    const nextSession = rotation.includes(state.nextSession) ? state.nextSession : rotation[0];

    const todayDow = new Date().getDay();
    const sportDays = schedule?.sportDays || [];
    const legsHeavy = schedule?.sportLegsHeavy !== false;
    const recentHours =
      ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
        String(schedule?.sportIntensity || 'hard')
      ] || 30;
    const isSportDay = sportDays.includes(todayDow);
    const hadSportRecently = (workouts || []).some(
      (workout) =>
        (workout.type === 'sport' || workout.type === 'hockey') &&
        (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
    );
    const sportLegs = (isSportDay || hadSportRecently) && legsHeavy;

    const startOfWeek = getWeekStart(new Date());
    const doneThisWeek = (workouts || [])
      .filter(
        (workout) =>
          workout.program === 'hypertrophysplit' &&
          new Date(workout.date) >= startOfWeek
      )
      .map((workout) => String(workout.programOption || ''));

    const uniqueSessions = Array.from(new Set(rotation));
    let bestKey: HypertrophySessionKey = uniqueSessions[0] || 'push';
    let bestScore = -999;

    const scored = uniqueSessions.map((key) => {
      const doneCount = doneThisWeek.filter((value) => value === key).length;
      const expectedCount = rotation.filter((value) => value === key).length;
      const remaining = expectedCount - doneCount;
      const isLeg = LEG_SESSIONS.has(key);
      let score = 0;
      if (remaining <= 0) score -= 100;
      if (sportLegs && isLeg) score -= 30;
      if (remaining > 0) score += 10;
      if (!isLeg && sportLegs) score += 15;
      if (key === nextSession && remaining > 0) score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
      return { key, done: remaining <= 0, isLeg };
    });

    return scored.map(({ key, done, isLeg }) => {
      const compoundNames = (TEMPLATES[key] || [])
        .filter(isLiftSlot)
        .map((slot) =>
          getDisplayName(state.lifts[slot.liftKey]?.name || LIFT_NAMES[slot.liftKey])
        )
        .join(' + ');
      const badges = [
        done ? '✅' : '',
        sportLegs && isLeg && !WEEKS[week].deload ? '🏃⚠️' : '',
        key === bestKey && !done ? '⭐' : '',
      ]
        .filter(Boolean)
        .join('');
      return {
        value: key,
        label: `${badges ? `${badges} ` : ''}${sessionLabel(key)}: ${compoundNames}`,
        isRecommended: key === bestKey,
        done,
        hasLegs: isLeg,
        sportLegs,
      };
    });
  },
  buildSession: (
    selectedOption: string,
    rawState: HypertrophySplitState,
    context?: ProgramSessionBuildContext
  ): WorkoutExercise[] => {
    const state = migrateState(rawState);
    const key = (selectedOption || 'push') as HypertrophySessionKey;
    const template = TEMPLATES[key];
    if (!template) return [];
    const week = state.week || 1;
    const rounding = state.rounding || 2.5;
    const effectiveSessionMode =
      context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
    const energyBoost = context?.energyBoost === true;
    const programDeload = WEEKS[week].deload;
    const buildWeek =
      effectiveSessionMode === 'normal' && programDeload ? Math.max(1, week - 1) : week;
    const isDeload = effectiveSessionMode === 'light' && programDeload;

    return template.map((slot) => {
      if (isLiftSlot(slot)) {
        const lift =
          state.lifts[slot.liftKey] || {
            tm: LIFT_DEFAULTS[slot.liftKey],
            name: LIFT_NAMES[slot.liftKey],
          };
        const prescription = getPrescription(lift.tm, buildWeek, slot.isT2, rounding);
        const setCount =
          prescription.sets + (energyBoost && !slot.isT2 && !isDeload ? 1 : 0);
        const sets = Array.from({ length: setCount }, () => ({
          weight: prescription.weight,
          reps: prescription.reps,
          done: false,
          rpe: null,
        }));
        return {
          id: Date.now() + Math.random(),
          name: lift.name || LIFT_NAMES[slot.liftKey],
          liftKey: slot.liftKey,
          note: `${prescription.weight}kg x ${setCount}x${prescription.reps}${
            isDeload ? ` - ${trHS('program.hs.deload_easy', 'easy')}` : ''
          }`,
          isAux: slot.isT2,
          isAccessory: false,
          tm: lift.tm,
          auxSlotIdx: -1,
          prescribedWeight: prescription.weight,
          prescribedReps: prescription.reps,
          tierLabel: slot.isT2 ? 'T2' : 'T1',
          sets,
        } as WorkoutExercise;
      }

      const accName = state.accessories[slot.acc] || ACC_DEFAULTS[slot.acc] || '';
      const scheme = ACC_REP_SCHEME[slot.acc] || { sets: 3, reps: 12 };
      const accSets = isDeload ? Math.max(2, scheme.sets - 1) : scheme.sets;
      return {
        id: Date.now() + Math.random(),
        name: accName,
        note: `${accSets}x${scheme.reps}`,
        isAux: true,
        isAccessory: true,
        tm: 0,
        auxSlotIdx: getHSAccessorySlotIdx(slot.acc),
        accSlotKey: slot.acc,
        sets: Array.from({ length: accSets }, () => ({
          weight: '',
          reps: scheme.reps,
          done: false,
          rpe: null,
        })),
      } as WorkoutExercise;
    });
  },
  getSessionLabel: (
    selectedOption: string,
    rawState: HypertrophySplitState,
    context?: ProgramSessionBuildContext
  ) => {
    const state = migrateState(rawState);
    const key = (selectedOption || 'push') as HypertrophySessionKey;
    const week = state.week || 1;
    const effectiveSessionMode =
      context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
    const buildWeek =
      effectiveSessionMode === 'normal' && (WEEKS[week] || WEEKS[1]).deload
        ? Math.max(1, week - 1)
        : week;
    const block = WEEKS[buildWeek] || WEEKS[1];
    return `${SESSION_ICONS[key] || '💪'} ${sessionLabel(key)} · ${trHS(
      'program.hs.week_label',
      'W{week}',
      { week: buildWeek }
    )} ${trHS(`program.hs.block.${getBlockKey(buildWeek)}`, block.block)} [${trHS(
      'program.hs.cycle_short',
      'C{cycle}',
      { cycle: state.cycle || 1 }
    )}]`;
  },
  getSessionModeRecommendation: (rawState: HypertrophySplitState) => {
    const week = migrateState(rawState).week || 1;
    return (WEEKS[week] || WEEKS[1]).deload ? 'light' : 'normal';
  },
  getBlockInfo: (rawState: HypertrophySplitState) => {
    const state = migrateState(rawState);
    const week = state.week || 1;
    const resolved = WEEKS[week] || WEEKS[1];
    const pct = Math.round(resolved.t1 * 100);
    const reps = getReps(resolved.t1);
    const sets = getSets(resolved.t1, resolved.deload);
    return {
      name: trHS(`program.hs.block.${getBlockKey(week)}`, resolved.block),
      weekLabel: trHS('program.hs.week_label', 'W{week}', { week }),
      pct,
      isDeload: resolved.deload,
      totalWeeks: CYCLE_LENGTH,
      reps,
      sets,
      modeDesc: resolved.deload
        ? trHS(
            'program.hs.blockinfo.deload',
            'Light week - reduced volume and intensity for recovery.'
          )
        : trHS(
            'program.hs.blockinfo.normal',
            'T1: {sets}x{reps} @{pct}% TM · T2 lighter · Accessories {accSets}x12-15',
            { sets, reps, pct, accSets: 3 }
          ),
    };
  },
  getSessionCharacter: (_selectedOption: string, rawState: HypertrophySplitState) => {
    const week = normalizeHSWeek(migrateState(rawState).week);
    const resolved = WEEKS[week] || WEEKS[1];
    const pct = Math.round((resolved.t1 || 0.65) * 100);
    if (resolved.deload) {
      return {
        tone: 'deload',
        icon: '🌊',
        labelKey: 'program.hs.character.deload',
        labelFallback: trHS(
          'program.hs.character.deload',
          'Deload - reduced volume, recovery focus'
        ),
        labelParams: {},
      };
    }
    if (resolved.block === 'Push' || pct >= 78) {
      return {
        tone: 'heavy',
        icon: '🔥',
        labelKey: 'program.hs.character.heavy',
        labelFallback: trHS('program.hs.character.heavy', 'Push - T1 at {pct}% TM', {
          pct,
        }),
        labelParams: { pct },
      };
    }
    if (resolved.block === 'Build') {
      return {
        tone: 'volume',
        icon: '💪',
        labelKey: 'program.hs.character.build',
        labelFallback: trHS(
          'program.hs.character.build',
          'Build - T1 at {pct}% TM, growing volume',
          { pct }
        ),
        labelParams: { pct },
      };
    }
    return {
      tone: 'volume',
      icon: '📈',
      labelKey: 'program.hs.character.ramp',
      labelFallback: trHS(
        'program.hs.character.ramp',
        'Ramp-up - T1 at {pct}% TM, moderate start',
        { pct }
      ),
      labelParams: { pct },
    };
  },
  getPreSessionNote: (_selectedOption: string, rawState: HypertrophySplitState) => {
    const state = migrateState(rawState);
    const week = normalizeHSWeek(state.week);
    const cycle = state.cycle || 1;
    const resolved = WEEKS[week] || WEEKS[1];
    if (resolved.deload) {
      return trHS(
        'program.hs.note.deload',
        'Cycle {cycle}, Week {week} - deload. Lighter loads, let your body recover.',
        { cycle, week }
      );
    }
    return trHS(
      'program.hs.note.default',
      'Cycle {cycle}, Week {week} of {total} - {block} phase. Stay consistent with prescribed volume.',
      { cycle, week, total: CYCLE_LENGTH, block: resolved.block }
    );
  },
  adjustAfterSession: (
    exercises: WorkoutExercise[],
    rawState: HypertrophySplitState
  ) => {
    const nextState = cloneJson(migrateState(rawState));
    const week = nextState.week || 1;
    if (WEEKS[week].deload) return nextState;

    exercises.forEach((exercise) => {
      const liftKey = String(
        (exercise as WorkoutExercise & { liftKey?: string }).liftKey || ''
      );
      if (exercise.isAccessory || !liftKey) return;
      const typedLiftKey = liftKey as HypertrophyLiftKey;
      const lift = nextState.lifts[typedLiftKey];
      if (!lift) return;
      const doneSets = (exercise.sets || []).filter(
        (set: WorkoutExercise['sets'][number]) => set.done
      ).length;
      const targetSets = (exercise.sets || []).length;
      if (week >= 5 && week <= 6) {
        lift.tm = adjustTM(lift.tm, doneSets, targetSets);
      }
    });
    return nextState;
  },
  advanceState: (rawState: HypertrophySplitState, sessionsThisWeek?: number) => {
    const state = migrateState(rawState);
    const freq = getHSDaysPerWeek();
    const week = state.week || 1;
    const rotation = ROTATIONS[freq] || ROTATIONS[3];
    const currentSession = rotation.includes(state.nextSession)
      ? state.nextSession
      : rotation[0];
    const nextIndex = (rotation.indexOf(currentSession) + 1) % rotation.length;
    const nextSession = rotation[nextIndex];

    if ((sessionsThisWeek || 0) >= freq && week < CYCLE_LENGTH) {
      return {
        ...state,
        nextSession,
        week: week + 1,
        weekStartDate: new Date().toISOString(),
        sessionCount: (state.sessionCount || 0) + 1,
      };
    }
    if ((sessionsThisWeek || 0) >= freq && week >= CYCLE_LENGTH) {
      return {
        ...state,
        nextSession: rotation[0],
        week: 1,
        cycle: (state.cycle || 1) + 1,
        weekStartDate: new Date().toISOString(),
        sessionCount: (state.sessionCount || 0) + 1,
      };
    }
    return {
      ...state,
      nextSession,
      sessionCount: (state.sessionCount || 0) + 1,
    };
  },
  dateCatchUp: (rawState: HypertrophySplitState) => {
    const state = migrateState(rawState);
    const week = normalizeHSWeek(state.week);
    if (week >= CYCLE_LENGTH) return state;
    const daysSince =
      (Date.now() - new Date(state.weekStartDate || Date.now()).getTime()) / MS_PER_DAY;
    if (daysSince < 7) return state;
    const nextWeek = getHSCatchUpWeek(week, Math.floor(daysSince / 7));
    return nextWeek === week
      ? state
      : { ...state, week: nextWeek, weekStartDate: new Date().toISOString() };
  },
  getAuxSwapOptions: (exercise?: WorkoutExercise) => {
    const accKey = String(
      (exercise as WorkoutExercise & { accSlotKey?: string })?.accSlotKey || ''
    ) as AccessoryKey;
    if (!accKey) return null;
    const options = [...(ACC_POOLS[accKey] || [])];
    if (exercise?.name && !options.includes(exercise.name)) options.unshift(exercise.name);
    return {
      category: accKey,
      filters: ACC_FILTERS[accKey] || {},
      options,
    };
  },
  getBackSwapOptions: () => [],
  onAuxSwap: (slotIdx: number, newName: string, rawState: HypertrophySplitState) => {
    const accKey = getHSAccessorySlotKey(slotIdx);
    const nextState = cloneJson(migrateState(rawState));
    if (!accKey) return nextState;
    nextState.accessories[accKey] = String(newName || '').trim() || ACC_DEFAULTS[accKey];
    return nextState;
  },
  onBackSwap: (rawState: HypertrophySplitState) => rawState,
  getDashboardTMs: (rawState: HypertrophySplitState) => {
    const state = migrateState(rawState);
    return Array.from(activeLiftKeys(getHSDaysPerWeek()))
      .filter((key) => state.lifts[key])
      .map((key) => ({
        name: getDisplayName(state.lifts[key].name || LIFT_NAMES[key]),
        value: `${state.lifts[key].tm}kg`,
      }));
  },
  getBannerHTML: (
    options: SessionOption[],
    rawState: HypertrophySplitState,
    schedule: SportSchedule,
    workouts: WorkoutRecord[],
    fatigue?: FatigueResult | Record<string, unknown> | null
  ) => {
    const state = migrateState(rawState);
    const week = state.week || 1;
    const resolved = WEEKS[week] || WEEKS[1];
    const allDone = (options || []).every((option) => option.done);
    const bestOption = (options || []).find((option) => option.isRecommended);
    const recovery = fatigue ? 100 - Number((fatigue as FatigueResult).overall || 0) : 100;

    const todayDow = new Date().getDay();
    const sportDays = schedule?.sportDays || [];
    const legsHeavy = schedule?.sportLegsHeavy !== false;
    const recentHours =
      ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
        String(schedule?.sportIntensity || 'hard')
      ] || 30;
    const sportName = schedule?.sportName || trHS('common.sport', 'Sport');
    const isSportDay = sportDays.includes(todayDow);
    const hadSportRecently = (workouts || []).some(
      (workout) =>
        (workout.type === 'sport' || workout.type === 'hockey') &&
        (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
    );
    const sportLegs = (isSportDay || hadSportRecently) && legsHeavy;
    const sportLabel = isSportDay ? `${sportName} day` : `Post-${sportName.toLowerCase()}`;
    const blockLabel = trHS(`program.hs.block.${getBlockKey(week)}`, resolved.block);
    const left = (options || []).filter((option) => !option.done).length;

    if (allDone) {
      return {
        style: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
        color: 'var(--green)',
        html: trHS('program.hs.banner_all_done', 'All sessions done this week! Rest up.'),
      };
    }
    if (sportLegs && bestOption && !bestOption.hasLegs) {
      return {
        style: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.25)',
        color: 'var(--blue)',
        html: `🏃 ${sportLabel} - ${trHS(
          'program.hs.banner_upper_rec',
          'recommending <strong>{session}</strong> (upper-focused).',
          { session: sessionLabel(bestOption.value as HypertrophySessionKey) }
        )}`,
      };
    }
    if (sportLegs && bestOption && bestOption.hasLegs) {
      return {
        style: 'rgba(251,146,60,0.1)',
        border: 'rgba(251,146,60,0.25)',
        color: 'var(--orange)',
        html: `🏃 ${trHS(
          'program.hs.banner_legs_only',
          '{sport} - only leg sessions remain. Go lighter or rest.',
          { sport: sportName }
        )}`,
      };
    }
    if (recovery < 40) {
      return {
        style: 'rgba(251,146,60,0.1)',
        border: 'rgba(251,146,60,0.25)',
        color: 'var(--orange)',
        html: trHS(
          'program.hs.banner_low_recovery',
          'Recovery {recovery}% - consider resting.',
          { recovery }
        ),
      };
    }

    const nextLabel = bestOption
      ? sessionLabel(bestOption.value as HypertrophySessionKey)
      : sessionLabel(state.nextSession);
    return {
      style: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.15)',
      color: 'var(--purple)',
      html: `💪 ${trHS(
        'program.hs.banner_default',
        '<strong>{session}</strong> next · {block} W{week} · {left} left · Recovery {recovery}%',
        { session: nextLabel, block: blockLabel, week, left, recovery }
      )}`,
    };
  },
  renderSettings: (rawState: HypertrophySplitState, container: HTMLElement) => {
    const state = migrateState(rawState);
    const freq = getHSDaysPerWeek();
    const keys = Array.from(activeLiftKeys(freq));
    const roundOptions = [1, 2.5, 5]
      .map(
        (value) =>
          `<option value="${value}"${
            value === (state.rounding || 2.5) ? ' selected' : ''
          }>${value} kg</option>`
      )
      .join('');
    const liftRows = keys
      .map((key) => {
        const lift = state.lifts[key] || { tm: LIFT_DEFAULTS[key], name: LIFT_NAMES[key] };
        return `<div class="lift-row">
          <span class="lift-label" style="min-width:100px">${escapeHtml(
            getDisplayName(lift.name || LIFT_NAMES[key])
          )}</span>
          <input type="number" id="hs-adv-tm-${key}" value="${escapeHtml(
            String(lift.tm)
          )}" min="0" step="0.1" style="flex:1">
        </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${trHS(
            'program.hs.settings.cycle_title',
            'Cycle Controls'
          )}</div>
          <div class="settings-section-sub">${trHS(
            'program.hs.settings.overview',
            '8-week mesocycle: Ramp-up -> Build -> Push -> Deload. TM adjusts automatically on Push weeks.'
          )}</div>
          <label>${trHS('program.hs.settings.cycle_week', 'Cycle & Week')}</label>
          <div style="font-size:13px;color:var(--text);margin-bottom:8px">${trHS(
            'program.hs.settings.cycle_value',
            'Cycle {cycle} · Week {week} of {total}',
            { cycle: state.cycle || 1, week: state.week || 1, total: CYCLE_LENGTH }
          )}</div>
          <label>${trHS('program.hs.settings.week_override', 'Override Week (1-8)')}</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" id="hs-adv-week" min="1" max="${CYCLE_LENGTH}" value="${escapeHtml(
              String(state.week || 1)
            )}" style="flex:1">
            <button class="btn btn-sm btn-secondary" type="button" onclick="document.getElementById('hs-adv-week').value=1" style="width:auto">Reset</button>
          </div>
          <label style="margin-top:12px">${trHS(
            'program.hs.settings.rounding',
            'Weight Rounding (kg)'
          )}</label>
          <select id="hs-adv-rounding">${roundOptions}</select>
          <div class="settings-section-sub" style="margin-top:12px">${escapeHtml(
            getHSFrequencyHint(freq)
          )}</div>
          <div style="font-size:13px;color:var(--text);font-weight:600">${escapeHtml(
            splitDescription(freq)
          )}</div>
          <div id="hs-adv-split-preview" style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.8">${buildSplitPreviewMarkup(
            freq
          )}</div>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${trHS(
            'program.hs.settings.tms',
            'Training Maxes (kg)'
          )}</div>
          <div class="settings-section-sub">${trHS(
            'program.hs.settings.tm_help',
            'Weights are auto-calculated as a percentage of these values each week.'
          )}</div>
          <div>${liftRows}</div>
        </div>
      </div>
      <button class="btn btn-purple" style="margin-top:16px" onclick="saveProgramSetup()">${trHS(
        'program.hs.save_setup',
        'Save Program Setup'
      )}</button>
    `;
  },
  renderSimpleSettings: (rawState: HypertrophySplitState, container: HTMLElement) => {
    const state = migrateState(rawState);
    const freq = getHSDaysPerWeek();
    const keys = Array.from(activeLiftKeys(freq));
    const liftRows = keys
      .map((key) => {
        const lift = state.lifts[key] || { tm: LIFT_DEFAULTS[key], name: LIFT_NAMES[key] };
        return `<div class="lift-row">
          <span class="lift-label" style="min-width:100px">${escapeHtml(
            getDisplayName(lift.name || LIFT_NAMES[key])
          )}</span>
          <input type="number" id="hs-basic-tm-${key}" value="${escapeHtml(
            String(lift.tm)
          )}" min="0" step="0.1" style="flex:1">
        </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="program-basics-note">${trHS(
        'program.hs.simple.overview',
        'Choose how many times per week you want to train. The split adapts automatically.'
      )}</div>
      <div class="settings-section-card" id="hs-basic-lifts-card">
        <div class="settings-section-title">${trHS(
          'program.hs.settings.tms',
          'Training Maxes (kg)'
        )}</div>
        <div class="settings-section-sub">${escapeHtml(getHSFrequencyHint(freq))}</div>
        <div class="settings-section-sub" style="margin-top:-2px;color:var(--text)">${escapeHtml(
          splitDescription(freq)
        )}</div>
        <div id="hs-basic-lifts-container">${liftRows}</div>
      </div>
    `;
  },
  getSimpleSettingsSummary: (_rawState: HypertrophySplitState) => {
    const freq = getHSDaysPerWeek();
    return trHS('program.hs.simple.summary', '{count} sessions/week · {split}', {
      count: freq,
      split: splitDescription(freq),
    });
  },
  saveSettings: (rawState: HypertrophySplitState) => {
    const state = cloneJson(migrateState(rawState));
    const freq = getHSDaysPerWeek();
    state.week = Math.max(
      1,
      Math.min(CYCLE_LENGTH, readNumberInput('hs-adv-week') || state.week || 1)
    );
    state.rounding = readNumberInput('hs-adv-rounding') || state.rounding || 2.5;
    Array.from(activeLiftKeys(freq)).forEach((key) => {
      const value = readNumberInput(`hs-adv-tm-${key}`);
      if (Number.isFinite(value) && state.lifts[key]) state.lifts[key].tm = value;
    });
    if (!(ROTATIONS[freq] || ROTATIONS[3]).includes(state.nextSession)) {
      state.nextSession = (ROTATIONS[freq] || ROTATIONS[3])[0];
    }
    return state;
  },
  saveSimpleSettings: (rawState: HypertrophySplitState) => {
    const state = cloneJson(migrateState(rawState));
    const freq = getHSDaysPerWeek();
    Array.from(activeLiftKeys(freq)).forEach((key) => {
      const value = readNumberInput(`hs-basic-tm-${key}`);
      if (Number.isFinite(value) && state.lifts[key]) state.lifts[key].tm = value;
    });
    if (!(ROTATIONS[freq] || ROTATIONS[3]).includes(state.nextSession)) {
      state.nextSession = (ROTATIONS[freq] || ROTATIONS[3])[0];
    }
    return state;
  },
  _previewSplit: (freq?: number) => {
    const resolvedFreq = Number(freq) || getHSDaysPerWeek();
    const preview = document.getElementById('hs-adv-split-preview');
    if (!preview) return;
    preview.innerHTML = buildSplitPreviewMarkup(resolvedFreq);
  },
};

export const hypertrophySplitProgram =
  hypertrophySplitProgramImpl as unknown as ProgramPlugin<Record<string, unknown>>;
