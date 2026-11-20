import { TICK_RATE } from '../constants';
import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';
import { clampShade } from './shade-zones';

/** Sub-step 5: pulse on button edge. Needs cooldown 0 and enough carried motes, else ignored silently. */
export function usePulse(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.pulseCooldownTicks > 0 || p.carried < TUNING.pulse_cost) return;
  p.carried -= TUNING.pulse_cost;
  const ids: string[] = [];
  for (const sh of s.shades) {
    const d = distXZ(p.pos, sh.pos);
    if (d > TUNING.pulse_radius) continue;
    const dx = d === 0 ? 1 : (sh.pos[0] - p.pos[0]) / d;
    const dz = d === 0 ? 0 : (sh.pos[2] - p.pos[2]) / d;
    const prevX = sh.pos[0];
    const prevZ = sh.pos[2];
    sh.pos[0] += dx * TUNING.pulse_push_m;
    sh.pos[2] += dz * TUNING.pulse_push_m;
    clampShade(s, sh.pos, prevX, prevZ);
    sh.state = 'stunned';
    sh.stateTicks = Math.round(TUNING.pulse_stun_s * TICK_RATE);
    ids.push(sh.id);
    s.score += TUNING.score.per_stun;
  }
  p.pulseCooldownTicks = Math.round(TUNING.pulse_cooldown_s * TICK_RATE);
  events.push({ tick: s.tick, name: 'pulse', data: { stunned_ids: ids } });
}
