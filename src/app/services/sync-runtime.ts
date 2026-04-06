type MutableRecord = Record<string, unknown>;

type RealtimeChannelLike = {
  on: (
    event: string,
    filter: Record<string, unknown>,
    callback: () => void
  ) => RealtimeChannelLike;
  subscribe: () => unknown;
};

type SyncRuntimeState = {
  currentUser: MutableRecord | null;
  workouts: Array<Record<string, unknown>>;
  schedule: MutableRecord | null;
  profile: MutableRecord | null;
  activeWorkout: MutableRecord | null;
  cloudSyncEnabled: boolean;
};

type SyncCloudPullResult = {
  usedCloud: boolean;
  usedDocs: boolean;
  requiresBootstrapFinalize: boolean;
};

type SyncRuntimeDeps = {
  readState: () => SyncRuntimeState;
  writeState: (partial: Partial<SyncRuntimeState>) => void;
  setCloudSyncEnabled: (value: boolean) => void;
  setRestDuration: (value: number) => void;
  loadLocalData: (options?: Record<string, unknown>) => boolean;
  pullWorkoutsFromTable: (
    fallbackWorkouts?: Array<Record<string, unknown>>
  ) => Promise<{
    usedTable: boolean;
    didBackfill: boolean;
    workouts?: Array<Record<string, unknown>>;
  }>;
  bootstrapProfileRuntimeState: (input?: Record<string, unknown>) => {
    profile: MutableRecord;
    schedule: MutableRecord;
    workouts: Array<Record<string, unknown>>;
    changed: {
      profile: boolean;
      schedule: boolean;
      workouts: boolean;
    };
  };
  setLanguage?: (language?: string) => string;
  restoreActiveWorkoutDraft?: (
    draft?: Record<string, unknown> | null,
    options?: Record<string, unknown>
  ) => boolean;
  getActiveWorkoutDraftCache: () => Record<string, unknown> | null;
  clearActiveWorkoutDraft: () => void;
  saveWorkouts: () => Promise<void>;
  upsertWorkoutRecords: (
    items?: Array<Record<string, unknown>>,
    options?: Record<string, unknown>
  ) => Promise<void>;
  saveScheduleData: (options?: Record<string, unknown>) => Promise<void>;
  saveProfileData: (options?: Record<string, unknown>) => Promise<void>;
  buildExerciseIndex: () => void;
  applyTranslations?: () => void;
  renderSyncStatus: () => void;
  updateDashboard: () => void;
  maybeOpenOnboarding?: () => void;
  isCloudSyncEnabled: () => boolean;
  isBrowserOffline: () => boolean;
  setSyncStatus: (state: string) => void;
  fetchLegacyProfileBlob: () => Promise<{
    usedCloud: boolean;
    profile?: MutableRecord;
    schedule?: MutableRecord;
    updatedAt?: string | null;
  }>;
  pullProfileDocuments: (options?: Record<string, unknown>) => Promise<{
    usedDocs: boolean;
    supported: boolean;
  }>;
  applyLegacyProfileBlob: (
    remoteProfile?: MutableRecord,
    remoteSchedule?: MutableRecord,
    options?: Record<string, unknown>
  ) => void;
  updateLegacyProfileStamp: (updatedAt?: string | null) => void;
  getProfileDocumentsSupported: () => boolean | null;
  upsertProfileDocuments: (
    docKeys: string[],
    profileLike?: MutableRecord | null,
    scheduleLike?: MutableRecord | null,
    options?: Record<string, unknown>
  ) => Promise<{
    ok: boolean;
    staleDocKeys: string[];
  }>;
  getAllProfileDocumentKeys: (
    profileLike?: MutableRecord | null
  ) => string[];
  finalizeProfileBootstrapAfterCloudPull: () => unknown;
  persistLocalProfileCache: () => void;
  persistLocalScheduleCache: () => void;
  persistLocalWorkoutsCache: () => void;
  refreshSyncedUI: (options?: Record<string, unknown>) => void;
  clearDocKeysDirty: (docKeys: string[]) => void;
  uniqueDocKeys: (docKeys: string[]) => string[];
  getDirtyDocKeys: () => string[];
  pushLegacyProfileBlob: () => Promise<boolean>;
  supabaseClient?: {
    channel?: (name: string) => RealtimeChannelLike;
    removeChannel?: (channel: unknown) => void;
  } | null;
};

type SyncRuntimeApi = {
  loadData: (options?: Record<string, unknown>, deps?: SyncRuntimeDeps) => Promise<void>;
  pushToCloud: (options?: Record<string, unknown>, deps?: SyncRuntimeDeps) => Promise<boolean>;
  flushPendingCloudSync: (deps?: SyncRuntimeDeps) => Promise<boolean>;
  pullFromCloud: (
    options?: Record<string, unknown>,
    deps?: SyncRuntimeDeps
  ) => Promise<SyncCloudPullResult>;
  resolveStaleProfileDocumentRejects: (
    staleDocKeys?: string[],
    deps?: SyncRuntimeDeps
  ) => Promise<boolean>;
  teardownRealtimeSync: (deps?: SyncRuntimeDeps) => void;
  applyRealtimeSync: (
    reason?: string,
    deps?: SyncRuntimeDeps
  ) => Promise<void>;
  scheduleRealtimeSync: (reason?: string, deps?: SyncRuntimeDeps) => void;
  setupRealtimeSync: (deps?: SyncRuntimeDeps) => void;
};

type SyncRuntimeWindow = Window & {
  __IRONFORGE_SYNC_RUNTIME__?: SyncRuntimeApi;
};

let syncRealtimeChannel: unknown = null;
let realtimeSyncTimer: ReturnType<typeof setTimeout> | null = null;
let isApplyingRemoteSync = false;

function getRuntimeWindow(): SyncRuntimeWindow | null {
  if (typeof window === 'undefined') return null;
  return window as SyncRuntimeWindow;
}

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getState(deps?: SyncRuntimeDeps) {
  return deps?.readState() || {
    currentUser: null,
    workouts: [],
    schedule: null,
    profile: null,
    activeWorkout: null,
    cloudSyncEnabled: true,
  };
}

async function pullFromCloudInternal(
  options?: Record<string, unknown>,
  deps?: SyncRuntimeDeps
): Promise<SyncCloudPullResult> {
  if (!deps) {
    return {
      usedCloud: false,
      usedDocs: false,
      requiresBootstrapFinalize: false,
    };
  }
  const opts = options || {};
  const state = getState(deps);
  if (!state.currentUser || !deps.isCloudSyncEnabled()) {
    return {
      usedCloud: false,
      usedDocs: false,
      requiresBootstrapFinalize: false,
    };
  }

  deps.setSyncStatus('syncing');
  const legacySnapshot = await deps.fetchLegacyProfileBlob();
  const docsResult = await deps.pullProfileDocuments({
    legacyProfile: legacySnapshot.profile,
    legacySchedule: legacySnapshot.schedule,
  });
  if (docsResult.usedDocs) {
    deps.setSyncStatus('synced');
    return {
      usedCloud: true,
      usedDocs: true,
      requiresBootstrapFinalize: false,
    };
  }

  if (legacySnapshot.usedCloud) {
    deps.applyLegacyProfileBlob(
      legacySnapshot.profile || {},
      legacySnapshot.schedule || {},
      {
        preferRemoteWhenUnset: true,
      }
    );
    deps.updateLegacyProfileStamp(legacySnapshot.updatedAt || null);

    if (deps.getProfileDocumentsSupported() !== false) {
      const nextState = getState(deps);
      await deps.upsertProfileDocuments(
        deps.getAllProfileDocumentKeys(nextState.profile),
        nextState.profile,
        nextState.schedule,
        { notifyUser: false }
      );
    }

    deps.setSyncStatus('synced');
    return {
      usedCloud: true,
      usedDocs: false,
      requiresBootstrapFinalize: opts.finalizeBootstrap === true,
    };
  }

  deps.setSyncStatus(deps.isBrowserOffline() ? 'offline' : 'synced');
  return {
    usedCloud: false,
    usedDocs: false,
    requiresBootstrapFinalize: false,
  };
}

async function resolveStaleProfileDocumentRejectsInternal(
  staleDocKeys?: string[],
  deps?: SyncRuntimeDeps
) {
  if (!deps) return false;
  const nextStaleDocKeys = deps.uniqueDocKeys(staleDocKeys || []);
  const state = getState(deps);
  if (
    !nextStaleDocKeys.length ||
    !state.currentUser ||
    !deps.isCloudSyncEnabled() ||
    isApplyingRemoteSync
  ) {
    return false;
  }

  deps.clearDocKeysDirty(nextStaleDocKeys);
  const beforeProfile = JSON.stringify(state.profile || {});
  const beforeSchedule = JSON.stringify(state.schedule || {});
  const pullResult = await pullFromCloudInternal(
    { finalizeBootstrap: true },
    deps
  );
  if (pullResult.requiresBootstrapFinalize) {
    deps.finalizeProfileBootstrapAfterCloudPull();
  }
  const nextState = getState(deps);
  const changed =
    beforeProfile !== JSON.stringify(nextState.profile || {}) ||
    beforeSchedule !== JSON.stringify(nextState.schedule || {});
  if (pullResult.usedCloud && changed) {
    deps.persistLocalProfileCache();
    deps.persistLocalScheduleCache();
    deps.refreshSyncedUI({ toast: false });
  }
  return pullResult.usedCloud === true;
}

async function pushToCloudInternal(
  options?: Record<string, unknown>,
  deps?: SyncRuntimeDeps
) {
  if (!deps) return false;
  const state = getState(deps);
  if (!state.currentUser || !deps.isCloudSyncEnabled() || isApplyingRemoteSync) {
    return false;
  }
  if (deps.isBrowserOffline()) {
    deps.setSyncStatus('offline');
    return false;
  }

  const opts = options || {};
  const docKeys =
    (Array.isArray(opts.docKeys) ? (opts.docKeys as string[]) : null) ||
    deps.getAllProfileDocumentKeys(state.profile);
  deps.setSyncStatus('syncing');
  const writeResult = await deps.upsertProfileDocuments(
    docKeys,
    state.profile,
    state.schedule,
    { notifyUser: false }
  );
  if (writeResult.ok) {
    let resolvedStaleRejects = true;
    if (writeResult.staleDocKeys.length) {
      resolvedStaleRejects = await resolveStaleProfileDocumentRejectsInternal(
        writeResult.staleDocKeys,
        deps
      );
    }
    deps.setSyncStatus(resolvedStaleRejects ? 'synced' : 'error');
    return true;
  }

  return await deps.pushLegacyProfileBlob();
}

async function flushPendingCloudSyncInternal(deps?: SyncRuntimeDeps) {
  if (!deps) return false;
  const state = getState(deps);
  if (!state.currentUser || !deps.isCloudSyncEnabled() || isApplyingRemoteSync) {
    return false;
  }
  if (deps.isBrowserOffline()) {
    deps.setSyncStatus('offline');
    return false;
  }
  const dirtyDocKeys = deps.getDirtyDocKeys();
  if (!dirtyDocKeys.length) return true;
  return await pushToCloudInternal({ docKeys: dirtyDocKeys }, deps);
}

async function loadDataInternal(
  options?: Record<string, unknown>,
  deps?: SyncRuntimeDeps
) {
  if (!deps) return;
  const opts = options || {};
  const allowCloudSync = opts.allowCloudSync !== false;
  deps.setCloudSyncEnabled(allowCloudSync);

  const stateBeforeLoad = getState(deps);
  deps.loadLocalData({
    userId:
      (typeof opts.userId === 'string' ? opts.userId : '') ||
      String(stateBeforeLoad.currentUser?.id || '').trim(),
    allowLegacyFallback: true,
  });

  const cloudResult = allowCloudSync
    ? await pullFromCloudInternal(undefined, deps)
    : { usedCloud: false, usedDocs: false, requiresBootstrapFinalize: false };
  const stateAfterCloud = getState(deps);
  const tableResult = allowCloudSync
    ? await deps.pullWorkoutsFromTable(stateAfterCloud.workouts)
    : { usedTable: false, didBackfill: false };
  const gotCloud = cloudResult.usedCloud === true;
  const gotWorkoutTable =
    tableResult.usedTable === true || tableResult.didBackfill === true;
  if (gotWorkoutTable && Array.isArray(tableResult.workouts)) {
    deps.writeState({ workouts: cloneJson(tableResult.workouts) });
  }
  if (gotCloud || gotWorkoutTable) {
    deps.persistLocalWorkoutsCache();
    deps.persistLocalScheduleCache();
    deps.persistLocalProfileCache();
  }

  const preBootstrapState = getState(deps);
  const bootstrapResult = deps.bootstrapProfileRuntimeState({
    profile: preBootstrapState.profile,
    schedule: preBootstrapState.schedule,
    workouts: preBootstrapState.workouts,
  });
  let nextProfile = cloneJson(bootstrapResult.profile);
  if (typeof deps.setLanguage === 'function') {
    nextProfile.language = deps.setLanguage(String(nextProfile.language || ''));
  }
  deps.writeState({
    profile: nextProfile,
    schedule: cloneJson(bootstrapResult.schedule),
    workouts: cloneJson(bootstrapResult.workouts),
  });

  const postBootstrapState = getState(deps);
  if (!postBootstrapState.activeWorkout && typeof deps.restoreActiveWorkoutDraft === 'function') {
    const restored = deps.restoreActiveWorkoutDraft(
      deps.getActiveWorkoutDraftCache(),
      { toast: false }
    );
    if (!restored) deps.clearActiveWorkoutDraft();
  }

  if (bootstrapResult.changed.workouts) {
    await deps.saveWorkouts();
    const nextState = getState(deps);
    if (nextState.currentUser && deps.isCloudSyncEnabled()) {
      await deps.upsertWorkoutRecords(nextState.workouts);
    }
  }
  if (bootstrapResult.changed.schedule) {
    await deps.saveScheduleData({ touchSync: true, push: false });
  }
  if (bootstrapResult.changed.profile) {
    await deps.saveProfileData({ touchSync: true, push: false });
  }

  const finalState = getState(deps);
  deps.setRestDuration(Number(finalState.profile?.defaultRest || 120));
  deps.buildExerciseIndex();
  deps.applyTranslations?.();
  deps.renderSyncStatus();
  deps.updateDashboard();
  deps.maybeOpenOnboarding?.();
}

async function applyRealtimeSyncInternal(
  reason?: string,
  deps?: SyncRuntimeDeps
) {
  if (!deps) return;
  const state = getState(deps);
  if (!state.currentUser || !deps.isCloudSyncEnabled() || isApplyingRemoteSync) {
    return;
  }
  if (deps.isBrowserOffline()) {
    deps.setSyncStatus('offline');
    return;
  }

  isApplyingRemoteSync = true;
  try {
    const beforeState = getState(deps);
    const beforeProfile = JSON.stringify(beforeState.profile || {});
    const beforeSchedule = JSON.stringify(beforeState.schedule || {});
    const beforeWorkouts = JSON.stringify(beforeState.workouts || []);

    const pullResult = await pullFromCloudInternal(
      { finalizeBootstrap: true },
      deps
    );
    const pullState = getState(deps);
    const tableResult = await deps.pullWorkoutsFromTable(pullState.workouts);
    if (
      (tableResult.usedTable === true || tableResult.didBackfill === true) &&
      Array.isArray(tableResult.workouts)
    ) {
      deps.writeState({ workouts: cloneJson(tableResult.workouts) });
    }
    if (pullResult.requiresBootstrapFinalize) {
      deps.finalizeProfileBootstrapAfterCloudPull();
    }

    const nextState = getState(deps);
    const changed =
      beforeProfile !== JSON.stringify(nextState.profile || {}) ||
      beforeSchedule !== JSON.stringify(nextState.schedule || {}) ||
      beforeWorkouts !== JSON.stringify(nextState.workouts || []);
    if (changed) {
      deps.persistLocalProfileCache();
      deps.persistLocalScheduleCache();
      deps.persistLocalWorkoutsCache();
      deps.refreshSyncedUI({ toast: reason !== 'auth-load' });
    }
  } finally {
    isApplyingRemoteSync = false;
  }
}

function teardownRealtimeSyncInternal(deps?: SyncRuntimeDeps) {
  if (realtimeSyncTimer) {
    clearTimeout(realtimeSyncTimer);
    realtimeSyncTimer = null;
  }
  if (syncRealtimeChannel && deps?.supabaseClient?.removeChannel) {
    deps.supabaseClient.removeChannel(syncRealtimeChannel);
  }
  syncRealtimeChannel = null;
}

function scheduleRealtimeSyncInternal(reason?: string, deps?: SyncRuntimeDeps) {
  if (!deps) return;
  const state = getState(deps);
  if (!state.currentUser || !deps.isCloudSyncEnabled()) return;
  if (deps.isBrowserOffline()) return;
  if (realtimeSyncTimer) clearTimeout(realtimeSyncTimer);
  realtimeSyncTimer = setTimeout(() => {
    void applyRealtimeSyncInternal(reason, deps);
  }, 150);
}

function setupRealtimeSyncInternal(deps?: SyncRuntimeDeps) {
  teardownRealtimeSyncInternal(deps);
  if (!deps) return;
  const state = getState(deps);
  if (
    !state.currentUser ||
    !deps.isCloudSyncEnabled() ||
    deps.isBrowserOffline() ||
    typeof deps.supabaseClient?.channel !== 'function'
  ) {
    return;
  }

  syncRealtimeChannel = deps.supabaseClient
    .channel(`ironforge-sync-${String(state.currentUser.id || '')}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workouts',
        filter: `user_id=eq.${String(state.currentUser.id || '')}`,
      },
      () => scheduleRealtimeSyncInternal('workouts', deps)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profile_documents',
        filter: `user_id=eq.${String(state.currentUser.id || '')}`,
      },
      () => scheduleRealtimeSyncInternal('profile-documents', deps)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${String(state.currentUser.id || '')}`,
      },
      () => scheduleRealtimeSyncInternal('legacy-profile', deps)
    )
    .subscribe();
}

export function installSyncRuntimeBridge() {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) return null;
  if (runtimeWindow.__IRONFORGE_SYNC_RUNTIME__) {
    return runtimeWindow.__IRONFORGE_SYNC_RUNTIME__;
  }

  const api: SyncRuntimeApi = {
    loadData: (options, deps) => loadDataInternal(options, deps),
    pushToCloud: (options, deps) => pushToCloudInternal(options, deps),
    flushPendingCloudSync: (deps) => flushPendingCloudSyncInternal(deps),
    pullFromCloud: (options, deps) => pullFromCloudInternal(options, deps),
    resolveStaleProfileDocumentRejects: (staleDocKeys, deps) =>
      resolveStaleProfileDocumentRejectsInternal(staleDocKeys, deps),
    teardownRealtimeSync: (deps) => teardownRealtimeSyncInternal(deps),
    applyRealtimeSync: (reason, deps) => applyRealtimeSyncInternal(reason, deps),
    scheduleRealtimeSync: (reason, deps) =>
      scheduleRealtimeSyncInternal(reason, deps),
    setupRealtimeSync: (deps) => setupRealtimeSyncInternal(deps),
  };

  runtimeWindow.__IRONFORGE_SYNC_RUNTIME__ =
    api as unknown as NonNullable<SyncRuntimeWindow['__IRONFORGE_SYNC_RUNTIME__']>;
  return api;
}
