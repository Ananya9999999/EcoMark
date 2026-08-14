"use client";

/**
 * The verification wait — the emotional core (7.6 moment 1). Not a spinner:
 * a staged sequence naming the real step in progress, driven by elapsed
 * time. Completed stages stay visible as a ledger of what has happened.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { VerificationMethod } from "@/lib/types";

const STAGES: Record<VerificationMethod, string[]> = {
  satellite: ["locating parcel", "retrieving imagery", "comparing before and after", "calculating"],
  ocr: ["reading document", "extracting values", "checking against records", "calculating"],
  gps: ["reading trip log", "matching routes", "calculating"],
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
      // Only render on an actual stage change; stop once the last is active.
      setActiveIndex((prev) => (prev === index ? prev : index));
      if (index === lastIndex) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [stages.length]);

  return (
    <div className="surface-shelf p-6" role="status" aria-live="polite">
      <span className="type-label-xs mb-4 block">Verifying</span>
      <ol className="flex flex-col gap-2.5">
        {stages.map((stage, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "ahead";
          return (
              <motion.li
                key={stage}
                initial={{ opacity: 0, x: -6 }}
                animate={{
                  opacity: state === "ahead" ? 0.35 : 1,
                  x: 0,
                }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className={`inline-flex h-4 w-4 items-center justify-center ${
                    state === "done"
                      ? "text-chlorophyll"
                      : state === "active"
                        ? "text-limb"
                        : "text-graticule"
                  }`}
                >
                  {state === "done" ? (
                    "✓"
                  ) : state === "active" ? (
                    <motion.span
                      className="inline-block h-2 w-2 rounded-full bg-limb"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-graticule" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    state === "active" ? "text-airglow" : "text-graticule"
                  }`}
                >
                  {stage}
                </span>
              </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
