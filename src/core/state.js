import { getDataStateSnapshot } from '../stores/data-store';

export function getState() {
  const state = getDataStateSnapshot();
  return {
    workouts: state.workouts,
    schedule: state.schedule,
    profile: state.profile,
    activeWorkout: state.activeWorkout,
    restDuration: state.restDuration,
    restEndsAt: state.restEndsAt,
    restSecondsLeft: state.restSecondsLeft,
    currentUser: state.currentUser,
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
