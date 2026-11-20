import * as THREE from 'three';
import type { NightConfig, Surface } from '../../core/nights';
import { isExcluded } from './decor-exclusion-zones';
import { isOnWalkerPath } from './may-character-walker-path-per-night';
import { buildIslandVegetation } from './decor-vegetation-layout';
import { buildBellTowerTemple } from './decor-props-night-3-bell-tower-temple';
import { buildBanyanTree } from './decor-props-night-3-banyan-tree';
import { buildBannersAndIncense, type GroundPoint } from './decor-props-night-3-banners-and-incense';
import type { NightPropsHandle } from './decor-props-night-2-areca-island';

type Ramp = Extract<Surface, { kind: 'ramp' }>;

/** Banyan on tier 0 at z < 0 (also flattened in the height field), clear of start and walker loop. */
const BANYAN = { x: -7, z: -18, clear: 7 };
/** Banner rings: [radius, angles in degrees]; points hitting exclusion zones are skipped. */
const BANNER_RINGS: readonly (readonly [number, readonly number[]])[] = [
  [22.4, [8, 55, 90, 125, 172]], // tier 1 outer edge (half ring, z > 0), away from the ramp tops at 30/150
  [6.6, [0, 180, 270]], // tier 2 around the bell tower
  [40.5, [-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5]], // tier 0 near the rim
];
const BURNER_ALONG = 30.2; // just outside the ramp foot (r 30)
const BURNER_ACROSS = 2.6; // from the ramp axis: clear of the stair cheek walls (half width 1.5 + 0.4)

/** Two incense burners flanking the foot of every ramp. */
function burnerPoints(cfg: NightConfig, heightAt: (x: number, z: number) => number): GroundPoint[] {
  const out: GroundPoint[] = [];
  for (const s of cfg.surfaces) {
    if (s.kind !== 'ramp') continue;
    const r: Ramp = s;
    const a = (r.angleDeg * Math.PI) / 180;
    for (const side of [-1, 1]) {
      const x = Math.cos(a) * BURNER_ALONG - Math.sin(a) * side * BURNER_ACROSS;
      const z = Math.sin(a) * BURNER_ALONG + Math.cos(a) * side * BURNER_ACROSS;
      out.push([x, heightAt(x, z), z]);
    }
  }
  return out;
}

/**
 * Night 3 "Đảo Chuông": curved-roof bell tower with a bronze bell, big banyan with aerial roots,
 * swaying phướn banners on all three tiers, incense burners at both ramp feet, shared vegetation.
 * Tier walls/stairs are part of the terrain layer.
 */
export function buildNight3Props(
  cfg: NightConfig, seed: number, lowQuality: boolean, heightAt: (x: number, z: number) => number,
): NightPropsHandle {
  const g = new THREE.Group();
  g.name = 'props-night-3';
  const tower = cfg.obstacles[0];
  const topY = Math.max(...cfg.surfaces.map((s) => (s.kind === 'disc' ? s.y : 0)));
  const temple = tower ? buildBellTowerTemple(tower, topY) : null;

  const banyan = buildBanyanTree(BANYAN.x, heightAt(BANYAN.x, BANYAN.z), BANYAN.z, seed + 51, (x, z) => !isExcluded(cfg, x, z) && !isOnWalkerPath(cfg, x, z));
  const bannerPts: GroundPoint[] = [];
  for (const [r, angles] of BANNER_RINGS) {
    for (const deg of angles) {
      const a = (deg * Math.PI) / 180;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (isExcluded(cfg, x, z) || isOnWalkerPath(cfg, x, z)) continue;
      bannerPts.push([x, heightAt(x, z), z]);
    }
  }
  const burners = burnerPoints(cfg, heightAt);
  const dressing = buildBannersAndIncense(bannerPts, burners, cfg.wind, seed + 52);

  const nearAnchored = (x: number, z: number): boolean =>
    Math.hypot(x - BANYAN.x, z - BANYAN.z) < BANYAN.clear || burners.some((b) => Math.hypot(x - b[0], z - b[2]) < 1.4);
  const vegetation = buildIslandVegetation(cfg, seed, lowQuality, heightAt, {
    palms: 6, trees: 8, bamboo: 8, bushes: 30, flowers: 42,
    palmBand: [0.86, 0.93], treeBand: [0.8, 0.9], bambooBand: [0.79, 0.9],
    blocked: (x, z) => nearAnchored(x, z) || isOnWalkerPath(cfg, x, z),
    tallTaken: [...bannerPts, [BANYAN.x, 0, BANYAN.z]],
  });

  g.add(banyan.group, dressing.group, vegetation.group);
  if (temple) g.add(temple.group);
  return {
    group: g,
    update(dtS: number) {
      temple?.update(dtS);
      banyan.update(dtS);
      dressing.update(dtS);
      vegetation.update(dtS);
    },
  };
}
