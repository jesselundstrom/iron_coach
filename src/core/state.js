import { getDataStateSnapshot } from '../stores/data-store';
import { getWorkoutStoreSnapshot } from '../stores/workout-store';

export function getState() {
  const dataState = getDataStateSnapshot();
  const workoutState = getWorkoutStoreSnapshot();
  return {
    workouts: dataState.workouts,
    schedule: dataState.schedule,
    profile: dataState.profile,
    activeWorkout: workoutState.activeWorkout,
    restDuration: workoutState.restDuration,
    restEndsAt: workoutState.restEndsAt,
    restSecondsLeft: workoutState.restSecondsLeft,
    currentUser: dataState.currentUser,
  };
}

export function subscribe(eventNames, listener) {
  if (typeof window === 'undefined') return () => {};
  const names = Array.isArray(eventNames) ? eventNames : [eventNames];
  names.forEach((eventName) => window.addEventListener(eventName, listener));
  return () => {
    names.forEach((eventName) => window.removeEventListener(eventName, listener));
  };
}
