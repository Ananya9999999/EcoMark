import * as THREE from "three";

/**
 * Conversions between lat/lng and points on a unit sphere.
 *
 * Derived from three.js SphereGeometry: a vertex at texture coordinate u is
 * placed at azimuth 2πu with x = -cos(2πu)·sinθ, z = sin(2πu)·sinθ, and an
 * equirectangular earth texture has longitude L at u = L/360 + 0.5.
 * Substituting gives, for latitude φ and longitude L:
 *
 *   x =  cos(φ) · cos(L)
 *   y =  sin(φ)
 *   z = -cos(φ) · sin(L)
 *
 * Verified by dropping pins at known cities (see globe acceptance).
 */

export function latLngToVector3(latDeg: number, lngDeg: number, radius = 1): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lng = THREE.MathUtils.degToRad(lngDeg);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lng),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lng),
  );
}

export function vector3ToLatLng(point: THREE.Vector3): { lat: number; lng: number } {
  const n = point.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)));
  const lng = THREE.MathUtils.radToDeg(Math.atan2(-n.z, n.x));
  return { lat, lng };
}

/** Points of a circle of ground radius `radiusM` centred at lat/lng, on a sphere of `sphereRadius`. */
export function radiusCirclePoints(
  latDeg: number,
  lngDeg: number,
  radiusM: number,
  sphereRadius = 1,
  segments = 96,
): THREE.Vector3[] {
  const EARTH_RADIUS_M = 6_371_000;
  const angular = radiusM / EARTH_RADIUS_M; // angular radius in radians

  const centre = latLngToVector3(latDeg, lngDeg, 1);
  // Orthonormal basis in the tangent plane at the centre.
  const up = Math.abs(centre.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3().crossVectors(up, centre).normalize();
  const north = new THREE.Vector3().crossVectors(centre, east).normalize();

  const points: THREE.Vector3[] = [];
  const cosA = Math.cos(angular);
  const sinA = Math.sin(angular);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const dir = new THREE.Vector3()
      .addScaledVector(centre, cosA)
      .addScaledVector(east, sinA * Math.cos(t))
      .addScaledVector(north, sinA * Math.sin(t));
    points.push(dir.multiplyScalar(sphereRadius));
  }
  return points;
}
