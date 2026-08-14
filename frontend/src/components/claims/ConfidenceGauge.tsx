"use client";

/** Confidence as a calibrated dial, not a bare percentage (§11.3). */

import { motion } from "framer-motion";

export function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  // 240° sweep, starting bottom-left
  const START = 150;
  const SWEEP = 240;
  const R = 46;
  const CX = 60;
  const CY = 60;

  const polar = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
  };

  const arc = (from: number, to: number, radius: number) => {
    const s = polar(from, radius);
    const e = polar(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const ticks = Array.from({ length: 13 }, (_, i) => {
    const angle = START + (i / 12) * SWEEP;
    const major = i % 3 === 0;
    const inner = polar(angle, major ? R - 9 : R - 5);
    const outer = polar(angle, R);
    return { ...inner, x2: outer.x, y2: outer.y, major };
  });

  const needle = polar(START + pct * SWEEP, R - 13);

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="96" viewBox="0 0 120 96" aria-hidden className="shrink-0">
        <path d={arc(START, START + SWEEP, R)} fill="none" stroke="var(--line)" strokeWidth="2" />
        <motion.path
          d={arc(START, START + SWEEP, R)}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x}
            y1={t.y}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "var(--text-secondary)" : "var(--line)"}
            strokeWidth="1"
          />
        ))}
        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="3" fill="var(--signal)" />
      </svg>
      <div>
        <span className="t-label">Confidence</span>
        <div className="mono-28 mt-1 text-primary">{(pct * 100).toFixed(0)}%</div>
        <p className="mono-12 mt-1 text-muted">
          {pct >= 0.85 ? "high" : pct >= 0.6 ? "moderate" : "low"}
        </p>
      </div>
    </div>
  );
}
