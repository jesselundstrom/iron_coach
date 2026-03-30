import { getDisplayName } from './exercise-library';
import { normalizeTrainingPreferences } from './normalizers';
import {
  buildPlanningContext,
  getCoachingInsights,
  getRecentDisplayMuscleLoads,
  getTodayTrainingDecision,
} from './planning';
import type { Profile, SportSchedule, WorkoutRecord } from './types';

type DashboardRuntimeWindow = Window &
  Record<string, unknown> & {
    I18N?: {
      t?: (
        key: string,
        params?: Record<string, unknown> | null,
        fallback?: string
      ) => string;
    };
    buildTrainingCommentaryState?: (
      input?: Record<string, unknown>
    ) => Record<string, unknown> | null;
    presentTrainingCommentary?: (
      state?: Record<string, unknown> | null,
      surface?: string
    ) => Record<string, any> | null;
    getSportRecentHours?: () => number;
    getMuscleBodySvgFront?: () => string;
    getMuscleBodySvgBack?: () => string;
    getTodayTrainingDecision?: (
      input?: Record<string, unknown> | null
    ) => Record<string, any> | null;
  };

type DashboardPlanInput = {
  activeProgram: Record<string, any> | null;
  activeProgramState: Record<string, any> | null;
  fatigue: Record<string, any>;
  profile: Profile | null;
  schedule: SportSchedule | null;
  workouts: WorkoutRecord[];
  status: { tone: string; text: string };
};

const ALL_DISPLAY_MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;

const REST_DAY_TIP_ITEMS = [
  ['rest_day.tip.1', 'sleep', "Protect tonight's sleep and let recovery lead."],
  ['rest_day.tip.2', 'sleep', 'A steady bedtime makes tomorrow feel easier.'],
  ['rest_day.tip.3', 'sleep', 'Trade late scrolling for a quieter evening.'],
  ['rest_day.tip.4', 'sleep', 'Good recovery is often just food, calm, and sleep.'],
  ['rest_day.tip.5', 'hydration', 'Start the day with water and stay ahead of thirst.'],
  ['rest_day.tip.6', 'hydration', 'Sip through the day instead of catching up at night.'],
  ['rest_day.tip.7', 'hydration', 'After a hard session, extra fluids help more than you think.'],
  ['rest_day.tip.8', 'hydration', 'Keep a bottle nearby and make hydration automatic.'],
  ['rest_day.tip.9', 'mobility', 'Five easy minutes of mobility is enough today.'],
  ['rest_day.tip.10', 'mobility', 'A short walk and a little range of motion goes a long way.'],
  ['rest_day.tip.11', 'mobility', 'Move a bit today so tomorrow starts looser.'],
  ['rest_day.tip.12', 'mobility', 'Recovery day is a good day for easy tissue care and gentle movement.'],
  ['rest_day.tip.13', 'nutrition', 'One good protein meal can lift the whole day.'],
  ['rest_day.tip.14', 'nutrition', 'Build meals around protein first and let the rest follow.'],
  ['rest_day.tip.15', 'nutrition', 'Eat enough today so tomorrow does not start under-fueled.'],
  ['rest_day.tip.16', 'nutrition', 'A calm, simple meal often beats perfect macros on paper.'],
  ['rest_day.tip.17', 'mental', 'Use today to make the next training day feel easy to start.'],
  ['rest_day.tip.18', 'mental', 'Use today to notice what worked this week.'],
  ['rest_day.tip.19', 'mental', 'Discipline also means skipping junk fatigue.'],
  ['rest_day.tip.20', 'mental', 'Progress comes from training well and recovering on purpose.'],
] as const;

let lastTmSignature = '';
let lastTmValues: Record<string, { value: string }> = {};

function getDashboardRuntimeWindow(): DashboardRuntimeWindow | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as DashboardRuntimeWindow;
}

function trDash(
  key: string,
  fallback: string,
  params?: Record<string, unknown> | null
) {
  return getDashboardRuntimeWindow()?.I18N?.t?.(key, params || null, fallback) || fallback;
}

function isSportWorkout(workout: WorkoutRecord | Record<string, unknown>) {
  return workout?.type === 'sport' || workout?.type === 'hockey';
}

function isSimpleDashboardMode(profileLike?: Record<string, unknown> | null) {
  if (!profileLike || typeof profileLike !== 'object') return false;
  const preferences =
    profileLike.preferences && typeof profileLike.preferences === 'object'
      ? (profileLike.preferences as Record<string, unknown>)
      : {};
  if (preferences.detailedView === true) return false;
  if (preferences.detailedView === false) return true;
  const coaching =
    profileLike.coaching && typeof profileLike.coaching === 'object'
      ? (profileLike.coaching as Record<string, unknown>)
      : {};
  const guidanceMode = String(coaching.guidanceMode || 'balanced');
  const experienceLevel = String(coaching.experienceLevel || 'returning');
  return guidanceMode === 'guided' || (guidanceMode === 'balanced' && experienceLevel === 'beginner');
}

function parseDashboardTmValue(rawValue: unknown) {
  const raw = String(rawValue || '').trim();
  const match = raw.match(/^([0-9]+(?:[.,][0-9]+)?)(.*)$/);
  if (!match) return { main: raw, unit: '', numeric: null as number | null };
  const numeric = parseFloat(match[1].replace(',', '.'));
  return {
    main: match[1],
    unit: (match[2] || '').trim(),
    numeric: Number.isFinite(numeric) ? numeric : null,
  };
}

function roundDashboardTmDisplayValue(rawValue: unknown) {
  const parsed = parseDashboardTmValue(rawValue);
  if (parsed.numeric === null) {
    return { main: parsed.main, unit: parsed.unit, numeric: null, value: String(rawValue || '') };
  }
  const rounded = Math.round(parsed.numeric * 2) / 2;
  const main =
    Number.isInteger(rounded) ? rounded.toFixed(0) : Number.isInteger(rounded * 10) ? rounded.toFixed(1) : String(rounded);
  return { main, unit: parsed.unit, numeric: rounded, value: `${main}${parsed.unit}` };
}

function formatDashboardTmDelta(delta: number) {
  const rounded = Math.round((parseFloat(String(delta)) || 0) * 10) / 10;
  if (!rounded) return '';
  return `${rounded > 0 ? '+' : ''}${
    Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
  }`;
}

function getRecoveryGradient(recovery: number) {
  if (recovery >= 85) {
    return {
      start: 'var(--green)',
      mid: 'var(--green)',
      end: 'var(--green)',
      glow: 'rgba(76,175,121,0.2)',
    };
  }
  if (recovery >= 60) {
    return {
      start: 'var(--yellow)',
      mid: 'var(--yellow)',
      end: 'var(--yellow)',
      glow: 'rgba(245,200,66,0.2)',
    };
  }
  return {
    start: 'var(--red)',
    mid: 'var(--red)',
    end: 'var(--red)',
    glow: 'rgba(224,82,82,0.18)',
  };
}

function getDashboardRecoveryBadgeData(overallRecovery: number) {
  if (overallRecovery >= 85) return { text: trDash('dashboard.badge.go', 'Valmis'), tone: 'go' };
  if (overallRecovery >= 60) {
    return { text: trDash('dashboard.badge.caution', 'Kevennä'), tone: 'caution' };
  }
  return { text: trDash('dashboard.badge.rest', 'Palautus'), tone: 'rest' };
}

function getTodayWorkoutSummary(workouts: WorkoutRecord[]) {
  const today = new Date().toDateString();
  let liftCount = 0;
  let sportCount = 0;
  workouts.forEach((workout) => {
    if (new Date(workout?.date).toDateString() !== today) return;
    if (isSportWorkout(workout)) sportCount += 1;
    else liftCount += 1;
  });
  return { hasLift: liftCount > 0, liftCount, sportCount };
}

function sanitizeDashboardRichText(text: string) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>');
}

function highlightDashboardText(text: string, patterns: Array<string | RegExp>) {
  let next = String(text || '');
  patterns.forEach((pattern) => {
    if (!pattern) return;
    if (pattern instanceof RegExp) {
      next = next.replace(pattern, (match) => `<strong>${match}</strong>`);
      return;
    }
    const token = String(pattern);
    if (token) next = next.replace(token, `<strong>${token}</strong>`);
  });
  return next;
}

function getDashboardDayLabel(dayIndex: number) {
  const dayNames = [
    trDash('day.sun.short', 'Sun'),
    trDash('day.mon.short', 'Mon'),
    trDash('day.tue.short', 'Tue'),
    trDash('day.wed.short', 'Wed'),
    trDash('day.thu.short', 'Thu'),
    trDash('day.fri.short', 'Fri'),
    trDash('day.sat.short', 'Sat'),
  ];
  return dayNames[dayIndex] || String(dayIndex || '');
}

function getTrainingDecisionSummary(
  decision: Record<string, unknown> | null,
  context: Record<string, unknown>
) {
  const runtimeWindow = getDashboardRuntimeWindow();
  if (
    typeof runtimeWindow?.buildTrainingCommentaryState === 'function' &&
    typeof runtimeWindow?.presentTrainingCommentary === 'function'
  ) {
    const state = runtimeWindow.buildTrainingCommentaryState({ decision, context });
    const summary = runtimeWindow.presentTrainingCommentary(state, 'dashboard_summary');
    if (!summary) return null;
    return {
      title: summary.title,
      body: summary.body,
      tone: summary.tone || (state as Record<string, unknown>)?.tone,
      reasonLabels: [...(summary.reasonLabels || [])],
    };
  }
  return null;
}

function getTrainingDecisionReasonLabels(decision: Record<string, unknown> | null) {
  const runtimeWindow = getDashboardRuntimeWindow();
  if (
    typeof runtimeWindow?.buildTrainingCommentaryState === 'function' &&
    typeof runtimeWindow?.presentTrainingCommentary === 'function'
  ) {
    const summary = runtimeWindow.presentTrainingCommentary(
      runtimeWindow.buildTrainingCommentaryState({ decision }),
      'dashboard_summary'
    );
    return summary?.reasonLabels || [];
  }
  return [];
}

function getPreferenceGuidance(
  profileLike: Profile | Record<string, unknown> | null,
  context: Record<string, unknown>
) {
  const preferences = normalizeTrainingPreferences(
    (profileLike as Record<string, unknown> | null) || {}
  );
  const lines = [
    trDash(
      {
        strength: 'dashboard.pref.goal.strength',
        hypertrophy: 'dashboard.pref.goal.hypertrophy',
        general_fitness: 'dashboard.pref.goal.general_fitness',
        sport_support: 'dashboard.pref.goal.sport_support',
      }[preferences.goal] || 'dashboard.pref.goal.strength',
      {
        strength: 'Today, prioritize crisp top sets and solid bar speed.',
        hypertrophy: 'Today, prioritize quality volume and controlled reps.',
        general_fitness: 'Keep the session sustainable and leave a little in the tank.',
        sport_support: 'Keep the work athletic today and avoid grindy reps.',
      }[preferences.goal] || 'Today, prioritize crisp top sets and solid bar speed.'
    ),
  ];

  if (preferences.sessionMinutes <= 45) {
    lines.push(
      trDash(
        'dashboard.pref.time.short',
        'Time is tight, so do the main work first and treat accessories as optional.'
      )
    );
  } else if (preferences.sessionMinutes >= 75 && context?.canPushVolume) {
    lines.push(
      trDash(
        'dashboard.pref.time.long',
        'There is room for a fuller session today, so include accessories if recovery stays good.'
      )
    );
  }

  if (preferences.equipmentAccess === 'basic_gym') {
    lines.push(
      trDash(
        'dashboard.pref.equipment.basic_gym',
        'If a planned lift is not available, use an exercise swap and stay close to the same movement pattern.'
      )
    );
  } else if (preferences.equipmentAccess === 'home_gym') {
    lines.push(
      trDash(
        'dashboard.pref.equipment.home_gym',
        'A home gym may require swaps today, so favor practical variations you can load well.'
      )
    );
  } else if (preferences.equipmentAccess === 'minimal') {
    lines.push(
      trDash(
        'dashboard.pref.equipment.minimal',
        'Equipment is limited, so keep the session minimal and swap exercises freely when needed.'
      )
    );
  }

  return lines;
}

function getDashboardCompletionMessage(summary: { hasLift: boolean; liftCount: number; sportCount: number }) {
  if (!summary?.hasLift) return null;
  if (summary.sportCount > 0) {
    return {
      title: trDash('dashboard.today_done', 'Päivän työ tehty'),
      body: trDash(
        'dashboard.today_done_with_sport',
        'Gym work and sport are already logged today. Strong day. Give recovery room to do its job now.'
      ),
    };
  }
  if (summary.liftCount > 1) {
    return {
      title: trDash('dashboard.today_done', 'Päivän työ tehty'),
      body: trDash(
        'dashboard.today_done_body_multi',
        'You already logged {count} gym sessions today. Good work. Close the day calmly and come into the next session fresh.',
        { count: summary.liftCount }
      ),
    };
  }
  return {
    title: trDash('dashboard.today_done', 'Päivän työ tehty'),
    body: trDash(
      'dashboard.today_done_body',
      'Your gym work is already logged for today. Good work. Give recovery some room and come into the next session sharp.'
    ),
  };
}

function getRestDayTip(dateLike?: Date) {
  const now = dateLike instanceof Date ? dateLike : new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.max(1, Math.floor((now.getTime() - startOfYear.getTime()) / 86400000));
  const [key, category, fallback] =
    REST_DAY_TIP_ITEMS[(dayOfYear - 1) % REST_DAY_TIP_ITEMS.length];
  return {
    text: trDash(key, fallback),
    category,
    categoryLabel: trDash(`rest_day.category.${category}`, category),
  };
}

function getDashboardTrendState(input: Record<string, unknown>) {
  const adherenceRate = Math.max(0, Math.round(Number(input?.adherenceRate || 0)));
  const sessions90 = Math.max(0, parseInt(String(input?.sessions90 || 0), 10));
  const frictionCount = Math.max(0, parseInt(String(input?.frictionCount || 0), 10));
  const bestDaysCount = Math.max(0, parseInt(String(input?.bestDaysCount || 0), 10));
  const progressDirection = String(input?.progressDirection || 'none');
  if (sessions90 < 4 && adherenceRate < 40 && progressDirection === 'none' && bestDaysCount < 2) {
    return 'building_consistency';
  }
  if (
    adherenceRate >= 65 &&
    (progressDirection === 'up' || (frictionCount === 0 && bestDaysCount >= 1))
  ) {
    return 'stable_progress';
  }
  if (frictionCount > 0 || progressDirection === 'down' || adherenceRate >= 45) {
    return 'stalled_or_fragile';
  }
  return 'building_consistency';
}

function getDashboardMuscleBodyData(days?: number) {
  const displayLoads = getRecentDisplayMuscleLoads(days);
  const loads = Object.fromEntries(
    ALL_DISPLAY_MUSCLE_GROUPS.map((group) => {
      const value = Number(displayLoads?.[group] || 0);
      const level = value >= 8 ? 'high' : value >= 4 ? 'moderate' : value >= 1.5 ? 'light' : null;
      return [group, { value, level }];
    })
  ) as Record<string, { value: number; level: string | null }>;
  const activeGroups = ALL_DISPLAY_MUSCLE_GROUPS.filter((group) => loads[group].level).sort(
    (left, right) => loads[right].value - loads[left].value
  );
  const runtimeWindow = getDashboardRuntimeWindow();
  return {
    empty: activeGroups.length === 0,
    emptyText: trDash('dashboard.log_to_see', 'Log workouts and the data will show up here.'),
    flipLabel: trDash('dashboard.muscle_body.flip', 'Flip'),
    frontLabel: trDash('dashboard.muscle_body.front', 'Front'),
    backLabel: trDash('dashboard.muscle_body.back', 'Back'),
    loads: Object.fromEntries(
      ALL_DISPLAY_MUSCLE_GROUPS.map((group) => [group, loads[group].level || 'none'])
    ),
    legend: activeGroups.map((group) => ({
      group,
      name: trDash(`dashboard.muscle_group.${group}`, group),
      level: loads[group].level,
      levelText: trDash(`dashboard.muscle_load.${loads[group].level}`, loads[group].level || ''),
    })),
    svg: {
      front:
        typeof runtimeWindow?.getMuscleBodySvgFront === 'function'
          ? runtimeWindow.getMuscleBodySvgFront()
          : '',
      back:
        typeof runtimeWindow?.getMuscleBodySvgBack === 'function'
          ? runtimeWindow.getMuscleBodySvgBack()
          : '',
    },
  };
}

export function getDashboardLabels() {
  return {
    todayPlan: trDash('dashboard.today_plan', "Today's Plan"),
    weeklySessions: trDash('dashboard.weekly_sessions', 'Weekly Sessions'),
    recovery: trDash('dashboard.recovery', 'Recovery'),
    nutrition: trDash('dashboard.nutrition', 'Nutrition'),
    maxes: trDash('dashboard.maxes', 'Maxes'),
  };
}

export function getDashboardWeekLegendItems() {
  return [
    { id: 'lift', tone: 'lift', label: trDash('dashboard.calendar.legend_lift', 'Workout logged') },
    {
      id: 'scheduled',
      tone: 'scheduled',
      label: trDash('dashboard.calendar.legend_scheduled', 'Scheduled'),
    },
  ];
}

export function getDashboardDayDetailData(
  workouts: WorkoutRecord[],
  scheduleLike: SportSchedule | null,
  dayDate: Date
) {
  const logged = workouts.filter(
    (workout) => new Date(workout.date).toDateString() === dayDate.toDateString()
  );
  if (logged.length) {
    const items: Array<{ kind: string; text: string }> = [];
    logged.forEach((workout) => {
      if (isSportWorkout(workout)) {
        items.push({
          kind: 'sport',
          text: String(
            workout.name || scheduleLike?.sportName || trDash('common.sport', 'Sport')
          ),
        });
        return;
      }
      const names = (workout.exercises || []).map((exercise) => exercise.name).filter(Boolean);
      if (names.length) {
        names.forEach((name) => items.push({ kind: 'default', text: String(name) }));
        return;
      }
      items.push({ kind: 'muted', text: trDash('common.workout', 'Workout') });
    });
    return items;
  }
  return [
    {
      kind: 'muted',
      text: scheduleLike?.sportDays?.includes(dayDate.getDay())
        ? trDash('dashboard.status.sport_day', '{sport} day', {
            sport: scheduleLike?.sportName || trDash('common.sport', 'Sport'),
          })
        : trDash('dashboard.no_session_logged', 'No session logged'),
    },
  ];
}

export function wasSportRecently(workouts: WorkoutRecord[], hours?: number) {
  const fallbackHours =
    typeof getDashboardRuntimeWindow()?.getSportRecentHours === 'function'
      ? Number(getDashboardRuntimeWindow()?.getSportRecentHours?.() || 30)
      : 30;
  const resolvedHours = Number(hours || fallbackHours || 30);
  return workouts.some(
    (workout) =>
      isSportWorkout(workout) &&
      Date.now() - new Date(workout.date).getTime() < resolvedHours * 3600000
  );
}

export function getDashboardRecoverySnapshot(
  fatigue: Record<string, any>,
  profileLike?: Profile | null
) {
  const muscularRecovery = 100 - Number(fatigue?.muscular || 0);
  const cnsRecovery = 100 - Number(fatigue?.cns || 0);
  const overallRecovery = 100 - Number(fatigue?.overall || 0);
  const simple = isSimpleDashboardMode(profileLike || null);
  return {
    overallLabel: trDash('dashboard.overall', 'Overall'),
    overallValue: overallRecovery,
    badge: getDashboardRecoveryBadgeData(overallRecovery),
    simpleSummary: simple
      ? overallRecovery > 70
        ? trDash('dashboard.recovery.simple_good', "You're well recovered")
        : overallRecovery > 40
          ? trDash('dashboard.recovery.simple_moderate', 'Moderate - listen to your body')
          : trDash('dashboard.recovery.simple_low', 'Take it easy today')
      : null,
    rows: simple
      ? []
      : [
          {
            id: 'muscular',
            label: trDash('dashboard.muscular', 'Muscular'),
            value: muscularRecovery,
            gradient: getRecoveryGradient(muscularRecovery),
          },
          {
            id: 'cns',
            label: trDash('dashboard.nervous', 'Nervous System'),
            value: cnsRecovery,
            gradient: getRecoveryGradient(cnsRecovery),
          },
        ],
  };
}

export function getDashboardTrainingMaxData(
  activeProgram: Record<string, any> | null,
  activeProgramState: Record<string, any> | null
) {
  const title =
    activeProgram?.dashboardStatsLabel || trDash('dashboard.training_maxes', 'Training Maxes');
  if (typeof activeProgram?.getDashboardTMs !== 'function') return { title, items: [] };
  const trainingMaxes = (activeProgram.getDashboardTMs(activeProgramState || {}) || []).map(
    (item: Record<string, unknown>) => ({
      ...item,
      value: roundDashboardTmDisplayValue(item.value).value,
    })
  );
  const signature = trainingMaxes.map((item: Record<string, unknown>) => `${item.name}:${item.value}`).join('|');
  const previousValues = { ...lastTmValues };
  const changed = !!lastTmSignature && signature !== lastTmSignature;
  lastTmSignature = signature;
  lastTmValues = Object.fromEntries(
    trainingMaxes.map((item: Record<string, unknown>) => [String(item.name || ''), { value: String(item.value || '') }])
  );
  return {
    title,
    items: trainingMaxes.map((item: Record<string, unknown>, index: number) => {
      const name = String(item.name || '');
      const currentValue = parseDashboardTmValue(item.value);
      const previousValue = parseDashboardTmValue(previousValues[name]?.value || item.value);
      const itemChanged =
        changed &&
        previousValues[name]?.value !== undefined &&
        previousValues[name].value !== String(item.value || '');
      const improved =
        itemChanged &&
        currentValue.numeric !== null &&
        previousValue.numeric !== null &&
        currentValue.numeric > previousValue.numeric;
      return {
        id: name,
        index,
        name,
        label: getDisplayName(name),
        main: currentValue.main,
        unit: currentValue.unit,
        value: item.value,
        previousValue: previousValues[name]?.value || item.value,
        stalled: item.stalled === true,
        changed: itemChanged,
        improved,
        delta: improved
          ? formatDashboardTmDelta((currentValue.numeric || 0) - (previousValue.numeric || 0))
          : '',
      };
    }),
  };
}

export function buildDashboardPlanStructuredSnapshot(input: DashboardPlanInput) {
  const activeProgram = input.activeProgram;
  if (!activeProgram) {
    return {
      headerSub: '',
      hero: {
        kicker: trDash('dashboard.today_plan', "Today's Plan"),
        status: input.status,
        tone: 'rest',
        cta: { type: 'none' },
      },
      progress: { percent: 0, value: '', footer: '', sportFooter: '', done: 0, total: 1 },
      sections: [],
    };
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const preferences = normalizeTrainingPreferences(
    (input.profile as Record<string, unknown> | null) || {}
  );
  const range = activeProgram.getTrainingDaysRange?.() || { min: 2, max: 6 };
  const frequency = Math.max(
    Number(range.min || 2),
    Math.min(Number(range.max || 6), Number(preferences.trainingDaysPerWeek || 3))
  );
  const todaySummary = getTodayWorkoutSummary(input.workouts);
  const doneThisWeek = input.workouts.filter(
    (workout) =>
      (workout.program === activeProgram.id ||
        (!workout.program && workout.type === activeProgram.id)) &&
      new Date(workout.date) >= weekStart
  ).length;
  const sportThisWeek = input.workouts.filter(
    (workout) => isSportWorkout(workout) && new Date(workout.date) >= weekStart
  ).length;
  const sportName = input.schedule?.sportName || trDash('common.sport', 'Sport');
  const blockInfo =
    typeof activeProgram.getBlockInfo === 'function'
      ? activeProgram.getBlockInfo(input.activeProgramState || {})
      : { name: '', weekLabel: '', isDeload: false, modeDesc: '' };
  const planningContext =
    buildPlanningContext({
      profile: input.profile,
      schedule: input.schedule,
      workouts: input.workouts,
      activeProgram,
      activeProgramState: input.activeProgramState,
      fatigue: input.fatigue,
    }) || null;
  const runtimeWindow = getDashboardRuntimeWindow();
  const getTrainingDecision =
    typeof runtimeWindow?.getTodayTrainingDecision === 'function'
      ? runtimeWindow.getTodayTrainingDecision.bind(runtimeWindow)
      : getTodayTrainingDecision;
  const trainingDecision =
    getTrainingDecision(planningContext || null) || {
      action: 'train',
      reasonCodes: [],
      restrictionFlags: [],
      timeBudgetMinutes: preferences.sessionMinutes,
    };
  const coachingInsights =
    getCoachingInsights({ context: planningContext, decision: trainingDecision }) || null;
  const decisionSummary =
    getTrainingDecisionSummary(trainingDecision, planningContext || {
      sessionsRemaining: Math.max(0, frequency - doneThisWeek),
      sportLoad: {},
    }) || null;
  const commentaryState =
    typeof runtimeWindow?.buildTrainingCommentaryState === 'function'
      ? runtimeWindow.buildTrainingCommentaryState({
          decision: trainingDecision,
          context:
            planningContext || { sessionsRemaining: Math.max(0, frequency - doneThisWeek), sportLoad: {} },
        })
      : null;
  const focusSupport =
    typeof runtimeWindow?.presentTrainingCommentary === 'function' && commentaryState
      ? runtimeWindow.presentTrainingCommentary(commentaryState, 'dashboard_focus_support')
      : null;
  const coachCommentary =
    typeof runtimeWindow?.presentTrainingCommentary === 'function' && commentaryState
      ? runtimeWindow.presentTrainingCommentary(commentaryState, 'dashboard_coach')
      : null;
  const reasonLabels =
    decisionSummary?.reasonLabels || getTrainingDecisionReasonLabels(trainingDecision);
  const guidance = getPreferenceGuidance(input.profile, {
    detail: focusSupport?.text || blockInfo.modeDesc || '',
    canPushVolume:
      100 - Number(input.fatigue?.overall || 0) >= 70 &&
      trainingDecision.action === 'train' &&
      !blockInfo.isDeload,
    decisionSummary,
    reasonLabels,
  });
  const bestDays = (((coachingInsights?.bestDayIndexes as number[] | undefined) || []) as number[])
    .map((dayIndex: number) => getDashboardDayLabel(dayIndex))
    .filter(Boolean)
    .slice(0, 2);
  const adherenceRate = Math.max(0, Math.round(Number(coachingInsights?.adherenceRate30 || 0)));
  const trendState = getDashboardTrendState({
    adherenceRate,
    sessions90: coachingInsights?.sessions90,
    frictionCount: coachingInsights?.frictionCount,
    bestDaysCount: bestDays.length,
    progressDirection: String(coachingInsights?.progressionSummary || '').match(/[+][0-9]/)
      ? 'up'
      : String(coachingInsights?.progressionSummary || '').match(/[-][0-9]/)
        ? 'down'
        : 'none',
  });
  const coachCard = (() => {
    const completion = getDashboardCompletionMessage(todaySummary);
    if (completion) {
      return {
        copy: `<strong>${trDash('dashboard.today_done_coach_title', 'Hyvä työ')}</strong> ${trDash(
          'dashboard.today_done_coach_body',
          'Today’s main work is already done. Let recovery do its work and come into the next session fresh.'
        )}`,
        positive: true,
        reasonLabels: [],
      };
    }
    return {
      copy:
        (trainingDecision?.action && trainingDecision.action !== 'train' && coachCommentary?.title && coachCommentary?.body
          ? `<strong>${coachCommentary.title}</strong> ${coachCommentary.body}`
          : guidance[0] || decisionSummary?.body || ''),
      positive: false,
      reasonLabels: decisionSummary?.reasonLabels || [],
    };
  })();
  const restDayTip =
    !todaySummary.hasLift &&
    (trainingDecision.action === 'rest' || doneThisWeek >= frequency)
      ? getRestDayTip(new Date())
      : null;
  const remaining = Math.max(0, frequency - doneThisWeek);
  const percent = Math.round((Math.min(doneThisWeek, frequency) / Math.max(frequency, 1)) * 100);
  const shouldShowStart = trainingDecision.action !== 'rest' && !todaySummary.hasLift;

  return {
    headerSub: (
      isSimpleDashboardMode(input.profile)
        ? [trDash(`program.${activeProgram.id}.name`, activeProgram.name || 'Workout')]
        : [
            trDash(`program.${activeProgram.id}.name`, activeProgram.name || 'Workout'),
            blockInfo.name || '',
            blockInfo.weekLabel || '',
          ]
    )
      .filter(Boolean)
      .join(' · '),
    hero: {
      kicker: trDash('dashboard.today_plan', "Today's Plan"),
      status: input.status,
      tone: shouldShowStart ? 'train' : todaySummary.hasLift ? 'done' : 'rest',
      cta: shouldShowStart
        ? {
            type: 'button',
            label: isSimpleDashboardMode(input.profile)
              ? trDash('dashboard.simple.start', 'Start Your Workout')
              : trDash('dashboard.start_session', 'Start Session'),
            action: 'goToLog',
          }
        : todaySummary.hasLift
          ? { type: 'badge', label: trDash('dashboard.today_done_badge', 'Done for today'), tone: 'positive' }
          : { type: 'none' },
    },
    progress: {
      percent,
      value: trDash('dashboard.sessions', '{done}/{total} sessions', {
        done: Math.min(doneThisWeek, frequency),
        total: Math.max(frequency, 1),
      }),
      footer:
        doneThisWeek >= frequency
          ? trDash('dashboard.progress_complete', 'Weekly target complete')
          : trDash(
              remaining === 1 ? 'dashboard.progress_remaining_one' : 'dashboard.progress_remaining_many',
              remaining === 1 ? '1 session left this week' : '{count} sessions left this week',
              { count: remaining }
            ),
      sportFooter: sportThisWeek
        ? trDash('dashboard.sport_sessions_week', '{count} {sport} sessions logged this week', {
            count: sportThisWeek,
            sport: String(sportName).toLowerCase(),
          })
        : '',
      done: Math.min(doneThisWeek, frequency),
      total: Math.max(frequency, 1),
    },
    sections: [
      {
        id: 'coach',
        label: trDash('dashboard.insights.title', 'Coach insight'),
        head: restDayTip
          ? trDash('rest_day.head', 'Recovery')
          : coachCard.positive
            ? trDash('dashboard.today_done', 'Done for today')
            : trDash('workout.today.coach_note', 'Coach note'),
        positive: coachCard.positive === true,
        copy: restDayTip ? restDayTip.text : coachCard.copy,
        reasonLabels: restDayTip ? [] : coachCard.reasonLabels || [],
        restDayTip: !!restDayTip,
        completion: getDashboardCompletionMessage(todaySummary)
          ? { ...getDashboardCompletionMessage(todaySummary), tone: 'positive' }
          : null,
      },
      ...(isSimpleDashboardMode(input.profile)
        ? []
        : [
            {
              id: 'stats',
              label: trDash('workout.today.block_stats', 'Trends'),
              head: trDash('workout.today.last_30_days', 'Last 30 days'),
              summary: {
                title: trDash(
                  `dashboard.trends.summary.${trendState}.title`,
                  trendState === 'stable_progress'
                    ? 'Your training rhythm is working'
                    : trendState === 'stalled_or_fragile'
                      ? 'There is good work here, but the rhythm is fragile'
                      : 'Your routine is still taking shape'
                ),
                body:
                  trendState === 'stable_progress'
                    ? trDash('dashboard.trends.summary.stable.body', 'You are showing up often enough to build momentum and the recent signals look healthy.')
                    : trendState === 'stalled_or_fragile'
                      ? trDash('dashboard.trends.summary.fragile.body', 'The base is there, but the recent pattern still looks a bit uneven.')
                      : trDash('dashboard.trends.summary.building.body', 'A few more steady weeks will make the pattern much easier to read.'),
                tone:
                  trendState === 'stable_progress' ? 'positive' : trendState === 'stalled_or_fragile' ? 'caution' : 'neutral',
              },
              primaryMetric: {
                value: `${adherenceRate}%`,
                label: trDash('dashboard.trends.primary.label', 'On-plan days'),
                sublabel:
                  coachingInsights?.adherenceSummary ||
                  trDash('dashboard.trends.primary.sublabel_fallback', 'Keep stacking ordinary weeks and the picture will sharpen.'),
                tone:
                  trendState === 'stable_progress' ? 'positive' : trendState === 'stalled_or_fragile' ? 'caution' : 'neutral',
              },
              supportingMetrics: [
                ...(bestDays.length > 1
                  ? [{ value: bestDays.join(' / '), label: trDash('dashboard.trends.best_days', 'Most natural days'), tone: 'cool' }]
                  : []),
                ...(Number(coachingInsights?.sessions90 || 0) > 0
                  ? [{ value: String(coachingInsights?.sessions90 || 0), label: trDash('dashboard.trends.sessions', 'Recent sessions'), tone: 'neutral' }]
                  : []),
              ].slice(0, 2),
              insights: [
                ...(coachingInsights?.adherenceSummary
                  ? [{
                      tone: adherenceRate >= 65 ? 'green' : adherenceRate >= 45 ? 'orange' : 'neutral',
                      text: highlightDashboardText(String(coachingInsights.adherenceSummary), [`${adherenceRate}%`]),
                    }]
                  : []),
                ...(((coachingInsights?.frictionItems as string[] | undefined) || []).length
                  ? [{
                      tone: 'orange',
                      text: sanitizeDashboardRichText(
                        String(((coachingInsights?.frictionItems as string[] | undefined) || [])[0] || '')
                      ),
                    }]
                  : bestDays.length > 1
                    ? [{
                        tone: 'blue',
                        text: highlightDashboardText(
                          trDash('dashboard.insights.best_days_line', 'You train most often on {days}.', {
                            days: bestDays.join(' / '),
                          }),
                          [bestDays.join(' / ')]
                        ),
                      }]
                    : []),
              ].slice(0, 2),
            },
            {
              id: 'muscle',
              label: trDash('dashboard.muscle_load.recent', 'Recent muscle load'),
              head: trDash('workout.today.recovery_status', 'Recovery status'),
              body: getDashboardMuscleBodyData(7),
            },
          ]),
    ],
  };
}

export function animateDashboardPlanMuscleBars() {
  document.querySelectorAll('.dashboard-plan-muscle-fill').forEach((fill) => {
    const load = Math.max(0, Math.min(100, parseFloat(fill.getAttribute('data-load') || '0') || 0));
    if (fill instanceof HTMLElement) {
      fill.style.setProperty('--dashboard-muscle-scale', String(load / 100));
    }
  });
  document.querySelectorAll('.muscle-body-wrapper').forEach((wrapper) => {
    ALL_DISPLAY_MUSCLE_GROUPS.forEach((group) => {
      const level = wrapper.getAttribute(`data-muscle-${group}`) || 'none';
      wrapper.querySelectorAll(`.muscle-zone[data-muscle="${group}"]`).forEach((zone) => {
        zone.setAttribute('data-level', level);
      });
    });
  });
}
