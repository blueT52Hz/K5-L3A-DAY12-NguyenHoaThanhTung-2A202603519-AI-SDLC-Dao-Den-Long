import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';

const ISLAND_R = 40;
const SLAB_H = 0.5;
const ROCK_DEPTH = 28;

function flat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, metalness: 0 });
}

/** Night 1 island: grass disc (top y=0), sand rim, inverted rock cone, cloud sea below. */
function buildNight1(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'terrain-night-1';

  const grass = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, SLAB_H, 64), flat(P.grass));
  grass.position.y = -SLAB_H / 2;
  g.add(grass);

  // Sand rim: thin ring just above the grass top so it shows near the edge.
  const sand = new THREE.Mesh(new THREE.RingGeometry(ISLAND_R - 3.5, ISLAND_R, 64), flat(P.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.02;
  g.add(sand);

  // Rock: cone flipped so its tip points down, hanging under the slab.
  const rock = new THREE.Mesh(new THREE.ConeGeometry(ISLAND_R - 1, ROCK_DEPTH, 14, 1), flat(P.stone));
  rock.rotation.x = Math.PI;
  rock.position.y = -SLAB_H - ROCK_DEPTH / 2;
  g.add(rock);

  // Cloud sea: flattened translucent blobs around and below the island (shared geometry/material).
  const blobGeo = new THREE.SphereGeometry(1, 12, 8);
  const blobMat = new THREE.MeshStandardMaterial({
    color: P.cloudSea, flatShading: true, roughness: 1, transparent: true, opacity: 0.85,
  });
  const rnd = mulberry32(4101);
  for (let i = 0; i < 28; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 20 + rnd() * 70;
    const s = 8 + rnd() * 14;
    const blob = new THREE.Mesh(blobGeo, blobMat);
    blob.scale.set(s, s * 0.22, s * (0.7 + rnd() * 0.5));
    blob.position.set(Math.cos(a) * d, -16 - rnd() * 10, Math.sin(a) * d);
    blob.rotation.y = rnd() * Math.PI;
    g.add(blob);
  }
  return g;
}

/**
 * Terrain for a night. Temporary scope: only Night 1 is drawn; other nights return an empty group.
 */
export function buildTerrainLayer(cfg: NightConfig): THREE.Group {
  return cfg.id === 1 ? buildNight1() : new THREE.Group();
}
