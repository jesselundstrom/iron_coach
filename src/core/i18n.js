import { tr } from '../stores/i18n-store';

export function t(key, fallback, params) {
  return tr(key, params, fallback);
}
