import { tr } from '../../stores/i18n-store';

export function t(
  key: string,
  fallback?: string,
  params?: Record<string, unknown> | null
) {
  return tr(key, params, fallback);
}
