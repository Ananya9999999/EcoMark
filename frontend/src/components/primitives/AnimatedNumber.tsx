"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * Counts to a new value when it changes — the credit-award moment (7.6 #2).
 * Resolves instantly under prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  decimals = 1,
  durationMs = 700,
}: {
  value: number;
  decimals?: number;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const shown = useRef(value); // what is actually on screen right now
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // Tween from the value currently displayed, not the previous target —
    // otherwise a change mid-animation makes the number visibly snap.
    const from = shown.current;
    previous.current = value;
    if (from === value) return;
    if (prefersReducedMotion()) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      shown.current = next;
      setDisplay(next);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return <>{display.toFixed(decimals)}</>;
}
