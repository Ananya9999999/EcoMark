/** Device and preference checks that decide whether 3D runs at all. */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The four fallback conditions from the build spec §9.3. Any one of them
 * means the static field renders instead of the canvas.
 */
export function canRender3D(): boolean {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (window.innerWidth < 640) return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores <= 4) return false;
  return webglAvailable();
}

/** Particle budget by breakpoint: desktop 2000 · tablet 1000 · mobile 400. */
export function particleBudget(): number {
  if (typeof window === "undefined") return 400;
  if (window.innerWidth >= 1024) return 2000;
  if (window.innerWidth >= 640) return 1000;
  return 400;
}
