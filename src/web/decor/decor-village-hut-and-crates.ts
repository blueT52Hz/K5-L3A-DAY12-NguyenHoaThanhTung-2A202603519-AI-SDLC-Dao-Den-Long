import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, instancedFrom, jitterVertices, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { mulberry32 } from './seeded-random';

/** Thatched hut: plank walls on short stilts, gable thatch roof with darker eaves, door, porch step. */
function buildHutGeometry(rnd: () => number): THREE.BufferGeometry {
  const plankA = new THREE.Color(P.wood), plankB = new THREE.Color(P.wood).multiplyScalar(0.78);
  const thatchTop = new THREE.Color(P.thatch), thatchLow = new THREE.Color(P.thatch).multiplyScalar(0.6);
  const tmp = new THREE.Color();
  const walls = new THREE.BoxGeometry(2.8, 1.7, 2.2, 7, 1, 5);
  walls.translate(0, 0.25 + 0.85, 0);
  // Gable roof: triangular prism along x (3-sided cylinder, apex up), overhanging the walls.
  const roof = jitterVertices(new THREE.CylinderGeometry(1, 1, 3.6, 3, 4), 0.05, rnd);
  roof.rotateZ(Math.PI / 2);
  roof.rotateX(-Math.PI / 2); // apex up, flat eaves underneath
  roof.scale(1, 0.95, 1.65);
  roof.translate(0, 2.45, 0);
  const parts = [
    colored(walls, (x, _y, z) => tmp.copy(Math.floor((x + z) * 2.2 + 10) % 2 ? plankA : plankB)),
    // Thatch: horizontal straw bands darkening toward the eaves, darker ridge.
    colored(roof, (_x, y) => tmp.copy(thatchLow).lerp(thatchTop, Math.min(1, Math.max(0, (y - 2.0) / 1.1)))
      .multiplyScalar(y > 3.3 ? 0.6 : Math.floor(y * 5) % 2 ? 1 : 0.85)),
    colored(new THREE.BoxGeometry(0.7, 1.15, 0.06), 0x24160d, trs(-0.5, 0.25 + 0.6, 1.12)),
    colored(new THREE.BoxGeometry(1.2, 0.12, 0.6), P.wood, trs(-0.5, 0.12, 1.45)),
  ];
  for (const [sx, sz] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) {
    parts.push(colored(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 5), P.wood, trs(sx, 0.2, sz)));
  }
  return mergeColored(parts);
}

/** Wooden crate with darker frame edges suggested by vertex tint. */
function buildCrateGeometry(): THREE.BufferGeometry {
  const light = new THREE.Color(P.arecaTrunk), dark = new THREE.Color(P.wood);
  const tmp = new THREE.Color();
  return colored(new THREE.BoxGeometry(0.7, 0.6, 0.7, 2, 2, 2), (x, y, z) =>
    tmp.copy(Math.abs(x) > 0.3 || Math.abs(y) > 0.25 || Math.abs(z) > 0.3 ? dark : light).lerp(light, Math.abs(x * z) * 2));
}

/** Clay jar (lathe) with a dark mouth band. */
export function buildJarGeometry(): THREE.BufferGeometry {
  const profile = [[0, 0], [0.22, 0.02], [0.33, 0.2], [0.3, 0.45], [0.17, 0.6], [0.19, 0.68], [0.15, 0.7]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Color(P.jar), band = new THREE.Color(P.jar).multiplyScalar(0.55), tmp = new THREE.Color();
  return colored(new THREE.LatheGeometry(profile, 9), (_x, y) => tmp.copy(y > 0.56 || (y > 0.28 && y < 0.33) ? band : body));
}

export interface VillageSpot { x: number; y: number; z: number; yaw: number }

/**
 * Huts (one InstancedMesh + warm emissive windows) and crate stacks with clay jars,
 * placed at already-validated spots in the dock local frame.
 */
export function buildHutsAndCrates(huts: VillageSpot[], crates: VillageSpot[], seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'village-huts-crates';
  const rnd = mulberry32(seed);
  const mat = vertexColorMaterial();
  g.add(instancedFrom(buildHutGeometry(rnd), mat, huts.map((h) => trs(h.x, h.y, h.z, 0, h.yaw, 0)), 'huts'));

  // Glowing windows on both side walls: warm = safe, cosy.
  const winMs: THREE.Matrix4[] = [];
  for (const h of huts) {
    const base = trs(h.x, h.y, h.z, 0, h.yaw, 0);
    for (const side of [-1, 1]) winMs.push(new THREE.Matrix4().multiplyMatrices(base, trs(side * 1.41, 1.25, 0, 0, Math.PI / 2, 0)));
    winMs.push(new THREE.Matrix4().multiplyMatrices(base, trs(0.65, 1.3, 1.11)));
  }
  const winMat = new THREE.MeshStandardMaterial({ color: P.lanternCore, emissive: P.lanternLit, emissiveIntensity: 2.2, side: THREE.DoubleSide });
  g.add(instancedFrom(new THREE.PlaneGeometry(0.55, 0.45), winMat, winMs, 'hut-windows'));

  const crateMs: THREE.Matrix4[] = [];
  const jarMs: THREE.Matrix4[] = [];
  for (const c of crates) {
    const layout: [number, number, number][] = [[0, 0, 0], [0.75, 0, 0.1], [0.35, 0.6, 0.05], [-0.1, 0, 0.8]];
    for (const [ox, oy, oz] of layout) {
      crateMs.push(new THREE.Matrix4().multiplyMatrices(trs(c.x, c.y, c.z, 0, c.yaw, 0), trs(ox, oy + 0.3, oz, 0, (rnd() - 0.5) * 0.3, 0)));
    }
    for (let k = 0; k < 3; k++) {
      const a = c.yaw + 2.2 + k * 0.7;
      jarMs.push(trs(c.x + Math.cos(a) * 1.2, c.y, c.z + Math.sin(a) * 1.2, 0, rnd() * 3, 0, 0.8 + rnd() * 0.5));
    }
  }
  g.add(instancedFrom(buildCrateGeometry(), mat, crateMs, 'crates'));
  g.add(instancedFrom(buildJarGeometry(), mat, jarMs, 'jars'));
  return g;
}
