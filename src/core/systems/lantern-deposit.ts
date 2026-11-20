import { HEIGHT_TOLERANCE } from '../constants';
import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Lantern } from '../types';

/**
 * Tick step 5 (spec 6.4): on interact edge, deposit into the nearest unlit lantern with XZ <= interact_radius
 * and |foot Y - lantern Y| <= HEIGHT_TOLERANCE (ties: lower id). Scores per_mote per deposited mote and
 * per_lantern when it lights.
 */
export function depositToLantern(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  let best: Lantern | null = null;
  let bestD = Infinity;
  for (const l of s.lanterns) {
    if (l.lit || Math.abs(p.pos[1] - l.pos[1]) > HEIGHT_TOLERANCE) continue;
    const d = distXZ(p.pos, l.pos);
    if (d <= TUNING.interact_radius && d < bestD) { best = l; bestD = d; }
  }
  if (!best) return;
  const amount = Math.min(p.carried, TUNING.lantern_cost - best.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  best.deposited += amount;
  s.score += TUNING.score.per_mote * amount;
  events.push({ tick: s.tick, name: 'deposit', data: { lantern_id: best.id, amount, deposited: best.deposited } });
  if (best.deposited >= TUNING.lantern_cost) {
    best.lit = true;
    s.score += TUNING.score.per_lantern;
    events.push({ tick: s.tick, name: 'lantern_lit', data: { lantern_id: best.id } });
  }
}
