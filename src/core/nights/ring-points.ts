import type { Vec3 } from '../types';

/** `count` points on a circle (center cx,cz), starting at startDeg, every stepDeg: (r cos a, y, r sin a). */
export function ringPoints(cx: number, cz: number, r: number, y: number, startDeg: number, stepDeg: number, count: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((startDeg + i * stepDeg) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
  }
  return out;
}
