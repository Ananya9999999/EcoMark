"use client";

/**
 * The atmospheric field — the signature element (design.md §5).
 *
 * One InstancedMesh, one draw call. Particles drift as a diffuse cloud
 * (unmeasured carbon) and can be pulled into an ordered target formation
 * (measured and captured):
 *
 *   mode="seal"     the EcoMark emblem — a calibration seal. Landing page.
 *   mode="disperse" the seal breaking apart. Plays on entering the app.
 *   mode="ambient"  a calm field whose lattice density follows the balance.
 *
 * Never intercepts pointer events; pauses when the tab is hidden or the
 * canvas scrolls out of view.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { particleBudget } from "@/lib/capabilities";

/**
 * seal     — the full emblem drawn in particles
 * rings    — orbit rings only, so a real logo can sit at their centre
 * disperse — the formation breaking apart on entry
 * ambient  — the calm field behind the app header
 */
export type FieldMode = "seal" | "rings" | "disperse" | "ambient";

export interface ParticleFieldProps {
  mode: FieldMode;
  /** 0..1 — how ordered the ambient lattice is (driven by total balance). */
  order?: number;
  /** Category weights, normalised, deciding the colour mix. */
  mix?: { land: number; energy: number; water: number; transport: number };
  className?: string;
}

const CATEGORY_COLORS = {
  land: new THREE.Color("#6ee7a8"),
  energy: new THREE.Color("#f0a868"),
  water: new THREE.Color("#5ec8e8"),
  transport: new THREE.Color("#a98bf0"),
};

/**
 * Target positions forming the EcoMark mark: the satellite from the brand
 * logo — body, two solar-panel wings, dish — inside two orbit rings.
 * Built from maths, so the emblem costs nothing to ship.
 */
function buildSealTargets(count: number, ringsOnly = false): Float32Array {
  const out = new Float32Array(count * 3);
  const TILT = -0.62; // radians, matching the logo's diagonal
  const cos = Math.cos(TILT);
  const sin = Math.sin(TILT);

  if (ringsOnly) {
    // Three concentric orbit paths framing whatever sits at the centre.
    for (let i = 0; i < count; i++) {
      const lane = i % 3;
      const r = [1.62, 1.86, 2.08][lane];
      let a = (Math.floor(i / 3) / (count / 3)) * Math.PI * 2;
      const seg = a % (Math.PI * 2);
      // gaps so each path reads as an orbit rather than a plain circle
      if (lane === 1 && seg > 2.4 && seg < 3.0) a += 0.75;
      if (lane === 2 && seg > 5.4 && seg < 6.0) a += 0.6;
      const jitter = 1 + (Math.random() - 0.5) * 0.016;
      out[i * 3] = Math.cos(a) * r * jitter;
      out[i * 3 + 1] = Math.sin(a) * r * jitter * 0.97;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.16;
    }
    return out;
  }

  // place a point in the satellite's own tilted frame
  const put = (i: number, u: number, v: number, depth = 0.05) => {
    out[i * 3] = u * cos - v * sin;
    out[i * 3 + 1] = u * sin + v * cos;
    out[i * 3 + 2] = (Math.random() - 0.5) * depth;
  };

  // proportions of the particle budget
  const nRing = Math.floor(count * 0.34);
  const nBody = Math.floor(count * 0.16);
  const nPanel = Math.floor(count * 0.36);
  const nDish = count - nRing - nBody - nPanel;

  let i = 0;

  // two orbit rings, the outer one broken into arcs like the logo
  for (let k = 0; k < nRing; k++, i++) {
    const outer = k % 2 === 0;
    const r = outer ? 1.5 : 1.26;
    // one loop per ring so the path reads continuous, not dotted
    let a = (Math.floor(k / 2) / (nRing / 2)) * Math.PI * 2;
    if (outer) {
      // leave two gaps so it reads as an orbit path, not a plain circle
      const seg = a % (Math.PI * 2);
      if (seg > 2.5 && seg < 3.1) a += 0.7;
      if (seg > 5.7) a += 0.5;
    }
    const jitter = 1 + (Math.random() - 0.5) * 0.014;
    out[i * 3] = Math.cos(a) * r * jitter;
    out[i * 3 + 1] = Math.sin(a) * r * jitter * 0.98;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }

  // central body — a filled capsule along the tilt axis
  for (let k = 0; k < nBody; k++, i++) {
    const t = k / nBody;
    const v = (t - 0.5) * 0.9;
    const halfWidth = 0.13 * Math.sqrt(Math.max(0, 1 - Math.pow(v / 0.52, 6)));
    const u = (Math.random() * 2 - 1) * halfWidth;
    put(i, u, v, 0.12);
  }

  // two solar-panel wings, drawn as grids
  for (let k = 0; k < nPanel; k++, i++) {
    const side = k % 2 === 0 ? -1 : 1;
    const t = ((k / nPanel) * 2) % 1;
    const inner = 0.24;
    const outerEdge = 0.98;
    const u = side * (inner + t * (outerEdge - inner));
    // dense outline, lighter interior, plus the cell divider lines
    const roll = Math.random();
    let v: number;
    if (roll < 0.5) v = (Math.random() < 0.5 ? 1 : -1) * 0.22; // long edges
    else if (roll < 0.7) v = 0; // centre spar
    else v = (Math.random() * 2 - 1) * 0.22; // panel face
    put(i, u, v, 0.05);
  }

  // dish antenna, offset off one end
  for (let k = 0; k < nDish; k++, i++) {
    const a = (k / nDish) * Math.PI * 2;
    const r = 0.09 + Math.random() * 0.08;
    put(i, Math.cos(a) * r * 1.1, 0.62 + Math.sin(a) * r, 0.06);
  }

  return out;
}

/** A loose lattice the ambient field settles toward. */
function buildLatticeTargets(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const per = Math.ceil(Math.cbrt(count));
  for (let i = 0; i < count; i++) {
    const xi = i % per;
    const yi = Math.floor(i / per) % per;
    const zi = Math.floor(i / (per * per));
    out[i * 3] = (xi / (per - 1) - 0.5) * 7;
    out[i * 3 + 1] = (yi / (per - 1) - 0.5) * 3.2;
    out[i * 3 + 2] = (zi / Math.max(1, per - 1) - 0.5) * 2.4;
  }
  return out;
}

function Particles({ mode, order = 0.4, mix }: Omit<ParticleFieldProps, "className">) {
  const count = useMemo(() => particleBudget(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { invalidate } = useThree();

  // Per-particle state, allocated once.
  const state = useMemo(() => {
    const cloud = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);
    const current = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 4.2;
      const z = (Math.random() - 0.5) * 3;
      cloud[i * 3] = x;
      cloud[i * 3 + 1] = y;
      cloud[i * 3 + 2] = z;
      current[i * 3] = x;
      current[i * 3 + 1] = y;
      current[i * 3 + 2] = z;
      drift[i * 3] = (Math.random() - 0.5) * 0.08;
      drift[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
      drift[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { cloud, drift, current, phase };
  }, [count]);

  const seal = useMemo(
    () => buildSealTargets(count, mode === "rings"),
    [count, mode],
  );
  const lattice = useMemo(() => buildLatticeTargets(count), [count]);

  // Colour each instance once from the category mix.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const weights = mix ?? { land: 0.4, energy: 0.25, water: 0.15, transport: 0.2 };
    const entries = Object.entries(weights) as [keyof typeof CATEGORY_COLORS, number][];
    const total = entries.reduce((s, [, w]) => s + w, 0) || 1;
    const colour = new THREE.Color();
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      let picked = entries[0][0];
      for (const [key, w] of entries) {
        r -= w;
        if (r <= 0) {
          picked = key;
          break;
        }
      }
      colour.copy(CATEGORY_COLORS[picked]);
      // vary luminance so the field has depth rather than reading flat
      colour.multiplyScalar(0.45 + Math.random() * 0.75);
      mesh.setColorAt(i, colour);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [count, mix, invalidate]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const elapsed = useRef(0);
  const dispersedFor = useRef(0);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    if (mode === "disperse") dispersedFor.current += dt;

    const { current, cloud, drift, phase } = state;
    // How strongly particles are pulled toward their target formation.
    const pull =
      mode === "seal" || mode === "rings"
        ? 2.6
        : mode === "ambient"
          ? 0.35 + order * 1.1
          : 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let tx: number;
      let ty: number;
      let tz: number;

      if (mode === "seal" || mode === "rings") {
        tx = seal[i3];
        ty = seal[i3 + 1];
        tz = seal[i3 + 2];
      } else if (mode === "ambient") {
        // blend between free drift and the ordered lattice by `order`
        const wobble = Math.sin(elapsed.current * 0.35 + phase[i]) * 0.14;
        tx = THREE.MathUtils.lerp(cloud[i3] + drift[i3] * elapsed.current, lattice[i3], order);
        ty =
          THREE.MathUtils.lerp(
            cloud[i3 + 1] + drift[i3 + 1] * elapsed.current,
            lattice[i3 + 1],
            order,
          ) + wobble;
        tz = THREE.MathUtils.lerp(cloud[i3 + 2], lattice[i3 + 2], order);
      } else {
        // disperse: push outward from the centre, accelerating toward the viewer
        const k = 1 + dispersedFor.current * 2.4;
        tx = current[i3] * k;
        ty = current[i3 + 1] * k;
        tz = current[i3 + 2] + dispersedFor.current * 5.5;
      }

      if (mode === "disperse") {
        current[i3] = tx;
        current[i3 + 1] = ty;
        current[i3 + 2] = tz;
      } else {
        const k = Math.min(1, dt * pull);
        current[i3] += (tx - current[i3]) * k;
        current[i3 + 1] += (ty - current[i3 + 1]) * k;
        current[i3 + 2] += (tz - current[i3 + 2]) * k;
      }

      dummy.position.set(current[i3], current[i3 + 1], current[i3 + 2]);
      const s = mode === "seal" || mode === "rings" ? 0.016 : 0.013;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Slow rotation only while the seal is held.
    // Rings turn slowly; the full seal only breathes.
    if (mode === "rings") mesh.rotation.z = elapsed.current * 0.055;
    else if (mode === "seal") mesh.rotation.z = Math.sin(elapsed.current * 0.12) * 0.06;
  });

  // The emblem sits above centre so the wordmark can sit beneath it.
  const groupY = mode === "seal" || mode === "rings" ? 1.15 : 0;

  return (
    <group position={[0, groupY, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Pulls the camera back far enough that the seal sits behind the wordmark. */
function CameraRig({ mode }: { mode: FieldMode }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.z = mode === "ambient" ? 4.2 : 7.4;
    // rings sit slightly wider, so pull back a touch more
    if (mode === "rings") camera.position.z = 7.9;
    camera.updateProjectionMatrix();
  }, [camera, mode]);
  return null;
}

/** Cursor parallax — shifts the field a few degrees, no more. */
function Parallax() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 0.28;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 0.18;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(() => {
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (-target.current.y - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** The landing seal is signal-dominant; the app field follows real holdings. */
export const SEAL_MIX = { land: 1, energy: 0.07, water: 0.05, transport: 0.05 };

export default function ParticleField({
  mode,
  order = 0.4,
  mix,
  className,
}: ParticleFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [tabActive, setTabActive] = useState(true);

  // Pause when scrolled out of view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setTabActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = visible && tabActive;

  return (
    <div ref={wrapRef} className={className} aria-hidden style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={running ? "always" : "never"}
        style={{ pointerEvents: "none" }}
      >
        <CameraRig mode={mode} />
        <Particles mode={mode} order={order} mix={mix} />
        <Parallax />
      </Canvas>
    </div>
  );
}
