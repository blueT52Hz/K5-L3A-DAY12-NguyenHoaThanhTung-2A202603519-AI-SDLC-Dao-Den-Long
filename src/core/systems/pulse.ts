import { PULSE_CENTER_DY, PULSE_PUSH_TICKS, TICK_RATE } from '../constants';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Vec3 } from '../types';
import { pulseDrifters } from './drifter-ai';
import { compareShadeIds } from './shade-id-order';
import { unitXZ } from './shade-movement-terrain';

/**
 * Tick step 7 (spec 6.5): pulse on button edge; needs cooldown 0 and carried >= pulse_cost, else ignored silently.
 * Center = May's feet + PULSE_CENTER_DY. Every shade (any state) whose body center (ground + SHADE_Y) is within
 * pulse_radius in 3D is stunned for pulse_stun_s (refreshed if already stunned) and, unless it is still spawning,
 * gets a PULSE_PUSH_TICKS horizontal push away from the center (+X when the XZ coincide), applied in step 8.
 * +per_stun each. Event `pulse {stunned_ids}` lists shade ids in id order.
 */
export function usePulse(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.pulseCooldownTicks > 0 || p.carried < TUNING.pulse_cost) return;
  p.carried -= TUNING.pulse_cost;
  const center: Vec3 = [p.pos[0], p.pos[1] + PULSE_CENTER_DY, p.pos[2]];
  const hit = s.shades.filter((sh) =>
    Math.hypot(sh.pos[0] - center[0], sh.pos[1] - center[1], sh.pos[2] - center[2]) <= TUNING.pulse_radius);
  for (const sh of hit) {
    if (sh.state !== 'spawning') {
      sh.pushTicks = PULSE_PUSH_TICKS;
      sh.pushDir = unitXZ(center[0], center[2], sh.pos[0], sh.pos[2]);
    }
    const wasDrain = sh.state === 'drain';
    sh.state = 'stunned';
    sh.targetLanternId = null;
    sh.drainTicks = 0;
    sh.stateTicks = Math.round(TUNING.pulse_stun_s * TICK_RATE);
    s.score += wasDrain ? TUNING.score.per_stun_drain : TUNING.score.per_stun;
  }
  pulseDrifters(s, center, events);
  p.pulseCooldownTicks = Math.round(TUNING.pulse_cooldown_s * TICK_RATE);
  events.push({ tick: s.tick, name: 'pulse', data: { stunned_ids: [...hit].sort(compareShadeIds).map((sh) => sh.id) } });
}
