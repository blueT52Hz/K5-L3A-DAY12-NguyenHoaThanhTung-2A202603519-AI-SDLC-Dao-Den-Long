import { TICK_RATE } from '../constants';
import { clampToIsland, distXZ } from '../math-xz';
import { nextRandom } from '../rng';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/** Sub-step 9: first non-stunned shade (by id order) in hit radius hurts the player. Returns true if flames ran out. */
export function checkHit(s: GameState, events: GameEvent[]): boolean {
  const p = s.player;
  if (p.invulnTicks > 0) return false;
  const hitter = s.shades.find((sh) => sh.state !== 'stunned' && distXZ(sh.pos, p.pos) <= TUNING.shade_hit_radius);
  if (!hitter) return false;
  p.flames -= 1;
  const dropped = Math.floor(p.carried * TUNING.hit_drop_ratio);
  p.carried -= dropped;
  for (let i = 0; i < dropped; i++) {
    const r = 2.5 + nextRandom(s) * 1.5;
    const a = nextRandom(s) * Math.PI * 2;
    const pos = clampToIsland([p.pos[0] + r * Math.sin(a), 0, p.pos[2] + r * Math.cos(a)]);
    s.motes.push({ id: `M${s.nextMoteId++}`, pos });
  }
  p.invulnTicks = Math.round(TUNING.invuln_s * TICK_RATE);
  events.push({ tick: s.tick, name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
  return p.flames <= 0;
}
