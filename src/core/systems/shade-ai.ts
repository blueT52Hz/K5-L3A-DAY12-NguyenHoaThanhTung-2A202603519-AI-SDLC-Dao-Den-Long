import {
  HEADING_CHANGE_TICKS, PULSE_PUSH_TICKS, RECOIL_DIST, RECOIL_MOVE_TICKS, RECOIL_TICKS, SHADE_DETECT, SHADE_GIVE_UP, SHADE_WANDER_FACTOR, TICK_RATE,
} from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import type { NightConfig } from '../nights/night-config-types';
import { nextRandom } from '../rng';
import { TUNING } from '../tuning';
import type { GameState, Shade } from '../types';
import { settleShadeY, shadeCanStand, walkShade } from './shade-movement-terrain';
import { drainStep, walkTowardLowFuelLantern } from './shade-drain-behavior';
import { evictStep, keepOutOfSafeZones } from './shade-zones';

/**
 * Tick step 2, after the counters were decremented: a timed state whose counter reached 0 ends.
 * spawning -> wander; stunned -> always wander and no wander->chase detection on that same tick (Phase 3); recoil -> chase if XZ to May <= SHADE_GIVE_UP, else wander.
 */
export function endTimedShadeState(s: GameState, sh: Shade): void {
  if (sh.stateTicks > 0) return;
  if (sh.state === 'spawning') sh.state = 'wander';
  else if (sh.state === 'stunned') { sh.state = 'wander'; sh.noDetectTick = s.tick; }
  else if (sh.state === 'recoil') {
    sh.state = distXZ(sh.pos, s.player.pos) <= SHADE_GIVE_UP ? 'chase' : 'wander';
  }
}

/** One pulse push step (pulse_push_m over PULSE_PUSH_TICKS); any obstacle stops the push for good. */
function pushStep(cfg: NightConfig, sh: Shade): void {
  const len = TUNING.pulse_push_m / PULSE_PUSH_TICKS;
  const x = sh.pos[0] + sh.pushDir[0] * len;
  const z = sh.pos[2] + sh.pushDir[1] * len;
  if (!shadeCanStand(cfg, sh, x, z)) { sh.pushTicks = 0; return; }
  sh.pos[0] = x;
  sh.pos[2] = z;
}

/** wander <-> chase switches by XZ distance to May, then the wander / chase walk for this tick. */
function wanderOrChase(s: GameState, cfg: NightConfig, sh: Shade): void {
  const p = s.player.pos;
  const d = distXZ(sh.pos, p);
  if (sh.state === 'wander' && d <= SHADE_DETECT && sh.noDetectTick !== s.tick) sh.state = 'chase';
  else if (sh.state === 'chase' && d > SHADE_GIVE_UP) sh.state = 'wander';
  const speed = cfg.shadeSpeed / TICK_RATE;
  if (sh.state === 'chase') {
    if (d === 0) return;
    const k = Math.min(speed, d) / d;
    walkShade(cfg, sh, (p[0] - sh.pos[0]) * k, (p[2] - sh.pos[2]) * k);
    return;
  }
  // wander: drift toward the nearest low-fuel lantern (no RNG), or start draining it when in range.
  if (walkTowardLowFuelLantern(s, cfg, sh)) return;
  // wander: new random heading every HEADING_CHANGE_TICKS, half speed.
  if (sh.headingTicks === 0) {
    const a = nextRandom(s) * Math.PI * 2;
    sh.heading = [Math.cos(a), Math.sin(a)];
    sh.headingTicks = HEADING_CHANGE_TICKS;
  }
  const w = speed * SHADE_WANDER_FACTOR;
  walkShade(cfg, sh, sh.heading[0] * w, sh.heading[1] * w);
}

/**
 * Tick step 8 (spec 6.4-6.6): evicting shades leave the zone first; otherwise a pending pulse push, or the
 * state's own motion (spawning / stunned stand still, recoil backs off along pushDir). Every non-evicting shade
 * is then kept out of lit safe zones; touching a zone edge ends a push.
 */
export function moveShades(s: GameState): void {
  const cfg = getNight(s.night);
  for (const sh of s.shades) {
    if (sh.evictFrom) { evictStep(s, sh); continue; }
    const prevX = sh.pos[0];
    const prevZ = sh.pos[2];
    const pushing = sh.pushTicks > 0;
    if (pushing) pushStep(cfg, sh);
    else if (sh.state === 'drain') { if (drainStep(s, sh)) wanderOrChase(s, cfg, sh); }
    else if (sh.state === 'wander' || sh.state === 'chase') wanderOrChase(s, cfg, sh);
    else if (sh.state === 'recoil') {
      const r = RECOIL_DIST / RECOIL_MOVE_TICKS;
      walkShade(cfg, sh, sh.pushDir[0] * r, sh.pushDir[1] * r);
    }
    settleShadeY(cfg, sh);
    if (keepOutOfSafeZones(s, sh, prevX, prevZ) && pushing) sh.pushTicks = 0;
  }
}
