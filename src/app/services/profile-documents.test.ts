import { describe, expect, it } from 'vitest';
import { PROFILE_DOCUMENT_KEYS } from '../../domain/config';
import {
  buildStateFromProfileDocuments,
  mergeSyncMeta,
  resolveProfileSaveDocKeys,
  toProfileDocumentRows,
} from './profile-documents';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function passthroughBootstrap(input?: Record<string, unknown>) {
  return {
    profile: cloneJson((input?.profile as Record<string, unknown>) || {}),
    schedule: cloneJson((input?.schedule as Record<string, unknown>) || {}),
    workouts: cloneJson((input?.workouts as Array<Record<string, unknown>>) || []),
  };
}

describe('profile-documents helpers', () => {
  it('resolves default and program-targeted save doc keys', () => {
    const profile = {
      programs: {
        forge: { week: 1 },
        wendler531: { cycle: 2 },
      },
    };

    expect(resolveProfileSaveDocKeys(profile)).toEqual([
      PROFILE_DOCUMENT_KEYS.core,
      'program:forge',
      'program:wendler531',
    ]);
    expect(resolveProfileSaveDocKeys(profile, { programIds: ['w531'] })).toEqual([
      'program:wendler531',
    ]);
  });

  it('builds profile document rows with client timestamps from syncMeta', () => {
    const profile = {
      activeProgram: 'forge',
      preferences: { trainingDaysPerWeek: 3 },
      coaching: {},
      bodyMetrics: {},
      programs: {
        forge: { week: 2 },
      },
      syncMeta: {
        profileUpdatedAt: '2026-04-01T10:00:00.000Z',
        programUpdatedAt: {
          forge: '2026-04-01T11:00:00.000Z',
        },
      },
    };

    const rows = toProfileDocumentRows({
      docKeys: [PROFILE_DOCUMENT_KEYS.core, 'program:forge'],
      profileLike: profile,
      scheduleLike: null,
      defaultLanguage: 'en',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        doc_key: PROFILE_DOCUMENT_KEYS.core,
        client_updated_at: '2026-04-01T10:00:00.000Z',
      }),
      expect.objectContaining({
        doc_key: 'program:forge',
        client_updated_at: '2026-04-01T11:00:00.000Z',
      }),
    ]);
  });

  it('keeps newer local profile sections when remote docs are older', () => {
    const result = buildStateFromProfileDocuments({
      rows: [
        {
          doc_key: PROFILE_DOCUMENT_KEYS.core,
          payload: {
            defaultRest: 120,
            language: 'en',
            activeProgram: 'forge',
            preferences: { trainingDaysPerWeek: 5 },
            coaching: {},
          },
          client_updated_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-04-01T09:00:00.000Z',
        },
      ],
      fallbackProfile: {
        defaultRest: 120,
        language: 'en',
        activeProgram: 'forge',
        preferences: { trainingDaysPerWeek: 3 },
        coaching: {},
        syncMeta: {
          profileUpdatedAt: '2026-04-01T10:00:00.000Z',
        },
      },
      fallbackSchedule: { sportDays: [1, 3] },
      bootstrapProfileRuntimeState: passthroughBootstrap,
    });

    expect(result.profile.preferences).toEqual({ trainingDaysPerWeek: 3 });
  });

  it('applies newer remote program docs and preserves merged program sync timestamps', () => {
    const result = buildStateFromProfileDocuments({
      rows: [
        {
          doc_key: 'program:wendler531',
          payload: { cycle: 3, week: 2, daysPerWeek: 4 },
          client_updated_at: '2026-04-01T10:00:00.000Z',
          updated_at: '2026-04-01T09:00:00.000Z',
        },
      ],
      fallbackProfile: {
        programs: {
          wendler531: { cycle: 2, week: 1, daysPerWeek: 3 },
        },
        syncMeta: {
          programUpdatedAt: {
            wendler531: '2026-04-01T08:00:00.000Z',
          },
        },
      },
      fallbackSchedule: {},
      bootstrapProfileRuntimeState: passthroughBootstrap,
    });

    expect(result.profile.programs).toEqual({
      wendler531: { cycle: 3, week: 2, daysPerWeek: 4 },
    });
    expect(result.profile.syncMeta).toEqual({
      programUpdatedAt: {
        wendler531: '2026-04-01T10:00:00.000Z',
      },
    });
  });

  it('merges syncMeta by newest timestamp per section and program', () => {
    expect(
      mergeSyncMeta(
        {
          profileUpdatedAt: '2026-04-01T10:00:00.000Z',
          programUpdatedAt: {
            forge: '2026-04-01T09:00:00.000Z',
          },
        },
        {
          profileUpdatedAt: '2026-04-01T08:00:00.000Z',
          scheduleUpdatedAt: '2026-04-01T11:00:00.000Z',
          programUpdatedAt: {
            forge: '2026-04-01T12:00:00.000Z',
          },
          workoutsTableReady: true,
        }
      )
    ).toEqual({
      profileUpdatedAt: '2026-04-01T10:00:00.000Z',
      scheduleUpdatedAt: '2026-04-01T11:00:00.000Z',
      programUpdatedAt: {
        forge: '2026-04-01T12:00:00.000Z',
      },
      workoutsTableReady: true,
    });
  });
});
