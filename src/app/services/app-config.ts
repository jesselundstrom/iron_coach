export const APP_VERSION = '2.0.0';
export const SUPABASE_URL = 'https://koreqcjrpzcbfgkptvfx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_Ccuq9Bwyxmyy4JfrWqXlhg_qiWmCYpn';

type ConfigWindow = Window & {
  __IRONFORGE_APP_VERSION__?: string;
  __IRONFORGE_SUPABASE_URL__?: string;
  __IRONFORGE_SUPABASE_PUBLISHABLE_KEY__?: string;
};

export function installAppConfigGlobals() {
  if (typeof window === 'undefined') return;
  const runtimeWindow = window as ConfigWindow;
  runtimeWindow.__IRONFORGE_APP_VERSION__ = APP_VERSION;
  runtimeWindow.__IRONFORGE_SUPABASE_URL__ = SUPABASE_URL;
  runtimeWindow.__IRONFORGE_SUPABASE_PUBLISHABLE_KEY__ =
    SUPABASE_PUBLISHABLE_KEY;
}
