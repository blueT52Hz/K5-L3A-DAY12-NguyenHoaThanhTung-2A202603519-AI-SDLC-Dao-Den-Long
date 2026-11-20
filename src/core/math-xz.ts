import type { Vec3 } from './types';

/** Horizontal (XZ plane) distance between two points. */
export function distXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}
