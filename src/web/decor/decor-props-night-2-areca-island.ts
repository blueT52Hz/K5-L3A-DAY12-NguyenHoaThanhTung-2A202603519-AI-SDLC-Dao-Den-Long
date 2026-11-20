import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { mulberry32 } from './seeded-random';
import { isExcluded } from './decor-exclusion-zones';
import { baseDiscs } from './island-terrain-height-field';
import { isOnWalkerPath } from './may-character-walker-path-per-night';
import { buildIslandVegetation } from './decor-vegetation-layout';
import { buildArecaPalms } from './decor-vegetation-areca-palms-and-betel';
import { buildBridgeLanternPoles } from './decor-props-night-2-bridge-lantern-poles';
import { buildLotusPond, buildVillageWell, type GroundSpot } from './decor-props-night-2-well-and-lotus-pond';

/** Anchored Night 2 spots (also flattened in the height field): lotus pond on island A, well on island B. */
const POND = { x: -4.5, z: 5, r: 2.4 };
const WELL = { x: 63, z: 7, yaw: 0.5 };
const ROW_RADII: readonly (readonly [number, number])[] = [[24.6, 5.4], [20.8, 10]]; // [ring radius, spacing]

export interface NightPropsHandle { group: THREE.Group; update(dtS: number): void }

/** True if (x,z) is in the corridor leading onto the bridge (kept open between the islands). */
function inBridgeApproach(cfg: NightConfig, x: number, z: number): boolean {
  return cfg.surfaces.some((s) => s.kind === 'rect' && x >= s.xMin - 6 && x <= s.xMax + 6 && z >= s.zMin - 2.8 && z <= s.zMax + 2.8);
}

/** Rows of areca palms on two outer rings of every island, skipping exclusion zones and the bridge approach. */
function arecaRowPoints(cfg: NightConfig, heightAt: (x: number, z: number) => number, seed: number): number[][] {
  const rnd = mulberry32(seed);
  const out: number[][] = [];
  for (const d of baseDiscs(cfg)) {
    ROW_RADII.forEach(([r, spacing], row) => {
      const n = Math.round((Math.PI * 2 * r) / spacing);
      for (let i = 0; i < n; i++) {
        const a = ((i + row * 0.5) / n) * Math.PI * 2 + (rnd() - 0.5) * 0.04;
        const rr = r + (rnd() - 0.5) * 0.6;
        const x = d.cx + Math.cos(a) * rr, z = d.cz + Math.sin(a) * rr;
        if (isExcluded(cfg, x, z) || inBridgeApproach(cfg, x, z) || isOnWalkerPath(cfg, x, z)) continue;
        if (Math.hypot(x - WELL.x, z - WELL.z) < 4 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 2) continue;
        out.push([x, heightAt(x, z), z]);
      }
    });
  }
  return out;
}

/**
 * Night 2 "Đảo Cau": areca palm rows (some with betel vines), lantern poles along both sides of the
 * bamboo bridge, a village well with water jars, a lotus pond, plus shared bushes/flowers/bamboo/trees.
 */
export function buildNight2Props(
  cfg: NightConfig, seed: number, lowQuality: boolean, heightAt: (x: number, z: number) => number,
): NightPropsHandle {
  const g = new THREE.Group();
  g.name = 'props-night-2';
  const arecaPts = arecaRowPoints(cfg, heightAt, seed + 41);
  const areca = buildArecaPalms(lowQuality ? arecaPts.filter((_, i) => i % 2 === 0) : arecaPts, seed + 42);
  const bridge = buildBridgeLanternPoles(cfg);
  const wellSpot: GroundSpot = { x: WELL.x, y: heightAt(WELL.x, WELL.z), z: WELL.z, yaw: WELL.yaw };
  const pondSpot: GroundSpot = { x: POND.x, y: heightAt(POND.x, POND.z), z: POND.z, yaw: 0 };
  const nearAnchored = (x: number, z: number): boolean =>
    Math.hypot(x - WELL.x, z - WELL.z) < 3.5 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1;
  const vegetation = buildIslandVegetation(cfg, seed, lowQuality, heightAt, {
    palms: 0, trees: 5, bamboo: 6, bushes: 24, flowers: 30,
    palmBand: [0.82, 0.93], treeBand: [0.5, 0.7], bambooBand: [0.55, 0.75],
    blocked: (x, z) => nearAnchored(x, z) || inBridgeApproach(cfg, x, z) || isOnWalkerPath(cfg, x, z),
    tallTaken: arecaPts,
  });
  g.add(areca.group, bridge.group, buildVillageWell(wellSpot, seed + 43), buildLotusPond(pondSpot, POND.r, seed + 44), vegetation.group);
  return {
    group: g,
    update(dtS: number) {
      areca.update(dtS);
      bridge.update(dtS);
      vegetation.update(dtS);
    },
  };
}
