import type * as THREE from 'three';

/** Ticket bench camera: circle around (0,0,0), radius 30 m, height 15 m, one lap per 15 s. */
const RADIUS = 30;
const HEIGHT = 15;
const LAP_S = 15;

/**
 * Place the camera t seconds after the first bench frame. Starts at angle 0 = (30, 15, 0); the angle grows
 * from +X toward -Z, which is counter-clockwise seen from above in three.js axes. Always looks at the origin.
 */
export function placeBenchCamera(camera: THREE.PerspectiveCamera, tS: number): void {
  const a = (2 * Math.PI * tS) / LAP_S;
  camera.position.set(RADIUS * Math.cos(a), HEIGHT, -RADIUS * Math.sin(a));
  camera.lookAt(0, 0, 0);
}
