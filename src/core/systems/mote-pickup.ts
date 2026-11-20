import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/** Sub-step 3: pick up motes within pickup_radius in id order while below capacity. */
export function pickupMotes(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  const kept = [];
  for (const m of s.motes) {
    if (p.carried < TUNING.carry_capacity && distXZ(p.pos, m.pos) <= TUNING.pickup_radius) {
      p.carried += 1;
      s.score += TUNING.score.per_mote;
      events.push({ tick: s.tick, name: 'mote_picked', data: { carried: p.carried } });
    } else kept.push(m);
  }
  s.motes = kept;
}
