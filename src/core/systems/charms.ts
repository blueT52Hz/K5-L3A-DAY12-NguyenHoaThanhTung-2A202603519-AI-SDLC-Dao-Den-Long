import { CHARM_RESPAWN_TICKS, CHARM_TICKS, HEIGHT_TOLERANCE } from '../constants';
import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/**
 * Tick step 4 (spec 7.2): pick up an available wind charm with the same reach rule as motes (no capacity needed).
 * Starts / refreshes charmTicks and the charm's respawn countdown (ticked in timers).
 */
export function pickupCharms(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.respawnTicks > 0) return;
  for (const c of s.charms) {
    if (!c.available || c.respawnTicks > 0) continue;
    if (distXZ(p.pos, c.pos) > TUNING.pickup_radius || Math.abs(p.pos[1] - c.pos[1]) > HEIGHT_TOLERANCE) continue;
    c.available = false;
    c.respawnTicks = CHARM_RESPAWN_TICKS;
    p.charmTicks = CHARM_TICKS;
    events.push({ tick: s.tick, name: 'charm_picked', data: { charm_id: c.id, charm_ticks: CHARM_TICKS } });
  }
}
