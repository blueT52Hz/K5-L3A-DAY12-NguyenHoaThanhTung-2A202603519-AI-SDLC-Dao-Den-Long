import { getNight } from '../nights';
import type { GameState } from '../types';

/** Sub-step 0: decrement counters first so a counter set at step k lasts exactly its tick count. */
export function tickTimers(s: GameState): void {
  const p = s.player;
  if (p.invulnTicks > 0) p.invulnTicks -= 1;
  if (p.pulseCooldownTicks > 0) p.pulseCooldownTicks -= 1;
  for (const sh of s.shades) {
    if (sh.stateTicks > 0) sh.stateTicks -= 1;
    if (sh.state === 'stunned' && sh.stateTicks === 0) sh.state = 'chase';
  }
  if (s.spawnEnabled && s.spawnTicks > 0) s.spawnTicks -= 1;
}

/** True (and timer reset) when the periodic spawn is due. */
export function spawnDue(s: GameState): boolean {
  if (!s.spawnEnabled || s.spawnTicks > 0) return false;
  s.spawnTicks = getNight(s.night).shadeIntervalTicks;
  return true;
}
