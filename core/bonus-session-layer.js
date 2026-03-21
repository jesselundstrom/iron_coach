// Bonus session detection + generation layer.
// Builds a complementary accessory workout when all scheduled program sessions
// for the week are complete, targeting undertrained muscle groups.
(function () {
  'use strict';

  const BONUS_DISPLAY_GROUPS = [
    'chest',
    'back',
    'shoulders',
    'quads',
    'hamstrings',
    'glutes',
    'core',
    'biceps',
    'triceps',
  ];

  // Groups below this set-equivalent count are targeted for bonus work.
  // A well-hit group in a 3-day program accumulates 10-15+ set-equivalents,
  // so anything under 10 is relatively undertrained and benefits from extras.
  const GAP_THRESHOLD = 10;
  // Minimum exercises to generate (fill from least-trained groups if needed)
  const MIN_EXERCISES = 4;
  // Maximum gap groups to target in a bonus session
  const MAX_GAP_GROUPS = 5;
  // Sets per exercise in the bonus session
  const BONUS_SETS = 3;
  // Rep range
  const BONUS_REPS = 10;

  function i18nText(key, fallback, params) {
    if (window.I18N && I18N.t) return I18N.t(key, params, fallback);
    return fallback;
  }

  // ── Detection ──────────────────────────────────────────────────────

  function isBonusSessionAvailable(prog, state, workouts, schedule) {
    if (!prog || !prog.getSessionOptions) return false;
    try {
      var options = prog.getSessionOptions(state, workouts, schedule);
    } catch (_e) {
      return false;
    }
    if (!Array.isArray(options) || options.length === 0) return false;
    var allDone = options.every(function (o) {
      return o.done === true;
    });
    if (!allDone) return false;

    // Require at least 1 real (non-bonus) session this week
    var sow = getWeekStart(new Date());
    var realSessionCount = (workouts || []).filter(function (w) {
      return (
        (w.program === prog.id || (!w.program && w.type === prog.id)) &&
        new Date(w.date) >= sow &&
        !w.isBonus
      );
    }).length;
    return realSessionCount >= 1;
  }

  // ── Week muscle load analysis ──────────────────────────────────────

  function getWeekMuscleLoad(workouts, progId) {
    var sow = getWeekStart(new Date());
    var muscleLoad = {};
    var exercisesUsed = new Set();

    if (
      !window.EXERCISE_LIBRARY ||
      !EXERCISE_LIBRARY.getExerciseMeta ||
      !EXERCISE_LIBRARY.mapMuscleToDisplayGroup
    ) {
      return { muscleLoad: muscleLoad, exercisesUsed: exercisesUsed };
    }

    (workouts || []).forEach(function (w) {
      if (w.isBonus) return;
      if (w.type === 'sport' || w.type === 'hockey') return;
      if (progId && w.program !== progId && (w.program || w.type !== progId))
        return;
      if (new Date(w.date) < sow) return;

      (w.exercises || []).forEach(function (ex) {
        var completedSets = (ex.sets || []).filter(function (s) {
          return s.done && !s.isWarmup;
        }).length;
        if (!completedSets) return;

        exercisesUsed.add(ex.name);
        var meta = EXERCISE_LIBRARY.getExerciseMeta(
          ex.exerciseId || ex.name
        );
        if (!meta) return;

        (meta.primaryMuscles || []).forEach(function (muscle) {
          var group = EXERCISE_LIBRARY.mapMuscleToDisplayGroup(muscle);
          if (group) muscleLoad[group] = (muscleLoad[group] || 0) + completedSets;
        });
        (meta.secondaryMuscles || []).forEach(function (muscle) {
          var group = EXERCISE_LIBRARY.mapMuscleToDisplayGroup(muscle);
          if (group)
            muscleLoad[group] = (muscleLoad[group] || 0) + completedSets * 0.5;
        });
      });
    });

    return { muscleLoad: muscleLoad, exercisesUsed: exercisesUsed };
  }

  // ── Gap identification ─────────────────────────────────────────────

  function identifyMuscleGaps(weekMuscleLoad) {
    var ranked = BONUS_DISPLAY_GROUPS.map(function (group) {
      return { group: group, load: weekMuscleLoad[group] || 0 };
    }).sort(function (a, b) {
      return a.load - b.load;
    });

    var gaps = ranked.filter(function (item) {
      return item.load < GAP_THRESHOLD;
    });

    // If strict filtering yields fewer than MIN_EXERCISES groups, take the
    // least-trained groups regardless of threshold so the bonus session is
    // never too small.
    if (gaps.length < MIN_EXERCISES) {
      gaps = ranked.slice(0, MIN_EXERCISES);
    }

    return gaps.slice(0, MAX_GAP_GROUPS);
  }

  // ── Session builder ────────────────────────────────────────────────

  function buildBonusSession(prog, state, workouts, schedule) {
    // Allow program-specific override
    if (typeof prog.buildBonusSession === 'function') {
      try {
        var custom = prog.buildBonusSession(state, workouts, schedule);
        if (Array.isArray(custom) && custom.length > 0) return custom;
      } catch (_e) {}
    }

    var analysis = getWeekMuscleLoad(workouts, prog.id);
    var gaps = identifyMuscleGaps(analysis.muscleLoad);

    var exercises = [];
    var pickedNames = new Set();
    var pickedMovements = new Set();

    // Collect movement tags already heavily used this week
    var weekMovementTags = new Set();
    if (window.EXERCISE_LIBRARY && EXERCISE_LIBRARY.getExerciseMeta) {
      analysis.exercisesUsed.forEach(function (name) {
        var meta = EXERCISE_LIBRARY.getExerciseMeta(name);
        if (meta) (meta.movementTags || []).forEach(function (t) {
          weekMovementTags.add(t);
        });
      });
    }

    gaps.forEach(function (gap) {
      if (
        !window.EXERCISE_LIBRARY ||
        !EXERCISE_LIBRARY.searchExercises
      )
        return;
      var candidates = EXERCISE_LIBRARY.searchExercises('', {
        muscleGroups: [gap.group],
        limit: 20,
      });

      // Score candidates: prefer isolation, prefer fresh movement patterns,
      // prefer exercises not already done this week
      var scored = candidates.filter(function (c) {
        return !pickedNames.has(c.name);
      }).map(function (c) {
        var score = 0;
        // Strongly prefer isolation/accessory category exercises for bonus work
        if (c.category === 'isolation') score += 30;
        // Prefer exercises not already done this week
        if (!analysis.exercisesUsed.has(c.name)) score += 20;
        // Prefer movement patterns not already covered this week
        var moveTags = c.movementTags || [];
        var hasNewMovement = moveTags.some(function (t) {
          return !weekMovementTags.has(t) && !pickedMovements.has(t);
        });
        if (hasNewMovement) score += 15;
        // Prefer single-joint over compound for gap-fill
        if (moveTags.indexOf('isolation') >= 0) score += 10;
        // Small popularity tiebreaker
        score += Math.min(10, (c.popularity || 0) / 10);
        return { record: c, score: score };
      }).sort(function (a, b) {
        return b.score - a.score;
      });

      var pick = scored.length > 0 ? scored[0].record : null;
      if (!pick) return;

      pickedNames.add(pick.name);
      (pick.movementTags || []).forEach(function (t) {
        pickedMovements.add(t);
      });
      var groupLabel = i18nText(
        'muscle.' + gap.group,
        gap.group.charAt(0).toUpperCase() + gap.group.slice(1)
      );
      exercises.push({
        id: Date.now() + Math.random(),
        name: pick.name,
        note:
          groupLabel +
          ' \u00b7 ' +
          BONUS_SETS +
          '\u00d7' +
          BONUS_REPS +
          '-12',
        isAux: false,
        isAccessory: true,
        isBonus: true,
        tm: 0,
        auxSlotIdx: -1,
        sets: Array.from({ length: BONUS_SETS }, function () {
          return { weight: '', reps: BONUS_REPS, done: false, rpe: null };
        }),
      });
    });

    // Ensure a core exercise if core gap exists and not already included
    var hasCoreGap =
      (analysis.muscleLoad.core || 0) < 4 &&
      !exercises.some(function (ex) {
        var meta =
          window.EXERCISE_LIBRARY &&
          EXERCISE_LIBRARY.getExerciseMeta(ex.name);
        return (
          meta &&
          (meta.displayMuscleGroups || []).indexOf('core') >= 0
        );
      });
    if (hasCoreGap && exercises.length < 6) {
      var coreCandidates =
        window.EXERCISE_LIBRARY &&
        EXERCISE_LIBRARY.searchExercises('', {
          muscleGroups: ['core'],
          limit: 10,
        });
      if (coreCandidates) {
        var corePick = coreCandidates.filter(function (c) {
          return (
            !analysis.exercisesUsed.has(c.name) && !pickedNames.has(c.name)
          );
        })[0] || coreCandidates[0];
        if (corePick && !pickedNames.has(corePick.name)) {
          exercises.push({
            id: Date.now() + Math.random(),
            name: corePick.name,
            note:
              i18nText('muscle.core', 'Core') +
              ' \u00b7 ' +
              BONUS_SETS +
              '\u00d7' +
              BONUS_REPS +
              '-12',
            isAux: false,
            isAccessory: true,
            isBonus: true,
            tm: 0,
            auxSlotIdx: -1,
            sets: Array.from({ length: BONUS_SETS }, function () {
              return { weight: '', reps: BONUS_REPS, done: false, rpe: null };
            }),
          });
        }
      }
    }

    return exercises;
  }

  // ── Snapshot for React island ──────────────────────────────────────

  function getBonusSessionSnapshot(prog, state, workouts, schedule) {
    var analysis = getWeekMuscleLoad(workouts, prog.id);
    var gaps = identifyMuscleGaps(analysis.muscleLoad);
    var exercises = buildBonusSession(prog, state, workouts, schedule);
    var targetGroups = gaps.map(function (g) {
      return i18nText(
        'muscle.' + g.group,
        g.group.charAt(0).toUpperCase() + g.group.slice(1)
      );
    });

    return {
      available: true,
      label: i18nText('workout.bonus.label', 'Bonus Workout'),
      subtitle: i18nText(
        'workout.bonus.subtitle',
        'Extra session for undertrained areas'
      ),
      kicker: i18nText('workout.bonus.kicker', 'Week complete'),
      startLabel: i18nText(
        'workout.bonus.start',
        'Start Bonus Workout'
      ),
      targetGroups: targetGroups,
      preview: {
        headerTitle: i18nText(
          'workout.bonus.preview_title',
          'Bonus Session'
        ),
        chips: targetGroups.slice(0, 3),
        rows: exercises.map(function (ex, idx) {
          return {
            id: ex.id,
            index: idx + 1,
            name:
              window.EXERCISE_LIBRARY &&
              EXERCISE_LIBRARY.getDisplayName
                ? EXERCISE_LIBRARY.getDisplayName(ex.name)
                : ex.name,
            pattern: BONUS_SETS + ' \u00d7 ' + BONUS_REPS + '-12',
            weight: '',
          };
        }),
      },
    };
  }

  // ── Public API ─────────────────────────────────────────────────────

  window.BONUS_SESSION = {
    isBonusSessionAvailable: isBonusSessionAvailable,
    buildBonusSession: buildBonusSession,
    getBonusSessionSnapshot: getBonusSessionSnapshot,
    getWeekMuscleLoad: getWeekMuscleLoad,
    identifyMuscleGaps: identifyMuscleGaps,
  };
})();
