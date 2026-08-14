"use client";

/**
 * Landing — the one moment of spectacle (design.md §5).
 *
 * Particles coalesce into the EcoMark seal. Pressing Enter disperses it and
 * moves into the app. After this, the interface stays quiet: the subject is
 * serious and the entrance has already made its point.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { AtmosphericField } from "@/components/three/AtmosphericField";
import { SEAL_MIX } from "@/components/three/ParticleField";
import { getStoredUserId } from "@/lib/api";

export default function Landing() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  const enter = useCallback(() => {
    if (entering) return;
    setEntering(true);
    // Let the dispersal play, then continue to the app.
    const destination = getStoredUserId() ? "/dashboard" : "/login";
    window.setTimeout(() => router.push(destination), 620);
  }, [entering, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <AtmosphericField
        mode={entering ? "disperse" : "rings"}
        mix={SEAL_MIX}
        className="pointer-events-none absolute inset-0"
      />

      {/* The brand mark sits at the centre of the orbit paths. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[33%] z-10 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          entering ? { opacity: 0, scale: 1.35 } : { opacity: 1, scale: 1 }
        }
        transition={{ delay: entering ? 0 : 0.5, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src="/mark.png"
          alt="EcoMark"
          width={200}
          height={200}
          priority
          className="h-36 w-36 md:h-48 md:w-48"
          style={{ filter: "drop-shadow(0 0 40px rgba(110,231,168,0.4))" }}
        />
      </motion.div>
      {/* soft floor under the emblem so the wordmark reads cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--bg-void) 42%)",
        }}
      />

      <motion.div
        className="relative z-10 mt-[58vh] flex flex-col items-center text-center"
        animate={entering ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.p
          className="t-label mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          Verify · Credit · Impact
        </motion.p>

        <motion.h1
          className="t-64 text-primary"
          style={{ letterSpacing: "-0.04em" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          EcoMark
        </motion.h1>

        <motion.p
          className="t-16 mt-4 max-w-md text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.7 }}
        >
          Proof, not promises. Log a real-world climate action, have it
          verified against evidence, and hold the credit it earns.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          <button
            onClick={enter}
            className="field group flex items-center gap-3 border-signal-dim px-6 py-3 text-primary transition-colors hover:border-signal"
            style={{ borderRadius: "var(--r-row)" }}
          >
            <span className="t-14">Enter</span>
            <span className="mono-12 text-secondary group-hover:text-signal">↵</span>
          </button>
          <span className="mono-12 text-muted">or press Enter</span>
        </motion.div>
      </motion.div>

      {/* instrument footer — measured values, set as data */}
      <motion.div
        className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-8 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: entering ? 0 : 1 }}
        transition={{ delay: 1.9, duration: 0.6 }}
      >
        {[
          ["METHODS", "3"],
          ["CATEGORIES", "4"],
          ["LEDGER", "ON-CHAIN"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="mono-12 text-secondary">{value}</span>
            <span className="t-label" style={{ fontSize: 12 }}>
              {label}
            </span>
          </div>
        ))}
      </motion.div>
    </main>
  );
}
