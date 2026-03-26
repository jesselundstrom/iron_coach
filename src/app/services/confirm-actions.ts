import { useRuntimeStore } from '../store/runtime-store';

let pendingConfirmCallback: (() => void) | null = null;

function getRuntimeConfirmCallback() {
  return pendingConfirmCallback;
}

function clearRuntimeConfirmCallback() {
  pendingConfirmCallback = null;
}

export function confirmOk() {
  const callback = getRuntimeConfirmCallback();
  if (callback) {
    clearRuntimeConfirmCallback();
    useRuntimeStore.getState().closeConfirm();
    callback();
    return;
  }
  window.confirmOk?.();
}

export function confirmCancel() {
  const callback = getRuntimeConfirmCallback();
  if (callback) {
    clearRuntimeConfirmCallback();
    useRuntimeStore.getState().closeConfirm();
    return;
  }
  window.confirmCancel?.();
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm?: (() => void) | null
) {
  useRuntimeStore.getState().openConfirm({
    open: true,
    title,
    message,
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  });
  pendingConfirmCallback = onConfirm || null;
}
