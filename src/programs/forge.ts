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

type ForgeMode = 'sets' | 'rtf' | 'rir';
type AuxCategory = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'back';

type ForgeLift = {
  name: string;
  tm: number;
  isAux?: boolean;
};

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

type ForgeSwapInfo = {
  category: string;
  filters: Record<string, unknown>;
  options: string[];
};

type ForgeSessionCharacter = {
  tone: string;
  icon: string;
  labelKey: string;
  labelFallback: string;
  labelParams: Record<string, unknown>;
};

type ForgePlugin = Omit<
  ProgramPlugin<ForgeState>,
  'getAuxSwapOptions' | 'getBackSwapOptions' | 'onAuxSwap' | 'onBackSwap'
> & {
  getSessionModeRecommendation?: (state: ForgeState) => string;
  getSessionCharacter?: (
    selectedOption: string,
    state: ForgeState
  ) => ForgeSessionCharacter;
  getPreSessionNote?: (selectedOption: string, state: ForgeState) => string;
  getAuxSwapOptions?: (exercise?: WorkoutExercise) => ForgeSwapInfo | null;
  getBackSwapOptions?: () => ForgeSwapInfo;
  onAuxSwap?: (slotIdx: number, newName: string, state: ForgeState) => ForgeState;
  onBackSwap?: (newName: string, state: ForgeState) => ForgeState;
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
  getTrainingDaysPerWeekLabel?: (value: number) => string;
  getWeekStart?: (date?: Date) => Date;
  resolveProgramExerciseName?: (input: unknown) => string;
  createTrainingCommentaryEvent?: (
    code: string,
    params?: Record<string, unknown>
  ) => Record<string, unknown> | null;
};

const MS_PER_DAY = 864e5;
const LEG_LIFTS = [
  'squat',
  'front squat',
  'paused squat',
  'high bar squat',
  'beltless squat',
  'wider stance squat',
  'narrower stance squat',
  'box squat',
  'pin squat',
  'half squat',
  'good morning',
  'squat with slow eccentric',
  'leg press',
  'deadlift',
  'sumo deadlift',
  'conventional deadlift',
  'block pull',
  'rack pull',
  'deficit deadlift',
  'romanian deadlift',
  'stiff leg deadlift',
  'snatch grip deadlift',
  'trap bar deadlift',
];

const MAIN_SLOT_CONFIG = [
  {
    base: 'Squat',
    category: 'squat',
    labelKey: 'program.forge.lift.sq',
    fallback: 'Squat (SQ)',
  },
  {
    base: 'Bench Press',
    category: 'bench',
    labelKey: 'program.forge.lift.bp',
    fallback: 'Bench Press (BP)',
  },
  {
    base: 'Deadlift',
    category: 'deadlift',
    labelKey: 'program.forge.lift.dl',
    fallback: 'Deadlift (DL)',
  },
  {
    base: 'OHP',
    category: 'ohp',
    labelKey: 'program.forge.lift.ohp',
    fallback: 'Overhead Press (OHP)',
  },
] as const;

const AUX_LABELS = [
  ['program.forge.lift.sq1', 'Squat Variant 1 (SQ-1)'],
  ['program.forge.lift.sq2', 'Squat Variant 2 (SQ-2)'],
  ['program.forge.lift.bp1', 'Bench Variant 1 (BP-1)'],
  ['program.forge.lift.bp2', 'Bench Variant 2 (BP-2)'],
  ['program.forge.lift.dlv', 'Deadlift Variant (DL)'],
  ['program.forge.lift.ohpv', 'Overhead Press Variant (OHP)'],
] as const;

const INTERNAL = {
  mainIntensity: [
    0, 0.7, 0.75, 0.8, 0.725, 0.775, 0.825, 0.6, 0.75, 0.8, 0.85, 0.775, 0.825,
    0.875, 0.6, 0.8, 0.85, 0.9, 0.85, 0.9, 0.95, 0.6,
  ],
  auxIntensity: [
    0, 0.6, 0.65, 0.7, 0.625, 0.675, 0.725, 0.5, 0.65, 0.7, 0.75, 0.675, 0.725,
    0.775, 0.5, 0.7, 0.75, 0.8, 0.75, 0.8, 0.85, 0.5,
  ],
  deloadWeeks: [7, 14, 21],
  blockNames: [
    '',
    'Hypertrophy',
    'Hypertrophy',
    'Hypertrophy',
    'Hypertrophy',
    'Hypertrophy',
    'Hypertrophy',
    'Deload',
    'Strength',
    'Strength',
    'Strength',
    'Strength',
    'Strength',
    'Strength',
    'Deload',
    'Peaking',
    'Peaking',
    'Peaking',
    'Peaking',
    'Peaking',
    'Peaking',
    'Deload',
  ],
  setLow: 4,
  setHigh: 6,
  tmUp: 0.02,
  tmDown: -0.05,
  modes: {
    sets: {
      name: 'Sets Completed',
      desc: 'Do sets until RIR cutoff. TM adjusts by total sets.',
    },
    rtf: {
      name: 'Reps to Failure',
      desc: 'Normal sets plus an AMRAP last set. TM adjusts by reps hit.',
    },
    rir: {
      name: 'Last Set RIR',
      desc: 'Fixed sets, then report RIR on the last set.',
    },
  } as Record<ForgeMode, { name: string; desc: string }>,
  auxOptions: {
    squat: [
      'Front Squat',
      'Paused Squat',
      'High Bar Squat',
      'Beltless Squat',
      'Wider Stance Squat',
      'Narrower Stance Squat',
      'Box Squat',
      'Pin Squat',
      'Half Squat',
      'Good Morning',
      'Squat With Slow Eccentric',
      'Leg Press',
    ],
    bench: [
      'Close-Grip Bench',
      'Long Pause Bench',
      'Spoto Press',
      'Incline Press',
      'Wider Grip Bench',
      'Board Press',
      'Pin Press',
      'Slingshot Bench',
      'Bench With Feet Up',
      'Bench With Slow Eccentric',
      'DB Bench',
    ],
    deadlift: [
      'Sumo Deadlift',
      'Conventional Deadlift',
      'Block Pull',
      'Rack Pull',
      'Deficit Deadlift',
      'Romanian Deadlift',
      'Stiff Leg Deadlift',
      'Snatch Grip Deadlift',
      'Trap Bar Deadlift',
    ],
    ohp: ['Push Press', 'Behind The Neck OHP', 'Seated OHP', 'Incline Press', 'DB OHP'],
    back: [
      'Barbell Rows',
      'DB Rows',
      'Chest Supported Rows',
      'T-Bar Rows',
      'Pull-ups',
      'Chin-ups',
      'Neutral Grip Pull-ups',
      'Pull-downs',
    ],
  } as Record<AuxCategory, string[]>,
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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function getTrainingDaysPerWeekLabel(value: number) {
  return getForgeWindow()?.getTrainingDaysPerWeekLabel?.(value) || `${value} sessions / week`;
}

function normalizeForgeWeek(rawWeek: unknown, skipPeakBlock: boolean) {
  const week = parseInt(String(rawWeek || ''), 10);
  const maxWeek = skipPeakBlock ? 14 : 21;
  if (!Number.isFinite(week) || week < 1) return 1;
  return Math.min(maxWeek, week);
}

function getForgeLoggedRepCount(raw: unknown) {
  const reps = parseInt(String(raw || ''), 10);
  return Number.isFinite(reps) && reps >= 0 ? reps : null;
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

function getForgeBlockName(rawName: string) {
  const keyMap: Record<string, string> = {
    Hypertrophy: 'program.forge.block.hypertrophy',
    Strength: 'program.forge.block.strength',
    Peaking: 'program.forge.block.peaking',
    Deload: 'program.forge.block.deload',
  };
  return rawName ? trForge(keyMap[rawName] || '', rawName) : rawName;
}

function getForgeModeName(mode: ForgeMode) {
  return trForge(`program.forge.mode.${mode}.name`, INTERNAL.modes[mode].name);
}

function getForgeModeDesc(mode: ForgeMode) {
  return trForge(`program.forge.mode.${mode}.desc`, INTERNAL.modes[mode].desc);
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
    squat: {
      movementTags: ['squat'],
      equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
      muscleGroups: ['quads', 'glutes'],
    },
    bench: {
      movementTags: ['horizontal_press'],
      equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
      muscleGroups: ['chest', 'triceps', 'shoulders'],
    },
    deadlift: {
      movementTags: ['hinge'],
      equipmentTags: ['barbell', 'trap_bar', 'dumbbell', 'machine', 'bodyweight'],
      muscleGroups: ['hamstrings', 'glutes', 'back'],
    },
    ohp: {
      movementTags: ['vertical_press'],
      equipmentTags: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
      muscleGroups: ['shoulders', 'triceps'],
    },
    back: {
      movementTags: ['horizontal_pull', 'vertical_pull'],
      equipmentTags: ['barbell', 'dumbbell', 'cable', 'machine', 'pullup_bar', 'bodyweight'],
      muscleGroups: ['back', 'biceps'],
    },
  };
  return filtersByCategory[category] || {};
}

function getForgeMainOptions(slotIdx: number, currentName: string) {
  const config = MAIN_SLOT_CONFIG[slotIdx] || MAIN_SLOT_CONFIG[0];
  const options = [config.base, ...(INTERNAL.auxOptions[config.category] || [])];
  if (currentName && !options.includes(currentName)) options.push(currentName);
  return [...new Set(options)];
}

function getForgeAuxSwapInfo(slotIdx: number, currentName?: string) {
  const category = INTERNAL.getAuxCategory(slotIdx);
  const options = [...(INTERNAL.auxOptions[category] || [])];
  if (currentName && !options.includes(currentName)) options.unshift(currentName);
  return {
    category,
    filters: getForgeSwapFilters(category),
    options,
  };
}

function getForgeBackSwapInfo(currentName?: string) {
  const options = [...(INTERNAL.auxOptions.back || [])];
  if (currentName && !options.includes(currentName)) options.unshift(currentName);
  return {
    category: 'back',
    filters: getForgeSwapFilters('back'),
    options,
  };
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
      main: [
        { name: 'Squat', tm: 100 },
        { name: 'Bench Press', tm: 80 },
        { name: 'Deadlift', tm: 120 },
        { name: 'OHP', tm: 50 },
      ],
      aux: [
        { name: 'Front Squat', tm: 80 },
        { name: 'Paused Squat', tm: 90 },
        { name: 'Close-Grip Bench', tm: 70 },
        { name: 'Spoto Press', tm: 75 },
        { name: 'Stiff Leg Deadlift', tm: 100 },
        { name: 'Push Press', tm: 50 },
      ],
    },
  };
}

function getPrescription(
  tm: number,
  week: number,
  isAux: boolean,
  rounding: number,
  mode: ForgeMode
) {
  const pct = isAux ? INTERNAL.auxIntensity[week] : INTERNAL.mainIntensity[week];
  const weight = Math.round((tm * pct) / (rounding || 2.5)) * (rounding || 2.5);
  const reps = INTERNAL.getReps(pct || 0.7);
  const rir = INTERNAL.getRIR(pct || 0.7);
  const isDeload = INTERNAL.deloadWeeks.includes(week);

  if (mode === 'rtf') {
    return {
      weight,
      reps,
      rir,
      pct,
      isDeload,
      normalSets: 4,
      fixedSets: 5,
      repOutTarget: reps * 2,
      note: isDeload
        ? trForge('program.forge.note.deload', '{reps}x{weight}kg - easy, 5 sets', {
            reps,
            weight,
          })
        : trForge(
            'program.forge.note.rtf',
            '{weight}kg x {reps} for 4 sets, then AMRAP the last set (target {target}+ reps).',
            { weight, reps, target: reps * 2 }
          ),
    };
  }

  if (mode === 'rir') {
    return {
      weight,
      reps,
      rir,
      pct,
      isDeload,
      normalSets: 4,
      fixedSets: 5,
      repOutTarget: reps * 2,
      note: isDeload
        ? trForge('program.forge.note.deload', '{reps}x{weight}kg - easy, 5 sets', {
            reps,
            weight,
          })
        : trForge(
            'program.forge.note.rir',
            '{weight}kg x {reps} for 5 sets - note how many reps were left in the tank on the final set.',
            { weight, reps }
          ),
    };
  }

  return {
    weight,
    reps,
    rir,
    pct,
    isDeload,
    normalSets: 4,
    fixedSets: 5,
    repOutTarget: reps * 2,
    note: isDeload
      ? trForge('program.forge.note.deload', '{reps}x{weight}kg - easy, 5 sets', {
          reps,
          weight,
        })
      : trForge(
          'program.forge.note.sets',
          '{weight}kg x {reps} - stop when RIR drops to {rir}. Aim for 4-6 sets.',
          { weight, reps, rir }
        ),
  };
}

function getDayExercises(day: number, freq: number, lifts: ForgeState['lifts']) {
  const main = lifts.main || [];
  const aux = lifts.aux || [];
  const result: ForgeLift[] = [];
  const splits: Record<number, Array<Array<['m' | 'a', number]>>> = {
    2: [
      [
        ['m', 0],
        ['m', 1],
        ['a', 4],
        ['a', 5],
      ],
      [
        ['m', 2],
        ['m', 3],
        ['a', 0],
        ['a', 2],
      ],
    ],
    3: [
      [
        ['m', 0],
        ['a', 4],
        ['a', 3],
      ],
      [
        ['m', 1],
        ['m', 3],
        ['a', 0],
      ],
      [
        ['m', 2],
        ['a', 2],
        ['a', 1],
        ['a', 5],
      ],
    ],
    4: [
      [
        ['m', 0],
        ['a', 3],
        ['a', 4],
      ],
      [
        ['m', 1],
        ['a', 0],
        ['a', 5],
      ],
      [
        ['m', 2],
        ['a', 2],
      ],
      [
        ['m', 3],
        ['a', 1],
      ],
    ],
    5: [
      [
        ['m', 0],
        ['a', 5],
      ],
      [
        ['m', 1],
        ['a', 0],
      ],
      [
        ['m', 2],
        ['a', 2],
      ],
      [
        ['m', 3],
        ['a', 1],
      ],
      [
        ['a', 3],
        ['a', 4],
      ],
    ],
    6: [
      [
        ['m', 0],
        ['a', 2],
      ],
      [
        ['a', 5],
        ['a', 4],
      ],
      [
        ['m', 1],
        ['a', 0],
      ],
      [
        ['a', 3],
        ['a', 1],
      ],
      [['m', 2]],
      [['m', 3]],
    ],
  };
  const layout = splits[freq]?.[day - 1] || splits[3][0];
  layout?.forEach(([kind, idx]) => {
    const source = kind === 'm' ? main : aux;
    if (source[idx]) result.push({ ...source[idx], isAux: kind === 'a' });
  });
  return result;
}

function adjustTrainingMax(
  tm: number,
  data:
    | number
    | {
        repsOnLastSet?: number | null;
        repOutTarget?: number | null;
        setsCompleted?: number;
        lastSetRIR?: number | null;
      },
  week: number,
  mode: ForgeMode
) {
  if (INTERNAL.deloadWeeks.includes(week)) return tm;

  if (mode === 'rtf') {
    const reps = typeof data === 'object' ? data.repsOnLastSet : null;
    const target = typeof data === 'object' ? data.repOutTarget || 10 : 10;
    if (reps === null || reps === undefined) return tm;
    if (reps >= target + 3) return roundTm(tm * 1.04);
    if (reps >= target) return roundTm(tm * 1.02);
    if (reps >= target - 2) return tm;
    return roundTm(tm * 0.95);
  }

  if (mode === 'rir') {
    const setsCompleted = typeof data === 'object' ? data.setsCompleted || 0 : 0;
    const lastSetRIR = typeof data === 'object' ? data.lastSetRIR : null;
    if (setsCompleted < 5) return roundTm(tm * 0.95);
    if (lastSetRIR !== null && lastSetRIR !== undefined) {
      if (lastSetRIR <= 0) return roundTm(tm * 0.97);
      if (lastSetRIR <= 1) return tm;
      if (lastSetRIR <= 2) return roundTm(tm * 1.01);
      return roundTm(tm * 1.02);
    }
    return tm;
  }

  const setsCompleted =
    typeof data === 'number' ? data : Number(data.setsCompleted || 0);
  if (setsCompleted < INTERNAL.setLow) return roundTm(tm * (1 + INTERNAL.tmDown));
  if (setsCompleted > INTERNAL.setHigh) return roundTm(tm * (1 + INTERNAL.tmUp));
  return tm;
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
      main: (
        Array.isArray(state.lifts?.main) ? state.lifts.main : initial.lifts.main
      ).map((lift, idx) => ({
        name: resolveProgramExerciseName(lift?.name || initial.lifts.main[idx].name),
        tm: Number.isFinite(Number(lift?.tm)) ? Number(lift?.tm) : initial.lifts.main[idx].tm,
      })),
      aux: (
        Array.isArray(state.lifts?.aux) ? state.lifts.aux : initial.lifts.aux
      ).map((lift, idx) => ({
        name: resolveProgramExerciseName(lift?.name || initial.lifts.aux[idx].name),
        tm: Number.isFinite(Number(lift?.tm)) ? Number(lift?.tm) : initial.lifts.aux[idx].tm,
      })),
    },
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

function buildSplitPreviewMarkup(freq: number, lifts: ForgeState['lifts']) {
  let html = '';
  for (let day = 1; day <= freq; day += 1) {
    const exercises = getDayExercises(day, freq, lifts);
    const names = exercises
      .map((exercise) =>
        exercise.isAux
          ? `<span style="color:var(--purple)">${escapeHtml(
              getDisplayName(exercise.name)
            )}</span>`
          : `<strong>${escapeHtml(getDisplayName(exercise.name))}</strong>`
      )
      .join(' · ');
    html += `<div style="margin-bottom:4px"><span style="color:var(--accent);font-weight:700">${escapeHtml(
      trForge('program.forge.settings.day_num', 'Day {day}:', { day })
    )}</span> ${names}</div>`;
  }
  html += `<div style="margin-top:6px;font-size:11px;color:var(--muted)">${trForge(
    'program.forge.settings.split_legend',
    '<strong>Bold</strong> = main lift · <span style="color:var(--purple)">Purple</span> = auxiliary'
  )}</div>`;
  return html;
}

export const forgeProgram: ForgePlugin = {
  id: 'forge',
  name: 'Forge Protocol',
  description: '21-week strength cycle: hypertrophy, strength, and peaking.',
  icon: '⚒️',
  legLifts: LEG_LIFTS,
  getInitialState: () => createInitialState(),
  migrateState: (state: Record<string, unknown>) => migrateForgeState(state),
  getCapabilities: () => ({
    difficulty: 'advanced',
    frequencyRange: { min: 2, max: 6 },
    recommendationScore: (days: number, prefs?: Record<string, unknown>) => {
      let score = prefs?.goal === 'strength' ? 7 : 2;
      if (days >= 3 && days <= 5) score += 2;
      return score;
    },
  }),
  getTrainingDaysRange: () => ({ min: 2, max: 6 }),
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

    const exercises = [
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
          note: prescription.note,
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
        note: state.backWeight
          ? trForge(
              'program.forge.back.note_weight',
              '{weight}kg x 3 sets of 8-10 - hit 3x10, then increase the load.',
              { weight: state.backWeight }
            )
          : trForge(
              'program.forge.back.note_empty',
              'Set a working weight in Program Basics to auto-fill this movement.'
            ),
        isAccessory: true,
        tm: 0,
        auxSlotIdx: -1,
        sets: Array.from({ length: 3 }, () => ({
          weight: state.backWeight || '',
          reps: 8,
          done: false,
          rpe: null,
        })),
      },
    ];

    return exercises;
  },
  getSessionLabel: (
    selectedOption: string,
    rawState: ForgeState,
    context?: ProgramSessionBuildContext
  ) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const dayNum = parseInt(String(selectedOption || '1'), 10) || 1;
    const week = state.week || 1;
    const effectiveSessionMode =
      context?.effectiveSessionMode === 'light' ? 'light' : 'normal';
    const programDeload = INTERNAL.deloadWeeks.includes(week);
    const labelWeek =
      effectiveSessionMode === 'normal' && programDeload ? Math.max(1, week - 1) : week;
    const isDeload = effectiveSessionMode === 'light' && programDeload;
    const mode = state.mode || 'sets';
    return `${isDeload ? '🌊' : '🏋️'} ${trForge(
      'program.forge.session_label',
      'W{week} Day {day} · {block} [{mode}]',
      {
        week: labelWeek,
        day: dayNum,
        block: getForgeBlockName(INTERNAL.blockNames[labelWeek] || ''),
        mode: getForgeModeName(mode),
      }
    )}`;
  },
  getSessionModeRecommendation: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    return INTERNAL.deloadWeeks.includes(state.week || 1) ? 'light' : 'normal';
  },
  getBlockInfo: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const week = state.week || 1;
    const pct = Math.round((INTERNAL.mainIntensity[week] || 0) * 100);
    const isDeload = INTERNAL.deloadWeeks.includes(week);
    const reps = INTERNAL.getReps(INTERNAL.mainIntensity[week] || 0.7);
    const rir = INTERNAL.getRIR(INTERNAL.mainIntensity[week] || 0.7);
    let modeDesc = '';
    if (isDeload) {
      modeDesc = trForge(
        'program.forge.blockinfo.deload',
        'Light week - 60% TM, easy recovery work.'
      );
    } else if (state.mode === 'sets') {
      modeDesc = trForge(
        'program.forge.blockinfo.sets',
        'Do sets of {reps} until RIR drops to {rir}. Aim for 4-6 sets.',
        { reps, rir }
      );
    } else if (state.mode === 'rtf') {
      modeDesc = trForge(
        'program.forge.blockinfo.rtf',
        '{reps} reps x 4 sets, then AMRAP the final set.',
        { reps }
      );
    } else {
      modeDesc = trForge(
        'program.forge.blockinfo.rir',
        '5 fixed sets, then rate the last set by reps in reserve.'
      );
    }
    return {
      name: getForgeBlockName(INTERNAL.blockNames[week] || ''),
      weekLabel: trForge('program.forge.week_label', 'Week {week}', { week }),
      pct,
      isDeload,
      totalWeeks: state.skipPeakBlock ? 14 : 21,
      mode: state.mode || 'sets',
      modeName: getForgeModeName(state.mode || 'sets'),
      modeDesc,
      reps,
      rir,
    };
  },
  getSessionCharacter: (_selectedOption: string, rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const week = state.week || 1;
    const pct = Math.round((INTERNAL.mainIntensity[week] || 0) * 100);
    const block = INTERNAL.blockNames[week] || '';
    if (INTERNAL.deloadWeeks.includes(week)) {
      return {
        tone: 'deload',
        icon: '🌊',
        labelKey: 'program.forge.character.deload',
        labelFallback: trForge(
          'program.forge.character.deload',
          'Deload - lighter loads and recovery focus'
        ),
        labelParams: {},
      };
    }
    if (block === 'Peaking' || pct >= 85) {
      return {
        tone: 'heavy',
        icon: '🔥',
        labelKey: 'program.forge.character.heavy',
        labelFallback: trForge(
          'program.forge.character.heavy',
          'Heavy - top work around {pct}% TM',
          { pct }
        ),
        labelParams: { pct },
      };
    }
    if (block === 'Strength') {
      return {
        tone: 'heavy',
        icon: '💪',
        labelKey: 'program.forge.character.strength',
        labelFallback: trForge(
          'program.forge.character.strength',
          'Strength - {pct}% TM with controlled volume',
          { pct }
        ),
        labelParams: { pct },
      };
    }
    return {
      tone: 'volume',
      icon: '📈',
      labelKey: 'program.forge.character.volume',
      labelFallback: trForge(
        'program.forge.character.volume',
        'Hypertrophy - build volume around {pct}% TM',
        { pct }
      ),
      labelParams: { pct },
    };
  },
  getPreSessionNote: (_selectedOption: string, rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const week = state.week || 1;
    const totalWeeks = state.skipPeakBlock ? 14 : 21;
    const block = getForgeBlockName(INTERNAL.blockNames[week] || '');
    let modeHint = '';
    if (state.mode === 'sets') {
      modeHint = trForge(
        'program.forge.note.sets_hint',
        'Stop sets when form starts to break down.'
      );
    } else if (state.mode === 'rtf') {
      modeHint = trForge(
        'program.forge.note.rtf_hint',
        'Push the final set for max reps.'
      );
    } else {
      modeHint = trForge(
        'program.forge.note.rir_hint',
        'Rate how many reps were left in the tank on the final set.'
      );
    }
    if (INTERNAL.deloadWeeks.includes(week)) {
      return trForge(
        'program.forge.note.deload',
        'Week {week} of {total} - deload. Keep it light and recover well.',
        { week, total: totalWeeks }
      );
    }
    return trForge(
      'program.forge.note.default',
      'Week {week} of {total} - {block}. {hint}',
      { week, total: totalWeeks, block, hint: modeHint }
    );
  },
  adjustAfterSession: (exercises: WorkoutExercise[], rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const nextState = cloneJson(state);
    const week = normalizeForgeWeek(state.week, state.skipPeakBlock);
    const mode = state.mode || 'sets';
    if (INTERNAL.deloadWeeks.includes(week)) return nextState;

    (exercises || []).forEach((exercise) => {
      if (exercise.isAccessory) return;
      const lift = [...nextState.lifts.main, ...nextState.lifts.aux].find(
        (item) => item.name === exercise.name
      );
      if (!lift) return;

      const doneSets = (exercise.sets || []).filter((set) => set.done).length;
      let adjustData:
        | number
        | {
            repsOnLastSet?: number | null;
            repOutTarget?: number | null;
            setsCompleted?: number;
            lastSetRIR?: number | null;
          };

      if (mode === 'rtf') {
        const amrapSet = (exercise.sets || []).find((set) => set.isAmrap && set.done);
        adjustData = {
          repsOnLastSet: getForgeLoggedRepCount(amrapSet?.reps),
          repOutTarget: exercise.repOutTarget || 10,
        };
      } else if (mode === 'rir') {
        const lastDoneSet = (exercise.sets || []).filter((set) => set.done).pop();
        adjustData = {
          setsCompleted: doneSets,
          lastSetRIR:
            lastDoneSet?.rir !== null && lastDoneSet?.rir !== undefined
              ? getForgeLoggedRepCount(lastDoneSet.rir)
              : null,
        };
      } else {
        adjustData = doneSets;
      }

      lift.tm = adjustTrainingMax(lift.tm, adjustData, week, mode);
    });

    return nextState;
  },
  advanceState: (rawState: ForgeState, sessionsThisWeek?: number) => {
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
  dateCatchUp: (rawState: ForgeState) => {
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
  getAuxSwapOptions: (exercise) => {
    if (exercise?.auxSlotIdx === undefined || Number(exercise.auxSlotIdx) < 0) return null;
    return getForgeAuxSwapInfo(Number(exercise.auxSlotIdx), exercise.name);
  },
  getBackSwapOptions: () => getForgeBackSwapInfo(),
  onAuxSwap: (slotIdx, newName, rawState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    if (state.lifts?.aux[slotIdx]) state.lifts.aux[slotIdx].name = newName;
    return state;
  },
  onBackSwap: (newName, rawState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    return { ...state, backExercise: newName };
  },
  getProgramConstraints: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const overrides: Record<string, Record<string, unknown>> = {};
    (state.lifts.main || []).forEach((lift, idx) => {
      const config = MAIN_SLOT_CONFIG[idx] || MAIN_SLOT_CONFIG[0];
      overrides[String(lift.name || '').trim().toLowerCase()] = {
        filters: getForgeSwapFilters(config.category),
        options: getForgeMainOptions(idx, lift.name),
        clearWeightOnSwap: true,
      };
    });
    (state.lifts.aux || []).forEach((lift, idx) => {
      const info = getForgeAuxSwapInfo(idx, lift.name);
      overrides[String(lift.name || '').trim().toLowerCase()] = {
        filters: info.filters,
        options: info.options,
        clearWeightOnSwap: true,
      };
    });
    const backInfo = getForgeBackSwapInfo(state.backExercise || 'Barbell Rows');
    overrides[String(state.backExercise || 'Barbell Rows').trim().toLowerCase()] = {
      filters: backInfo.filters,
      options: backInfo.options,
      clearWeightOnSwap: true,
    };
    return { exerciseOverrides: overrides };
  },
  adaptSession: (baseSession: WorkoutExercise[], planningContext?: Record<string, unknown>) => ({
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
  getBannerHTML: (
    options: SessionOption[],
    rawState: ForgeState,
    schedule: SportSchedule,
    workouts: WorkoutRecord[],
    fatigue?: Record<string, unknown> | null
  ) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const freq = getForgeDaysPerWeek();
    const doneCount = options.filter((option) => option.done).length;
    const allDone = options.every((option) => option.done);
    const todayDow = new Date().getDay();
    const sportDays = schedule?.sportDays || [];
    const legsHeavy = schedule?.sportLegsHeavy !== false;
    const recentHours =
      ({ easy: 18, moderate: 24, hard: 30 } as Record<string, number>)[
        schedule?.sportIntensity || 'hard'
      ];
    const sportName = schedule?.sportName || trForge('common.sport', 'Sport');
    const isSportDay = sportDays.includes(todayDow);
    const hadSportRecently = workouts.some(
      (workout) =>
        (workout.type === 'sport' || workout.type === 'hockey') &&
        (Date.now() - new Date(workout.date).getTime()) / 3600000 <= recentHours
    );
    const sportLegs = (isSportDay || hadSportRecently) && legsHeavy;
    const sportLabel = isSportDay ? `${sportName} day` : `Post-${String(sportName).toLowerCase()}`;
    const recovery = fatigue ? 100 - Number(fatigue.overall || 0) : 100;
    const bestOption = options.find((option) => option.isRecommended);
    const left = freq - doneCount;

    if (allDone) {
      return {
        style: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
        color: 'var(--green)',
        html: trForge(
          'program.forge.banner_all_done',
          'All {count} sessions are done this week. Rest up and recover.',
          { count: freq }
        ),
      };
    }

    if (sportLegs && bestOption && !bestOption.hasLegs) {
      return {
        style: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.25)',
        color: 'var(--blue)',
        html: `🏃 ${escapeHtml(sportLabel)} - ${trForge(
          'program.forge.banner_upper_recommended',
          'recommending <strong>Day {day}</strong> to spare your legs.',
          { day: bestOption.value }
        )}`,
      };
    }

    if (sportLegs && bestOption && bestOption.hasLegs) {
      return {
        style: 'rgba(251,146,60,0.1)',
        border: 'rgba(251,146,60,0.25)',
        color: 'var(--orange)',
        html: `🏃 ${trForge(
          'program.forge.banner_legs_only_left',
          '{sport} legs and only leg-heavy sessions remain. Go lighter or rest.',
          { sport: sportName }
        )}`,
      };
    }

    if (recovery < 40) {
      return {
        style: 'rgba(251,146,60,0.1)',
        border: 'rgba(251,146,60,0.25)',
        color: 'var(--orange)',
        html: trForge(
          'program.forge.banner_low_recovery',
          'Recovery {recovery}% - consider resting. If you train, <strong>Day {day}</strong> is next.',
          { recovery, day: bestOption?.value || 1 }
        ),
      };
    }

    return {
      style: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.15)',
      color: 'var(--purple)',
      html: trForge(
        'program.forge.banner_recommended',
        'Recommended: <strong>Day {day}</strong> · {left} sessions left this week · Recovery {recovery}%',
        { day: bestOption?.value || 1, left, recovery }
      ),
    };
  },
  renderSimpleSettings: (rawState: ForgeState, container: HTMLElement) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const freq = getForgeDaysPerWeek();
    const mainRows = state.lifts.main
      .map((lift, idx) => {
        const config = MAIN_SLOT_CONFIG[idx] || MAIN_SLOT_CONFIG[0];
        const options = buildSelectOptions(
          getForgeMainOptions(idx, lift.name).map((name) => ({
            value: name,
            label: getDisplayName(name),
          })),
          lift.name
        );
        return `
          <label>${escapeHtml(trForge(config.labelKey, config.fallback))}</label>
          <select id="forge-basic-main-name-${idx}">${options}</select>
          <label>${escapeHtml(trForge('program.w531.settings.training_max', 'Training Max (kg)'))}</label>
          <input type="number" id="forge-basic-main-tm-${idx}" value="${escapeHtml(String(lift.tm || 0))}" min="0" step="0.1">
        `;
      })
      .join('');
    const backOptions = buildSelectOptions(
      getForgeBackSwapInfo(state.backExercise || 'Barbell Rows').options.map((name) => ({
        value: name,
        label: getDisplayName(name),
      })),
      state.backExercise || 'Barbell Rows'
    );
    container.innerHTML = `
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.simple.schedule', 'Weekly Rhythm')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trForge(
              'program.forge.simple.overview',
              'Set your core lifts and repeat back work here. Weekly frequency comes from Training Preferences.'
            )
          )}</div>
          <div class="settings-row-note">${escapeHtml(
            trForge('program.global_frequency_hint', 'Uses your Training preference: {value}.', {
              value: getTrainingDaysPerWeekLabel(freq),
            })
          )}</div>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.simple.main_lifts', 'Main Lifts')
          )}</div>
          ${mainRows}
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.simple.back_work', 'Back Work')
          )}</div>
          <label>${escapeHtml(
            trForge('program.forge.settings.back_exercise', 'Back Exercise (every session)')
          )}</label>
          <select id="forge-basic-back-exercise">${backOptions}</select>
          <label style="margin-top:12px">${escapeHtml(
            trForge('program.forge.settings.working_weight', 'Working Weight (kg)')
          )}</label>
          <input type="number" id="forge-basic-back-weight" value="${escapeHtml(
            String(state.backWeight || '')
          )}" min="0" step="0.1">
        </div>
      </div>
    `;
  },
  getSimpleSettingsSummary: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    return trForge(
      'program.forge.simple.summary',
      '{count} sessions / week · {back} every session',
      { count: getForgeDaysPerWeek(), back: getDisplayName(state.backExercise || 'Barbell Rows') }
    );
  },
  renderSettings: (rawState: ForgeState, container: HTMLElement) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const modeOptions = buildSelectOptions(
      (Object.keys(INTERNAL.modes) as ForgeMode[]).map((mode) => ({
        value: mode,
        label: `${getForgeModeName(mode)} - ${getForgeModeDesc(mode)}`,
      })),
      state.mode || 'sets'
    );
    const roundingOptions = buildSelectOptions(
      ['1', '2.5', '5'].map((value) => ({ value, label: `${value} kg` })),
      String(state.rounding || 2.5)
    );
    const auxRows = state.lifts.aux
      .map((lift, idx) => {
        const [labelKey, fallback] = AUX_LABELS[idx] || [`Variant ${idx + 1}`, `Variant ${idx + 1}`];
        const info = getForgeAuxSwapInfo(idx, lift.name);
        const options = buildSelectOptions(
          info.options.map((name) => ({ value: name, label: getDisplayName(name) })),
          lift.name
        );
        return `
          <label>${escapeHtml(trForge(labelKey, fallback))}</label>
          <select id="forge-advanced-aux-name-${idx}">${options}</select>
          <label>${escapeHtml(trForge('program.w531.settings.training_max', 'Training Max (kg)'))}</label>
          <input type="number" id="forge-advanced-aux-tm-${idx}" value="${escapeHtml(String(lift.tm || 0))}" min="0" step="0.1">
        `;
      })
      .join('');
    const basicsSummary = state.lifts.main
      .map((lift, idx) => {
        const config = MAIN_SLOT_CONFIG[idx] || MAIN_SLOT_CONFIG[0];
        return `<div class="settings-row-note" style="margin-top:8px"><strong>${escapeHtml(
          trForge(config.labelKey, config.fallback)
        )}:</strong> ${escapeHtml(getDisplayName(lift.name))} · ${escapeHtml(
          String(lift.tm || 0)
        )} kg</div>`;
      })
      .join('');
    const backSummary = `<div class="settings-row-note" style="margin-top:8px"><strong>${escapeHtml(
      trForge('program.forge.settings.back_exercise', 'Back Exercise (every session)')
    )}:</strong> ${escapeHtml(
      getDisplayName(state.backExercise || 'Barbell Rows')
    )} · ${escapeHtml(String(state.backWeight || 0))} kg</div>`;
    container.innerHTML = `
      <div class="program-settings-grid">
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.settings.control_title', 'Cycle Controls')
          )}</div>
          <label>${escapeHtml(trForge('program.forge.settings.mode', 'Program Mode'))}</label>
          <select id="prog-mode">${modeOptions}</select>
          <div class="settings-row-note">${escapeHtml(getForgeModeDesc(state.mode || 'sets'))}</div>
          <label style="margin-top:12px">${escapeHtml(
            trForge('program.forge.settings.week', 'Current Week (1-21)')
          )}</label>
          <input type="number" id="prog-week" min="1" max="21" value="${escapeHtml(
            String(state.week || 1)
          )}">
          <label style="margin-top:12px">${escapeHtml(
            trForge('program.forge.settings.rounding', 'Weight Rounding (kg)')
          )}</label>
          <select id="prog-rounding">${roundingOptions}</select>
          <label class="toggle-row settings-toggle-block" for="prog-skip-peak">
            <div>
              <div class="toggle-row-title">${escapeHtml(
                trForge('program.forge.settings.skip_peak_off', 'Skip Peak Block')
              )}</div>
              <div class="toggle-row-sub">${escapeHtml(
                trForge(
                  'program.forge.settings.peak_help',
                  'Loop back after Strength instead of running the peaking block.'
                )
              )}</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="prog-skip-peak"${
                state.skipPeakBlock ? ' checked' : ''
              }>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </div>
          </label>
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.settings.basics_location_title', 'Program Basics')
          )}</div>
          <div class="settings-section-sub">${escapeHtml(
            trForge(
              'program.forge.settings.basics_location_help',
              'Main lifts, training maxes, and back work live in Program Basics so the day-to-day setup stays in one place.'
            )
          )}</div>
          ${basicsSummary}
          ${backSummary}
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.settings.aux_lifts', 'Auxiliary Lifts')
          )}</div>
          ${auxRows}
        </div>
        <div class="settings-section-card">
          <div class="settings-section-title">${escapeHtml(
            trForge('program.forge.settings.preview_title', 'Weekly Split Preview')
          )}</div>
          <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.8">
            ${buildSplitPreviewMarkup(getForgeDaysPerWeek(), state.lifts)}
          </div>
        </div>
      </div>
      <div class="program-setup-actions">
        <button class="btn btn-purple program-setup-save-btn" type="button" onclick="saveProgramSetup()">${escapeHtml(
          trForge('program.forge.save_setup', 'Save Program Setup')
        )}</button>
      </div>
    `;
  },
  saveSettings: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const nextState = cloneJson(state);
    nextState.mode = (readInputValue('prog-mode') as ForgeMode) || nextState.mode;
    nextState.week = normalizeForgeWeek(
      readInputValue('prog-week'),
      readCheckedValue('prog-skip-peak')
    );
    nextState.rounding = Number(readInputValue('prog-rounding')) || nextState.rounding;
    nextState.skipPeakBlock = readCheckedValue('prog-skip-peak');
    nextState.lifts.aux = nextState.lifts.aux.map((lift, idx) => ({
      ...lift,
      name: resolveProgramExerciseName(readInputValue(`forge-advanced-aux-name-${idx}`) || lift.name),
      tm: Number(readInputValue(`forge-advanced-aux-tm-${idx}`)) || 0,
    }));
    return nextState;
  },
  saveSimpleSettings: (rawState: ForgeState) => {
    const state = migrateForgeState(cloneJson(rawState) as Record<string, unknown>);
    const nextState = cloneJson(state);
    nextState.lifts.main = nextState.lifts.main.map((lift, idx) => ({
      ...lift,
      name: resolveProgramExerciseName(readInputValue(`forge-basic-main-name-${idx}`) || lift.name),
      tm: Number(readInputValue(`forge-basic-main-tm-${idx}`)) || 0,
    }));
    nextState.backExercise = resolveProgramExerciseName(
      readInputValue('forge-basic-back-exercise') || nextState.backExercise || 'Barbell Rows'
    );
    nextState.backWeight = Number(readInputValue('forge-basic-back-weight')) || 0;
    return nextState;
  },
};
