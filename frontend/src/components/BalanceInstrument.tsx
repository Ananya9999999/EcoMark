"use client";

/**
 * Balance as one calibrated instrument, not four stat cards (design.md §4).
 * A single bar divided into four category segments over a tick scale, with
 * the total in 40px mono. The segments are the chart.
 */

import { motion } from "framer-motion";

import { CATEGORIES, type Balance, type CreditCategory } from "@/lib/types";
import { AnimatedNumber } from "./primitives/AnimatedNumber";

export const CATEGORY_VAR: Record<CreditCategory, string> = {
  land: "var(--land)",
  energy: "var(--energy)",
  water: "var(--water)",
  transport: "var(--transport)",
};

export function BalanceInstrument({ balance }: { balance: Balance }) {
  const total = balance.total;
  const segments = CATEGORIES.map((c) => ({
    category: c,
    amount: balance.balances[c] ?? 0,
    pct: total > 0 ? ((balance.balances[c] ?? 0) / total) * 100 : 0,
  }));

  return (
    <section aria-label="Credit balance" className="panel p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="t-label">Total holdings</span>
          <div className="mono-40 mt-2 text-primary">
            <AnimatedNumber value={total} decimals={1} />
          </div>
        </div>
        <span className="t-label mt-1 hidden sm:block">Composition</span>
      </div>

      {/* the gauge */}
      <div className="mt-6">
        <div
          className="flex h-3 w-full overflow-hidden rounded-[var(--r-instrument)] bg-void"
          role="img"
          aria-label={segments
            .map((s) => `${s.category} ${s.amount.toFixed(1)}`)
            .join(", ")}
        >
          {total > 0 ? (
            segments.map((s, i) => (
              <motion.div
                key={s.category}
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.52, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: CATEGORY_VAR[s.category] }}
              />
            ))
          ) : (
            <div className="h-full w-full bg-[var(--muted-wash)]" />
          )}
        </div>
        {/* tick scale beneath, as on an instrument */}
        <div className="ticks mt-1 h-2 w-full opacity-70" aria-hidden />
      </div>

      {/* readouts */}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.category} className="flex flex-col gap-1.5">
            <dt className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0"
                style={{ background: CATEGORY_VAR[s.category] }}
              />
              <span className="t-label" style={{ letterSpacing: "0.1em" }}>
                {s.category}
              </span>
            </dt>
            <dd className="mono-20 text-primary">
              <AnimatedNumber value={s.amount} decimals={1} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
