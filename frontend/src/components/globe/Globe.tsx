"use client";

/**
 * The signature element (7.5.1): an interactive Earth for coordinate input.
 * Click drops the pin; drag rotates (damped); scroll zooms; the camera makes
 * an eased journey to a dropped pin; the claim radius is drawn as a circle
 * projected on the surface; a fresnel rim glow sits on the limb.
 *
 * Performance: single sphere + small pin/ring geometries, no React state
 * changes per frame — the camera journey and ambient rotation run inside
 * useFrame with refs and pre-allocated scratch vectors. The non-interactive
 * mini globe parks its camera at the pin and renders on demand only.
 */

import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { latLngToVector3, radiusCirclePoints, vector3ToLatLng } from "./coords";

/** The --limb accent from the design brief. Three.js cannot read CSS custom
 * properties, so the token is mirrored here — change both together. */
const ACCENT = "#5cc8db";
const ACCENT_RGB = new THREE.Color(ACCENT);

export interface GlobeProps {
  lat: number | null;
  lng: number | null;
  radiusM: number;
  interactive?: boolean;
  /** Camera distance. The location funnel drives this per level. */
  zoom?: number;
  /** Fires when the user drops the pin by clicking the sphere. */
  onPick?: (lat: number, lng: number) => void;
  /** Fires if the WebGL context is lost — parents swap in the fallback. */
  onContextLost?: () => void;
  className?: string;
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The limb glow: strongest at grazing angles, colour = the accent uniform.
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  void main() {
    float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
    gl_FragColor = vec4(uColor, 1.0) * rim;
  }
`;

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        uniforms: { uColor: { value: ACCENT_RGB } },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} scale={1.12}>
      <sphereGeometry args={[1, 48, 48]} />
    </mesh>
  );
}

function Pin({ lat, lng }: { lat: number; lng: number }) {
  const position = useMemo(() => latLngToVector3(lat, lng, 1.005), [lat, lng]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
    return q;
  }, [position]);
  return (
    <group position={position} quaternion={quaternion}>
      {/* a thin spike + glowing head, in the limb accent */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.06, 8]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
    </group>
  );
}

function RadiusRing({ lat, lng, radiusM }: { lat: number; lng: number; radiusM: number }) {
  const geometry = useMemo(() => {
    const points = radiusCirclePoints(lat, lng, radiusM, 1.004);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [lat, lng, radiusM]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const line = useMemo(
    () =>
      new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 }),
      ),
    [geometry],
  );
  useEffect(() => {
    const material = line.material as THREE.Material;
    return () => material.dispose();
  }, [line]);
  return <primitive object={line} />;
}

// Scratch vectors for the per-frame camera journey — allocated once.
const _current = new THREE.Vector3();
const _goal = new THREE.Vector3();

function EarthScene({
  lat,
  lng,
  radiusM,
  interactive = true,
  zoom,
  onPick,
}: Omit<GlobeProps, "className" | "onContextLost">) {
  const texture = useLoader(THREE.TextureLoader, "/earth_day.jpg");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();
  const hasPin = lat != null && lng != null;
  // Camera journey state — refs, not React state, to keep frames cheap.
  const journey = useRef<{ target: THREE.Vector3; active: boolean; distance: number }>({
    target: new THREE.Vector3(),
    active: false,
    distance: zoom ?? 2.6,
  });
  const interacted = useRef(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  // Move to the pin whenever the coordinates change (dropped or typed).
  // The static mini globe parks instantly; the interactive globe travels.
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!interactive) {
      const distance = camera.position.length() || 2.2;
      camera.position.copy(latLngToVector3(lat, lng, 1).multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      invalidate(); // demand mode — request the one frame this needs
      return;
    }
    journey.current.target.copy(latLngToVector3(lat, lng, 1));
    journey.current.active = true;
  }, [lat, lng, interactive, camera, invalidate]);

  // A new zoom level restarts the journey so the camera flies in.
  useEffect(() => {
    if (zoom == null) return;
    journey.current.distance = zoom;
    if (lat != null && lng != null) journey.current.active = true;
  }, [zoom, lat, lng]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    // Ambient rotation at rest, until the user takes over or a pin exists.
    if (controls && interactive && !interacted.current && !hasPin) {
      controls.autoRotate = true;
    } else if (controls) {
      controls.autoRotate = false;
    }
    // Eased travel: swing the camera direction toward the pin.
    if (journey.current.active) {
      const cam = state.camera;
      // ease the direction toward the target and the distance toward the level
      const wanted = journey.current.distance;
      const distance = THREE.MathUtils.lerp(
        cam.position.length(),
        wanted,
        Math.min(1, delta * 3),
      );
      _current.copy(cam.position).normalize();
      _goal.copy(journey.current.target).normalize();
      _current.lerp(_goal, Math.min(1, delta * 4)).normalize();
      cam.position.copy(_current).multiplyScalar(distance);
      cam.lookAt(0, 0, 0);
      if (
        _current.angleTo(_goal) < 0.004 &&
        Math.abs(distance - wanted) < 0.01
      ) {
        journey.current.active = false;
      }
    }
    controls?.update();
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    downAt.current = { x: e.clientX, y: e.clientY };
    interacted.current = true;
    journey.current.active = false; // the user's drag wins over the journey
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || !onPick) return;
    // Distinguish a click from the end of a drag.
    const down = downAt.current;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const { lat: pickedLat, lng: pickedLng } = vector3ToLatLng(e.point);
    onPick(Number(pickedLat.toFixed(4)), Number(pickedLng.toFixed(4)));
  };

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <mesh onClick={handleClick} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
      </mesh>
      <Atmosphere />
      {hasPin && <Pin lat={lat!} lng={lng!} />}
      {hasPin && <RadiusRing lat={lat!} lng={lng!} radiusM={radiusM} />}
      {interactive && (
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          // Wheel zoom is off on purpose: it used to swallow the page scroll,
          // trapping the user on this section. The funnel sets the zoom level.
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          autoRotateSpeed={0.4}
          minDistance={1.2}
          maxDistance={4.5}
        />
      )}
    </>
  );
}

export default function Globe({ className, onContextLost, ...props }: GlobeProps) {
  const interactive = props.interactive ?? true;
  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0.6, 2.6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        // The static mini globe renders only when something changes.
        frameloop={interactive ? "always" : "demand"}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              // R3F calls forceContextLoss() during its own teardown, and
              // React's dev double-mount triggers exactly that once. Only a
              // loss on a canvas still in the document is a real failure.
              setTimeout(() => {
                if (canvas.isConnected) onContextLost?.();
              }, 0);
            },
            { once: true },
          );
        }}
      >
        <EarthScene {...props} />
      </Canvas>
    </div>
  );
}
