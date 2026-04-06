import { describe, expect, it } from 'vitest';
import {
  buildSavedWorkoutRecord,
  buildWorkoutFinishPlan,
  buildPostWorkoutOutcome,
  buildSessionSummaryPromptState,
  buildWorkoutRestDisplayState,
  clearWorkoutRestHideHost,
  clearWorkoutRestIntervalHost,
  buildWorkoutRestLifecyclePlan,
  buildWorkoutSessionSnapshot,
  commitWorkoutFinishPersistence,
  buildWorkoutStartPlan,
  buildWorkoutProgressionToast,
  buildWorkoutProgressionResult,
  appendWorkoutSet,
  applyPostWorkoutOutcomeEffects,
  completeWorkoutRestTimer,
  applySetUpdateMutation,
  clearWorkoutStartSnapshot,
  getCachedWorkoutStartSnapshot,
  removeWorkoutExercise,
  resolveWorkoutProgramMeta,
  resolveWorkoutRestDuration,
  resolveWorkoutStartSnapshot,
  sanitizeSetValue,
  scheduleWorkoutRestHideHost,
  scheduleWorkoutRestIntervalHost,
  skipWorkoutRestTimer,
  startWorkoutRestTimer,
  syncWorkoutRestTimer,
  restoreWorkoutRestTimer,
  toggleWorkoutSetCompletion,
} from './workout-runtime';

describe('workout runtime mutation helpers', () => {
  it('reuses cached workout start snapshots for identical signatures', () => {
    clearWorkoutStartSnapshot();
    const prog = {
      id: 'forge',
      buildSession: () => [{ name: 'Bench', sets: [{ weight: 60, reps: 5 }] }],
      getSessionLabel: () => 'Day 1',
      getSessionDescription: () => 'Press focus',
    };

    const first = resolveWorkoutStartSnapshot(
      {
        prog,
        state: { week: 1 },
        selectedOption: '1',
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      {
        normalizeTrainingPreferences: (profileLike?: Record<string, unknown> | null) => ({
          warmupSetsEnabled:
            profileLike?.preferences &&
            typeof profileLike.preferences === 'object' &&
            (profileLike.preferences as Record<string, unknown>).warmupSetsEnabled === true,
          goal: '',
          sessionMinutes: 0,
          sportReadinessCheckEnabled: false,
        }),
        normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
        getWorkoutStartDecisionBundle: () => ({
          planningContext: {},
          trainingDecision: { action: 'train' },
          effectiveDecision: { action: 'train' },
          selectedSessionMode: 'auto',
          effectiveSessionMode: 'normal',
          sportAwareLowerBody: false,
        }),
        getProgramSessionBuildContext: () => ({}),
        getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
          state as Record<string, unknown>,
        cloneWorkoutExercises: (exercises?: unknown) =>
          JSON.parse(JSON.stringify(exercises || [])),
        withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
        applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
          exercises,
          changes: [],
          equipmentHint: '',
        }),
        injectWarmupSets: () => {},
      }
    );
    const second = resolveWorkoutStartSnapshot(
      {
        prog,
        state: { week: 1 },
        selectedOption: '1',
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      {
        normalizeTrainingPreferences: () => ({
          warmupSetsEnabled: false,
          goal: '',
          sessionMinutes: 0,
          sportReadinessCheckEnabled: false,
        }),
        normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
        getWorkoutStartDecisionBundle: () => ({
          planningContext: {},
          trainingDecision: { action: 'train' },
          effectiveDecision: { action: 'train' },
          selectedSessionMode: 'auto',
          effectiveSessionMode: 'normal',
          sportAwareLowerBody: false,
        }),
        getProgramSessionBuildContext: () => ({}),
        getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
          state as Record<string, unknown>,
        cloneWorkoutExercises: (exercises?: unknown) =>
          JSON.parse(JSON.stringify(exercises || [])),
        withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
        applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
          exercises,
          changes: [],
          equipmentHint: '',
        }),
        injectWarmupSets: () => {},
      }
    );

    expect(second).toEqual(first);
    expect(getCachedWorkoutStartSnapshot()).toEqual(first);
  });

  it('builds a typed planned workout start plan with presentation data', () => {
    clearWorkoutStartSnapshot();
    const prog = {
      id: 'forge',
      name: 'Forge',
      legLifts: ['squat'],
      buildSession: () => [{ name: 'Squat', sets: [{ weight: 100, reps: 5 }] }],
      getSessionLabel: () => 'Lower Day',
      getSessionDescription: () => 'Heavy lower focus',
      getBlockInfo: () => ({ isDeload: false }),
    };

    const plan = buildWorkoutStartPlan(
      {
        prog,
        state: { mode: 'sets', week: 2 },
        selectedOption: '1',
        schedule: {
          sportName: 'Hockey',
          sportDays: [new Date().getDay()],
          sportLegsHeavy: true,
        },
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      {
        t: (key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
        normalizeTrainingPreferences: () => ({
          warmupSetsEnabled: false,
          goal: '',
          sessionMinutes: 0,
          sportReadinessCheckEnabled: false,
        }),
        normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
        getWorkoutStartDecisionBundle: () => ({
          planningContext: {},
          trainingDecision: {
            action: 'train_light',
            restrictionFlags: ['avoid_heavy_legs'],
          },
          effectiveDecision: {
            action: 'train_light',
            restrictionFlags: ['avoid_heavy_legs'],
          },
          selectedSessionMode: 'auto',
          effectiveSessionMode: 'normal',
          sportAwareLowerBody: true,
        }),
        getProgramSessionBuildContext: () => ({}),
        getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
          state as Record<string, unknown>,
        cloneWorkoutExercises: (exercises?: unknown) =>
          JSON.parse(JSON.stringify(exercises || [])),
        withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
        applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
          exercises,
          changes: ['Reduce lower-body volume'],
          equipmentHint: 'Use dumbbells if racks are busy',
        }),
        injectWarmupSets: () => {},
        buildWorkoutRewardState: () => ({}),
        ensureWorkoutExerciseUiKeys: (exercises: Array<Record<string, unknown>>) =>
          exercises.map((exercise, index) => ({
            ...exercise,
            uiKey: `exercise-${index}`,
          })),
        getWorkoutCommentaryState: () => ({ tone: 'caution' }),
        presentTrainingCommentary: () => ({ text: 'Take it lighter today' }),
        getWorkoutDecisionSummary: () => ({ title: 'Adjusted session plan' }),
        getTrainingToastColor: () => 'var(--orange)',
        wasSportRecently: () => false,
      }
    );

    expect(plan.activeWorkout?.program).toBe('forge');
    expect(plan.activeWorkout?.programLabel).toBe('Lower Day');
    expect(plan.startSnapshot?.selectedOption).toBe('1');
    expect(plan.startPresentation?.title).toBe('Lower Day');
    expect(plan.startPresentation?.queuedToasts?.map((toast) => toast.text)).toEqual([
      'Take it lighter today',
      'Reduce lower-body volume',
      'Use dumbbells if racks are busy',
      'Hockey legs - consider fewer sets or swapping day order',
    ]);
  });

  it('reuses the cached preview snapshot when start begins without an explicit option', () => {
    clearWorkoutStartSnapshot();
    const prog = {
      id: 'casualfullbody',
      name: 'Gym Basics',
      buildSession: () => [
        { name: 'Goblet Squat', sets: [{ weight: 20, reps: 10 }] },
      ],
      getSessionLabel: () => 'Day A',
      getSessionDescription: () => 'Full body',
      getBlockInfo: () => ({ isDeload: false }),
    };
    const deps = {
      t: (key: string, fallback: string, params?: Record<string, unknown>) => {
        if (!params) return fallback;
        return Object.entries(params).reduce(
          (text, [paramKey, value]) =>
            text.replace(`{${paramKey}}`, String(value ?? '')),
          fallback
        );
      },
      normalizeTrainingPreferences: () => ({
        warmupSetsEnabled: false,
        goal: '',
        sessionMinutes: 0,
        sportReadinessCheckEnabled: false,
      }),
      normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
      getWorkoutStartDecisionBundle: () => ({
        planningContext: {},
        trainingDecision: { action: 'train' },
        effectiveDecision: { action: 'train' },
        selectedSessionMode: 'auto',
        effectiveSessionMode: 'normal',
        sportAwareLowerBody: false,
      }),
      getProgramSessionBuildContext: () => ({}),
      getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
        state as Record<string, unknown>,
      cloneWorkoutExercises: (exercises?: unknown) =>
        JSON.parse(JSON.stringify(exercises || [])),
      withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
      applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
        exercises,
        changes: [],
        equipmentHint: '',
      }),
      injectWarmupSets: () => {},
      buildWorkoutRewardState: () => ({}),
      ensureWorkoutExerciseUiKeys: (exercises: Array<Record<string, unknown>>) =>
        exercises.map((exercise, index) => ({
          ...exercise,
          uiKey: `exercise-${index}`,
        })),
      getWorkoutCommentaryState: () => null,
      presentTrainingCommentary: () => null,
      getWorkoutDecisionSummary: () => null,
      getTrainingToastColor: () => 'var(--purple)',
      wasSportRecently: () => false,
    };
    const decisionBundle = deps.getWorkoutStartDecisionBundle();

    const cached = resolveWorkoutStartSnapshot(
      {
        prog,
        state: { day: 1 },
        selectedOption: '2',
        decisionBundle,
        planningContext: decisionBundle.planningContext,
        trainingDecision: decisionBundle.trainingDecision,
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      deps
    );
    prog.buildSession = () => {
      throw new Error('buildSession should not rerun when cached preview is reused');
    };

    const plan = buildWorkoutStartPlan(
      {
        prog,
        state: { day: 1 },
        selectedOption: '',
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      deps
    );

    expect(plan.startSnapshot).toEqual(cached);
    expect(plan.activeWorkout?.programOption).toBe('2');
    expect(plan.activeWorkout?.exercises.map((exercise) => exercise.name)).toEqual([
      'Goblet Squat',
    ]);
  });

  it('rebuilds the start snapshot when planning inputs change between preview and start', () => {
    clearWorkoutStartSnapshot();
    const prog = {
      id: 'casualfullbody',
      name: 'Gym Basics',
      buildSession: (_selectedOption: string, state: Record<string, unknown>) => [
        {
          name: state.day === 2 ? 'Row' : 'Goblet Squat',
          sets: [{ weight: 20, reps: 10 }],
        },
      ],
      getSessionLabel: () => 'Day A',
      getSessionDescription: () => 'Full body',
      getBlockInfo: () => ({ isDeload: false }),
    };
    const deps = {
      t: (key: string, fallback: string, params?: Record<string, unknown>) => {
        if (!params) return fallback;
        return Object.entries(params).reduce(
          (text, [paramKey, value]) =>
            text.replace(`{${paramKey}}`, String(value ?? '')),
          fallback
        );
      },
      normalizeTrainingPreferences: (profileLike?: Record<string, unknown> | null) => ({
        warmupSetsEnabled:
          profileLike?.preferences &&
          typeof profileLike.preferences === 'object' &&
          (profileLike.preferences as Record<string, unknown>).warmupSetsEnabled === true,
        goal: '',
        sessionMinutes: 0,
        sportReadinessCheckEnabled: false,
      }),
      normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
      getWorkoutStartDecisionBundle: () => ({
        planningContext: {},
        trainingDecision: {
          action: 'train',
          recommendedSessionOption: '2',
        },
        effectiveDecision: {
          action: 'train',
          recommendedSessionOption: '2',
        },
        selectedSessionMode: 'auto',
        effectiveSessionMode: 'normal',
        sportAwareLowerBody: false,
      }),
      getProgramSessionBuildContext: () => ({}),
      getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
        state as Record<string, unknown>,
      cloneWorkoutExercises: (exercises?: unknown) =>
        JSON.parse(JSON.stringify(exercises || [])),
      withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
      applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
        exercises,
        changes: [],
        equipmentHint: '',
      }),
      injectWarmupSets: () => {},
      buildWorkoutRewardState: () => ({}),
      ensureWorkoutExerciseUiKeys: (exercises: Array<Record<string, unknown>>) =>
        exercises.map((exercise, index) => ({
          ...exercise,
          uiKey: `exercise-${index}`,
        })),
      getWorkoutCommentaryState: () => null,
      presentTrainingCommentary: () => null,
      getWorkoutDecisionSummary: () => null,
      getTrainingToastColor: () => 'var(--purple)',
      wasSportRecently: () => false,
    };
    const decisionBundle = deps.getWorkoutStartDecisionBundle();

    const previewSnapshot = resolveWorkoutStartSnapshot(
      {
        prog,
        state: { day: 1 },
        selectedOption: '2',
        decisionBundle,
        planningContext: decisionBundle.planningContext,
        trainingDecision: decisionBundle.trainingDecision,
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      deps
    );

    const plan = buildWorkoutStartPlan(
      {
        prog,
        state: { day: 2 },
        selectedOption: '',
        profile: { preferences: { warmupSetsEnabled: true } },
      },
      deps
    );

    expect(plan.startSnapshot?.signature).not.toBe(previewSnapshot?.signature);
    expect(plan.startSnapshot?.exercises.map((exercise) => exercise.name)).toEqual([
      'Row',
    ]);
    expect(plan.activeWorkout?.exercises.map((exercise) => exercise.name)).toEqual([
      'Row',
    ]);
  });

  it('rebuilds the start snapshot when explicit program runtime context changes', () => {
    clearWorkoutStartSnapshot();
    const prog = {
      id: 'forge',
      name: 'Forge',
      buildSession: (
        _selectedOption: string,
        _state: Record<string, unknown>,
        context?: Record<string, unknown>
      ) => [
        {
          name:
            Number(
              (context?.programRuntime as Record<string, unknown> | undefined)
                ?.daysPerWeek || 0
            ) >= 4
              ? 'Bench Press'
              : 'Squat',
          sets: [{ weight: 20, reps: 10 }],
        },
      ],
      getSessionLabel: () => 'Day A',
      getSessionDescription: () => 'Full body',
      getBlockInfo: () => ({ isDeload: false }),
    };
    const deps = {
      t: (_key: string, fallback: string) => fallback,
      normalizeTrainingPreferences: () => ({
        warmupSetsEnabled: false,
        goal: '',
        sessionMinutes: 0,
        sportReadinessCheckEnabled: false,
      }),
      normalizeEnergyLevel: (value?: unknown) => String(value || 'normal'),
      getWorkoutStartDecisionBundle: () => ({
        planningContext: {},
        trainingDecision: { action: 'train' },
        effectiveDecision: { action: 'train' },
        selectedSessionMode: 'auto',
        effectiveSessionMode: 'normal',
        sportAwareLowerBody: false,
      }),
      getProgramSessionStateForBuild: (_prog: unknown, state: unknown) =>
        state as Record<string, unknown>,
      cloneWorkoutExercises: (exercises?: unknown) =>
        JSON.parse(JSON.stringify(exercises || [])),
      withResolvedExerciseId: (exercise?: Record<string, unknown>) => exercise || {},
      applyTrainingPreferencesToExercises: (exercises: Array<Record<string, unknown>>) => ({
        exercises,
        changes: [],
        equipmentHint: '',
      }),
      injectWarmupSets: () => {},
      buildWorkoutRewardState: () => ({}),
      ensureWorkoutExerciseUiKeys: (exercises: Array<Record<string, unknown>>) =>
        exercises.map((exercise, index) => ({
          ...exercise,
          uiKey: `exercise-${index}`,
        })),
      getWorkoutCommentaryState: () => null,
      presentTrainingCommentary: () => null,
      getWorkoutDecisionSummary: () => null,
      getTrainingToastColor: () => 'var(--purple)',
      wasSportRecently: () => false,
    };
    let daysPerWeek = 3;
    const getProgramSessionBuildContext = () => ({
      programRuntime: {
        daysPerWeek,
        weekStartDate: '2026-04-06T00:00:00.000Z',
        sessionReadiness: 'default',
      },
    });

    const previewSnapshot = resolveWorkoutStartSnapshot(
      {
        prog,
        state: { week: 1 },
        selectedOption: '1',
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      {
        ...deps,
        getProgramSessionBuildContext,
      }
    );

    daysPerWeek = 4;
    const plan = buildWorkoutStartPlan(
      {
        prog,
        state: { week: 1 },
        selectedOption: '1',
        profile: { preferences: { warmupSetsEnabled: false } },
      },
      {
        ...deps,
        getProgramSessionBuildContext,
      }
    );

    expect(plan.startSnapshot?.signature).not.toBe(previewSnapshot?.signature);
    expect(plan.activeWorkout?.exercises.map((exercise) => exercise.name)).toEqual([
      'Bench Press',
    ]);
  });

  it('falls back to snapshot week and cycle when workout meta resolution throws', () => {
    const result = resolveWorkoutProgramMeta({
      prog: {
        getWorkoutMeta: () => {
          throw new Error('meta failed');
        },
      },
      progressionSourceState: {
        week: 4,
        cycle: 2,
      },
    });

    expect(result.programMeta).toEqual({
      week: 4,
      cycle: 2,
    });
    expect(result.error).toBeInstanceOf(Error);
  });

  it('builds a progression toast when the workout advances into a new week', () => {
    const toast = buildWorkoutProgressionToast(
      {
        activeWorkout: { isBonus: false },
        prog: {
          name: 'Forge',
          getBlockInfo: () => ({ name: 'Week 4' }),
        },
        programName: 'Forge',
        advancedState: { week: 4 },
        newState: { week: 3 },
        programHookFailed: false,
      },
      {
        t: (key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
      }
    );

    expect(toast).toEqual({
      text: 'Forge - Week 4 up next!',
      color: 'var(--purple)',
      delay: 500,
    });
  });

  it('builds a typed finish plan with saved workout, summary data, and teardown', () => {
    const finishPlan = buildWorkoutFinishPlan(
      {
        prog: {
          id: 'forge',
          name: 'Forge',
          getWorkoutMeta: () => ({ week: 1, cycle: 1 }),
          adjustAfterSession: () => ({ week: 1, cycle: 1 }),
          advanceState: () => ({ week: 2, cycle: 1 }),
          getBlockInfo: () => ({ name: 'Week 2' }),
        },
        activeWorkout: {
          program: 'forge',
          type: 'forge',
          programOption: '1',
          programLabel: 'Day 1',
          sessionSnapshot: {
            buildState: { week: 1, cycle: 1 },
            buildContext: {
              programRuntime: {
                daysPerWeek: 3,
                weekStartDate: '2026-04-06T00:00:00.000Z',
              },
            },
          },
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ weight: 80, reps: 5, done: true }],
            },
          ],
          sessionDescription: 'Bench focus',
          isBonus: false,
        },
        state: { week: 1, cycle: 1 },
        workouts: [],
        sessionRPE: 7,
        duration: 3600,
        prCount: 1,
        workoutId: 123,
        workoutDate: '2026-04-06T10:00:00.000Z',
        programName: 'Forge',
      },
      {
        cloneTrainingDecision: (value?: Record<string, unknown> | null) =>
          value ? JSON.parse(JSON.stringify(value)) : null,
        stripWarmupSetsFromExercises: (exercises: Array<Record<string, unknown>>) =>
          exercises,
        getWeekStart: (date: Date) => date,
        parseLoggedRepCount: (value: unknown) => Number(value) || 0,
        buildCoachNote: () => 'Solid work.',
        t: (key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
      }
    );

    expect(finishPlan?.savedWorkout).toMatchObject({
      id: 123,
      date: '2026-04-06T10:00:00.000Z',
      program: 'forge',
      programMeta: { week: 1, cycle: 1 },
      programStateAfter: { week: 2, cycle: 1 },
    });
    expect(finishPlan?.savedWorkout.sessionSnapshot).toMatchObject({
      buildState: { week: 1, cycle: 1 },
      buildContext: {
        programRuntime: {
          daysPerWeek: 3,
          weekStartDate: '2026-04-06T00:00:00.000Z',
        },
      },
    });
    expect(finishPlan?.summaryData).toMatchObject({
      completedSets: 1,
      totalSets: 1,
      prCount: 1,
      coachNote: 'All sets done. Solid work.',
    });
    expect(finishPlan?.finishTeardownPlan).toMatchObject({
      showNotStarted: true,
      hideActive: true,
    });
    expect(finishPlan?.progressionToast).toEqual({
      text: 'Forge - Week 2 up next!',
      color: 'var(--purple)',
      delay: 500,
    });
  });

  it('passes stored program build context into workout finish hooks', () => {
    const calls: Array<{ hook: string; context: Record<string, unknown> | null }> = [];

    buildWorkoutFinishPlan(
      {
        prog: {
          id: 'wendler531',
          name: '5/3/1',
          getWorkoutMeta: (
            _state: Record<string, unknown>,
            context?: Record<string, unknown>
          ) => {
            calls.push({ hook: 'meta', context: context || null });
            return { week: 1, cycle: 1, daysPerWeek: 3 };
          },
          adjustAfterSession: (
            _exercises: Array<Record<string, unknown>>,
            _state: Record<string, unknown>,
            _selectedOption?: string,
            context?: Record<string, unknown>
          ) => {
            calls.push({ hook: 'adjust', context: context || null });
            return { week: 1, cycle: 1 };
          },
          advanceState: (
            _state: Record<string, unknown>,
            _sessionsThisWeek?: number,
            context?: Record<string, unknown>
          ) => {
            calls.push({ hook: 'advance', context: context || null });
            return { week: 2, cycle: 1 };
          },
          getBlockInfo: (
            _state: Record<string, unknown>,
            context?: Record<string, unknown>
          ) => {
            calls.push({ hook: 'block', context: context || null });
            return { name: 'Week 2' };
          },
        },
        activeWorkout: {
          program: 'wendler531',
          type: 'wendler531',
          programOption: '1',
          programLabel: 'Squat Day',
          exercises: [
            {
              name: 'Squat',
              sets: [{ weight: 100, reps: 5, done: true }],
            },
          ],
          sessionDescription: 'Main lift focus',
          isBonus: false,
          sessionSnapshot: {
            buildState: { week: 1, cycle: 1 },
            buildContext: {
              programRuntime: {
                daysPerWeek: 3,
                weekStartDate: '2026-04-06T00:00:00.000Z',
                sessionReadiness: 'none',
              },
            },
          },
        },
        state: { week: 1, cycle: 1 },
        workouts: [],
        duration: 1800,
        prCount: 0,
        workoutId: 456,
        workoutDate: '2026-04-06T10:00:00.000Z',
      },
      {
        cloneTrainingDecision: (value?: Record<string, unknown> | null) =>
          value ? JSON.parse(JSON.stringify(value)) : null,
        stripWarmupSetsFromExercises: (exercises: Array<Record<string, unknown>>) =>
          exercises,
        getWeekStart: (date: Date) => date,
        parseLoggedRepCount: (value: unknown) => Number(value) || 0,
        t: (_key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
      }
    );

    expect(calls).toEqual([
      {
        hook: 'meta',
        context: {
          programRuntime: {
            daysPerWeek: 3,
            weekStartDate: '2026-04-06T00:00:00.000Z',
            sessionReadiness: 'none',
          },
        },
      },
      {
        hook: 'adjust',
        context: {
          programRuntime: {
            daysPerWeek: 3,
            weekStartDate: '2026-04-06T00:00:00.000Z',
            sessionReadiness: 'none',
          },
        },
      },
      {
        hook: 'advance',
        context: {
          programRuntime: {
            daysPerWeek: 3,
            weekStartDate: '2026-04-06T00:00:00.000Z',
            sessionReadiness: 'none',
          },
        },
      },
      {
        hook: 'block',
        context: {
          programRuntime: {
            daysPerWeek: 3,
            weekStartDate: '2026-04-06T00:00:00.000Z',
            sessionReadiness: 'none',
          },
        },
      },
    ]);
  });

  it('uses the captured program runtime week start when counting finish-week sessions', () => {
    let recordedSessionsThisWeek = -1;

    const result = buildWorkoutProgressionResult(
      {
        prog: {
          id: 'forge',
          adjustAfterSession: () => ({ week: 1 }),
          advanceState: (
            state: Record<string, unknown>,
            sessionsThisWeek?: number
          ) => {
            recordedSessionsThisWeek = Number(sessionsThisWeek || 0);
            return state;
          },
        },
        activeWorkout: {
          program: 'forge',
          type: 'forge',
          programOption: '1',
          exercises: [],
          sessionSnapshot: {
            buildContext: {
              programRuntime: {
                weekStartDate: '2026-03-31T00:00:00.000Z',
              },
            },
          },
        },
        state: { week: 1 },
        progressionSourceState: { week: 1 },
        workouts: [
          { program: 'forge', date: '2026-03-31T08:00:00.000Z', isBonus: false },
          { program: 'forge', date: '2026-04-06T10:00:00.000Z', isBonus: false },
        ],
        workoutDate: '2026-04-06T10:00:00.000Z',
      },
      {
        stripWarmupSetsFromExercises: (exercises: Array<Record<string, unknown>>) =>
          exercises,
        getWeekStart: (date: Date) => date,
      }
    ) as Record<string, unknown>;

    expect(recordedSessionsThisWeek).toBe(2);
    expect(result.programHookFailed).toBe(false);
  });

  it('stores the session snapshot on saved workouts for later replay', () => {
    const saved = buildSavedWorkoutRecord({
      workoutId: 1,
      workoutDate: '2026-04-06T10:00:00.000Z',
      programId: 'forge',
      activeWorkout: {
        program: 'forge',
        type: 'forge',
        programOption: '1',
        programLabel: 'Day 1',
        exercises: [],
        sessionSnapshot: {
          buildState: { week: 3 },
          buildContext: {
            programRuntime: {
              daysPerWeek: 4,
              weekStartDate: '2026-04-06T00:00:00.000Z',
            },
          },
        },
      },
      stateBeforeSession: { week: 3 },
      progressionSourceState: { week: 3 },
      duration: 1200,
      totalSets: 0,
      exercises: [],
    });

    expect(saved.sessionSnapshot).toMatchObject({
      buildState: { week: 3 },
      buildContext: {
        programRuntime: {
          daysPerWeek: 4,
          weekStartDate: '2026-04-06T00:00:00.000Z',
        },
      },
    });
  });

  it('builds post-workout outcome from summary feedback, notes, duration, and nutrition intent', () => {
    const savedWorkout: Record<string, unknown> = {
      tmAdjustments: [
        {
          lift: 'Bench',
          oldTM: 100,
          newTM: 102.5,
          direction: 'up',
        },
      ],
    };

    const outcome = buildPostWorkoutOutcome(
      {
        savedWorkout,
        summaryResult: {
          feedback: 'too_hard',
          notes: 'Bar path felt off.',
          goToNutrition: true,
        },
        summaryData: {
          completedSets: 12,
        },
      },
      {
        inferDurationSignal: () => 'too_long',
        t: (key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
        formatWorkoutWeight: (value: unknown) => String(value),
      }
    );

    expect(savedWorkout.sessionFeedback).toBe('too_hard');
    expect(savedWorkout.sessionNotes).toBe('Bar path felt off.');
    expect(savedWorkout.durationSignal).toBe('too_long');
    expect(outcome).toMatchObject({
      shouldSaveWorkouts: true,
      goToNutrition: true,
      nutritionContext: {
        completedSets: 12,
      },
      durationSignal: 'too_long',
    });
    expect(outcome.tmAdjustmentToast).toContain('Bench');
  });

  it('builds a typed session summary prompt state from summary data', () => {
    const prompt = buildSessionSummaryPromptState(
      {
        summaryData: {
          programLabel: 'Forge Day 1',
          coachNote: 'Solid work.',
          duration: 3600,
          completedSets: 12,
          totalSets: 15,
          tonnage: 2450,
          rpe: 8,
          prCount: 1,
        },
        canLogNutrition: true,
        seed: 123,
      },
      {
        t: (key: string, fallback: string) => fallback,
        formatDuration: (value: number) => `${value}s`,
        formatTonnage: (value: number) => `${value} kg`,
      }
    );

    expect(prompt).toMatchObject({
      open: true,
      seed: 123,
      title: 'SESSION FORGED',
      programLabel: 'Forge Day 1',
      coachNote: 'Solid work.',
      canLogNutrition: true,
      feedback: null,
      notes: '',
    });
    expect(prompt.feedbackOptions).toEqual([
      { value: 'too_hard', label: 'Too hard' },
      { value: 'good', label: 'Good' },
      { value: 'too_easy', label: 'Too easy' },
    ]);
    expect(prompt.stats).toEqual([
      {
        key: 'duration',
        accent: '',
        label: 'Duration',
        initialText: '0s',
      },
      {
        key: 'sets',
        accent: 'green',
        label: 'Sets Done',
        initialText: '0/15',
      },
      {
        key: 'volume',
        accent: 'gold',
        label: 'Volume',
        initialText: '0 kg',
      },
      {
        key: 'rpe',
        accent: 'purple',
        label: 'RPE',
        initialText: '--',
      },
      {
        key: 'prs',
        accent: 'gold',
        label: 'PRs',
        initialText: '0',
      },
    ]);
  });

  it('commits workout finish persistence in typed order and schedules finish toasts', async () => {
    const calls: string[] = [];
    const toasts: Array<{ text: string; color?: string }> = [];
    const workouts: Array<Record<string, unknown>> = [];
    const finishPlan = buildWorkoutFinishPlan(
      {
        prog: {
          id: 'forge',
          name: 'Forge',
          getWorkoutMeta: () => ({ week: 1, cycle: 1 }),
          adjustAfterSession: () => ({ week: 1, cycle: 1 }),
          advanceState: () => ({ week: 2, cycle: 1 }),
          getBlockInfo: () => ({ name: 'Week 2' }),
        },
        activeWorkout: {
          program: 'forge',
          type: 'forge',
          programOption: '1',
          programLabel: 'Day 1',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ weight: 80, reps: 5, done: true }],
            },
          ],
          sessionDescription: 'Bench focus',
          isBonus: false,
        },
        state: { week: 1, cycle: 1 },
        workouts: [],
        sessionRPE: 7,
        duration: 3600,
        prCount: 1,
        workoutId: 123,
        workoutDate: '2026-04-06T10:00:00.000Z',
        programName: 'Forge',
      },
      {
        cloneTrainingDecision: (value?: Record<string, unknown> | null) =>
          value ? JSON.parse(JSON.stringify(value)) : null,
        stripWarmupSetsFromExercises: (exercises: Array<Record<string, unknown>>) =>
          exercises,
        getWeekStart: (date: Date) => date,
        parseLoggedRepCount: (value: unknown) => Number(value) || 0,
        t: (key: string, fallback: string, params?: Record<string, unknown>) => {
          if (!params) return fallback;
          return Object.entries(params).reduce(
            (text, [paramKey, value]) =>
              text.replace(`{${paramKey}}`, String(value ?? '')),
            fallback
          );
        },
      }
    );

    await commitWorkoutFinishPersistence(
      {
        prog: { id: 'forge' },
        finishPlan,
        workouts,
      },
      {
        logWarn: (scope: string) => calls.push(`warn:${scope}`),
        showToast: (text: string, color?: string) => {
          toasts.push({ text, color });
        },
        setTimer: (callback: () => void) => {
          calls.push('timer');
          callback();
        },
        setProgramState: (programId: string) => {
          calls.push(`setProgramState:${programId}`);
        },
        saveProfileData: () => {
          calls.push('saveProfileData');
        },
        upsertWorkoutRecord: async () => {
          calls.push('upsertWorkoutRecord');
        },
        saveWorkouts: async () => {
          calls.push('saveWorkouts');
        },
        buildExerciseIndex: () => {
          calls.push('buildExerciseIndex');
        },
        t: (_key: string, fallback: string) => fallback,
      }
    );

    expect(workouts).toHaveLength(1);
    expect(workouts[0]?.id).toBe(123);
    expect(calls).toEqual([
      'timer',
      'setProgramState:forge',
      'saveProfileData',
      'upsertWorkoutRecord',
      'saveWorkouts',
      'buildExerciseIndex',
    ]);
    expect(toasts).toEqual([
      {
        text: 'Forge - Week 2 up next!',
        color: 'var(--purple)',
      },
    ]);
  });

  it('applies post-workout outcome effects through typed runtime helpers', async () => {
    const calls: string[] = [];
    const toasts: Array<{ text: string; color?: string }> = [];

    await applyPostWorkoutOutcomeEffects(
      {
        postWorkoutOutcome: {
          shouldSaveWorkouts: true,
          tmAdjustmentToast: 'Bench TM updated',
          goToNutrition: true,
          nutritionContext: { completedSets: 12 },
          durationSignal: 'too_long',
        },
        summaryData: { completedSets: 12 },
      },
      {
        saveWorkouts: async () => {
          calls.push('saveWorkouts');
        },
        showToast: (text: string, color?: string) => {
          toasts.push({ text, color });
        },
        setTimer: (callback: () => void) => {
          calls.push('timer');
          callback();
        },
        setNutritionSessionContext: () => {
          calls.push('setNutritionSessionContext');
        },
        getRuntimeBridge: () => ({
          navigateToPage: (page: string) => {
            calls.push(`navigateToPage:${page}`);
          },
        }),
        showPage: (page: string) => {
          calls.push(`showPage:${page}`);
        },
      }
    );

    expect(calls).toEqual([
      'saveWorkouts',
      'timer',
      'setNutritionSessionContext',
      'navigateToPage:nutrition',
    ]);
    expect(toasts).toEqual([
      {
        text: 'Bench TM updated',
        color: 'var(--blue)',
      },
    ]);
  });

  it('resolves, starts, syncs, completes, skips, and restores workout rest timer state', () => {
    expect(
      resolveWorkoutRestDuration({
        restDuration: '180',
        profileDefaultRest: 120,
      })
    ).toBe(180);

    const started = startWorkoutRestTimer({
      restDuration: 180,
      now: 1_000,
    });
    expect(started).toMatchObject({
      restDuration: 180,
      restTotal: 180,
      restEndsAt: 181_000,
      restSecondsLeft: 180,
      restBarActive: true,
      shouldSkip: false,
      isComplete: false,
    });

    const synced = syncWorkoutRestTimer({
      restDuration: started.restDuration,
      restTotal: started.restTotal,
      restEndsAt: started.restEndsAt,
      now: 31_000,
    });
    expect(synced).toMatchObject({
      restEndsAt: 181_000,
      restSecondsLeft: 150,
      restBarActive: true,
      isComplete: false,
    });

    const completed = syncWorkoutRestTimer({
      restDuration: started.restDuration,
      restTotal: started.restTotal,
      restEndsAt: started.restEndsAt,
      now: 181_100,
    });
    expect(completed).toMatchObject({
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: true,
      isComplete: true,
    });

    expect(
      completeWorkoutRestTimer({
        restDuration: 180,
        restTotal: 180,
      })
    ).toMatchObject({
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: true,
      isComplete: true,
    });

    expect(
      skipWorkoutRestTimer({
        restDuration: 180,
      })
    ).toMatchObject({
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: false,
      shouldSkip: true,
      isComplete: false,
    });

    expect(
      restoreWorkoutRestTimer({
        restDuration: 120,
        restTotal: 120,
        restEndsAt: 150_000,
        now: 100_000,
      })
    ).toMatchObject({
      restDuration: 120,
      restTotal: 120,
      restEndsAt: 150_000,
      restSecondsLeft: 50,
      restBarActive: true,
      isComplete: false,
    });

    expect(
      restoreWorkoutRestTimer({
        restDuration: 120,
        restTotal: 120,
        restEndsAt: 90_000,
        now: 100_000,
      })
    ).toMatchObject({
      restDuration: 120,
      restTotal: 0,
      restEndsAt: 0,
      restSecondsLeft: 0,
      restBarActive: false,
      isComplete: false,
    });
  });

  it('builds typed workout rest display state and workout session snapshots', () => {
    expect(
      buildWorkoutRestDisplayState(
        {
          restSecondsLeft: 65,
          restTotal: 180,
        },
        {
          t: (_key: string, fallback: string) => fallback,
        }
      )
    ).toEqual({
      text: '1:05',
      className: 'rest-timer-count',
      arcOffset: 119.4 * (1 - 65 / 180),
    });

    expect(
      buildWorkoutRestDisplayState(
        {
          restSecondsLeft: 0,
          restTotal: 180,
        },
        {
          t: (_key: string, fallback: string) => fallback,
        }
      )
    ).toEqual({
      text: 'GO',
      className: 'rest-timer-count done',
      arcOffset: 119.4,
    });

    expect(
      buildWorkoutSessionSnapshot({
        activeWorkout: { programLabel: 'Forge Day 1' },
        restDuration: 180,
        restEndsAt: 120_000,
        restSecondsLeft: 45,
        restTotal: 180,
        currentUser: { id: 'user-1' },
        restBarActive: true,
        rpePrompt: { open: true, title: 'How hard?' },
        summaryPrompt: { open: false, title: 'Done' },
        sportCheckPrompt: { open: true, title: 'Sport check' },
        exerciseGuidePrompt: null,
      })
    ).toEqual({
      activeWorkout: { programLabel: 'Forge Day 1' },
      restDuration: 180,
      restEndsAt: 120000,
      restSecondsLeft: 45,
      restTotal: 180,
      currentUser: { id: 'user-1' },
      restBarActive: true,
      rpeOpen: true,
      rpePrompt: { open: true, title: 'How hard?' },
      summaryOpen: false,
      summaryPrompt: { open: false, title: 'Done' },
      sportCheckOpen: true,
      sportCheckPrompt: { open: true, title: 'Sport check' },
      exerciseGuideOpen: false,
      exerciseGuidePrompt: null,
    });
  });

  it('builds workout rest lifecycle plans for sync completion and skip flows', () => {
    expect(
      buildWorkoutRestLifecyclePlan(
        {
          mode: 'sync',
          restDuration: 180,
          restTotal: 180,
          restEndsAt: 100_000,
          now: 100_500,
        },
        {
          t: (_key: string, fallback: string) => fallback,
        }
      )
    ).toEqual({
      timerState: {
        restDuration: 180,
        restTotal: 180,
        restEndsAt: 0,
        restSecondsLeft: 0,
        restBarActive: true,
        shouldSkip: false,
        isComplete: true,
      },
      displayState: {
        text: 'GO',
        className: 'rest-timer-count done',
        arcOffset: 119.4,
      },
      shouldComplete: true,
      shouldPlayBeep: true,
      hideDelayMs: 3000,
    });

    expect(
      buildWorkoutRestLifecyclePlan(
        {
          mode: 'skip',
          restDuration: 180,
        },
        {
          t: (_key: string, fallback: string) => fallback,
        }
      )
    ).toEqual({
      timerState: {
        restDuration: 180,
        restTotal: 0,
        restEndsAt: 0,
        restSecondsLeft: 0,
        restBarActive: false,
        shouldSkip: true,
        isComplete: false,
      },
      displayState: {
        text: 'GO',
        className: 'rest-timer-count done',
        arcOffset: 119.4,
      },
      shouldComplete: false,
      shouldPlayBeep: false,
      hideDelayMs: 0,
    });
  });

  it('schedules and clears workout rest host timers through typed runtime helpers', () => {
    const calls: string[] = [];

    scheduleWorkoutRestIntervalHost(
      () => {
        calls.push('interval-callback');
      },
      {
        setInterval: (callback: () => void) => {
          calls.push('setInterval');
          return callback;
        },
        clearInterval: () => {
          calls.push('clearInterval');
        },
      }
    );
    scheduleWorkoutRestIntervalHost(
      () => {
        calls.push('interval-callback-2');
      },
      {
        setInterval: (callback: () => void) => {
          calls.push('setInterval-2');
          return callback;
        },
        clearInterval: () => {
          calls.push('clearInterval-2');
        },
      }
    );
    clearWorkoutRestIntervalHost({
      clearInterval: () => {
        calls.push('clearInterval-3');
      },
    });

    scheduleWorkoutRestHideHost(
      () => {
        calls.push('hide-callback');
      },
      600,
      {
        setTimeout: (_callback: () => void, delay?: number) => {
          calls.push(`setTimeout:${delay}`);
          return 'hide-handle';
        },
        clearTimeout: () => {
          calls.push('clearTimeout');
        },
      }
    );
    scheduleWorkoutRestHideHost(
      () => {
        calls.push('hide-callback-2');
      },
      300,
      {
        setTimeout: (_callback: () => void, delay?: number) => {
          calls.push(`setTimeout-2:${delay}`);
          return 'hide-handle-2';
        },
        clearTimeout: () => {
          calls.push('clearTimeout-2');
        },
      }
    );
    clearWorkoutRestHideHost({
      clearTimeout: () => {
        calls.push('clearTimeout-3');
      },
    });

    expect(calls).toEqual([
      'setInterval',
      'clearInterval-2',
      'setInterval-2',
      'clearInterval-3',
      'setTimeout:600',
      'clearTimeout-2',
      'setTimeout-2:300',
      'clearTimeout-3',
    ]);
  });

  it('sanitizes weight and reps into supported ranges', () => {
    expect(sanitizeSetValue('weight', '67.56')).toBe(67.6);
    expect(sanitizeSetValue('weight', '-2')).toBe(0);
    expect(sanitizeSetValue('reps', '12.9')).toBe(12);
    expect(sanitizeSetValue('reps', 'nope')).toBe('');
  });

  it('updates a set and propagates weight to later unfinished work sets', () => {
    const exercise = {
      sets: [
        { weight: 60, reps: 5, done: false, isWarmup: false },
        { weight: 60, reps: 5, done: false, isWarmup: false },
        { weight: 40, reps: 5, done: false, isWarmup: true },
        { weight: 60, reps: 5, done: true, isWarmup: false },
      ],
    };

    const result = applySetUpdateMutation({
      exercise,
      setIndex: 0,
      field: 'weight',
      rawValue: '67.5',
    });

    expect(result).toMatchObject({
      sanitizedValue: 67.5,
      shouldRefreshDoneSet: false,
      propagatedSetIndexes: [1],
    });
    expect(exercise.sets[0].weight).toBe(67.5);
    expect(exercise.sets[1].weight).toBe(67.5);
    expect(exercise.sets[2].weight).toBe(40);
    expect(exercise.sets[3].weight).toBe(60);
  });

  it('marks completed work sets for refresh when reps change', () => {
    const exercise = {
      sets: [{ weight: 100, reps: 5, done: true, isWarmup: false }],
    };

    const result = applySetUpdateMutation({
      exercise,
      setIndex: 0,
      field: 'reps',
      rawValue: '8',
    });

    expect(result?.shouldRefreshDoneSet).toBe(true);
    expect(exercise.sets[0].reps).toBe(8);
  });

  it('toggles set completion and clears rir on undo', () => {
    const exercise = {
      sets: [{ weight: 80, reps: 5, done: false, rir: 2 }],
    };

    const completed = toggleWorkoutSetCompletion({
      exercise,
      setIndex: 0,
    });
    expect(completed?.isNowDone).toBe(true);
    expect(exercise.sets[0].done).toBe(true);

    const undone = toggleWorkoutSetCompletion({
      exercise,
      setIndex: 0,
    });
    expect(undone?.isNowDone).toBe(false);
    expect(exercise.sets[0].done).toBe(false);
    expect(exercise.sets[0].rir).toBeUndefined();
  });

  it('appends a set using the latest set defaults', () => {
    const exercise = {
      sets: [{ weight: 75, reps: 6, done: true, rpe: 8 }],
    };

    const result = appendWorkoutSet({ exercise });

    expect(result?.newSetIndex).toBe(1);
    expect(exercise.sets[1]).toEqual({
      weight: 75,
      reps: 6,
      done: false,
      rpe: null,
    });
  });

  it('removes an exercise and returns the removed entry', () => {
    const exercises = [{ name: 'Bench' }, { name: 'Row' }, { name: 'Squat' }];

    const result = removeWorkoutExercise({
      exercises,
      exerciseIndex: 1,
    });

    expect(result?.removed).toEqual({ name: 'Row' });
    expect(exercises).toEqual([{ name: 'Bench' }, { name: 'Squat' }]);
  });
});
