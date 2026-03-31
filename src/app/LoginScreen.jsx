import { useEffect, useRef, useState } from 'react';
import { t } from './services/i18n.ts';
import { useRuntimeStore } from './store/runtime-store.ts';
import {
  loginWithEmailPassword,
  signUpWithEmailPassword,
} from './services/auth-runtime.ts';
import loginHeroImage from '../../assets/ironforge_bg.webp';

const START_RETRY_LIMIT = 24;

function getBuildLabel() {
  if (typeof window === 'undefined') return '';
  return String(window.__IRONFORGE_APP_VERSION__ || '').trim();
}

const MIN_EMBERS = 18;
const MAX_EMBERS = 34;
const COLOR_A = [255, 122, 58];
const COLOR_B = [255, 176, 103];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function emberColor(t, alpha) {
  const r = Math.round(lerp(COLOR_A[0], COLOR_B[0], t));
  const g = Math.round(lerp(COLOR_A[1], COLOR_B[1], t));
  const b = Math.round(lerp(COLOR_A[2], COLOR_B[2], t));
  return `rgba(${r},${g},${b},${alpha})`;
}

function resetEmber(ember, initial, width, height) {
  const fromForge = Math.random() < 0.82;
  const originX = width * 0.5;
  const spread = fromForge ? width * 0.32 : width * 0.72;

  ember.size = fromForge ? 0.8 + Math.random() * 1.8 : 0.6 + Math.random() * 1.2;
  ember.x = fromForge
    ? originX + (Math.random() - 0.5) * spread
    : Math.random() * width;
  ember.y = initial
    ? fromForge
      ? height * 0.64 + Math.random() * height * 0.22
      : height * 0.4 + Math.random() * height * 0.36
    : fromForge
      ? height * 0.8 + Math.random() * height * 0.12
      : height * 0.58 + Math.random() * height * 0.24;
  ember.speed = fromForge ? 8 + Math.random() * 16 : 6 + Math.random() * 10;
  ember.drift = (Math.random() - 0.5) * (fromForge ? 8 : 4);
  ember.phase = Math.random() * Math.PI * 2;
  ember.wiggle = 0.35 + Math.random() * 0.95;
  ember.life = 0.55 + Math.random() * 0.95;
  ember.alpha = fromForge ? 0.24 + Math.random() * 0.36 : 0.16 + Math.random() * 0.22;
  ember.t = Math.random();
}

function useForgeSparkEngine(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let embers = [];
    let animationId = 0;
    let retryAnimationId = 0;
    let retryTimeoutId = 0;
    let startAttempts = 0;
    let lastTs = 0;
    let isRunning = false;
    let isMounted = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width || window.innerWidth || 1));
      height = Math.max(1, Math.floor(rect.height || window.innerHeight || 1));
      dpr = clamp(window.devicePixelRatio || 1, 1, 1.75);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!embers.length) {
        const total = Math.floor(lerp(MIN_EMBERS, MAX_EMBERS, Math.random()));
        embers = Array.from({ length: total }, () => {
          const ember = {};
          resetEmber(ember, true, width, height);
          return ember;
        });
      }
    }

    function draw(ts) {
      if (!isRunning || !ctx) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.033);
      lastTs = ts;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const ember = embers[i];
        ember.y -= ember.speed * dt;
        ember.x += (ember.drift + Math.sin(ts * 0.0012 + ember.phase) * ember.wiggle * 3.8) * dt;
        ember.life -= dt * 0.22;
        ember.alpha = Math.max(0, ember.alpha - dt * 0.024);

        if (ember.y < -10 || ember.life <= 0 || ember.alpha <= 0) {
          resetEmber(ember, false, width, height);
        }

        const fadeTop = clamp((height - ember.y) / (height * 0.9), 0, 1);
        const alpha = ember.alpha * (1 - fadeTop * 0.88);
        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = emberColor(ember.t, alpha);
        ctx.shadowColor = emberColor(ember.t, alpha * 0.6);
        ctx.shadowBlur = 3;
        ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Forge glow at base of anvil
      const forgeGlow = ctx.createRadialGradient(
        width * 0.5, height * 0.82, 8,
        width * 0.5, height * 0.82, height * 0.2
      );
      forgeGlow.addColorStop(0, 'rgba(255,132,46,0.18)');
      forgeGlow.addColorStop(0.52, 'rgba(255,120,40,0.09)');
      forgeGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = forgeGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(draw);
    }

    function start() {
      if (!isMounted || isRunning) return;
      resize();
      lastTs = 0;
      isRunning = true;
      window.addEventListener('resize', resize);
      animationId = requestAnimationFrame(draw);
    }

    function clearPendingStartRetry() {
      if (retryAnimationId) cancelAnimationFrame(retryAnimationId);
      if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
      retryAnimationId = 0;
      retryTimeoutId = 0;
    }

    // Retry until canvas has real dimensions and layout has settled.
    function tryStart() {
      if (!isMounted || isRunning) return;
      const rect = canvas.getBoundingClientRect();
      if ((rect.width || 0) > 1 && (rect.height || 0) > 1) {
        clearPendingStartRetry();
        startAttempts = 0;
        start();
        return;
      }

      startAttempts += 1;
      if (startAttempts >= START_RETRY_LIMIT) return;

      clearPendingStartRetry();
      retryAnimationId = requestAnimationFrame(tryStart);
      retryTimeoutId = window.setTimeout(() => {
        retryAnimationId = 0;
        tryStart();
      }, 120);
    }

    requestAnimationFrame(tryStart);

    function onVisibilityChange() {
      if (document.hidden) {
        if (isRunning) {
          isRunning = false;
          cancelAnimationFrame(animationId);
          animationId = 0;
        }
        return;
      }
      if (!isRunning) {
        lastTs = 0;
        tryStart();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      isMounted = false;
      isRunning = false;
      cancelAnimationFrame(animationId);
      clearPendingStartRetry();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
      if (ctx) ctx.clearRect(0, 0, width, height);
    };
  }, [canvasRef]);
}

export default function LoginScreen() {
  const auth = useRuntimeStore((state) => state.auth);
  const setAuthState = useRuntimeStore((state) => state.setAuthState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buildLabel] = useState(() => getBuildLabel());
  const canvasRef = useRef(null);

  useEffect(() => {
    window.__IRONFORGE_LOGIN_DEBUG__?.render?.();
  }, []);

  useForgeSparkEngine(canvasRef);

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
    auth.messageTone === 'error' ? 'text-red-300' : 'text-[#ffb07a]';
  const signInLabel =
    auth.pendingAction === 'sign_in'
      ? t('login.signing_in', 'Signing in...')
      : t('login.sign_in', 'Sign In');
  const signUpLabel =
    auth.pendingAction === 'sign_up'
      ? t('login.creating_account', 'Creating account...')
      : t('login.create_account', 'Create Account');
  const passwordPlaceholder = t('login.password', 'Password');

  return (
    <div
      id="login-screen"
      data-ui="auth-screen"
      className="relative min-h-[100dvh] overflow-hidden bg-[#090b10] text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,11,16,0.08) 0%, rgba(8,7,5,0.34) 34%, rgba(7,6,5,0.72) 64%, rgba(5,4,4,0.94) 100%), url(${loginHeroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Spark particle canvas */}
      <canvas
        ref={canvasRef}
        id="sparks"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,156,84,0.26),rgba(255,112,38,0.12)_24%,transparent_54%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[-6%] z-0 h-[58%] bg-[radial-gradient(ellipse_74%_42%_at_50%_100%,rgba(255,120,44,0.24),rgba(255,92,24,0.1)_36%,transparent_72%)]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[64%] bg-[linear-gradient(0deg,rgba(5,4,4,0.98)_0%,rgba(7,5,4,0.88)_28%,rgba(10,8,7,0.66)_52%,transparent_100%)]" />

      <div
        className="absolute inset-x-0 bottom-[max(2.25rem,env(safe-area-inset-bottom))] z-20 flex justify-center px-5 sm:px-6"
      >
        <div
          data-ui="auth-card"
          className="relative w-full max-w-sm rounded-[28px] border border-[#f6c79e]/14 bg-[rgba(12,10,8,0.72)] px-5 pb-5 pt-6 shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,190,120,0.03)] backdrop-blur-[18px]"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,204,153,0.5),transparent)]" />
          <div className="mb-5 text-center">
            <h1 className="font-['Cinzel'] text-[2.1rem] uppercase tracking-[0.16em] text-[#fff4e6] [text-shadow:0_0_18px_rgba(255,155,88,0.22)]">
              Ironforge
            </h1>
            <div className="mx-auto mt-3 h-px w-20 bg-[linear-gradient(90deg,transparent,rgba(255,176,122,0.9),transparent)]" />
          </div>

          <form className="space-y-3" onSubmit={handleSignIn}>
            <input
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/34 px-4 text-center text-[0.95rem] text-[#fff8f2] placeholder:text-[#f6dcc8]/36 outline-none transition-colors focus:border-[#ff9a57]/56 focus:bg-black/44 focus:ring-0 disabled:opacity-60"
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
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/34 px-4 text-center text-[0.95rem] text-[#fff8f2] placeholder:text-[#f6dcc8]/36 outline-none transition-colors focus:border-[#ff9a57]/56 focus:bg-black/44 focus:ring-0 disabled:opacity-60"
              type="password"
              id="login-password"
              placeholder={passwordPlaceholder}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                clearAuthMessage();
              }}
              disabled={isBusy}
            />

            <div
              id="login-error"
              className={`min-h-[1rem] px-2 text-center text-[0.74rem] tracking-[0.02em] ${statusToneClass}`}
            >
              {statusMessage}
            </div>

            <pre
              id="login-debug"
              hidden
              aria-live="polite"
              className="hidden max-h-44 overflow-auto rounded-xl border border-white/10 bg-black/45 p-3 text-left font-mono text-[11px] leading-5 text-slate-200"
            />

            <button
              type="submit"
              disabled={isBusy}
              data-ui="auth-sign-in"
              data-shell-action="login-with-email"
              className="h-12 w-full rounded-2xl bg-[linear-gradient(90deg,#bc4f17_0%,#f27d35_52%,#ffb068_100%)] text-[0.95rem] font-semibold tracking-[0.16em] text-white shadow-[0_16px_38px_rgba(211,102,35,0.34),inset_0_1px_0_rgba(255,228,202,0.18)] transition active:scale-[0.985] disabled:opacity-60"
            >
              {signInLabel}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={isBusy}
              data-ui="auth-sign-up"
              data-shell-action="signup-with-email"
              className="h-12 w-full rounded-2xl border border-[#f0bb93]/16 bg-[rgba(255,255,255,0.02)] text-[0.92rem] font-semibold tracking-[0.12em] text-[#ffe4cf]/78 transition active:scale-[0.985] disabled:opacity-60"
            >
              {signUpLabel}
            </button>
          </form>

          {buildLabel ? (
            <div className="mt-4 text-center text-[0.56rem] uppercase tracking-[0.34em] text-[#d7b59a]/36">
              {buildLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
