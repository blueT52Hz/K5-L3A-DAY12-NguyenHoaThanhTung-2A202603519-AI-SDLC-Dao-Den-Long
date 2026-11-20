import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { scatterPoints, type ScatterOptions } from './decor-scatter-placement';
import { isExcluded } from './decor-exclusion-zones';
import { nearDockFootprint } from './decor-night-1-anchored-layout';
import { mulberry32 } from './seeded-random';
import { buildPalmsAndBamboo, type SwayingVegetation } from './decor-vegetation-palms-and-bamboo';
import { buildTreesBushesFlowers } from './decor-vegetation-trees-bushes-flowers';

const TALL_SPACING_M = 4.5; // min distance between any two tall plants (palm / bamboo / tree)

/**
 * Places Night 1 vegetation: palms on the beach edge, bamboo and round trees inside the rim,
 * bushes at their bases plus scattered, and flower patches. All points respect exclusion zones
 * and the dock/village footprint; y is lifted onto the visual terrain via `heightAt`.
 */
export function buildNight1Vegetation(
  cfg: NightConfig, seed: number, lowQuality: boolean, heightAt: (x: number, z: number) => number,
): SwayingVegetation {
  const rnd = mulberry32(seed ^ 0x51ed27);
  const free = (x: number, z: number): boolean => !isExcluded(cfg, x, z) && !nearDockFootprint(cfg, x, z);
  const lift = (p: number[]): number[] => [p[0], heightAt(p[0], p[2]), p[2]];
  const pick = (o: ScatterOptions): number[][] => scatterPoints(cfg, o).filter((p) => free(p[0], p[2])).map(lift);

  const tall: number[][] = [];
  const keepTall = (pts: number[][], max: number): number[][] => {
    const out: number[][] = [];
    for (const p of pts) {
      if (out.length >= max) break;
      if (tall.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < TALL_SPACING_M)) continue;
      tall.push(p);
      out.push(p);
    }
    return out;
  };
  const q = lowQuality ? 0.6 : 1;
  const palms = keepTall(pick({ seed: seed + 11, count: 40, minRadiusFrac: 0.82, maxRadiusFrac: 0.93, minSpacing: 4 }), Math.round(18 * q));
  const trees = keepTall(pick({ seed: seed + 12, count: 20, minRadiusFrac: 0.66, maxRadiusFrac: 0.8, minSpacing: 7 }), Math.round(7 * q));
  const bamboo = keepTall(pick({ seed: seed + 13, count: 20, minRadiusFrac: 0.7, maxRadiusFrac: 0.84, minSpacing: 6 }), Math.round(8 * q));

  // Bushes: 1-3 around each tall plant base, plus a scattered set.
  const bushes: number[][] = [];
  for (const t of tall) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, d = 1.2 + rnd() * 1.4;
      const x = t[0] + Math.cos(a) * d, z = t[2] + Math.sin(a) * d;
      if (Math.hypot(x, z) < 37.5 && free(x, z)) bushes.push(lift([x, 0, z]));
    }
  }
  bushes.push(...pick({ seed: seed + 14, count: Math.round(26 * q), minRadiusFrac: 0.25, maxRadiusFrac: 0.85, minSpacing: 3 }));
  const flowers = pick({ seed: seed + 15, count: Math.round(34 * q), minRadiusFrac: 0.15, maxRadiusFrac: 0.85, minSpacing: 3 });

  const group = new THREE.Group();
  group.name = 'vegetation';
  const palmsAndBamboo = buildPalmsAndBamboo(palms, bamboo, seed + 21);
  const others = buildTreesBushesFlowers(trees, bushes, flowers, heightAt, seed + 22);
  group.add(palmsAndBamboo.group, others.group);
  return {
    group,
    update(dtS: number) {
      palmsAndBamboo.update(dtS);
      others.update(dtS);
    },
  };
}
