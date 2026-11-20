import type { NightConfig, Surface } from '../../core/nights';
import { groundBelow } from '../../core/terrain/terrain-queries';

/** Night 1 island outer radius (gameplay disc). */
export const ISLAND_R = 40;
/** Width of the sloping beach ring inside every base-disc rim (Night 1: 40 - 36.2). */
export const BEACH_WIDTH_M = 3.8;
/** Night 1 radius where grass turns into the sloping beach ring. */
export const BEACH_START_R = ISLAND_R - BEACH_WIDTH_M;
/** Visual drop of the beach at the outer rim (m below the gameplay plane). */
export const BEACH_DROP_M = 0.55;

const BUMP_UP = 0.24; // max visual rise above the gameplay plane
const BUMP_DOWN = 0.1; // max visual dip below the gameplay plane
const FLAT_INNER_M = 3; // fully flat within this distance of lanterns/start/pads/props
const FLAT_OUTER_M = 5.5; // blend back to full noise by this distance

type Disc = Extract<Surface, { kind: 'disc' }>;

/** Extra flat spots [x, z] per night (anchored props that need level ground: pond, well, banyan, burners). */
const EXTRA_FLAT_SPOTS: Record<number, [number, number][]> = {
  2: [[-4.5, 5], [63, 7]],
  3: [[-7, -18]],
};

export function smooth01(e0: number, e1: number, x: number): number {
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

/** Island base discs: all discs sharing the lowest y (Night 2 has two). */
export function baseDiscs(cfg: NightConfig): Disc[] {
  const discs = cfg.surfaces.filter((s): s is Disc => s.kind === 'disc');
  if (discs.length === 0) return [];
  const minY = Math.min(...discs.map((d) => d.y));
  return discs.filter((d) => d.y === minY);
}

/** Distance from (x,z) to the rim of the nearest base disc, measured inward (negative = outside). */
export function rimDistance(discs: Disc[], x: number, z: number): number {
  let best = -Infinity;
  for (const d of discs) best = Math.max(best, d.r - Math.hypot(x - d.cx, z - d.cz));
  return best;
}

/**
 * Visual terrain height for any night: gameplay ground (tiers, ramps, bridge) plus gentle bumps on
 * flat grass, flattened near lanterns/start/pads/charms, and sloping down across each base-disc beach.
 * Ramps and the bridge keep their exact gameplay height.
 */
export function createTerrainHeightAt(cfg: NightConfig): (x: number, z: number) => number {
  const flatPts: [number, number][] = [
    [cfg.start[0], cfg.start[2]],
    ...cfg.lanterns.map((l): [number, number] => [l.pos[0], l.pos[2]]),
    ...cfg.jumpPads.map((j): [number, number] => [j.pos[0], j.pos[2]]),
    ...cfg.charms.map((c): [number, number] => [c.pos[0], c.pos[2]]),
    ...(EXTRA_FLAT_SPOTS[cfg.id] ?? []),
  ];
  const discs = baseDiscs(cfg);
  const baseY = discs.length ? discs[0].y : 0;
  // One single-surface config per ramp/bridge, built once (heightAt runs per frame for the walker).
  const exact = cfg.surfaces.filter((s) => s.kind === 'ramp' || s.kind === 'rect').map((s) => ({ ...cfg, surfaces: [s] }));
  return (x: number, z: number): number => {
    const g = groundBelow(cfg, x, z, 100) ?? baseY;
    for (const c of exact) if (groundBelow(c, x, z, 100) === g) return g;
    let minD = Infinity;
    for (const p of flatPts) minD = Math.min(minD, Math.hypot(x - p[0], z - p[1]));
    const n = sineNoise(x, z);
    let h = (n > 0 ? n * BUMP_UP : n * BUMP_DOWN) * smooth01(FLAT_INNER_M, FLAT_OUTER_M, minD);
    if (g === baseY) {
      const rim = rimDistance(discs, x, z);
      if (rim < BEACH_WIDTH_M) {
        const t = Math.min(1, Math.max(0, (BEACH_WIDTH_M - rim) / BEACH_WIDTH_M));
        h = h * (1 - t) - BEACH_DROP_M * t * t;
      }
    } else {
      h *= 0.5; // tier tops: calmer, paved-garden feel
    }
    return g + h;
  };
}

/** 0 on grass, 1 on sand; soft blend across ~1.6 m around the beach start (input: distance inward from the rim). */
export function sandBlendFromRim(rim: number): number {
  return 1 - smooth01(BEACH_WIDTH_M - 0.4, BEACH_WIDTH_M + 1.2, rim);
}
