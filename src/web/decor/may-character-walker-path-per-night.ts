import type { NightConfig } from '../../core/nights';
import type { MayIslandWalkerOptions } from './may-character-island-walker';

type LoopOptions = Required<Pick<MayIslandWalkerOptions, 'centerX' | 'centerZ' | 'radius' | 'wobbleScale' | 'maxRadius'>>;

/**
 * Walker loop per night (centre, mean radius, wobble), chosen to stay clear of lanterns and ramps:
 * - Night 1: the original loop (r 16 +- 2.1 inside the 25 m lantern ring);
 * - Night 2: island A, r 14 +- 2.1 (lanterns at 20 m from the centre, bridge starts at x 26);
 * - Night 3: tier 0 ring, r 32.8 +- 0.84 (ramps end at r 30, nearest lanterns L4/L5 at r 36.4).
 */
export function walkerLoopForNight(cfg: NightConfig): LoopOptions {
  if (cfg.id === 2) return { centerX: 0, centerZ: 0, radius: 14, wobbleScale: 1, maxRadius: 14 };
  if (cfg.id === 3) return { centerX: 0, centerZ: 0, radius: 32.8, wobbleScale: 0.4, maxRadius: 32.8 };
  return { centerX: 0, centerZ: 0, radius: 16, wobbleScale: 1, maxRadius: 18.9 };
}

/** Half-width (m) of the band around the loop kept free of tall decor (trees, banners, burners). */
const PATH_CLEARANCE_M = 1.6;

/** True if (x,z) lies on the walker's band for this night (tall props should not be placed there). */
export function isOnWalkerPath(cfg: NightConfig, x: number, z: number): boolean {
  const l = walkerLoopForNight(cfg);
  const wobble = 2.1 * l.wobbleScale;
  const d = Math.hypot(x - l.centerX, z - l.centerZ);
  return d >= l.radius - wobble - PATH_CLEARANCE_M && d <= l.radius + wobble + PATH_CLEARANCE_M;
}
