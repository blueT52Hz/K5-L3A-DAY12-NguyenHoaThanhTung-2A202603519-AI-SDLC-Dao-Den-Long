import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { colored, flatMaterial, instancedFrom, jitterVertices, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { buildJarGeometry } from './decor-village-hut-and-crates';

/** World spot: ground point and yaw. */
export interface GroundSpot { x: number; y: number; z: number; yaw: number }

/**
 * Village well (giếng làng): brick ring with a stone cap, dark water, two posts with a little
 * tiled roof, a windlass and a wooden bucket; plus a cluster of clay water jars beside it.
 */
export function buildVillageWell(spot: GroundSpot, seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'village-well';
  const rnd = mulberry32(seed);
  const brickA = new THREE.Color(0x9a5a3e), brickB = new THREE.Color(0x7c4630), tmp = new THREE.Color();
  const ring = new THREE.CylinderGeometry(0.95, 1.05, 0.85, 14, 3, true);
  ring.translate(0, 0.42, 0);
  const parts = [
    colored(ring, (x, y, z) => tmp.copy((Math.floor(Math.atan2(z, x) * 2.2 + Math.floor(y / 0.28) * 0.5) % 2) ? brickA : brickB)),
    colored(new THREE.CylinderGeometry(0.82, 0.82, 0.85, 14, 1, true), 0x4a2e22, trs(0, 0.42, 0)),
    colored(new THREE.TorusGeometry(1.0, 0.12, 4, 14), P.stone, trs(0, 0.88, 0, Math.PI / 2)),
    colored(new THREE.CircleGeometry(0.82, 14), 0x0e2a33, trs(0, 0.55, 0, -Math.PI / 2)),
  ];
  for (const sx of [-1.05, 1.05]) parts.push(colored(new THREE.BoxGeometry(0.14, 2.0, 0.14), P.wood, trs(sx, 1.0, 0)));
  parts.push(colored(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6), P.wood, trs(0, 1.6, 0, 0, 0, Math.PI / 2)));
  parts.push(colored(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 3), P.rope, trs(0.25, 1.22, 0)));
  parts.push(colored(new THREE.CylinderGeometry(0.17, 0.13, 0.26, 8), P.basket, trs(0.25, 0.75, 0)));
  // Little gable roof of tiles.
  for (const side of [-1, 1]) {
    parts.push(colored(new THREE.BoxGeometry(2.6, 0.06, 0.95), P.roofTile, trs(0, 2.18, side * 0.38, side * 0.5, 0, 0)));
  }
  parts.push(colored(new THREE.BoxGeometry(2.7, 0.1, 0.1), 0x5a2a20, trs(0, 2.42, 0)));
  const well = new THREE.Mesh(mergeColored(parts), vertexColorMaterial({ side: THREE.DoubleSide }));
  well.position.set(spot.x, spot.y, spot.z);
  well.rotation.y = spot.yaw;
  g.add(well);

  const jarMs: THREE.Matrix4[] = [];
  for (let k = 0; k < 5; k++) {
    const a = spot.yaw + 2.0 + k * 0.42, d = 1.8 + (k % 2) * 0.55;
    const x = spot.x + Math.cos(a) * d, z = spot.z + Math.sin(a) * d;
    jarMs.push(trs(x, spot.y - 0.02, z, 0, rnd() * 3, 0, 1.05 + rnd() * 0.6));
  }
  g.add(instancedFrom(buildJarGeometry(), vertexColorMaterial(), jarMs, 'well-water-jars'));
  return g;
}

/**
 * Small flat lotus pond (ao sen): dark water disc with a faint sheen, ring of rim stones,
 * floating lily pads and a few pink lotus flowers. All instanced except the water.
 */
export function buildLotusPond(spot: GroundSpot, radius: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'lotus-pond';
  const rnd = mulberry32(seed);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 28),
    new THREE.MeshStandardMaterial({ color: 0x123b48, emissive: 0x0a2230, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(spot.x, spot.y + 0.04, spot.z);
  g.add(water);

  const stoneMs: THREE.Matrix4[] = [];
  const n = Math.round(radius * 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.1, r = radius + 0.1 + rnd() * 0.15;
    const s = 0.28 + rnd() * 0.2;
    stoneMs.push(trs(spot.x + Math.cos(a) * r, spot.y + 0.05, spot.z + Math.sin(a) * r, rnd(), rnd() * 6, rnd(), s, s * 0.65, s));
  }
  const stones = instancedFrom(jitterVertices(new THREE.DodecahedronGeometry(1, 0), 0.2, rnd), flatMaterial(0xffffff), stoneMs, 'pond-rim-stones');
  const c = new THREE.Color();
  stoneMs.forEach((_, i) => stones.setColorAt(i, c.setHex(P.stone).offsetHSL(0, 0, (rnd() - 0.5) * 0.15)));
  g.add(stones);

  // Lily pads: flat discs with a notch (thetaLength < 2PI).
  const padMs: THREE.Matrix4[] = [];
  const flowerMs: THREE.Matrix4[] = [];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (radius - 0.4);
    const x = spot.x + Math.cos(a) * r, z = spot.z + Math.sin(a) * r;
    padMs.push(trs(x, spot.y + 0.07, z, -Math.PI / 2, 0, rnd() * 6, 0.3 + rnd() * 0.25));
    if (i % 3 === 0) flowerMs.push(trs(x, spot.y + 0.1, z, 0, rnd() * 6, 0, 0.9 + rnd() * 0.4));
  }
  const pad = new THREE.CircleGeometry(1, 10, 0.35, Math.PI * 2 - 0.35);
  g.add(instancedFrom(pad, flatMaterial(0x3f7f45, { side: THREE.DoubleSide }), padMs, 'lily-pads'));

  const petals: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, outer = k % 2 === 0;
    const petal = new THREE.SphereGeometry(0.09, 5, 3);
    petal.scale(0.55, 1.4, 0.3);
    petals.push(colored(petal, outer ? 0xff9cc2 : 0xffc6dc, trs(Math.cos(a) * 0.07, 0.11, Math.sin(a) * 0.07, 0, -a + Math.PI / 2, outer ? 0.75 : 0.35)));
  }
  petals.push(colored(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 6), 0xffd75e, trs(0, 0.1, 0)));
  g.add(instancedFrom(mergeColored(petals), vertexColorMaterial({ emissive: 0x3a1020 }), flowerMs, 'lotus-flowers'));
  return g;
}
