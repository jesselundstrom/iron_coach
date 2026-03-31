import { createClient, type Session } from '@supabase/supabase-js';
import { useRuntimeStore } from '../store/runtime-store';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './app-config';
import { t } from './i18n';
import {
  applyAuthSessionToDataStore,
  reportAuthSessionError,
} from '../../stores/data-store';

type AuthCredentials = {
  email?: string;
  password?: string;
};

type SupabaseClientLike = ReturnType<typeof createClient>;

type AuthRuntime = {
  bootstrap: () => Promise<void>;
  loginWithEmail: (credentials?: AuthCredentials) => Promise<void>;
  signUpWithEmail: (credentials?: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getSupabaseClient: () => SupabaseClientLike;
};

type RuntimeWindow = Window & {
  __IRONFORGE_SUPABASE__?: SupabaseClientLike;
  __IRONFORGE_GET_SUPABASE_CLIENT__?: () => SupabaseClientLike;
  __IRONFORGE_AUTH_RUNTIME__?: AuthRuntime;
  __IRONFORGE_LOGIN_DEBUG__?: {
    trace?: (message: string, details?: Record<string, unknown>) => void;
  };
  __IRONFORGE_TEST_AUTH_HOOK__?: {
    decorateClient?: (client: SupabaseClientLike) => SupabaseClientLike;
  };
  navigator: Navigator & {
    standalone?: boolean;
  };
};

const SESSION_BOOTSTRAP_TIMEOUT_MS = 4000;

let sharedSupabaseClient: SupabaseClientLike | null = null;
let authRuntimeInstance: AuthRuntime | null = null;
let bootstrapPromise: Promise<void> | null = null;
let authSubscriptionAttached = false;
let activeMutationId = 0;
let lastAppliedSessionSignature = 'uninitialized';

function getRuntimeWindow() {
  if (typeof window === 'undefined') return null;
  return window as RuntimeWindow;
}

function trace(message: string, details?: Record<string, unknown>) {
  getRuntimeWindow()?.__IRONFORGE_LOGIN_DEBUG__?.trace?.(message, details);
}

function isStandaloneDisplayMode(runtimeWindow: RuntimeWindow) {
  return (
    runtimeWindow.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    runtimeWindow.navigator.standalone === true
  );
}

async function noOpSupabaseLock<T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
) {
  return await fn();
}

function setAuthState(
  partial: Partial<ReturnType<typeof useRuntimeStore.getState>['auth']>
) {
  useRuntimeStore.getState().setAuthState(partial);
}

function describeSession(session: Session | null | undefined) {
  return {
    hasSession: !!session,
    userId: session?.user?.id || '',
    hasUser: !!session?.user,
  };
}

function getSessionSignature(session: Session | null | undefined) {
  return session?.user?.id ? `user:${session.user.id}` : 'signed_out';
}

function setBootingState() {
  setAuthState({
    phase: 'booting',
    isLoggedIn: false,
    pendingAction: null,
    message: '',
    messageTone: '',
  });
}

function clearSignedOutState() {
  setAuthState({
    phase: 'signed_out',
    isLoggedIn: false,
    pendingAction: null,
    message: '',
    messageTone: '',
  });
}

function setSignedOutMessage(message: string) {
  setAuthState({
    phase: 'signed_out',
    isLoggedIn: false,
    pendingAction: null,
    message,
    messageTone: 'error',
  });
}

function beginMutation(kind: 'sign_in' | 'sign_up' | 'sign_out') {
  activeMutationId += 1;
  trace('auth runtime mutation start', {
    kind,
    mutationId: activeMutationId,
  });
  return activeMutationId;
}

function isCurrentMutation(mutationId: number) {
  return mutationId === activeMutationId;
}

function normalizeCredentials(input?: AuthCredentials) {
  return {
    email: String(input?.email || '').trim(),
    password: String(input?.password || ''),
  };
}

function ensureSupabaseClient() {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    throw new Error('Auth runtime is unavailable outside the browser.');
  }
  if (sharedSupabaseClient?.auth) {
    return sharedSupabaseClient;
  }
  sharedSupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    isStandaloneDisplayMode(runtimeWindow)
      ? { auth: { lock: noOpSupabaseLock } }
      : {}
  );
  if (typeof runtimeWindow.__IRONFORGE_TEST_AUTH_HOOK__?.decorateClient === 'function') {
    sharedSupabaseClient =
      runtimeWindow.__IRONFORGE_TEST_AUTH_HOOK__.decorateClient(sharedSupabaseClient);
  }
  runtimeWindow.__IRONFORGE_SUPABASE__ = sharedSupabaseClient;
  trace('auth runtime created supabase client', {
    standalone: isStandaloneDisplayMode(runtimeWindow),
  });
  return sharedSupabaseClient;
}

async function applySessionWithSideEffects(
  session: Session | null,
  options?: {
    wasLoggedIn?: boolean;
    source?: string;
    mutationId?: number;
  }
) {
  const source = String(options?.source || 'unknown');
  const mutationId = options?.mutationId;
  const sessionSignature = getSessionSignature(session);

  if (mutationId != null && !isCurrentMutation(mutationId)) {
    trace('auth runtime skipped stale session apply', {
      source,
      mutationId,
      activeMutationId,
      ...describeSession(session),
    });
    return false;
  }

  if (
    lastAppliedSessionSignature === sessionSignature &&
    useRuntimeStore.getState().auth.pendingAction === null &&
    (source === 'bootstrap' || source.startsWith('auth-state:'))
  ) {
    trace('auth runtime skipped duplicate session apply', {
      source,
      sessionSignature,
    });
    return true;
  }

  setAuthState({
    phase: session?.user ? 'signed_in' : 'signed_out',
    isLoggedIn: !!session?.user,
    pendingAction: null,
  });
  await applyAuthSessionToDataStore(session);
  lastAppliedSessionSignature = sessionSignature;

  trace('auth runtime apply session done', {
    source,
    mutationId: mutationId ?? null,
    ...describeSession(session),
  });
  return true;
}

async function resolveBootstrapSession(getSession: () => Promise<{
  data: { session: Session | null };
  error: Error | null;
}>) {
  return await Promise.race([
    getSession(),
    new Promise<{ timedOut: true }>((resolve) => {
      window.setTimeout(() => resolve({ timedOut: true }), SESSION_BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);
}

function attachAuthStateSubscription(client: SupabaseClientLike) {
  if (authSubscriptionAttached) return;
  authSubscriptionAttached = true;
  client.auth.onAuthStateChange((event, session) => {
    const observedMutationId = activeMutationId;
    const wasLoggedIn = useRuntimeStore.getState().auth.isLoggedIn;
    trace('auth runtime auth-state event', {
      event,
      observedMutationId,
      wasLoggedIn,
      ...describeSession(session),
    });
    window.setTimeout(() => {
      void applySessionWithSideEffects(session, {
        wasLoggedIn,
        source: `auth-state:${event}`,
        mutationId: observedMutationId,
      }).catch((error) => {
        if (!isCurrentMutation(observedMutationId)) return;
        reportAuthSessionError(error);
        setSignedOutMessage(
          error instanceof Error
            ? error.message
            : t('login.finish_error', 'Unable to finish signing in right now.')
        );
      });
    }, 0);
  });
}

export async function bootstrapAuthRuntime() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const client = ensureSupabaseClient();
    const observedMutationId = activeMutationId;
    setBootingState();
    trace('auth runtime bootstrap start', { observedMutationId });
    attachAuthStateSubscription(client);
    try {
      const result = await resolveBootstrapSession(() => client.auth.getSession());
      if (observedMutationId !== activeMutationId) {
        trace('auth runtime bootstrap ignored after newer mutation', {
          observedMutationId,
          activeMutationId,
        });
        return;
      }
      if ('timedOut' in result) {
        clearSignedOutState();
        trace('auth runtime bootstrap timed out', {
          timeoutMs: SESSION_BOOTSTRAP_TIMEOUT_MS,
        });
        return;
      }
      await applySessionWithSideEffects(result.data.session || null, {
        wasLoggedIn: false,
        source: 'bootstrap',
        mutationId: observedMutationId,
      });
      setAuthState({ message: '', messageTone: '' });
    } catch (error) {
      if (observedMutationId !== activeMutationId) return;
      reportAuthSessionError(error);
      setSignedOutMessage(
        error instanceof Error
          ? error.message
          : t('login.finish_error', 'Unable to finish signing in right now.')
      );
    }
  })();
  return bootstrapPromise;
}

export async function loginWithEmailPassword(credentials?: AuthCredentials) {
  const mutationId = beginMutation('sign_in');
  const client = ensureSupabaseClient();
  const { email, password } = normalizeCredentials(credentials);

  setAuthState({
    phase: 'signed_out',
    isLoggedIn: false,
    pendingAction: 'sign_in',
    message: '',
    messageTone: '',
  });

  if (!email || !password) {
    setSignedOutMessage(t('login.enter_credentials', 'Enter your email and password.'));
    return;
  }

  try {
    const result = await client.auth.signInWithPassword({ email, password });
    if (!isCurrentMutation(mutationId)) return;
    if (result.error) {
      setSignedOutMessage(
        result.error.message || t('login.sign_in_error', 'Unable to sign in right now.')
      );
      return;
    }
    if (!result.data.session) {
      setSignedOutMessage(
        t('login.finish_error', 'Unable to finish signing in right now.')
      );
      return;
    }
    await applySessionWithSideEffects(result.data.session, {
      wasLoggedIn: false,
      source: 'sign-in-result',
      mutationId,
    });
  } catch (error) {
    if (!isCurrentMutation(mutationId)) return;
    reportAuthSessionError(error);
    setSignedOutMessage(
      error instanceof Error
        ? error.message
        : t('login.sign_in_error', 'Unable to sign in right now.')
    );
  }
}

export async function signUpWithEmailPassword(credentials?: AuthCredentials) {
  const mutationId = beginMutation('sign_up');
  const client = ensureSupabaseClient();
  const { email, password } = normalizeCredentials(credentials);

  setAuthState({
    phase: 'signed_out',
    isLoggedIn: false,
    pendingAction: 'sign_up',
    message: '',
    messageTone: '',
  });

  if (!email || !password) {
    setSignedOutMessage(t('login.enter_credentials', 'Enter your email and password.'));
    return;
  }

  try {
    const result = await client.auth.signUp({ email, password });
    if (!isCurrentMutation(mutationId)) return;
    if (result.error) {
      setSignedOutMessage(
        result.error.message ||
          t('login.sign_up_error', 'Unable to create account right now.')
      );
      return;
    }
    setAuthState({
      phase: 'signed_out',
      isLoggedIn: false,
      pendingAction: null,
      message: t(
        'login.account_created',
        'Account created! Check your email to confirm, then sign in.'
      ),
      messageTone: 'info',
    });
  } catch (error) {
    if (!isCurrentMutation(mutationId)) return;
    reportAuthSessionError(error);
    setSignedOutMessage(
      error instanceof Error
        ? error.message
        : t('login.sign_up_error', 'Unable to create account right now.')
    );
  }
}

export async function logoutFromAuthRuntime() {
  const mutationId = beginMutation('sign_out');
  const client = ensureSupabaseClient();
  const wasLoggedIn = useRuntimeStore.getState().auth.isLoggedIn;

  setAuthState({
    pendingAction: 'sign_out',
    message: '',
    messageTone: '',
  });

  try {
    const result = await client.auth.signOut();
    if (!isCurrentMutation(mutationId)) return;
    if (result.error) throw result.error;
    await applySessionWithSideEffects(null, {
      wasLoggedIn,
      source: 'sign-out-result',
      mutationId,
    });
  } catch (error) {
    if (!isCurrentMutation(mutationId)) return;
    reportAuthSessionError(error);
    setAuthState({
      pendingAction: null,
      message:
        error instanceof Error
          ? error.message
          : t('login.sign_out_error', 'Unable to sign out right now.'),
      messageTone: 'error',
    });
  }
}

export function installAuthRuntime() {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) return null;
  if (authRuntimeInstance) {
    runtimeWindow.__IRONFORGE_AUTH_RUNTIME__ = authRuntimeInstance;
    runtimeWindow.__IRONFORGE_GET_SUPABASE_CLIENT__ =
      authRuntimeInstance.getSupabaseClient;
    void authRuntimeInstance.bootstrap();
    return authRuntimeInstance;
  }

  authRuntimeInstance = {
    bootstrap: bootstrapAuthRuntime,
    loginWithEmail: loginWithEmailPassword,
    signUpWithEmail: signUpWithEmailPassword,
    logout: logoutFromAuthRuntime,
    getSupabaseClient: ensureSupabaseClient,
  };

  runtimeWindow.__IRONFORGE_AUTH_RUNTIME__ = authRuntimeInstance;
  runtimeWindow.__IRONFORGE_GET_SUPABASE_CLIENT__ =
    authRuntimeInstance.getSupabaseClient;
  void authRuntimeInstance.bootstrap();
  return authRuntimeInstance;
}
