import { callLegacyWindowFunction } from './legacy-call';

export function toggleDayDetail(dayIndex: number) {
  callLegacyWindowFunction('toggleDayDetail', dayIndex);
}

export function animateDashboardPlanMuscleBars() {
  callLegacyWindowFunction('animateDashboardPlanMuscleBars');
}
