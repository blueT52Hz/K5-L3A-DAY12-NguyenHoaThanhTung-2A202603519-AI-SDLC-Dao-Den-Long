import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import {
  colored, flatMaterial, instancedFrom, jitterVertices, mergeColored, swayMatrix, trs, vertexColorMaterial, type SwayInstance,
} from './decor-geometry-helpers';
import type { SwayingVegetation } from './decor-vegetation-palms-and-bamboo';

const TREE_SWAY = 0.025;
const TREE_WIND_SPEED = 0.7;
const FLOWER_COLORS = [P.flowerPink, P.flowerYellow, P.flowerWhite, P.flowerRed];

/** Round-canopy tree: tapered trunk + three lumpy canopy blobs, darker underneath. */
function buildRoundTreeGeometry(rnd: () => number): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.18, 0.3, 2.6, 6);
  trunk.translate(0, 1.3, 0);
  const parts = [colored(trunk, P.wood)];
  // Three green tones across the foliage clusters; every blob darkens toward its underside.
  const tones = [new THREE.Color(P.canopy), new THREE.Color(P.grassLight), new THREE.Color(P.canopy).offsetHSL(0.03, 0.05, 0.06)];
  const tmp = new THREE.Color(), under = new THREE.Color();
  const blobs: [number, number, number, number][] = [
    [0, 3.5, 0, 1.6], [1.0, 3.0, 0.4, 1.15], [-0.9, 3.1, -0.3, 1.2], [0.2, 2.9, -1.0, 1.05], [-0.3, 4.4, 0.3, 1.0],
  ];
  blobs.forEach(([x, y, z, r], k) => {
    const top = tones[k % tones.length];
    under.copy(top).multiplyScalar(0.45);
    const geo = jitterVertices(new THREE.IcosahedronGeometry(1, 1), 0.24, rnd);
    parts.push(colored(geo, (_x, py) => tmp.copy(under).lerp(top, Math.min(1, Math.max(0, (py - (y - r)) / (1.6 * r)))), trs(x, y, z, 0, rnd() * 3, 0, r, r * 0.85, r)));
  });
  return mergeColored(parts);
}

/** Bush: two squashed lumpy blobs. */
function buildBushGeometry(rnd: () => number): THREE.BufferGeometry {
  const light = new THREE.Color(P.bush).offsetHSL(0, 0, 0.07), dark = new THREE.Color(P.bush).multiplyScalar(0.6);
  const tmp = new THREE.Color();
  const shade = (_x: number, y: number): THREE.Color => tmp.copy(dark).lerp(light, Math.min(1, Math.max(0, y / 0.9)));
  return mergeColored([
    colored(jitterVertices(new THREE.IcosahedronGeometry(0.6, 1), 0.15, rnd), shade, trs(0, 0.35, 0, 0, 0, 0, 1, 0.75, 1)),
    colored(jitterVertices(new THREE.IcosahedronGeometry(0.45, 1), 0.12, rnd), shade, trs(0.5, 0.25, 0.2, 0, 0, 0, 1, 0.7, 1)),
  ]);
}

/** Flower head: five flat petals around a tiny centre (white base, tinted per instance). ~48 tris: a head is a few px on screen. */
function buildFlowerHeadGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(colored(new THREE.SphereGeometry(0.07, 4, 2), 0xffffff, trs(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08, 0, -a, 0, 1, 0.3, 0.6)));
  }
  parts.push(colored(new THREE.SphereGeometry(0.05, 4, 2), 0xffe08a, trs(0, 0.02, 0)));
  return mergeColored(parts);
}

/** Round trees, bushes and flower clusters (with stems) at given ground points [x, y, z]. */
export function buildTreesBushesFlowers(
  treePts: number[][], bushPts: number[][], flowerCentres: number[][], groundY: (x: number, z: number) => number, seed: number,
): SwayingVegetation {
  const g = new THREE.Group();
  g.name = 'vegetation-trees-bushes-flowers';
  const rnd = mulberry32(seed);
  const mat = vertexColorMaterial();

  const treeBase: SwayInstance[] = treePts.map(([x, y, z]) => {
    const s = 0.9 + rnd() * 0.5;
    return { x, y: y - 0.1, z, yaw: rnd() * Math.PI * 2, sx: s, sy: s * (0.9 + rnd() * 0.25), sz: s, phase: rnd() * 6.28 };
  });
  const trees = new THREE.InstancedMesh(buildRoundTreeGeometry(rnd), mat, Math.max(1, treeBase.length));
  trees.count = treeBase.length;
  trees.name = 'round-trees';
  const tint = new THREE.Color();
  treeBase.forEach((_, i) => trees.setColorAt(i, tint.setRGB(1, 1, 1).offsetHSL(0, 0, -rnd() * 0.12)));
  g.add(trees);
  const tm = new THREE.Matrix4();
  let time = 0;
  const writeTrees = (): void => {
    for (let i = 0; i < treeBase.length; i++) {
      const w = time * TREE_WIND_SPEED + treeBase[i].phase;
      trees.setMatrixAt(i, swayMatrix(tm, treeBase[i], Math.sin(w) * TREE_SWAY, Math.cos(w * 0.8) * TREE_SWAY));
    }
    trees.instanceMatrix.needsUpdate = true;
  };
  writeTrees();

  const bushMs = bushPts.map(([x, y, z]) => trs(x, y - 0.05, z, 0, rnd() * Math.PI * 2, 0, 0.7 + rnd() * 0.8));
  const bushes = instancedFrom(buildBushGeometry(rnd), mat, bushMs, 'bushes');
  bushMs.forEach((_, i) => bushes.setColorAt(i, tint.setRGB(1, 1, 1).offsetHSL((rnd() - 0.5) * 0.05, 0, -rnd() * 0.12)));
  g.add(bushes);

  // Flowers: 6-12 heads per cluster, same colour family per cluster for readable patches.
  const headMs: THREE.Matrix4[] = [];
  const stemMs: THREE.Matrix4[] = [];
  const headColors: THREE.Color[] = [];
  for (const [cx, , cz] of flowerCentres) {
    const base = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    const n = 6 + Math.floor(rnd() * 7);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 1.1;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const h = 0.22 + rnd() * 0.25;
      const y = groundY(x, z);
      stemMs.push(trs(x, y + h / 2, z, 0, 0, 0, 1, h, 1));
      headMs.push(trs(x, y + h, z, (rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4, 0.8 + rnd() * 0.5));
      headColors.push(new THREE.Color(rnd() < 0.15 ? P.flowerWhite : base));
    }
  }
  const stems = instancedFrom(new THREE.CylinderGeometry(0.012, 0.015, 1, 3), flatMaterial(P.grassLight, { flatShading: false }), stemMs, 'flower-stems');
  const heads = instancedFrom(buildFlowerHeadGeometry(), vertexColorMaterial({ emissive: 0x221a22 }), headMs, 'flower-heads');
  headColors.forEach((c, i) => heads.setColorAt(i, c));
  g.add(stems, heads);
  return { group: g, update(dtS: number) { time += dtS; writeTrees(); } };
}
