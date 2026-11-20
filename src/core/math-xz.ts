import { ISLAND_RADIUS } from './constants';
import type { Vec3 } from './types';

/** Horizontal (XZ plane) distance between two points. */
export function distXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/** Clamp the XZ position to the island disc (invisible wall). Mutates and returns p. */
export function clampToIsland(p: Vec3, radius: number = ISLAND_RADIUS): Vec3 {
  const d = Math.hypot(p[0], p[2]);
  if (d > radius) {
    const k = radius / d;
    p[0] *= k;
    p[2] *= k;
  }
  return p;
}
