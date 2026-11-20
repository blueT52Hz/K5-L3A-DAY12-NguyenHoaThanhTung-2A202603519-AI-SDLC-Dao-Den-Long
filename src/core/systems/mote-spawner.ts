import { DROPPED_TTL_TICKS, MOTE_CAP, MOTE_INITIAL, MOTE_SPAWN_EVERY } from '../constants';
import { distXZ } from '../math-xz';
import { getNight } from '../nights';
import { nextRandom } from '../rng';
import type { GameState, Mote, Vec3 } from '../types';

/** XZ radius around a spawn point that must be free of motes for a scheduled spawn ([TQ] spec 6.3). */
const FREE_POINT_RADIUS = 1.0;

/**
 * Initial motes (spec 6.3): MOTE_INITIAL distinct points of cfg.moteSpawnPoints chosen by a partial
 * Fisher-Yates shuffle over point indices. Ids M1..M20. Always draws the same RNG count for a night,
 * so createGame calls it even when the scenario replaces the motes.
 */
export function pickInitialMotes(s: GameState): Mote[] {
  const points = getNight(s.night).moteSpawnPoints;
  const idx = points.map((_, i) => i);
  const count = Math.min(MOTE_INITIAL, idx.length);
  const out: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(nextRandom(s) * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
    out.push({ id: `M${i + 1}`, pos: [...points[idx[i]]] as Vec3, kind: 'random', ttlTicks: null });
  }
  return out;
}

/**
 * Tick step 10: at simTick 240, 480, ... spawn one random mote at a random free spawn point if fewer
 * than MOTE_CAP motes (random + dropped) exist. No free point: skip this turn.
 */
export function spawnScheduledMote(s: GameState): void {
  if (!s.moteSpawnEnabled || s.simTick % MOTE_SPAWN_EVERY !== 0 || s.motes.length >= MOTE_CAP) return;
  const free = getNight(s.night).moteSpawnPoints.filter((p) => !s.motes.some((m) => distXZ(m.pos, p) <= FREE_POINT_RADIUS));
  if (free.length === 0) return;
  const p = free[Math.floor(nextRandom(s) * free.length)];
  s.motes.push({ id: `M${s.nextMoteId++}`, pos: [...p] as Vec3, kind: 'random', ttlTicks: null });
}

/** Add a dropped mote (ttl DROPPED_TTL_TICKS, removed by tickTimers) using the shared M-id counter. */
export function addDroppedMote(s: GameState, pos: Vec3): void {
  s.motes.push({ id: `M${s.nextMoteId++}`, pos: [...pos] as Vec3, kind: 'dropped', ttlTicks: DROPPED_TTL_TICKS });
}
