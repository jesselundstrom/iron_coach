function getRuntimeConfirmCallback() {
  return (
    (window as Window & {
      __IRONFORGE_CONFIRM_CALLBACK__?: (() => void) | null;
    }).__IRONFORGE_CONFIRM_CALLBACK__ || null
  );
}

function clearRuntimeConfirmCallback() {
  delete (window as Window & {
    __IRONFORGE_CONFIRM_CALLBACK__?: (() => void) | null;
  }).__IRONFORGE_CONFIRM_CALLBACK__;
}

export function confirmOk() {
  const bridge = window.__IRONFORGE_RUNTIME_BRIDGE__;
  const callback = getRuntimeConfirmCallback();
  if (callback) {
    clearRuntimeConfirmCallback();
    bridge?.closeConfirm?.();
    callback();
    return;
  }
  window.confirmOk?.();
}

export function confirmCancel() {
  const bridge = window.__IRONFORGE_RUNTIME_BRIDGE__;
  const callback = getRuntimeConfirmCallback();
  if (callback) {
    clearRuntimeConfirmCallback();
    bridge?.closeConfirm?.();
    return;
  }
  window.confirmCancel?.();
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm?: (() => void) | null
) {
  const bridge = window.__IRONFORGE_RUNTIME_BRIDGE__;
  if (bridge?.openConfirm) {
    bridge.openConfirm({
      open: true,
      title,
      message,
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    });
    const runtimeWindow = window as Window & {
      __IRONFORGE_CONFIRM_CALLBACK__?: (() => void) | null;
    };
    runtimeWindow.__IRONFORGE_CONFIRM_CALLBACK__ = onConfirm || null;
    return;
  }

  if (typeof window.showConfirm === 'function') {
    window.showConfirm(title, message, onConfirm || undefined);
    return;
  }

  console.error('[Ironforge] Confirm bridge is unavailable.');
}
