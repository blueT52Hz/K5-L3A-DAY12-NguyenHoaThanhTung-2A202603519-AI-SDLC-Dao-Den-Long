import { TICK_RATE } from '../constants';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, InputFrame, XZ } from '../types';
import type { ButtonEdges } from './pause-control';
import { worldMoveDir } from './player-movement';

/** Dash length / cooldown in ticks, derived from tuning seconds. */
export const dashDurationTicks = (): number => Math.round(TUNING.dash_duration_s * TICK_RATE);
export const dashCooldownTicksTotal = (): number => Math.round(TUNING.dash_cooldown_s * TICK_RATE);

/**
 * Tick step 3 (start): a dash edge starts a dash when none is running, the cooldown is 0 (or a wind charm is active)
 * and the player is not waiting to respawn. Direction = current move input, else facing. No cooldown with a charm.
 */
export function startDashIfRequested(s: GameState, input: InputFrame, edges: ButtonEdges, events: GameEvent[]): void {
  const p = s.player;
  if (!edges.dash || p.respawnTicks > 0 || p.dashTicks > 0) return;
  if (p.dashCooldownTicks > 0 && p.charmTicks === 0) return;
  const [mx, mz] = worldMoveDir(input);
  const len = Math.hypot(mx, mz);
  p.dashDir = len > 0 ? [mx / len, mz / len] : [p.facing[0], p.facing[1]];
  p.dashTicks = dashDurationTicks();
  if (p.charmTicks === 0) p.dashCooldownTicks = dashCooldownTicksTotal();
  events.push({ tick: s.tick, name: 'dash', data: {} });
}

/** Horizontal velocity (m/s) while dashing. */
export function dashVelocity(s: GameState): XZ {
  const [dx, dz] = s.player.dashDir;
  return [dx * TUNING.dash_speed, dz * TUNING.dash_speed];
}
