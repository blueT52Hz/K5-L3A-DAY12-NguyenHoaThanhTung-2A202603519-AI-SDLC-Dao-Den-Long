import { SHADE_FIRST_SPAWN_COUNT, SHADE_FIRST_SPAWN_TICK, SHADE_SPAWN_MIN_DIST, SHADE_SPAWNING_TICKS, SHADE_Y } from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import { nextRandom } from '../rng';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Shade, Vec3 } from '../types';
import { hasSafeZone } from './lantern-fuel';

/** A fresh shade record (no push, heading, or eviction pending). */
export function createShade(id: string, pos: Vec3, state: Shade['state'], stateTicks: number): Shade {
  return { id, pos, state, stateTicks, pushTicks: 0, pushDir: [0, 0], heading: [0, 0], headingTicks: 0, evictTicks: 0, evictFrom: null, targetLanternId: null, drainTicks: 0, noDetectTick: -1 };
}

/** How many shades the schedule wants at this simTick: 2 at 300, then 1 at 300 + interval * k (spec 6.6). */
function scheduledCount(simTick: number, interval: number): number {
  if (simTick === SHADE_FIRST_SPAWN_TICK) return SHADE_FIRST_SPAWN_COUNT;
  return simTick > SHADE_FIRST_SPAWN_TICK && (simTick - SHADE_FIRST_SPAWN_TICK) % interval === 0 ? 1 : 0;
}

/**
 * Tick step 10: scheduled spawns while fewer than maxShades exist. Valid point = a shadeSpawnPoint with
 * XZ >= SHADE_SPAWN_MIN_DIST from May, outside every lit safe zone, not already used this tick; drawn with
 * nextRandom. No valid point: the turn is skipped. New shades start `spawning` (SHADE_SPAWNING_TICKS).
 */
export function spawnShades(s: GameState, events: GameEvent[]): void {
  if (!s.shadeSpawnEnabled) return;
  const cfg = getNight(s.night);
  const count = scheduledCount(s.simTick, cfg.shadeIntervalTicks);
  const used = new Set<Vec3>();
  for (let i = 0; i < count && s.shades.length < cfg.maxShades; i++) {
    const valid = cfg.shadeSpawnPoints.filter((pt) => !used.has(pt)
      && distXZ(pt, s.player.pos) >= SHADE_SPAWN_MIN_DIST
      && !s.lanterns.some((l) => hasSafeZone(l) && distXZ(pt, l.pos) < TUNING.safe_radius));
    if (valid.length === 0) return;
    const pt = valid[Math.floor(nextRandom(s) * valid.length)];
    used.add(pt);
    const id = `S${s.nextShadeId++}`;
    s.shades.push(createShade(id, [pt[0], pt[1] + SHADE_Y, pt[2]], 'spawning', SHADE_SPAWNING_TICKS));
    events.push({ tick: s.tick, name: 'shade_spawned', data: { id } });
  }
}
