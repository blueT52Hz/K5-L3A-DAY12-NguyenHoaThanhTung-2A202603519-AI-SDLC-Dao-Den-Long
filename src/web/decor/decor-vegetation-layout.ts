import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { scatterPoints, type ScatterOptions } from './decor-scatter-placement';
import { isExcluded } from './decor-exclusion-zones';
import { nearDockFootprint } from './decor-night-1-anchored-layout';
import { mulberry32 } from './seeded-random';
import { baseDiscs, rimDistance } from './island-terrain-height-field';
import { buildPalmsAndBamboo, type SwayingVegetation } from './decor-vegetation-palms-and-bamboo';
import { buildTreesBushesFlowers } from './decor-vegetation-trees-bushes-flowers';

const TALL_SPACING_M = 4.5; // min distance between any two tall plants (palm / bamboo / tree)

/** Per-night vegetation mix: counts and radial bands (fractions of each base-disc radius). */
export interface VegetationMix {
  palms: number; trees: number; bamboo: number; bushes: number; flowers: number;
  palmBand: [number, number]; treeBand: [number, number]; bambooBand: [number, number];
  /** Extra keep-out (village props, walker path); scattered points inside it are dropped. */
  blocked: (x: number, z: number) => boolean;
  /** Points already occupied by tall anchored props (kept TALL_SPACING_M away). */
  tallTaken?: number[][];
}

/** Night 1: palms on the beach edge, bamboo and round trees inside the rim, dock/village kept clear. */
export function buildNight1Vegetation(
  cfg: NightConfig, seed: number, lowQuality: boolean, heightAt: (x: number, z: number) => number,
): SwayingVegetation {
  return buildIslandVegetation(cfg, seed, lowQuality, heightAt, {
    palms: 18, trees: 7, bamboo: 8, bushes: 26, flowers: 34,
    palmBand: [0.82, 0.93], treeBand: [0.66, 0.8], bambooBand: [0.7, 0.84],
    blocked: (x, z) => nearDockFootprint(cfg, x, z),
  });
}

/**
 * Places vegetation for a night: palms, bamboo and round trees in radial bands, bushes at their
 * bases plus scattered, and flower patches. All points respect exclusion zones and `mix.blocked`;
 * y is lifted onto the visual terrain via `heightAt` (tiers included).
 */
export function buildIslandVegetation(
  cfg: NightConfig, seed: number, lowQuality: boolean, heightAt: (x: number, z: number) => number, mix: VegetationMix,
): SwayingVegetation {
  const rnd = mulberry32(seed ^ 0x51ed27);
  const discs = baseDiscs(cfg);
  const free = (x: number, z: number): boolean => !isExcluded(cfg, x, z) && !mix.blocked(x, z);
  const lift = (p: number[]): number[] => [p[0], heightAt(p[0], p[2]), p[2]];
  const pick = (o: ScatterOptions): number[][] => scatterPoints(cfg, o).filter((p) => free(p[0], p[2])).map(lift);

  const tall: number[][] = [...(mix.tallTaken ?? [])];
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
  const band = (b: [number, number]) => ({ minRadiusFrac: b[0], maxRadiusFrac: b[1] });
  const palms = keepTall(pick({ seed: seed + 11, count: mix.palms * 2 + 4, ...band(mix.palmBand), minSpacing: 4 }), Math.round(mix.palms * q));
  const trees = keepTall(pick({ seed: seed + 12, count: Math.max(20, mix.trees * 2 + 6), ...band(mix.treeBand), minSpacing: 7 }), Math.round(mix.trees * q));
  const bamboo = keepTall(pick({ seed: seed + 13, count: mix.bamboo * 2 + 4, ...band(mix.bambooBand), minSpacing: 6 }), Math.round(mix.bamboo * q));

  // Bushes: 1-3 around each tall plant base, plus a scattered set.
  const bushes: number[][] = [];
  for (const t of tall) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, d = 1.2 + rnd() * 1.4;
      const x = t[0] + Math.cos(a) * d, z = t[2] + Math.sin(a) * d;
      if (rimDistance(discs, x, z) > 2.5 && free(x, z)) bushes.push(lift([x, 0, z]));
    }
  }
  bushes.push(...pick({ seed: seed + 14, count: Math.round(mix.bushes * q), minRadiusFrac: 0.25, maxRadiusFrac: 0.85, minSpacing: 3 }));
  const flowers = pick({ seed: seed + 15, count: Math.round(mix.flowers * q), minRadiusFrac: 0.15, maxRadiusFrac: 0.85, minSpacing: 3 });

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
