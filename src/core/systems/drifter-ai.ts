import {
  DRIFTER_CHASE_MIN_CARRIED, DRIFTER_DETECT, DRIFTER_DROP_VANISH_TICKS, DRIFTER_FLEE_TICKS, DRIFTER_IDLE_SPEED, DRIFTER_MAX,
  DRIFTER_SPAWN_EVERY, DRIFTER_SPEED, DRIFTER_STEAL_MAX, DRIFTER_TOUCH, DRIFTER_Y, HEADING_CHANGE_TICKS, TICK_RATE,
} from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import { nextRandom } from '../rng';
import { groundBelow } from '../terrain/terrain-queries';
import { TUNING } from '../tuning';
import type { Drifter, GameEvent, GameState, Vec3 } from '../types';
import { addDroppedMote } from './mote-spawner';

/** Drifters that still interact (everything but `removed`). */
const alive = (s: GameState): Drifter[] => s.drifters.filter((d) => d.state !== 'removed');

/** Unit XZ vector from (fx,fz) towards (tx,tz); coincident points give +X. */
function unitXZ(fx: number, fz: number, tx: number, tz: number): [number, number] {
  const len = Math.hypot(tx - fx, tz - fz);
  return len === 0 ? [1, 0] : [(tx - fx) / len, (tz - fz) / len];
}

/** Move a drifter along XZ by (dx,dz); drifters fly, so no terrain or safe-zone blocking. Y stays DRIFTER_Y. */
function fly(d: Drifter, dx: number, dz: number): void {
  d.pos = [d.pos[0] + dx, DRIFTER_Y, d.pos[2] + dz];
}

/** May carries enough and is within detect range (checked every tick; never applies to fled drifters). */
const seesLoot = (s: GameState, d: Drifter): boolean =>
  s.player.carried >= DRIFTER_CHASE_MIN_CARRIED && distXZ(d.pos, s.player.pos) <= DRIFTER_DETECT;

/**
 * Tick step 8 (spec 7.1): idle -> chase switch, then motion.
 * idle: 2 m/s along a heading redrawn from RNG every HEADING_CHANGE_TICKS; chase: 7 m/s straight at May
 * (never overshooting); flee: 7 m/s away from May.
 */
export function moveDrifters(s: GameState): void {
  const p = s.player;
  for (const d of alive(s)) {
    if (d.state === 'idle' && seesLoot(s, d)) d.state = 'chase';
    if (d.state === 'chase') {
      const step = Math.min(DRIFTER_SPEED / TICK_RATE, distXZ(d.pos, p.pos));
      const [ux, uz] = unitXZ(d.pos[0], d.pos[2], p.pos[0], p.pos[2]);
      fly(d, ux * step, uz * step);
    } else if (d.state === 'flee') {
      const [ux, uz] = unitXZ(p.pos[0], p.pos[2], d.pos[0], d.pos[2]);
      const v = DRIFTER_SPEED / TICK_RATE;
      fly(d, ux * v, uz * v);
    } else {
      if (d.headingTicks === 0) {
        const a = nextRandom(s) * Math.PI * 2;
        d.heading = [Math.cos(a), Math.sin(a)];
        d.headingTicks = HEADING_CHANGE_TICKS;
      }
      const v = DRIFTER_IDLE_SPEED / TICK_RATE;
      fly(d, d.heading[0] * v, d.heading[1] * v);
    }
  }
}

/**
 * Tick step 9, before shade hits: a chasing drifter within DRIFTER_TOUCH (XZ) takes min(3, carried), then flees.
 * Invulnerability does not stop it; waiting to respawn does. Each drifter steals at most once (it never chases again).
 */
export function drifterSteal(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  for (const d of alive(s)) {
    if (p.respawnTicks > 0) break;
    if (d.state !== 'chase' || distXZ(d.pos, p.pos) > DRIFTER_TOUCH) continue;
    const amount = Math.min(DRIFTER_STEAL_MAX, p.carried);
    if (amount <= 0) continue;
    p.carried -= amount;
    d.stolen = amount;
    d.state = 'flee';
    d.stateTicks = DRIFTER_FLEE_TICKS;
    events.push({ tick: s.tick, name: 'drifter_steal', data: { drifter_id: d.id, amount, carried: p.carried } });
  }
  // A chaser whose condition is gone goes back to idle (after stealing, so a touch always counts).
  for (const d of alive(s)) if (d.state === 'chase' && !seesLoot(s, d)) d.state = 'idle';
}

/**
 * Tick step 10: at simTick 1200, 2400, ... spawn one idle drifter (id D1, D2, ...) at a random shade spawn point
 * while fewer than DRIFTER_MAX non-removed drifters exist. Night without drifters or disabled spawning: nothing.
 */
export function spawnDrifters(s: GameState, _events: GameEvent[]): void {
  const cfg = getNight(s.night);
  if (!cfg.drifters || !s.drifterSpawnEnabled || s.simTick === 0 || s.simTick % DRIFTER_SPAWN_EVERY !== 0) return;
  if (alive(s).length >= DRIFTER_MAX || cfg.shadeSpawnPoints.length === 0) return;
  const pts = cfg.shadeSpawnPoints;
  const pt = pts[Math.min(pts.length - 1, Math.floor(nextRandom(s) * pts.length))];
  s.drifters.push({
    id: `D${s.nextDrifterId++}`, pos: [pt[0], DRIFTER_Y, pt[2]], state: 'idle', stolen: 0, stateTicks: 0,
    heading: [1, 0], headingTicks: 0,
  });
}

/** Where a dropped mote lands: ground under the drifter's XZ; no ground there: May's XZ at her ground Y ([TQ] 7.1). */
function dropPoint(s: GameState, d: Drifter): Vec3 {
  const cfg = getNight(s.night);
  const [px, py, pz] = s.player.pos;
  const g = groundBelow(cfg, d.pos[0], d.pos[2], py);
  if (g !== null) return [d.pos[0], g, d.pos[2]];
  return [px, groundBelow(cfg, px, pz, py) ?? py, pz];
}

/**
 * Tick step 7 hook (called by usePulse): drifters within 3D pulse_radius of the pulse center.
 * chase -> flee with nothing stolen; fleeing with loot drops it all as dropped motes and vanishes after
 * DRIFTER_DROP_VANISH_TICKS; idle and empty-handed fleeing drifters are unaffected.
 */
export function pulseDrifters(s: GameState, center: Vec3, events: GameEvent[]): void {
  for (const d of alive(s)) {
    const dist = Math.hypot(d.pos[0] - center[0], d.pos[1] - center[1], d.pos[2] - center[2]);
    if (dist > TUNING.pulse_radius) continue;
    if (d.state === 'chase') {
      d.state = 'flee';
      d.stolen = 0;
      d.stateTicks = DRIFTER_FLEE_TICKS;
    } else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen;
      for (let i = 0; i < amount; i++) addDroppedMote(s, dropPoint(s, d));
      d.stolen = 0;
      d.stateTicks = DRIFTER_DROP_VANISH_TICKS;
      events.push({ tick: s.tick, name: 'drifter_drop', data: { drifter_id: d.id, amount } });
    }
  }
}
