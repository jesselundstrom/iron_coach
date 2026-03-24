import { programStore } from '../stores/program-store.ts';

export function getRegisteredPrograms() {
  return programStore.getState().programs || [];
}

export function hasRegisteredPrograms() {
  return getRegisteredPrograms().length > 0;
}

export function getProgramById(programId) {
  return programStore.getState().getProgramById(programId) || null;
}

export function getProgramInitialState(programId) {
  return programStore.getState().getProgramInitialState(programId);
}

export function getActiveProgramId() {
  return programStore.getState().activeProgramId || null;
}

export function getActiveProgram() {
  return programStore.getState().activeProgram || null;
}

export function getActiveProgramState() {
  return programStore.getState().activeProgramState || null;
}

export function getProgramCapabilities(programId) {
  return programStore.getState().getProgramCapabilities(programId);
}

export function getProgramDifficultyMeta(programId) {
  return programStore.getState().getProgramDifficultyMeta(programId);
}

export function getProgramTrainingDaysRange(programId) {
  return programStore.getState().getProgramTrainingDaysRange(programId);
}

export function getEffectiveProgramFrequency(programId, profileLike) {
  return programStore.getState().getEffectiveProgramFrequency(programId, profileLike);
}
