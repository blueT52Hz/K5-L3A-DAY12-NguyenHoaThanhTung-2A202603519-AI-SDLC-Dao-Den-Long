import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { buildIslandTopMesh } from './island-terrain-top-and-beach';
import { buildCliffUnderside, buildRootsAndFloatingRocks } from './island-terrain-cliff-underside';

/**
 * Terrain for a night. Temporary scope: only Night 1 is drawn; other nights return an empty group.
 * Night 1: undulating grass top with sloping beach, layered cliff underside, roots and rock debris.
 * The cloud sea lives in the atmosphere layer (it animates).
 */
export function buildTerrainLayer(cfg: NightConfig, lowQuality = false): THREE.Group {
  const g = new THREE.Group();
  if (cfg.id !== 1) return g;
  g.name = 'terrain-night-1';
  g.add(buildIslandTopMesh(cfg), buildCliffUnderside(), buildRootsAndFloatingRocks(lowQuality));
  return g;
}
