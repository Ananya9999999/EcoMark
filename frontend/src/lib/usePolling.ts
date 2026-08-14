"use client";

import { useEffect, useRef } from "react";

export const POLL_INTERVAL_MS = 2000;

/**
 * Polls `fn` every POLL_INTERVAL_MS while `active` is true.
 *
 * The interval is keyed on `active` alone so it is not torn down and rebuilt
 * on every response, but it always invokes the latest `fn` through a ref —
 * otherwise a caller whose loader closes over changing state (the claim
 * filters) could keep polling with a stale closure.
 */
export function usePolling(fn: () => void, active: boolean): void {
  const latest = useRef(fn);

  // Written in an effect, not during render — refs must not be mutated
  // while rendering.
  useEffect(() => {
    latest.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => latest.current(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [active]);
}
