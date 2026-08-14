"use client";

import { useEffect } from "react";

export const POLL_INTERVAL_MS = 2000;

/**
 * Polls `fn` every POLL_INTERVAL_MS while `active` is true. The interval is
 * created once per activation, not per data update, and is cleaned up on
 * deactivation and unmount.
 */
export function usePolling(fn: () => void, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(fn, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // fn is intentionally not a dependency: pages pass stable useCallback
    // loaders, and re-keying the interval on loader identity would defeat
    // the point of this hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
