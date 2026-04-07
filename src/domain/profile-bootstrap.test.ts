import { describe, expect, it } from 'vitest';
import { bootstrapProfileRuntime } from './profile-bootstrap';

describe('profile bootstrap legacy normalization', () => {
  it('normalizes blob-era ATS fields into canonical forge program state', () => {
    const result = bootstrapProfileRuntime({
      profile: {
        activeProgram: 'ats',
        atsWeek: 3,
        atsDayNum: 2,
        atsDaysPerWeek: 4,
        atsMode: 'sets',
        atsRounding: 2.5,
        atsBackExercise: 'Barbell Rows',
        atsBackWeight: 72.5,
        atsWeekStartDate: '2026-04-01T00:00:00.000Z',
        atsLifts: {
          squat: { weight: 100 },
          bench: { weight: 80 },
        },
      },
      schedule: {},
      workouts: [],
      applyProgramCatchUp: false,
    });

    expect(result.profile.activeProgram).toBe('forge');
    const forgeState = (result.profile.programs as Record<string, any> | undefined)
      ?.forge;
    expect(forgeState).toMatchObject({
      week: 3,
      mode: 'sets',
      rounding: 2.5,
      backExercise: 'Barbell Rows',
      backWeight: 72.5,
    });
    expect(forgeState?.lifts?.main).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Squat', tm: 100 }),
        expect.objectContaining({ name: 'Bench Press', tm: 80 }),
      ])
    );
    expect(result.profile).not.toHaveProperty('atsWeek');
    expect(result.profile).not.toHaveProperty('atsLifts');
    expect(result.changed.profile).toBe(true);
  });
});
