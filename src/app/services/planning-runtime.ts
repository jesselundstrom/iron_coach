import { computeFatigue } from '../../domain/planning';
import type { WorkoutRecord } from '../../domain/types';
import { dataStore } from '../../stores/data-store';
import { profileStore } from '../../stores/profile-store';

type PlanningWindow = Window & {
  computeFatigue?: () => Record<string, unknown>;
};

export function installPlanningWindowBindings() {
  if (typeof window === 'undefined') return;
  const runtimeWindow = window as PlanningWindow;
  runtimeWindow.computeFatigue = () =>
    computeFatigue({
      workouts: (dataStore.getState().workouts || []) as WorkoutRecord[],
      schedule: profileStore.getState().schedule,
    });
}
