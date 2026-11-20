import { FALL_Y, RESPAWN_INVULN_TICKS, RESPAWN_WAIT_TICKS } from '../constants';
import { getNight } from '../nights';
import type { GameEvent, GameState, Vec3, XZ } from '../types';

/**
 * Tick step 3 (right after movement): falling below FALL_Y happens once and ignores invulnerability:
 * flames -1, all carried motes are lost (not dropped). With flames left, wait RESPAWN_WAIT_TICKS; with none,
 * resolveEndOfTick ends the game (no respawn).
 */
export function checkFall(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.pos[1] >= FALL_Y || p.respawnTicks > 0) return;
  p.flames -= 1;
  const lost = p.carried;
  p.carried = 0;
  events.push({ tick: s.tick, name: 'player_hit', data: { by: 'fall', flames: p.flames, dropped: 0, lost } });
  if (p.flames > 0) p.respawnTicks = RESPAWN_WAIT_TICKS;
}

/** Tick step 2, on the tick respawnTicks reaches 0: back to the night start, standing, with respawn invulnerability. */
export function respawnPlayer(s: GameState): void {
  const p = s.player;
  const cfg = getNight(s.night);
  p.pos = [...cfg.start] as Vec3;
  p.vel = [0, 0, 0];
  p.vy = 0;
  p.grounded = true;
  p.facing = [...cfg.startFacing] as XZ;
  p.launchVel = null;
  p.invulnTicks = RESPAWN_INVULN_TICKS;
}
