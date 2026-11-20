import type { NightConfig, Surface } from '../../core/nights';
import type { Vec3 } from '../../core/types';
import { mulberry32 } from './seeded-random';
import { isExcluded, scatterGroundY } from './decor-exclusion-zones';
import { baseDiscs } from './island-terrain-height-field';

export interface ScatterOptions {
  seed: number;
  count: number;
  /** Inner/outer sampling radius as a fraction of the disc radius (default 0..1). */
  minRadiusFrac?: number;
  maxRadiusFrac?: number;
  /** Min XZ distance between chosen points (default 0 = none). */
  minSpacing?: number;
  /** Total sampling attempts (default count * 20). */
  maxAttempts?: number;
}

type Rect = Extract<Surface, { kind: 'rect' }>;

/**
 * Deterministic scatter of ground points on the island base disc(s).
 * Count is split evenly between discs; may return fewer than `count`.
 */
export function scatterPoints(cfg: NightConfig, opts: ScatterOptions): Vec3[] {
  const discs = baseDiscs(cfg);
  if (discs.length === 0 || opts.count <= 0) return [];
  const rnd = mulberry32(opts.seed);
  const lo = opts.minRadiusFrac ?? 0;
  const hi = opts.maxRadiusFrac ?? 1;
  const spacing = opts.minSpacing ?? 0;
  const attempts = Math.ceil((opts.maxAttempts ?? opts.count * 20) / discs.length);
  const out: Vec3[] = [];
  discs.forEach((d, i) => {
    const target = Math.floor(opts.count / discs.length) + (i < opts.count % discs.length ? 1 : 0);
    let got = 0;
    for (let a = 0; a < attempts && got < target; a++) {
      // sqrt gives uniform area density within the annulus [lo, hi]
      const rf = Math.sqrt(lo * lo + rnd() * (hi * hi - lo * lo));
      const ang = rnd() * Math.PI * 2;
      const x = d.cx + Math.cos(ang) * rf * d.r;
      const z = d.cz + Math.sin(ang) * rf * d.r;
      if (isExcluded(cfg, x, z)) continue;
      const y = scatterGroundY(cfg, x, z);
      if (y === null) continue;
      if (spacing > 0 && out.some((p) => Math.hypot(p[0] - x, p[2] - z) < spacing)) continue;
      out.push([x, y, z]);
      got++;
    }
  });
  return out;
}

/** Paper lantern posts along both long edges of every rect (bridge) surface. */
export function paperLanternPositions(cfg: NightConfig, spacingM = 3): Vec3[] {
  const out: Vec3[] = [];
  for (const s of cfg.surfaces) {
    if (s.kind !== 'rect') continue;
    const r: Rect = s;
    for (let x = r.xMin; x <= r.xMax + 1e-9; x += spacingM) {
      out.push([x, r.y, r.zMin - 0.3], [x, r.y, r.zMax + 0.3]);
    }
  }
  return out;
}

const DOCK_ANGLE_DEG = 200;

/** Wooden dock at the Night 1 island edge (200 deg, away from lanterns); facing = yaw atan2(dx, dz) outward. */
export function dockAnchor(cfg: NightConfig): { pos: Vec3; facingRad: number } | null {
  if (cfg.id !== 1) return null;
  const d = baseDiscs(cfg)[0];
  if (!d) return null;
  const a = (DOCK_ANGLE_DEG * Math.PI) / 180;
  const dx = Math.cos(a), dz = Math.sin(a);
  return { pos: [d.cx + dx * d.r, d.y, d.cz + dz * d.r], facingRad: Math.atan2(dx, dz) };
}
