import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { colored, mergeColored, swayMatrix, trs, vertexColorMaterial, type SwayInstance } from './decor-geometry-helpers';

const TRUNK_H = 6.2;
const TRUNK_LEAN = 1.8;
const TRUNK_RINGS = 14;

/** Point on the palm trunk centre-line (curves toward local +x as it rises). */
function trunkPoint(t: number): THREE.Vector3 {
  return new THREE.Vector3(TRUNK_LEAN * t * t, TRUNK_H * t, 0);
}

/** Curved, tapered palm trunk with alternating light/dark ring bands. */
function buildPalmTrunkGeometry(): THREE.BufferGeometry {
  const radial = 6;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k <= TRUNK_RINGS; k++) {
    const t = k / TRUNK_RINGS;
    const c = trunkPoint(t);
    const r = (0.26 - 0.12 * t) * (k % 2 ? 0.92 : 1.05);
    for (let s = 0; s < radial; s++) {
      const a = (s / radial) * Math.PI * 2;
      pos.push(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
    }
  }
  for (let k = 0; k < TRUNK_RINGS; k++) {
    for (let s = 0; s < radial; s++) {
      const a = k * radial + s, b = k * radial + ((s + 1) % radial);
      idx.push(a, b + radial, b, a, a + radial, b + radial);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const light = new THREE.Color(P.arecaTrunk), dark = new THREE.Color(P.arecaTrunk).multiplyScalar(0.62);
  const tmp = new THREE.Color();
  return colored(g, (_x, y) => tmp.copy(Math.floor((y / TRUNK_H) * TRUNK_RINGS + 0.5) % 2 ? dark : light));
}

/** Height of the drooping frond rachis at fraction t of its length. */
function rachisY(t: number): number {
  return Math.sin(t * Math.PI * 0.55) * 0.9 - t * t * 1.9;
}

/**
 * One pinnate frond along local +x (~3.4 m): a thin folded midrib with paired tapered leaflets
 * that sweep forward and droop, longest in the middle of the frond.
 */
function buildFrondGeometry(): THREE.BufferGeometry {
  const L = 3.4;
  const pos: number[] = [];
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const w0 = 0.07 * (1 - t0), w1 = 0.07 * (1 - t1);
    const x0 = t0 * L, x1 = t1 * L, y0 = rachisY(t0), y1 = rachisY(t1);
    pos.push(x0, y0, -w0, x1, y1, -w1, x0, y0 + 0.04, 0, x0, y0 + 0.04, 0, x1, y1, w1, x0, y0, w0);
  }
  const leaflets = 11;
  for (let i = 1; i <= leaflets; i++) {
    const t = i / (leaflets + 1);
    const x = t * L, y = rachisY(t);
    const len = 0.25 + 0.85 * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const half = 0.12 + 0.07 * (1 - t);
    for (const side of [-1, 1]) {
      const tipX = x + len * 0.45, tipY = y - len * 0.45, tipZ = side * len * 0.85;
      // Two triangles per leaflet with a mid crease so it reads as a bent strip.
      const midX = x + len * 0.2, midY = y - len * 0.12, midZ = side * len * 0.45;
      pos.push(x - half, y, side * 0.03, midX, midY + 0.05, midZ, x + half, y, side * 0.03);
      pos.push(midX - half * 0.6, midY, midZ, tipX, tipY, tipZ, midX + half * 0.6, midY, midZ);
      pos.push(x + half, y, side * 0.03, midX, midY + 0.05, midZ, midX + half * 0.6, midY, midZ);
      pos.push(x - half, y, side * 0.03, midX - half * 0.6, midY, midZ, midX, midY + 0.05, midZ);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** Crown: ring of fronds (green, lighter tips) plus a cluster of coconuts, merged. */
function buildPalmCrownGeometry(rnd: () => number): THREE.BufferGeometry {
  const base = new THREE.Color(P.palmFrond), tip = new THREE.Color(P.arecaLeaf).offsetHSL(0.02, 0, 0.12);
  const tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const yaw = (i / fronds) * Math.PI * 2 + rnd() * 0.3;
    const m = trs(0, 0, 0, 0, yaw, (rnd() - 0.3) * 0.35, 0.85 + rnd() * 0.3);
    parts.push(colored(buildFrondGeometry(), (x, _y, z) => tmp.copy(base).lerp(tip, Math.min(1, Math.hypot(x, z) / 3.2)), m));
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(colored(new THREE.IcosahedronGeometry(0.2, 0), 0x5a3a1e, trs(Math.cos(a) * 0.22, -0.25, Math.sin(a) * 0.22)));
  }
  return mergeColored(parts);
}

/** Bamboo clump: culms with darker node bands and leaf tufts near the tops, merged. */
function buildBambooClumpGeometry(rnd: () => number): THREE.BufferGeometry {
  const stem = new THREE.Color(P.bamboo), node = new THREE.Color(P.bamboo).multiplyScalar(0.55);
  const leaf = new THREE.Color(P.arecaLeaf), tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const h = 3.6 + rnd() * 2.8;
    const x = (rnd() - 0.5) * 1.2, z = (rnd() - 0.5) * 1.2;
    const tiltX = (rnd() - 0.5) * 0.25, tiltZ = (rnd() - 0.5) * 0.25;
    const culm = new THREE.CylinderGeometry(0.06, 0.08, h, 5, Math.round(h / 0.45));
    culm.translate(0, h / 2, 0);
    const m = trs(x, 0, z, tiltX, rnd() * 3, tiltZ);
    parts.push(colored(culm, (_x, y) => tmp.copy(((y / 0.45) % 1) < 0.18 ? node : stem), m));
    for (let k = 0; k < 6; k++) {
      const leafGeo = new THREE.ConeGeometry(0.2, 1.4, 3);
      leafGeo.rotateZ(Math.PI / 2);
      leafGeo.translate(0.55, 0, 0);
      leafGeo.scale(1, 0.35, 1);
      const lm = new THREE.Matrix4().multiplyMatrices(m, trs(0, h * (0.55 + k * 0.075), 0, 0, rnd() * Math.PI * 2, -0.35));
      parts.push(colored(leafGeo, tmp.copy(leaf).offsetHSL(0, 0, (rnd() - 0.5) * 0.1).getHex(), lm));
    }
  }
  return mergeColored(parts);
}

export interface SwayingVegetation {
  group: THREE.Group;
  update(dtS: number): void;
}

const WIND_SPEED = 0.9;
const PALM_SWAY = 0.035; // rad at the trunk base
const CROWN_SWAY = 0.09; // extra rad on the crown
const BAMBOO_SWAY = 0.05;

/**
 * Palms (curved trunks leaning outward + frond crowns) and bamboo clumps at given ground points,
 * with a gentle wind sway. Points are [x, y, z] with y already on the visual terrain.
 */
export function buildPalmsAndBamboo(palmPts: number[][], bambooPts: number[][], seed: number): SwayingVegetation {
  const g = new THREE.Group();
  g.name = 'vegetation-palms-bamboo';
  const rnd = mulberry32(seed);
  const palms: SwayInstance[] = palmPts.map(([x, y, z]) => {
    const s = 0.75 + rnd() * 0.5;
    // Yaw so the trunk leans roughly outward (local +x maps to the outward direction).
    return { x, y: y - 0.1, z, yaw: -Math.atan2(z, x) + (rnd() - 0.5) * 0.9, sx: s, sy: s * (0.85 + rnd() * 0.35), sz: s, phase: rnd() * 6.28 };
  });
  const crownYaw = palms.map(() => rnd() * Math.PI * 2);
  const bamboo: SwayInstance[] = bambooPts.map(([x, y, z]) => {
    const s = 0.8 + rnd() * 0.45;
    return { x, y: y - 0.05, z, yaw: rnd() * Math.PI * 2, sx: s, sy: s, sz: s, phase: rnd() * 6.28 };
  });

  const mat = vertexColorMaterial({ side: THREE.DoubleSide });
  const trunkMesh = new THREE.InstancedMesh(buildPalmTrunkGeometry(), mat, Math.max(1, palms.length));
  const crownMesh = new THREE.InstancedMesh(buildPalmCrownGeometry(rnd), mat, Math.max(1, palms.length));
  const clumpMesh = new THREE.InstancedMesh(buildBambooClumpGeometry(rnd), mat, Math.max(1, bamboo.length));
  trunkMesh.name = 'palm-trunks'; crownMesh.name = 'palm-crowns'; clumpMesh.name = 'bamboo-clumps';
  trunkMesh.count = crownMesh.count = palms.length;
  clumpMesh.count = bamboo.length;
  g.add(trunkMesh, crownMesh, clumpMesh);

  const m = new THREE.Matrix4(), cm = new THREE.Matrix4(), tip = new THREE.Vector3(), top = trunkPoint(1);
  const crownBase: SwayInstance = { x: 0, y: 0, z: 0, yaw: 0, sx: 1, sy: 1, sz: 1, phase: 0 };
  let time = 0;
  const write = (): void => {
    for (let i = 0; i < palms.length; i++) {
      const b = palms[i];
      const w = time * WIND_SPEED + b.phase;
      const tx = Math.sin(w) * PALM_SWAY, tz = Math.cos(w * 0.8) * PALM_SWAY;
      trunkMesh.setMatrixAt(i, swayMatrix(m, b, tx, tz));
      tip.copy(top).applyMatrix4(m);
      Object.assign(crownBase, { x: tip.x, y: tip.y, z: tip.z, yaw: crownYaw[i], sx: b.sx, sy: b.sx, sz: b.sx });
      const cw = Math.sin(w * 1.7) * CROWN_SWAY;
      crownMesh.setMatrixAt(i, swayMatrix(cm, crownBase, tx * 2 + cw, tz * 2 - cw * 0.6));
    }
    for (let i = 0; i < bamboo.length; i++) {
      const b = bamboo[i];
      const w = time * WIND_SPEED * 1.2 + b.phase;
      clumpMesh.setMatrixAt(i, swayMatrix(m, b, Math.sin(w) * BAMBOO_SWAY, Math.cos(w * 0.7) * BAMBOO_SWAY));
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    crownMesh.instanceMatrix.needsUpdate = true;
    clumpMesh.instanceMatrix.needsUpdate = true;
  };
  write();
  return { group: g, update(dtS: number) { time += dtS; write(); } };
}
