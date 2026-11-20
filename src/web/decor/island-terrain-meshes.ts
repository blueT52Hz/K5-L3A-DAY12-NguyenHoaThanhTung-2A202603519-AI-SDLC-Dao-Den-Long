import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { buildTopPatchMesh, type TopPatch } from './island-terrain-top-and-beach';
import { buildCliffUnderside, buildRootsAndFloatingRocks } from './island-terrain-cliff-underside';
import { baseDiscs } from './island-terrain-height-field';
import { buildTierWallsAndStairs } from './island-terrain-tier-walls-and-stairs';
import { buildBambooBridges } from './island-terrain-bamboo-bridge';

/**
 * Stylized terrain for any night, driven by cfg.surfaces so it matches gameplay geometry exactly:
 * - every base disc: undulating grass top with sloping beach, layered cliff underside, roots and rocks;
 * - raised discs / annuli (Night 3 tiers): grass tops with a paved border, stone-faced walls, ramp stairs;
 * - rect surfaces (Night 2): bamboo bridge deck.
 * The cloud sea lives in the atmosphere layer (it animates).
 */
export function buildTerrainLayer(cfg: NightConfig, lowQuality = false): THREE.Group {
  const g = new THREE.Group();
  g.name = `terrain-night-${cfg.id}`;
  const base = baseDiscs(cfg);
  base.forEach((d, i) => {
    const name = i === 0 ? 'island-top' : `island-top-${i + 1}`;
    g.add(buildTopPatchMesh(cfg, { cx: d.cx, cz: d.cz, rIn: 0, rOut: d.r, rim: 'beach', level: d.y, name }, 7301 + i * 17));
    g.add(buildCliffUnderside(d), buildRootsAndFloatingRocks(lowQuality, d, 6620 + i * 31));
  });
  const baseY = base.length ? base[0].y : 0;
  let k = 0;
  for (const s of cfg.surfaces) {
    let patch: TopPatch | null = null;
    if (s.kind === 'disc' && s.y > baseY) {
      patch = { cx: s.cx, cz: s.cz, rIn: 0, rOut: s.r, rim: 'paved', level: s.y, name: `tier-top-${++k}` };
    } else if (s.kind === 'annulus') {
      const half = s.zMinExclusive !== undefined;
      patch = {
        cx: s.cx, cz: s.cz, rIn: s.rIn, rOut: s.rOut, rim: 'paved', level: s.y, name: `tier-top-${++k}`,
        ...(half ? { thetaStart: 0, thetaLen: Math.PI } : {}),
      };
    }
    if (patch) g.add(buildTopPatchMesh(cfg, patch, 7400 + k * 13));
  }
  if (cfg.surfaces.some((s) => s.kind === 'annulus' || s.kind === 'ramp' || (s.kind === 'disc' && s.y > baseY))) {
    g.add(buildTierWallsAndStairs(cfg));
  }
  if (cfg.surfaces.some((s) => s.kind === 'rect')) g.add(buildBambooBridges(cfg));
  return g;
}
