import type { NightConfig } from '../../core/nights';

/** Night 1 island outer radius (gameplay disc). */
export const ISLAND_R = 40;
/** Radius where grass turns into the sloping beach ring. */
export const BEACH_START_R = 36.2;
/** Visual drop of the beach at the outer rim (m below the gameplay plane). */
export const BEACH_DROP_M = 0.55;

const BUMP_UP = 0.24; // max visual rise above y=0
const BUMP_DOWN = 0.1; // max visual dip below y=0
const FLAT_INNER_M = 3; // fully flat within this distance of lanterns/start
const FLAT_OUTER_M = 5.5; // blend back to full noise by this distance

function smooth01(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Smooth layered sine noise in [-1, 1]; deterministic, no allocations. */
function sineNoise(x: number, z: number): number {
  const n =
    0.5 * Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.16 + 0.4) +
    0.3 * Math.sin((x + z) * 0.33 + 2.1) +
    0.2 * Math.cos((x - z) * 0.51 + 0.7);
  return Math.max(-1, Math.min(1, n));
}

/**
 * Visual-only terrain height for Night 1 (gameplay plane stays y=0).
 * Gentle bumps, flattened near lanterns/start, sloping down across the beach ring.
 */
export function createTerrainHeightAt(cfg: NightConfig): (x: number, z: number) => number {
  const flatPts: [number, number][] = [[cfg.start[0], cfg.start[2]], ...cfg.lanterns.map((l): [number, number] => [l.pos[0], l.pos[2]])];
  return (x: number, z: number): number => {
    let minD = Infinity;
    for (const p of flatPts) minD = Math.min(minD, Math.hypot(x - p[0], z - p[1]));
    const n = sineNoise(x, z);
    let h = (n > 0 ? n * BUMP_UP : n * BUMP_DOWN) * smooth01(FLAT_INNER_M, FLAT_OUTER_M, minD);
    const r = Math.hypot(x, z);
    if (r > BEACH_START_R) {
      const t = Math.min(1, (r - BEACH_START_R) / (ISLAND_R - BEACH_START_R));
      h = h * (1 - t) - BEACH_DROP_M * t * t;
    }
    return h;
  };
}

/** 0 on grass, 1 on sand; soft blend across 1.2 m around the beach start. */
export function sandBlendAt(r: number): number {
  return smooth01(BEACH_START_R - 1.2, BEACH_START_R + 0.4, r);
}
