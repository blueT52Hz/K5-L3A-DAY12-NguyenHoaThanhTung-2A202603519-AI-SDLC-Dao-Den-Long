import { getNight } from '../nights';
import type { GameState } from '../types';

/** Decrement a counter, never below 0. */
const dec = (n: number): number => (n > 0 ? n - 1 : 0);

/**
 * Tick step 2: decrement every counter first, so a counter set to N at tick k is back at 0 (usable / expired)
 * at tick k+N. Timed states change here on the tick their counter reaches 0.
 */
export function tickTimers(s: GameState): void {
  const p = s.player;
  p.invulnTicks = dec(p.invulnTicks);
  p.pulseCooldownTicks = dec(p.pulseCooldownTicks);
  p.dashTicks = dec(p.dashTicks);
  p.dashCooldownTicks = dec(p.dashCooldownTicks);
  p.charmTicks = dec(p.charmTicks);
  p.respawnTicks = dec(p.respawnTicks);

  // Dropped motes expire when their ttl reaches 0; random motes have ttl null.
  s.motes = s.motes.filter((m) => {
    if (m.ttlTicks === null) return true;
    m.ttlTicks = dec(m.ttlTicks);
    return m.ttlTicks > 0;
  });

  for (const c of s.charms) {
    if (c.respawnTicks > 0) {
      c.respawnTicks -= 1;
      if (c.respawnTicks === 0) c.available = true;
    }
  }

  for (const sh of s.shades) {
    sh.stateTicks = dec(sh.stateTicks);
    sh.pushTicks = dec(sh.pushTicks);
    sh.headingTicks = dec(sh.headingTicks);
    sh.evictTicks = dec(sh.evictTicks);
    // Interim Phase 1 transition (Task 5 adds the full state machine).
    if (sh.state === 'stunned' && sh.stateTicks === 0) sh.state = 'chase';
  }

  for (const d of s.drifters) {
    d.stateTicks = dec(d.stateTicks);
    d.headingTicks = dec(d.headingTicks);
  }

  // Interim Phase 1 shade spawner countdown (Task 5 replaces it with the simTick schedule).
  if (s.spawnEnabled && s.spawnTicks > 0) s.spawnTicks -= 1;
}

/** Interim: true (and timer reset) when the periodic Phase 1 shade spawn is due. */
export function spawnDue(s: GameState): boolean {
  if (!s.spawnEnabled || s.spawnTicks > 0) return false;
  s.spawnTicks = getNight(s.night).shadeIntervalTicks;
  return true;
}
