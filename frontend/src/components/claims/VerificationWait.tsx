"use client";

/**
 * The verification wait. Not a spinner: a staged sequence naming the real
 * step in progress, with a progress thread advancing through the state
 * machine so async work is legible rather than mysterious (§10.2).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { VerificationMethod } from "@/lib/types";

const STAGES: Record<VerificationMethod, string[]> = {
  satellite: [
    "Locating parcel",
    "Retrieving imagery",
    "Comparing before and after",
    "Calculating",
  ],
  ocr: ["Reading document", "Extracting values", "Checking against records", "Calculating"],
  gps: ["Reading trip log", "Matching routes", "Calculating"],
};

/** Seconds at which each stage begins, tuned to the mock's ~3s latency. */
const STAGE_AT = [0, 1.1, 2.2, 3.1];

export function VerificationWait({ method }: { method: VerificationMethod }) {
  const stages = STAGES[method];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const lastIndex = stages.length - 1;
    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      let index = 0;
      for (let i = 0; i <= lastIndex; i++) {
        if (elapsed >= STAGE_AT[i]) index = i;
      }
      setActiveIndex((prev) => (prev === index ? prev : index));
      if (index === lastIndex) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [stages.length]);

  return (
    <section className="panel p-6" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="t-label">Verifying</span>
        <span className="mono-12 text-secondary">
          {String(Math.min(activeIndex + 1, stages.length)).padStart(2, "0")} /{" "}
          {String(stages.length).padStart(2, "0")}
        </span>
      </div>

      {/* progress thread through the state machine */}
      <div className="mt-5 flex gap-1" aria-hidden>
        {stages.map((s, i) => (
          <div key={s} className="h-0.5 flex-1 overflow-hidden bg-void">
            <motion.div
              className="h-full"
              style={{ background: i <= activeIndex ? "var(--signal)" : "transparent" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= activeIndex ? 1 : 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              // grow from the left as each stage begins
            />
          </div>
        ))}
      </div>

      <ol className="mt-5 flex flex-col gap-3">
        {stages.map((stage, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "ahead";
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                aria-hidden
                className={`mono-12 inline-flex h-4 w-4 items-center justify-center ${
                  state === "done"
                    ? "text-signal"
                    : state === "active"
                      ? "text-signal"
                      : "text-muted"
                }`}
              >
                {state === "done" ? (
                  "✓"
                ) : state === "active" ? (
                  <motion.span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-signal"
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                ) : (
                  "·"
                )}
              </span>
              <span
                className={`t-14 ${
                  state === "ahead"
                    ? "text-muted"
                    : state === "active"
                      ? "text-primary"
                      : "text-secondary"
                }`}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
