import { HEIGHT_TOLERANCE } from '../constants';
import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/**
 * Tick step 4 (spec 6.3): pick up motes with XZ <= pickup_radius and |foot Y - mote ground Y| <= HEIGHT_TOLERANCE,
 * in id order while below capacity. Not while waiting to respawn. Score is added at deposit, not here.
 */
export function pickupMotes(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.respawnTicks > 0) return;
  const kept = [];
  for (const m of s.motes) {
    const inReach = distXZ(p.pos, m.pos) <= TUNING.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= HEIGHT_TOLERANCE;
    if (p.carried < TUNING.carry_capacity && inReach) {
      p.carried += 1;
      events.push({ tick: s.tick, name: 'mote_picked', data: { carried: p.carried } });
    } else kept.push(m);
  }
  s.motes = kept;
}
