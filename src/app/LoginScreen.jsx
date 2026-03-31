import { useEffect, useRef, useState } from 'react';
import { t } from './services/i18n.ts';
import { useRuntimeStore } from './store/runtime-store.ts';
import {
  loginWithEmailPassword,
  signUpWithEmailPassword,
} from './services/auth-runtime.ts';
import loginHeroImage from '../../assets/ironforge_bg.webp';

function getBuildLabel() {
  if (typeof window === 'undefined') return '';
  return String(window.__IRONFORGE_APP_VERSION__ || '').trim();
}

export default function LoginScreen() {
  const controllerRef = useRef(null);
  const signInButtonRef = useRef(null);
  const signUpButtonRef = useRef(null);
  const nativeActionRef = useRef({
    type: '',
    stamp: 0,
  });
  const auth = useRuntimeStore((state) => state.auth);
  const setAuthState = useRuntimeStore((state) => state.setAuthState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buildLabel] = useState(() => getBuildLabel());

  useEffect(() => {
    if (typeof window.createLoginSparksController !== 'function') return;
    const controller = window.createLoginSparksController();
    controller.start();
    controllerRef.current = controller;
    window.__IRONFORGE_LOGIN_DEBUG__?.render?.();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const signInButton = signInButtonRef.current;
    const signUpButton = signUpButtonRef.current;

    if (!(signInButton instanceof HTMLButtonElement)) return undefined;
    if (!(signUpButton instanceof HTMLButtonElement)) return undefined;

    function shouldSkipNativeAction(type) {
      const now = Date.now();
      const last = nativeActionRef.current;
      if (last.type === type && now - last.stamp < 500) {
        return true;
      }
      nativeActionRef.current = {
        type,
        stamp: now,
      };
      return false;
    }

    function handleNativeSignIn(event) {
      if (auth.pendingAction !== null) return;
      event.preventDefault();
      if (shouldSkipNativeAction('sign_in')) return;
      void runSignIn();
    }

    function handleNativeSignUp(event) {
      if (auth.pendingAction !== null) return;
      event.preventDefault();
      if (shouldSkipNativeAction('sign_up')) return;
      void runSignUp();
    }

    signInButton.addEventListener('touchend', handleNativeSignIn);
    signUpButton.addEventListener('touchend', handleNativeSignUp);

    return () => {
      signInButton.removeEventListener('touchend', handleNativeSignIn);
      signUpButton.removeEventListener('touchend', handleNativeSignUp);
    };
  }, [auth.pendingAction, email, password]);

  function clearAuthMessage() {
    if (!auth.message) return;
    setAuthState({ message: '', messageTone: '' });
  }

  async function runSignIn() {
    if (!email.trim() || !password) {
      setAuthState({
        message: t(
          'login.enter_credentials',
          'Enter your email and password.'
        ),
        messageTone: 'error',
      });
      return;
    }
    await loginWithEmailPassword({ email, password });
  }

  async function runSignUp() {
    if (!email.trim() || !password) {
      setAuthState({
        message: t(
          'login.enter_credentials',
          'Enter your email and password.'
        ),
        messageTone: 'error',
      });
      return;
    }
    if (password.length < 6) {
      setAuthState({
        message: t(
          'login.password_short',
          'Password must be at least 6 characters.'
        ),
        messageTone: 'error',
      });
      return;
    }
    await signUpWithEmailPassword({ email, password });
  }

  async function handleSignIn(event) {
    event.preventDefault();
    await runSignIn();
  }

  async function handleSignUp(event) {
    event.preventDefault();
    await runSignUp();
  }

  const isBusy = auth.pendingAction !== null;
  const statusMessage = auth.message || '';
  const statusToneClass =
    auth.messageTone === 'error' ? 'text-red-300' : 'text-accent';
  const signInLabel =
    auth.pendingAction === 'sign_in'
      ? t('login.signing_in', 'Signing in...')
      : t('login.sign_in', 'Sign In');
  const signUpLabel =
    auth.pendingAction === 'sign_up'
      ? t('login.creating_account', 'Creating account...')
      : t('login.create_account', 'Create Account');

  return (
    <div
      id="login-screen"
      data-ui="auth-screen"
      className="relative min-h-[100dvh] overflow-hidden bg-[#090b10] text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,11,16,0.20) 0%, rgba(7,9,14,0.84) 82%), url(${loginHeroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <canvas
        id="sparks"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,140,72,0.18),transparent_42%),linear-gradient(180deg,rgba(5,7,11,0.05),rgba(5,7,11,0.72))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_58%)]" />

      <div className="relative z-20 flex min-h-[100dvh] flex-col justify-end px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 rounded-[28px] border border-white/10 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                  {t('login.kicker', 'Forge Protocol')}
                </div>
                <h1 className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.04em] text-white">
                  Ironforge
                </h1>
                <p className="mt-3 max-w-[26ch] text-sm leading-6 text-white/72">
                  {t(
                    'login.subtitle',
                    'Sign in to sync training, nutrition, and recovery across your devices.'
                  )}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="h-16 w-12 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              />
            </div>

            <form className="space-y-3" onSubmit={handleSignIn}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {t('login.email', 'Email')}
                </span>
                <input
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-base text-white outline-none transition focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/30"
                  type="email"
                  id="login-email"
                  placeholder={t('login.email', 'Email')}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.currentTarget.value);
                    clearAuthMessage();
                  }}
                  disabled={isBusy}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  {t('login.password', 'Password')}
                </span>
                <input
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-base text-white outline-none transition focus:border-[#ff8a3d] focus:ring-2 focus:ring-[#ff8a3d]/30"
                  type="password"
                  id="login-password"
                  placeholder={t('login.password', 'Password')}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.currentTarget.value);
                    clearAuthMessage();
                  }}
                  disabled={isBusy}
                />
              </label>

              <div
                id="login-error"
                className={`min-h-[20px] text-sm ${statusToneClass}`}
              >
                {statusMessage}
              </div>

              <pre
                id="login-debug"
                hidden
                aria-live="polite"
                className="hidden max-h-44 overflow-auto rounded-2xl border border-white/10 bg-black/45 p-3 text-left font-mono text-[11px] leading-5 text-slate-200"
              />

              <button
                ref={signInButtonRef}
                type="submit"
                disabled={isBusy}
                data-ui="auth-sign-in"
                data-shell-action="login-with-email"
                className="h-14 w-full rounded-2xl bg-[linear-gradient(90deg,#df6a2e_0%,#ff9147_100%)] text-base font-semibold text-white shadow-[0_18px_44px_rgba(255,122,58,0.28)] transition active:scale-[0.99] disabled:opacity-70"
              >
                {signInLabel}
              </button>

              <button
                ref={signUpButtonRef}
                type="button"
                onClick={handleSignUp}
                disabled={isBusy}
                data-ui="auth-sign-up"
                data-shell-action="signup-with-email"
                className="h-14 w-full rounded-2xl border border-[#ff8a3d]/55 bg-white/5 text-base font-semibold text-[#ffb07a] transition active:scale-[0.99] disabled:opacity-70"
              >
                {signUpLabel}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
              <span>{t('login.stack_label', 'React Auth')}</span>
              {buildLabel ? <span>{buildLabel}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
