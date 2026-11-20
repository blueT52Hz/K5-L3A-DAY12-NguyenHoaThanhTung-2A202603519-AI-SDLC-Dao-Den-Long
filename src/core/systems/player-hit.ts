import { TICK_RATE } from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import { groundBelow } from '../terrain/terrain-queries';
import { nextRandom } from '../rng';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Vec3 } from '../types';
import { addDroppedMote } from './mote-spawner';

/** Tick step 9: first non-stunned shade (by id order) in hit radius hurts the player. Losing is decided at step 11. */
export function checkHit(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.invulnTicks > 0) return;
  const hitter = s.shades.find((sh) => sh.state !== 'stunned' && distXZ(sh.pos, p.pos) <= TUNING.shade_hit_radius);
  if (!hitter) return;
  p.flames -= 1;
  const dropped = Math.floor(p.carried * TUNING.hit_drop_ratio);
  p.carried -= dropped;
  for (let i = 0; i < dropped; i++) {
    const r = 2.5 + nextRandom(s) * 1.5;
    const a = nextRandom(s) * Math.PI * 2;
    let pos: Vec3 = [p.pos[0] + r * Math.sin(a), 0, p.pos[2] + r * Math.cos(a)];
    // Interim: a drop point over void falls back to the player's own spot.
    if (groundBelow(getNight(s.night), pos[0], pos[2], 0) === null) pos = [p.pos[0], 0, p.pos[2]];
    addDroppedMote(s, pos);
  }
  p.invulnTicks = Math.round(TUNING.invuln_s * TICK_RATE);
  events.push({ tick: s.tick, name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
}
