"use client";

/**
 * Wraps the particle canvas with its fallback. Lazy-loads the canvas so it
 * never delays first paint, and renders a designed static field instead when
 * any of the four fallback conditions holds (design.md §5).
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { canRender3D } from "@/lib/capabilities";
import type { FieldMode } from "./ParticleField";

const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

/** The fallback is a state in its own right: a calm sensor field at rest. */
export function StaticField({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(47,107,80,0.35), transparent 70%)",
        }}
      >
        <div
          className="h-full w-full opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(110,231,168,0.5) 0.7px, transparent 0.7px)",
            backgroundSize: "34px 34px",
            maskImage:
              "radial-gradient(ellipse 65% 75% at 50% 45%, black, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 75% at 50% 45%, black, transparent 75%)",
          }}
        />
      </div>
    </div>
  );
}

export function AtmosphericField({
  mode,
  order,
  mix,
  className,
}: {
  mode: FieldMode;
  order?: number;
  mix?: { land: number; energy: number; water: number; transport: number };
  className?: string;
}) {
  // null until measured on the client — render nothing rather than guess.
  const [use3D, setUse3D] = useState<boolean | null>(null);

  useEffect(() => {
    setUse3D(canRender3D());
  }, []);

  if (use3D === null) return <div className={className} aria-hidden />;
  if (!use3D) return <StaticField className={className} />;
  return <ParticleField mode={mode} order={order} mix={mix} className={className} />;
}
