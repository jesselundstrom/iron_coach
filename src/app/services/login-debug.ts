const MAX_LINES = 40;
const STORAGE_KEY = 'if2_login_debug_lines';

type DebugWindow = Window & {
  __IRONFORGE_LOGIN_DEBUG__?: {
    trace: (message: string, details?: Record<string, unknown>) => void;
    getLines: () => string[];
    clear: () => void;
    render: () => void;
  };
};

let lines: string[] = [];

function readPersistedLines() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((value) => String(value || '')).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function persistLines() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {}
}

function formatLine(message: string, details?: Record<string, unknown>) {
  const stamp = new Date().toISOString().slice(11, 19);
  if (!details || !Object.keys(details).length) {
    return `${stamp} ${message}`;
  }
  return `${stamp} ${message} ${JSON.stringify(details)}`;
}

function renderDebugPanel() {
  if (typeof document === 'undefined') return;
  const panel = document.getElementById('login-debug');
  if (!(panel instanceof HTMLPreElement)) return;
  if (!lines.length) {
    panel.hidden = true;
    panel.textContent = '';
    return;
  }
  panel.hidden = false;
  panel.textContent = lines.join('\n');
}

export function installLoginDebug() {
  if (typeof window === 'undefined') return;
  const runtimeWindow = window as DebugWindow;
  if (runtimeWindow.__IRONFORGE_LOGIN_DEBUG__) {
    runtimeWindow.__IRONFORGE_LOGIN_DEBUG__.render();
    return;
  }

  lines = readPersistedLines();

  runtimeWindow.__IRONFORGE_LOGIN_DEBUG__ = {
    trace(message, details) {
      lines = [...lines, formatLine(message, details)].slice(-MAX_LINES);
      persistLines();
      renderDebugPanel();
    },
    getLines() {
      return [...lines];
    },
    clear() {
      lines = [];
      persistLines();
      renderDebugPanel();
    },
    render() {
      renderDebugPanel();
    },
  };

  runtimeWindow.__IRONFORGE_LOGIN_DEBUG__.render();
}
