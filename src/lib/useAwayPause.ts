// Stops a game clock when the player isn't there: the tab is hidden, or
// nothing has been touched for a while (the page was left open).
import { useEffect, useRef } from 'react';

export const IDLE_MS = 60_000;

/**
 * While `active`, calls `onAway(at)` when the page is hidden or the player has
 * been idle for `idleMs`. The idle minute itself still counts (they could have
 * been studying the map), but nothing after it does.
 */
export function useAwayPause(active: boolean, onAway: (at: number) => void, idleMs = IDLE_MS) {
  const cb = useRef(onAway);
  cb.current = onAway;

  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const bump = () => {
      last = Date.now();
    };
    const onVisibility = () => {
      if (document.hidden) cb.current(Date.now());
    };
    const timer = setInterval(() => {
      if (Date.now() - last >= idleMs) cb.current(last + idleMs);
    }, 1000);

    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, idleMs]);
}
