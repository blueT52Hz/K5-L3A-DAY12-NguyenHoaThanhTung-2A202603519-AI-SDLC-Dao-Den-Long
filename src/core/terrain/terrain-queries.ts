import { STEP_UP } from '../constants';
import type { NightConfig, Surface } from '../nights/night-config-types';

/** Height of surface s at (x,z), or null if (x,z) is not covered. Boundaries are inclusive. */
function surfaceHeight(s: Surface, x: number, z: number): number | null {
  switch (s.kind) {
    case 'disc':
      return Math.hypot(x - s.cx, z - s.cz) <= s.r ? s.y : null;
    case 'annulus': {
      const d = Math.hypot(x - s.cx, z - s.cz);
      if (d < s.rIn || d > s.rOut) return null;
      return s.zMinExclusive !== undefined && !(z > s.zMinExclusive) ? null : s.y;
    }
    case 'rect':
      return x >= s.xMin && x <= s.xMax && z >= s.zMin && z <= s.zMax ? s.y : null;
    case 'ramp': {
      const a = (s.angleDeg * Math.PI) / 180;
      const along = x * Math.cos(a) + z * Math.sin(a);
      const across = -x * Math.sin(a) + z * Math.cos(a);
      const t = (along - s.rFrom) / (s.rTo - s.rFrom);
      if (Math.abs(across) > s.width / 2 || t < 0 || t > 1) return null;
      return s.yFrom + (s.yTo - s.yFrom) * t;
    }
  }
}

/** Highest surface at (x,z) with height <= footY + STEP_UP, or null (void). */
export function groundBelow(cfg: NightConfig, x: number, z: number, footY: number): number | null {
  let best: number | null = null;
  for (const s of cfg.surfaces) {
    const h = surfaceHeight(s, x, z);
    if (h !== null && h <= footY + STEP_UP && (best === null || h > best)) best = h;
  }
  return best;
}

/** True if a surface above footY + STEP_UP covers (x,z), or (x,z) is inside an obstacle taller than footY. */
export function isWall(cfg: NightConfig, x: number, z: number, footY: number): boolean {
  for (const s of cfg.surfaces) {
    const h = surfaceHeight(s, x, z);
    if (h !== null && h > footY + STEP_UP) return true;
  }
  return cfg.obstacles.some((o) => Math.hypot(x - o.cx, z - o.cz) <= o.r && footY < o.yTop);
}

/** Can a body with feet at footY move to (x,z)? allowDrop permits stepping onto lower ground or void. */
export function canWalkTo(cfg: NightConfig, footY: number, x: number, z: number, allowDrop: boolean): boolean {
  if (isWall(cfg, x, z, footY)) return false;
  if (allowDrop) return true;
  const g = groundBelow(cfg, x, z, footY);
  return g !== null && g >= footY - STEP_UP;
}
