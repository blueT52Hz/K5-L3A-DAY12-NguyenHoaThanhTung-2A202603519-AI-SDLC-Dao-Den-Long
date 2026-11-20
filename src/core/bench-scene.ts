import { SHADE_Y } from './constants';
import { createGame } from './create-game';
import { distXZ } from './math-xz';
import { getNight } from './nights';
import { nextRandom } from './rng';
import { createShade } from './systems/shade-spawner';
import { groundBelow, isWall } from './terrain/terrain-queries';
import { TUNING } from './tuning';
import type { GameState, Vec3 } from './types';

/** Ticket phase 4, benchmark scene: exactly 200 wandering shades and 100 motes on Night 1. */
export const BENCH_SHADES = 200;
export const BENCH_MOTES = 100;
/** Night 1 is a disc of radius 40; points are drawn inside 38 m so nothing sits on the very edge. */
const SCATTER_RADIUS = 38;
const MAX_TRIES = 100000;

/** Uniform point (by area) on the island where something can stand; optionally outside lit safe zones. */
function scatterPoint(s: GameState, avoidSafeZones: boolean): Vec3 {
  const cfg = getNight(s.night);
  for (let i = 0; i < MAX_TRIES; i++) {
    const r = SCATTER_RADIUS * Math.sqrt(nextRandom(s));
    const a = nextRandom(s) * Math.PI * 2;
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    const y = groundBelow(cfg, x, z, 100);
    if (y === null || isWall(cfg, x, z, y)) continue;
    if (avoidSafeZones && s.lanterns.some((l) => l.lit && distXZ(l.pos, [x, y, z]) < TUNING.safe_radius)) continue;
    return [x, y, z];
  }
  throw new Error('bench scene: no standable point found');
}

/**
 * Benchmark state (not used by headless or the contract): Night 1, L1-L3 lit with fuel 100, May at (0,0,0)
 * standing still, wind / drifters / scheduled spawns off, 200 `wander` shades (outside safe zones) and
 * 100 motes scattered evenly over the island from the seeded game RNG. `bench=true` makes step() skip
 * hits, pickups, fuel use, spawns and the end of the night, and keeps shades wandering.
 */
export function createBenchGame(seed: number): GameState {
  const s = createGame(seed, {
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [0, 0, 0] },
    lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: TUNING.fuel_max })),
  }, 1);
  s.bench = true;
  for (let i = 1; i <= BENCH_SHADES; i++) {
    const [x, y, z] = scatterPoint(s, true);
    s.shades.push(createShade(`S${i}`, [x, y + SHADE_Y, z], 'wander', 0));
  }
  for (let i = 1; i <= BENCH_MOTES; i++) {
    s.motes.push({ id: `M${i}`, pos: scatterPoint(s, false), kind: 'random', ttlTicks: null }); // ground level like spawn points
  }
  s.nextShadeId = BENCH_SHADES + 1;
  s.nextMoteId = BENCH_MOTES + 1;
  return s;
}
