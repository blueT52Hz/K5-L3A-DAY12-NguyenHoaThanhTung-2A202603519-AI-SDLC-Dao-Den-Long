import * as THREE from 'three';
import type { Lantern, Vec3 } from '../../core/types';
import { isLowFuel } from '../../core/systems/lantern-fuel';

/** Closest lantern needing help (unlit or low on fuel) to `from` (XZ distance), or null. */
export function nearestNeedyLantern(lanterns: Lantern[], from: Vec3): Lantern | null {
  let best: Lantern | null = null;
  let bd = Infinity;
  for (const l of lanterns) {
    if (l.lit && !isLowFuel(l)) continue;
    const d = Math.hypot(l.pos[0] - from[0], l.pos[2] - from[2]);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

export interface EdgeArrow { visible: boolean; x: number; y: number; angleRad: number }
const v = new THREE.Vector3();

/** Screen-edge arrow toward a world point; visible only when the point is outside the view. */
export function edgeArrow(camera: THREE.Camera, target: Vec3, w: number, h: number, margin = 48): EdgeArrow {
  v.set(...target).project(camera);
  let nx = v.x, ny = v.y;
  const behind = v.z > 1;
  if (behind) { nx = -nx; ny = -ny; }
  const onScreen = !behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
  if (onScreen) return { visible: false, x: 0, y: 0, angleRad: 0 };
  const m = Math.max(Math.abs(nx), Math.abs(ny), 1e-6);
  nx /= m; ny /= m; // push to the unit-square border
  const x = w / 2 + nx * (w / 2 - margin);
  const y = h / 2 - ny * (h / 2 - margin);
  return { visible: true, x, y, angleRad: Math.atan2(-(y - h / 2), x - w / 2) };
}
