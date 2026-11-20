import { DROP_RING_MAX, DROP_RING_MIN, HEIGHT_TOLERANCE, RECOIL_TICKS, TICK_RATE } from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import { nextRandom } from '../rng';
import { groundBelow } from '../terrain/terrain-queries';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Vec3 } from '../types';
import { addDroppedMote } from './mote-spawner';
import { compareShadeIds } from './shade-id-order';
import { shadeFootY, unitXZ } from './shade-movement-terrain';

/**
 * Where one dropped mote lands: ring DROP_RING_MIN..DROP_RING_MAX around May (angle, then radius, from
 * nextRandom), Y = ground there searched from May's feet. No ground there: May's XZ at her ground Y ([TQ] 6.6).
 */
function dropPoint(s: GameState): Vec3 {
  const cfg = getNight(s.night);
  const [px, py, pz] = s.player.pos;
  const a = nextRandom(s) * Math.PI * 2;
  const r = DROP_RING_MIN + nextRandom(s) * (DROP_RING_MAX - DROP_RING_MIN);
  const x = px + r * Math.cos(a);
  const z = pz + r * Math.sin(a);
  const g = groundBelow(cfg, x, z, py);
  if (g !== null) return [x, g, z];
  return [px, groundBelow(cfg, px, pz, py) ?? py, pz];
}

/**
 * Tick step 9 (spec 6.6): at most one hit per tick, by the lowest-id shade in wander / chase, not evicting, with
 * XZ <= shade_hit_radius and |May's feet - ground under the shade| <= HEIGHT_TOLERANCE. Nothing happens while
 * May is invulnerable or waiting to respawn. Hit: flames -1, floor(carried * hit_drop_ratio) motes dropped,
 * invulnerability, the shade recoils away from May. Losing is decided at step 11.
 */
export function checkHit(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.respawnTicks > 0 || p.invulnTicks > 0) return;
  const hitter = s.shades
    .filter((sh) => (sh.state === 'wander' || sh.state === 'chase') && sh.evictFrom === null
      && distXZ(sh.pos, p.pos) <= TUNING.shade_hit_radius && Math.abs(p.pos[1] - shadeFootY(sh)) <= HEIGHT_TOLERANCE)
    .sort(compareShadeIds)[0];
  if (!hitter) return;
  p.flames -= 1;
  const dropped = Math.floor(p.carried * TUNING.hit_drop_ratio);
  p.carried -= dropped;
  for (let i = 0; i < dropped; i++) addDroppedMote(s, dropPoint(s));
  p.invulnTicks = Math.round(TUNING.invuln_s * TICK_RATE);
  hitter.state = 'recoil';
  hitter.stateTicks = RECOIL_TICKS;
  hitter.pushTicks = 0;
  hitter.pushDir = unitXZ(p.pos[0], p.pos[2], hitter.pos[0], hitter.pos[2]);
  events.push({ tick: s.tick, name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
}
