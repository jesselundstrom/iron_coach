import { useEffect, useRef, useState } from 'react';
import { t } from './services/i18n.ts';
import { useRuntimeStore } from './store/runtime-store.ts';
import {
  loginWithEmailPassword,
  signUpWithEmailPassword,
} from './services/auth-runtime.ts';
import loginHeroImage from '../../assets/ironforge_bg.webp';

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
  const statusColor =
    auth.messageTone === 'error'
      ? '#f87171'
      : 'var(--accent)';
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
      className="login-page"
      id="login-screen"
      style={{
        backgroundImage: `url(${loginHeroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#090b10',
      }}
    >
      <canvas id="sparks" aria-hidden="true" />
      <div className="login-hero" aria-hidden="true" />
      <div className="login-wrap">
        <form className="login-form" onSubmit={handleSignIn}>
          <input
            className="login-input"
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
          <input
            className="login-input"
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
          <div id="login-error" style={{ color: statusColor }}>
            {statusMessage}
          </div>
          <pre
            id="login-debug"
            hidden
            aria-live="polite"
            style={{
              display: 'none',
              margin: '10px 0 0',
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(7,10,14,0.72)',
              border: '1px solid rgba(148,163,184,0.16)',
              color: '#cbd5e1',
              font: "12px/1.45 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace",
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              maxHeight: 180,
              overflow: 'auto',
            }}
          />
          <button
            className="btn-primary"
            ref={signInButtonRef}
            type="submit"
            disabled={isBusy}
          >
            {signInLabel}
          </button>
          <button
            className="btn-secondary"
            ref={signUpButtonRef}
            type="button"
            onClick={handleSignUp}
            disabled={isBusy}
          >
            {signUpLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
