import { EVICT_MAX_TICKS, TICK_RATE } from '../constants';
import { getNight } from '../nights';
import type { NightConfig } from '../nights/night-config-types';
import { TUNING } from '../tuning';
import type { GameState, Lantern, Shade, XZ } from '../types';
import { settleShadeY, shadeCanStand, unitXZ } from './shade-movement-terrain';

/** Float slack for "on the safe circle counts as outside". */
const EPS = 1e-9;
/** Angular samples when searching a safe circle for a standable exit point (0.5 degree steps). */
const CIRCLE_SAMPLES = 720;

const insideZone = (cx: number, cz: number, x: number, z: number): boolean => Math.hypot(x - cx, z - cz) < TUNING.safe_radius - EPS;
const litLanterns = (s: GameState): Lantern[] => s.lanterns.filter((l) => l.lit);

/** A spot where the shade may end up: standable from its foot and outside every lit safe zone. */
function isFreeSpot(s: GameState, cfg: NightConfig, sh: Shade, x: number, z: number): boolean {
  return shadeCanStand(cfg, sh, x, z) && !litLanterns(s).some((l) => insideZone(l.pos[0], l.pos[2], x, z));
}

/**
 * Nearest free spot to (x,z) on the safe circle centred at (cx,cz), sampled at fixed angles (deterministic,
 * no RNG; ties keep the lowest angle). Null when the whole circle is blocked or over void.
 */
function nearestFreeSpotOnCircle(s: GameState, cfg: NightConfig, sh: Shade, cx: number, cz: number, x: number, z: number): XZ | null {
  let best: XZ | null = null;
  let bestD = Infinity;
  for (let i = 0; i < CIRCLE_SAMPLES; i++) {
    const a = (2 * Math.PI * i) / CIRCLE_SAMPLES;
    const px = cx + TUNING.safe_radius * Math.cos(a);
    const pz = cz + TUNING.safe_radius * Math.sin(a);
    const d = Math.hypot(px - x, pz - z);
    if (d < bestD && isFreeSpot(s, cfg, sh, px, pz)) { best = [px, pz]; bestD = d; }
  }
  return best;
}

/** Exit point of the zone at (cx,cz) for the shade: radial projection if free, else the nearest free circle spot. */
function exitPoint(s: GameState, cfg: NightConfig, sh: Shade, cx: number, cz: number): XZ {
  const [ux, uz] = unitXZ(cx, cz, sh.pos[0], sh.pos[2]);
  const radial: XZ = [cx + ux * TUNING.safe_radius, cz + uz * TUNING.safe_radius];
  if (isFreeSpot(s, cfg, sh, radial[0], radial[1])) return radial;
  return nearestFreeSpotOnCircle(s, cfg, sh, cx, cz, sh.pos[0], sh.pos[2]) ?? radial;
}

/**
 * Tick step 6 (spec 6.4): shades inside the zone of a lantern lit since the last call are flagged evicting.
 * Lanterns already lit when the game was created count as seen (shades there are clamped at step 8 instead).
 */
export function updateSafeZones(s: GameState): void {
  const seen = new Set(s.safeZoneLanternIds);
  const lit = litLanterns(s);
  for (const l of lit) {
    if (seen.has(l.id)) continue;
    for (const sh of s.shades) {
      if (sh.evictFrom !== null || !insideZone(l.pos[0], l.pos[2], sh.pos[0], sh.pos[2])) continue;
      sh.evictFrom = [l.pos[0], l.pos[2]];
      sh.evictTicks = EVICT_MAX_TICKS;
    }
  }
  s.safeZoneLanternIds = lit.map((l) => l.id);
}

/**
 * Tick step 8 for an evicting shade: move straight to the zone exit at max(shade speed, remaining / ticks left),
 * so it is out within EVICT_MAX_TICKS moves; then the flag clears. Its visible state is untouched.
 */
export function evictStep(s: GameState, sh: Shade): void {
  if (!sh.evictFrom) return;
  const cfg = getNight(s.night);
  const [tx, tz] = exitPoint(s, cfg, sh, sh.evictFrom[0], sh.evictFrom[1]);
  const rem = Math.hypot(tx - sh.pos[0], tz - sh.pos[2]);
  const stepLen = Math.max(cfg.shadeSpeed / TICK_RATE, rem / Math.max(1, sh.evictTicks));
  if (stepLen >= rem) {
    sh.pos[0] = tx;
    sh.pos[2] = tz;
    sh.evictFrom = null;
    sh.evictTicks = 0;
  } else {
    sh.pos[0] += ((tx - sh.pos[0]) / rem) * stepLen;
    sh.pos[2] += ((tz - sh.pos[2]) / rem) * stepLen;
  }
  settleShadeY(cfg, sh);
}

/**
 * Keep a (non-evicting) shade out of lit safe zones after it moved from (prevX, prevZ). Radial projection onto
 * the circle; if that spot is not standable (island edge, wall) the shade goes back to its previous spot when
 * that was outside every zone, else to the nearest standable spot on the circle (finding: a shade is never
 * inside a lit zone unless evicting). Returns true when the zone edge stopped the shade.
 */
export function keepOutOfSafeZones(s: GameState, sh: Shade, prevX: number, prevZ: number): boolean {
  const lit = litLanterns(s);
  const [x0, , z0] = sh.pos;
  let x = x0;
  let z = z0;
  let first: Lantern | null = null;
  for (let pass = 0; pass < 3; pass++) {
    for (const l of lit) {
      if (!insideZone(l.pos[0], l.pos[2], x, z)) continue;
      first ??= l;
      const [ux, uz] = unitXZ(l.pos[0], l.pos[2], x, z);
      x = l.pos[0] + ux * TUNING.safe_radius;
      z = l.pos[2] + uz * TUNING.safe_radius;
    }
  }
  if (!first) return false;
  const cfg = getNight(s.night);
  let spot: XZ | null = null;
  if (isFreeSpot(s, cfg, sh, x, z)) spot = [x, z];
  else if (!lit.some((l) => insideZone(l.pos[0], l.pos[2], prevX, prevZ))) spot = [prevX, prevZ];
  else spot = nearestFreeSpotOnCircle(s, cfg, sh, first.pos[0], first.pos[2], x0, z0) ?? [prevX, prevZ];
  sh.pos[0] = spot[0];
  sh.pos[2] = spot[1];
  settleShadeY(cfg, sh);
  return true;
}
