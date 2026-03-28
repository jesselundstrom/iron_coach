import { useDashboardStore } from '../../stores/dashboard-store';
import { animateDashboardPlanMuscleBars as animateDashboardPlanMuscleBarsRuntime } from '../../domain/dashboard-runtime';

export function toggleDayDetail(dayIndex: number) {
  useDashboardStore.getState().toggleDayDetail(dayIndex);
}

export function animateDashboardPlanMuscleBars() {
  animateDashboardPlanMuscleBarsRuntime();
}
