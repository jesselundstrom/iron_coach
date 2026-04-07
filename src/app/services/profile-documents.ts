import { PROFILE_DOCUMENT_KEYS } from '../../domain/config';
import {
  normalizeBodyMetrics,
  normalizeCoachingProfile,
  normalizeProfileProgramStateMap,
  normalizeScheduleState,
  normalizeTrainingPreferences,
} from '../../domain/normalizers';
import { getCanonicalProgramId } from '../../domain/planning-utils';
import { typedProgramRegistry } from '../../programs';

type MutableRecord = Record<string, unknown>;

type ProgramDefinition = (typeof typedProgramRegistry)[keyof typeof typedProgramRegistry];

export type ProfileDocumentRow = {
  doc_key: string;
  payload?: MutableRecord;
  client_updated_at?: string | null;
  updated_at?: string | null;
  applied?: boolean;
};

export type BuildStateFromProfileDocumentsInput = {
  rows?: Array<ProfileDocumentRow | null | undefined> | null;
  fallbackProfile?: MutableRecord | null;
  fallbackSchedule?: MutableRecord | null;
  workoutItems?: Array<Record<string, unknown>> | null;
  currentSchedule?: MutableRecord | null;
  isDocKeyDirty?: (docKey: string) => boolean;
  bootstrapProfileRuntimeState?: (input?: Record<string, unknown>) => {
    profile: MutableRecord;
    schedule: MutableRecord;
    workouts: Array<Record<string, unknown>>;
  };
};

export type BuildStateFromProfileDocumentsResult = {
  profile: MutableRecord;
  schedule: MutableRecord;
  rowsByKey: Map<string, ProfileDocumentRow>;
};

export type ResolveProfileSaveDocKeysOptions = {
  docKeys?: string[];
  programIds?: string[];
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getProfilePrograms(profileLike?: MutableRecord | null) {
  return profileLike &&
    typeof profileLike.programs === 'object' &&
    profileLike.programs
    ? (profileLike.programs as MutableRecord)
    : {};
}

function listProgramIds(profileLike?: MutableRecord | null) {
  return Object.keys(getProfilePrograms(profileLike)).sort();
}

function filterCoreSyncMeta(syncMetaLike: unknown) {
  if (!syncMetaLike || typeof syncMetaLike !== 'object') return undefined;
  const next = { ...(syncMetaLike as MutableRecord) };
  delete next.profileUpdatedAt;
  delete next.scheduleUpdatedAt;
  delete next.programUpdatedAt;
  return Object.keys(next).length ? next : undefined;
}

function getRegisteredProgramDefinition(programId: unknown): ProgramDefinition | null {
  const canonicalId = getCanonicalProgramId(programId);
  if (!canonicalId) return null;
  return (
    typedProgramRegistry[canonicalId as keyof typeof typedProgramRegistry] || null
  );
}

function getImportedLegacyProgramMap(profileLike?: MutableRecord | null) {
  const source = cloneJson(profileLike || {}) || {};
  if (source.atsLifts && !source.forgeLifts) {
    source.forgeLifts = source.atsLifts;
    source.forgeWeek = source.atsWeek || 1;
    source.forgeRounding = source.atsRounding || 2.5;
    source.forgeDaysPerWeek = source.atsDaysPerWeek || 3;
    source.forgeDayNum = source.atsDayNum || 1;
    source.forgeBackExercise = source.atsBackExercise || 'Barbell Rows';
    source.forgeBackWeight = source.atsBackWeight || 0;
    source.forgeMode = source.atsMode || 'sets';
    source.forgeWeekStartDate = source.atsWeekStartDate || new Date().toISOString();
  }
  if (!source.programs && source.forgeLifts) {
    return {
      forge: {
        week: source.forgeWeek || 1,
        dayNum: source.forgeDayNum || 1,
        daysPerWeek: source.forgeDaysPerWeek || 3,
        mode: source.forgeMode || 'sets',
        rounding: source.forgeRounding || 2.5,
        weekStartDate: source.forgeWeekStartDate || new Date().toISOString(),
        backExercise: source.forgeBackExercise || 'Barbell Rows',
        backWeight: source.forgeBackWeight || 0,
        lifts: source.forgeLifts,
      },
    };
  }
  return {};
}

function getNormalizedProgramStateMap(profileLike?: MutableRecord | null) {
  const sourcePrograms = {
    ...getImportedLegacyProgramMap(profileLike),
    ...(cloneJson(getProfilePrograms(profileLike)) || {}),
  };
  const normalizedProfile = { programs: sourcePrograms };
  normalizeProfileProgramStateMap(normalizedProfile, getCanonicalProgramId);
  const nextPrograms: Record<string, Record<string, unknown>> = {};

  Object.entries(normalizedProfile.programs || {}).forEach(([programId, state]) => {
    const definition = getRegisteredProgramDefinition(programId);
    if (!definition) return;
    const definitionId = String(definition.id || programId);
    let nextState =
      state && typeof state === 'object'
        ? cloneJson(state as MutableRecord) || {}
        : cloneJson(
            typeof definition.getInitialState === 'function'
              ? definition.getInitialState()
              : {}
          ) || {};
    if (typeof definition.migrateState === 'function') {
      nextState = definition.migrateState(nextState) || nextState;
    }
    nextPrograms[definitionId] =
      nextState && typeof nextState === 'object'
        ? (nextState as Record<string, unknown>)
        : {};
  });

  return nextPrograms;
}

export function uniqueDocKeys(keys?: Array<string | null | undefined> | null) {
  return [...new Set((keys || []).filter(Boolean) as string[])];
}

export function programDocKey(programId: unknown) {
  const canonicalId = getCanonicalProgramId(programId);
  return `${PROFILE_DOCUMENT_KEYS.programPrefix}${String(canonicalId || '')}`;
}

export function programIdFromDocKey(docKey: unknown) {
  const key = String(docKey || '');
  const prefix = PROFILE_DOCUMENT_KEYS.programPrefix;
  const programId = key.startsWith(prefix) ? key.slice(prefix.length) : '';
  return getCanonicalProgramId(programId);
}

export function isProgramDocKey(docKey: unknown) {
  return !!programIdFromDocKey(docKey);
}

export function getAllProfileDocumentKeys(profileLike?: MutableRecord | null) {
  return uniqueDocKeys([
    PROFILE_DOCUMENT_KEYS.core,
    PROFILE_DOCUMENT_KEYS.schedule,
    ...listProgramIds(profileLike).map(programDocKey),
  ]);
}

export function resolveProfileSaveDocKeys(
  profileLike?: MutableRecord | null,
  options?: ResolveProfileSaveDocKeysOptions | null
) {
  const opts = options || {};
  if (Array.isArray(opts.docKeys) && opts.docKeys.length) {
    return uniqueDocKeys(opts.docKeys);
  }
  if (Array.isArray(opts.programIds) && opts.programIds.length) {
    return uniqueDocKeys(opts.programIds.map(programDocKey));
  }
  return uniqueDocKeys([
    PROFILE_DOCUMENT_KEYS.core,
    ...listProgramIds(profileLike).map(programDocKey),
  ]);
}

export function createNormalizedProfileCore(
  profileLike?: MutableRecord | null,
  options?: { includeSyncMeta?: boolean; defaultLanguage?: string }
) {
  const source = profileLike && typeof profileLike === 'object' ? profileLike : {};
  const next: MutableRecord = {
    defaultRest: Number(source.defaultRest) || 120,
    language:
      String(source.language || options?.defaultLanguage || '').trim().toLowerCase() === 'fi'
        ? 'fi'
        : 'en',
    activeProgram: getCanonicalProgramId(source.activeProgram) || 'forge',
  };
  const preferencesHolder = {
    preferences: cloneJson((source.preferences as MutableRecord) || {}) || {},
  };
  const coachingHolder = {
    coaching: cloneJson((source.coaching as MutableRecord) || {}) || {},
  };
  const bodyMetricsHolder = {
    bodyMetrics: cloneJson((source.bodyMetrics as MutableRecord) || {}) || {},
  };
  next.preferences = normalizeTrainingPreferences(preferencesHolder);
  next.coaching = normalizeCoachingProfile(coachingHolder);
  next.bodyMetrics = normalizeBodyMetrics(bodyMetricsHolder);
  if (options?.includeSyncMeta && source.syncMeta) {
    const filteredSyncMeta = filterCoreSyncMeta(cloneJson(source.syncMeta));
    if (filteredSyncMeta) next.syncMeta = filteredSyncMeta;
  }
  return next;
}

export function createNormalizedSchedulePayload(scheduleLike?: MutableRecord | null) {
  const source = scheduleLike && typeof scheduleLike === 'object' ? scheduleLike : {};
  const next: MutableRecord = {
    sportName: source.sportName,
    sportDays: Array.isArray(source.sportDays)
      ? [...source.sportDays]
      : Array.isArray(source.hockeyDays)
        ? [...source.hockeyDays]
        : [],
    sportIntensity: source.sportIntensity,
    sportLegsHeavy: source.sportLegsHeavy,
  };
  normalizeScheduleState(next);
  return next;
}

export function getDocumentPayload(
  docKey: unknown,
  profileLike?: MutableRecord | null,
  scheduleLike?: MutableRecord | null,
  options?: { defaultLanguage?: string }
) {
  const key = String(docKey || '');
  if (key === PROFILE_DOCUMENT_KEYS.core) {
    return createNormalizedProfileCore(profileLike, {
      includeSyncMeta: true,
      defaultLanguage: options?.defaultLanguage,
    });
  }
  if (key === PROFILE_DOCUMENT_KEYS.schedule) {
    return createNormalizedSchedulePayload(scheduleLike);
  }
  const programId = programIdFromDocKey(key);
  if (programId) {
    const state = getNormalizedProgramStateMap(profileLike)[programId];
    return state === undefined ? undefined : cloneJson(state) || {};
  }
  return undefined;
}

export function toProfileDocumentRows(input: {
  docKeys?: string[] | null;
  profileLike?: MutableRecord | null;
  scheduleLike?: MutableRecord | null;
  defaultLanguage?: string;
}) {
  const profileSyncMeta = input.profileLike?.syncMeta as
    | MutableRecord
    | undefined;
  const rows = uniqueDocKeys(input.docKeys)
    .map((docKey) => {
      const payload = getDocumentPayload(
        docKey,
        input.profileLike,
        input.scheduleLike,
        { defaultLanguage: input.defaultLanguage }
      );
      if (payload === undefined) return null;
      let clientUpdatedAt = new Date().toISOString();
      if (docKey === PROFILE_DOCUMENT_KEYS.core) {
        clientUpdatedAt = String(
          profileSyncMeta?.['profileUpdatedAt'] || clientUpdatedAt
        );
      } else if (docKey === PROFILE_DOCUMENT_KEYS.schedule) {
        clientUpdatedAt = String(
          profileSyncMeta?.['scheduleUpdatedAt'] || clientUpdatedAt
        );
      } else {
        const programId = programIdFromDocKey(docKey);
        clientUpdatedAt =
          String(
            (profileSyncMeta?.['programUpdatedAt'] as MutableRecord | undefined)?.[
              programId
            ] ||
              clientUpdatedAt
          );
      }
      return {
        doc_key: docKey,
        payload,
        client_updated_at: clientUpdatedAt,
      };
    })
    .filter(Boolean);

  return rows as Array<{ doc_key: string; payload: MutableRecord; client_updated_at: string }>;
}

export function parseSyncStamp(value: unknown) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : 0;
}

export function laterIso(a: unknown, b: unknown) {
  const at = parseSyncStamp(a);
  const bt = parseSyncStamp(b);
  if (at === 0 && bt === 0) return undefined;
  return at >= bt ? (String(a || new Date(at).toISOString()) || undefined) : (String(b || new Date(bt).toISOString()) || undefined);
}

export function getDocumentUpdatedAt(row: ProfileDocumentRow | null | undefined) {
  if (!row || typeof row !== 'object') return undefined;
  return row.client_updated_at || row.updated_at || undefined;
}

export function mergeSyncMeta(localMeta: unknown, remoteMeta: unknown) {
  const local = localMeta && typeof localMeta === 'object' ? (localMeta as MutableRecord) : {};
  const remote = remoteMeta && typeof remoteMeta === 'object' ? (remoteMeta as MutableRecord) : {};
  const merged: MutableRecord = { ...remote, ...local };
  const profileUpdatedAt = laterIso(
    local['profileUpdatedAt'],
    remote['profileUpdatedAt']
  );
  const scheduleUpdatedAt = laterIso(
    local['scheduleUpdatedAt'],
    remote['scheduleUpdatedAt']
  );
  if (profileUpdatedAt) merged.profileUpdatedAt = profileUpdatedAt;
  if (scheduleUpdatedAt) merged.scheduleUpdatedAt = scheduleUpdatedAt;
  const programIds = new Set([
    ...Object.keys((local['programUpdatedAt'] as MutableRecord) || {}),
    ...Object.keys((remote['programUpdatedAt'] as MutableRecord) || {}),
  ]);
  if (programIds.size) {
    merged.programUpdatedAt = {};
    programIds.forEach((programId) => {
      const next = laterIso(
        (local['programUpdatedAt'] as MutableRecord | undefined)?.[programId],
        (remote['programUpdatedAt'] as MutableRecord | undefined)?.[programId]
      );
      if (next) {
        (merged.programUpdatedAt as MutableRecord)[programId] = next;
      }
    });
    if (!Object.keys((merged.programUpdatedAt as MutableRecord) || {}).length) {
      delete merged.programUpdatedAt;
    }
  }
  if ('workoutsTableReady' in local || 'workoutsTableReady' in remote) {
    merged.workoutsTableReady = !!(local.workoutsTableReady || remote.workoutsTableReady);
  }
  return merged;
}

export function shouldUseRemoteSection(
  localUpdatedAt: unknown,
  remoteUpdatedAt: unknown,
  options?: { preferRemoteWhenUnset?: boolean }
) {
  const localStamp = parseSyncStamp(localUpdatedAt);
  const remoteStamp = parseSyncStamp(remoteUpdatedAt);
  if (remoteStamp === 0 && localStamp === 0) {
    return options?.preferRemoteWhenUnset === true;
  }
  if (remoteStamp === 0) return false;
  if (localStamp === 0) return true;
  return remoteStamp >= localStamp;
}

export function buildStateFromProfileDocuments(
  input: BuildStateFromProfileDocumentsInput
): BuildStateFromProfileDocumentsResult {
  const isDocKeyDirty = input.isDocKeyDirty || (() => false);
  const baseProfile = cloneJson(input.fallbackProfile || {}) || {};
  const baseProfileSyncMeta = (baseProfile.syncMeta as MutableRecord | undefined) || {};
  const nextProfile: MutableRecord = {
    ...baseProfile,
    programs: { ...cloneJson(getProfilePrograms(baseProfile)) },
  };
  const nextSchedule =
    cloneJson(input.fallbackSchedule || input.currentSchedule || {}) || {};
  const rowsByKey = new Map(
    (input.rows || [])
      .filter(Boolean)
      .map((row) => [String((row as ProfileDocumentRow).doc_key || ''), row as ProfileDocumentRow])
  );

  const coreRow = rowsByKey.get(PROFILE_DOCUMENT_KEYS.core);
  const corePayload = coreRow?.payload;
  if (corePayload && typeof corePayload === 'object') {
    const existingPrograms = nextProfile.programs || {};
    const existingSyncMeta = { ...(nextProfile.syncMeta as MutableRecord || {}) };
    const incomingSyncMeta = { ...(corePayload.syncMeta as MutableRecord || {}) };
    const remoteUpdatedAt = getDocumentUpdatedAt(coreRow);
    const localUpdatedAt = baseProfileSyncMeta['profileUpdatedAt'];
    const shouldApplyRemoteCore =
      !isDocKeyDirty(PROFILE_DOCUMENT_KEYS.core) &&
      shouldUseRemoteSection(localUpdatedAt, remoteUpdatedAt, {
        preferRemoteWhenUnset: true,
      });
    if (shouldApplyRemoteCore) {
      Object.assign(nextProfile, corePayload);
      nextProfile.programs = existingPrograms;
    }
    nextProfile.syncMeta = { ...existingSyncMeta, ...incomingSyncMeta };
    const mergedProfileUpdatedAt = laterIso(localUpdatedAt, remoteUpdatedAt);
    if (mergedProfileUpdatedAt) {
      (nextProfile.syncMeta as MutableRecord).profileUpdatedAt =
        mergedProfileUpdatedAt;
    }
  }

  const scheduleRow = rowsByKey.get(PROFILE_DOCUMENT_KEYS.schedule);
  const schedulePayload = scheduleRow?.payload;
  let resolvedSchedule = nextSchedule;
  if (schedulePayload && typeof schedulePayload === 'object') {
    const remoteUpdatedAt = getDocumentUpdatedAt(scheduleRow);
    const localUpdatedAt = baseProfileSyncMeta['scheduleUpdatedAt'];
    const shouldApplyRemoteSchedule =
      !isDocKeyDirty(PROFILE_DOCUMENT_KEYS.schedule) &&
      shouldUseRemoteSection(localUpdatedAt, remoteUpdatedAt, {
        preferRemoteWhenUnset: true,
      });
    if (shouldApplyRemoteSchedule) {
      resolvedSchedule = schedulePayload as MutableRecord;
    }
    const mergedScheduleUpdatedAt = laterIso(localUpdatedAt, remoteUpdatedAt);
    if (mergedScheduleUpdatedAt) {
      if (!nextProfile.syncMeta || typeof nextProfile.syncMeta !== 'object') {
        nextProfile.syncMeta = {};
      }
      (nextProfile.syncMeta as MutableRecord).scheduleUpdatedAt =
        mergedScheduleUpdatedAt;
    }
  }

  const programIds = new Set([
    ...Object.keys((nextProfile.programs as MutableRecord) || {}),
    ...Array.from(rowsByKey.keys())
      .filter(isProgramDocKey)
      .map(programIdFromDocKey),
  ]);
  programIds.forEach((programId) => {
    const normalizedProgramId = String(programId || '');
    const row = rowsByKey.get(programDocKey(normalizedProgramId));
    const payload = row?.payload;
    if (payload && typeof payload === 'object') {
      const remoteUpdatedAt = getDocumentUpdatedAt(row);
      const localUpdatedAt =
        (baseProfileSyncMeta['programUpdatedAt'] as MutableRecord | undefined)?.[
          normalizedProgramId
        ];
      const shouldApplyRemoteProgram =
        !isDocKeyDirty(programDocKey(normalizedProgramId)) &&
        shouldUseRemoteSection(localUpdatedAt, remoteUpdatedAt, {
          preferRemoteWhenUnset: true,
        });
      if (shouldApplyRemoteProgram) {
        (nextProfile.programs as MutableRecord)[normalizedProgramId] = payload;
      }
      const mergedProgramUpdatedAt = laterIso(localUpdatedAt, remoteUpdatedAt);
      if (mergedProgramUpdatedAt) {
        if (!nextProfile.syncMeta || typeof nextProfile.syncMeta !== 'object') {
          nextProfile.syncMeta = {};
        }
        if (
          !(nextProfile.syncMeta as MutableRecord).programUpdatedAt ||
          typeof (nextProfile.syncMeta as MutableRecord).programUpdatedAt !== 'object'
        ) {
          (nextProfile.syncMeta as MutableRecord).programUpdatedAt = {};
        }
        ((nextProfile.syncMeta as MutableRecord).programUpdatedAt as MutableRecord)[
          normalizedProgramId
        ] = mergedProgramUpdatedAt;
      }
    }
  });

  const bootstrapProfileRuntimeState =
    input.bootstrapProfileRuntimeState ||
    (() => ({
      profile: nextProfile,
      schedule: resolvedSchedule,
      workouts: input.workoutItems || [],
    }));
  const bootstrapResult = bootstrapProfileRuntimeState({
    profile: nextProfile,
    schedule: resolvedSchedule,
    workouts: input.workoutItems || [],
    applyToStore: false,
    normalizeWorkouts: false,
    applyProgramCatchUp: false,
  });

  return {
    profile: bootstrapResult.profile,
    schedule: bootstrapResult.schedule,
    rowsByKey,
  };
}
