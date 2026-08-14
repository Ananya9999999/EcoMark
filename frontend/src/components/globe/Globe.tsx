"use client";

/**
 * The signature element (7.5.1): an interactive Earth for coordinate input.
 * Click drops the pin; drag rotates (damped); scroll zooms; the camera makes
 * an eased journey to a dropped pin; the claim radius is drawn as a circle
 * projected on the surface; a fresnel rim glow sits on the limb.
 *
 * Performance: single sphere + small pin/ring geometries, no React state
 * changes per frame — the camera journey and ambient rotation run inside
 * useFrame with refs.
 */

import { Canvas, useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { latLngToVector3, radiusCirclePoints, vector3ToLatLng } from "./coords";

export interface GlobeProps {
  lat: number | null;
  lng: number | null;
  radiusM: number;
  interactive?: boolean;
  /** Fires when the user drops the pin by clicking the sphere. */
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The limb glow: strongest at grazing angles, colour = --limb (#5cc8db).
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
    gl_FragColor = vec4(0.36, 0.784, 0.859, 1.0) * rim;
  }
`;

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
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
        <meshBasicMaterial color="#5cc8db" />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color="#5cc8db" />
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
        new THREE.LineBasicMaterial({ color: "#5cc8db", transparent: true, opacity: 0.9 }),
      ),
    [geometry],
  );
  useEffect(() => {
    const material = line.material as THREE.Material;
    return () => material.dispose();
  }, [line]);
  return <primitive object={line} />;
}

function EarthScene({
  lat,
  lng,
  radiusM,
  interactive = true,
  onPick,
}: Omit<GlobeProps, "className">) {
  const texture = useLoader(THREE.TextureLoader, "/earth_day.jpg");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const hasPin = lat != null && lng != null;
  // Camera journey state — refs, not React state, to keep frames cheap.
  const journey = useRef<{ target: THREE.Vector3; active: boolean }>({
    target: new THREE.Vector3(),
    active: false,
  });
  const interacted = useRef(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  // Travel to the pin whenever the coordinates change (dropped or typed).
  useEffect(() => {
    if (lat == null || lng == null) return;
    journey.current.target.copy(latLngToVector3(lat, lng, 1));
    journey.current.active = true;
  }, [lat, lng]);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    // Ambient rotation at rest, until the user takes over or a pin exists.
    if (controls && interactive && !interacted.current && !hasPin) {
      controls.autoRotate = true;
    } else if (controls) {
      controls.autoRotate = false;
    }
    // Eased travel: swing the camera direction toward the pin.
    if (journey.current.active) {
      const distance = camera.position.length();
      const current = camera.position.clone().normalize();
      const goal = journey.current.target.clone().normalize();
      const next = current.lerp(goal, Math.min(1, delta * 4)).normalize();
      camera.position.copy(next.multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      if (next.angleTo(goal) < 0.005) journey.current.active = false;
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
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={interactive}
        enableRotate={interactive}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        autoRotateSpeed={0.4}
        minDistance={1.6}
        maxDistance={4.5}
      />
    </>
  );
}

export default function Globe({ className, ...props }: GlobeProps) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0.6, 2.6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <EarthScene {...props} />
      </Canvas>
    </div>
  );
}
