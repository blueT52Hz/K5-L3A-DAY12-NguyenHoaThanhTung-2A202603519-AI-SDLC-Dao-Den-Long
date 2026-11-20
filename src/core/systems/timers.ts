import type { GameState } from '../types';
import { respawnPlayer } from './player-fall-respawn';
import { endTimedShadeState } from './shade-ai';

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
  const waitingRespawn = p.respawnTicks > 0;
  p.respawnTicks = dec(p.respawnTicks);
  if (waitingRespawn && p.respawnTicks === 0) respawnPlayer(s);

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
    endTimedShadeState(s, sh); // spawning / stunned / recoil end on the tick their counter reaches 0
  }

  for (const d of s.drifters) {
    const wasTiming = d.stateTicks > 0;
    d.stateTicks = dec(d.stateTicks);
    // Fleeing (flight or post-drop vanish) ends as `removed` on the tick its counter reaches 0.
    if (wasTiming && d.stateTicks === 0 && d.state === 'flee') d.state = 'removed';
    d.headingTicks = dec(d.headingTicks);
  }
}
