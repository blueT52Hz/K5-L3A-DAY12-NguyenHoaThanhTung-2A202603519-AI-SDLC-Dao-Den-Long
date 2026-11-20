import { SHADE_Y, TICK_RATE } from '../constants';
import { getNight } from '../nights';
import { distXZ } from '../math-xz';
import { nextRandom } from '../rng';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';
import { clampShade } from './shade-zones';
import { spawnDue } from './timers';

/** Sub-step 7: periodic spawn at radius 38 (capped at MAX_SHADES). */
export function spawnShade(s: GameState, events: GameEvent[]): void {
  if (!spawnDue(s) || s.shades.length >= getNight(s.night).maxShades) return;
  const a = nextRandom(s) * Math.PI * 2;
  const id = `S${s.nextShadeId++}`;
  s.shades.push({ id, pos: [38 * Math.sin(a), SHADE_Y, 38 * Math.cos(a)], state: 'chase', stateTicks: 0,
    pushTicks: 0, pushDir: [0, 0], heading: [0, 0], headingTicks: 0, evictTicks: 0, evictFrom: null });
  events.push({ tick: s.tick, name: 'shade_spawned', data: { id } });
}

/** Sub-step 8: non-stunned shades step toward the player, then get clamped. */
export function moveShades(s: GameState): void {
  const step = TUNING.shade_speed / TICK_RATE;
  const p = s.player.pos;
  for (const sh of s.shades) {
    if (sh.state === 'stunned') continue;
    const prevX = sh.pos[0];
    const prevZ = sh.pos[2];
    const d = distXZ(sh.pos, p);
    if (d > 0) {
      const k = Math.min(step, d) / d;
      sh.pos[0] += (p[0] - sh.pos[0]) * k;
      sh.pos[2] += (p[2] - sh.pos[2]) * k;
    }
    clampShade(s, sh.pos, prevX, prevZ);
  }
}
