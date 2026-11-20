import { DRAIN_CHASE_RADIUS, DRAIN_RANGE_M, SHADE_WANDER_FACTOR, TICK_RATE } from '../constants';
import { distXZ } from '../math-xz';
import type { NightConfig } from '../nights/night-config-types';
import type { GameState, Lantern, Shade } from '../types';
import { isLowFuel } from './lantern-fuel';
import { walkShade } from './shade-movement-terrain';

/** Leave the `drain` state's bookkeeping behind (target and counter reset). */
function clearDrain(sh: Shade): void {
  sh.targetLanternId = null;
  sh.drainTicks = 0;
}

/** Nearest lit low-fuel lantern by XZ; ties go to the smaller id number. Null when none. */
function nearestLowFuelLantern(s: GameState, sh: Shade): Lantern | null {
  let best: Lantern | null = null;
  let bestD = Infinity;
  for (const l of s.lanterns) {
    if (!isLowFuel(l)) continue;
    const d = distXZ(sh.pos, l.pos);
    if (d < bestD || (d === bestD && best !== null && Number(l.id.slice(1)) < Number(best.id.slice(1)))) { best = l; bestD = d; }
  }
  return best;
}

/**
 * A wandering shade goes for the nearest low-fuel lantern: within DRAIN_RANGE_M it starts draining (stands still),
 * else it walks toward it at wander speed (no RNG). Returns false when no low-fuel lantern exists (random wander).
 */
export function walkTowardLowFuelLantern(s: GameState, cfg: NightConfig, sh: Shade): boolean {
  const l = nearestLowFuelLantern(s, sh);
  if (!l) { sh.targetLanternId = null; return false; }
  sh.targetLanternId = l.id;
  const d = distXZ(sh.pos, l.pos);
  if (d <= DRAIN_RANGE_M) {
    sh.state = 'drain';
    sh.drainTicks = 0;
    return true;
  }
  const k = Math.min((cfg.shadeSpeed / TICK_RATE) * SHADE_WANDER_FACTOR, d) / d;
  walkShade(cfg, sh, (l.pos[0] - sh.pos[0]) * k, (l.pos[2] - sh.pos[2]) * k);
  return true;
}

/**
 * One tick of a `drain` shade. May within DRAIN_CHASE_RADIUS -> chase; target no longer low-fuel (out, or refuelled)
 * or out of DRAIN_RANGE_M -> wander. Both exits return true (the caller then walks this tick); otherwise it stands still.
 */
export function drainStep(s: GameState, sh: Shade): boolean {
  if (distXZ(sh.pos, s.player.pos) <= DRAIN_CHASE_RADIUS) {
    sh.state = 'chase';
    clearDrain(sh);
    return true;
  }
  const l = s.lanterns.find((x) => x.id === sh.targetLanternId);
  if (!l || !isLowFuel(l) || distXZ(sh.pos, l.pos) > DRAIN_RANGE_M) {
    sh.state = 'wander';
    clearDrain(sh);
    return true;
  }
  return false;
}
