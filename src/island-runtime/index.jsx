import { startTransition, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

export function useIslandSnapshot(eventName, getSnapshot) {
  const [snapshot, setSnapshot] = useState(() => getSnapshot());

  useEffect(() => {
    const handleChange = () => {
      startTransition(() => {
        setSnapshot(getSnapshot());
      });
    };

    window.addEventListener(eventName, handleChange);
    return () => window.removeEventListener(eventName, handleChange);
  }, [eventName, getSnapshot]);

  return snapshot;
}

export function mountIsland({
  mountId,
  legacyShellId,
  mountedFlag,
  eventName,
  Component,
}) {
  const mountNode = document.getElementById(mountId);
  if (!mountNode) return false;

  document.getElementById(legacyShellId)?.remove();
  window[mountedFlag] = true;
  createRoot(mountNode).render(<Component />);
  window.dispatchEvent(new CustomEvent(eventName));
  return true;
}
