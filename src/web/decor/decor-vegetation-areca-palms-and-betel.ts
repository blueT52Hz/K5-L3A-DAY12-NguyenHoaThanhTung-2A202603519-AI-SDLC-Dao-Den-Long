import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { colored, mergeColored, swayMatrix, trs, vertexColorMaterial, type SwayInstance } from './decor-geometry-helpers';
import { buildFrondGeometry, type SwayingVegetation } from './decor-vegetation-palms-and-bamboo';

const TRUNK_H = 8.2;
const SHAFT_H = 1.3;
const WIND_SPEED = 0.85;
const SWAY = 0.028; // rad at the base: slender areca tops move ~0.25 m

/**
 * Areca palm (cây cau), modelled in one local frame so a single base tilt sways it all:
 * slender ringed grey trunk, smooth green crownshaft, a cluster of orange nuts and ~8 arching fronds.
 */
function buildArecaPalmGeometry(rnd: () => number): THREE.BufferGeometry {
  const light = new THREE.Color(0xa59c88), dark = new THREE.Color(0x6e6858), tmp = new THREE.Color();
  const trunk = new THREE.CylinderGeometry(0.1, 0.15, TRUNK_H, 6, 24);
  trunk.translate(0, TRUNK_H / 2, 0);
  const parts = [colored(trunk, (_x, y) => tmp.copy(Math.floor(y / 0.34) % 2 ? dark : light).lerp(light, y / TRUNK_H * 0.4))];
  const shaft = new THREE.CylinderGeometry(0.13, 0.16, SHAFT_H, 6);
  parts.push(colored(shaft, 0x5f8f3e, trs(0, TRUNK_H + SHAFT_H / 2, 0)));
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    parts.push(colored(new THREE.IcosahedronGeometry(0.11, 0), i % 3 ? 0xe08a2e : 0x9aa83c,
      trs(Math.cos(a) * 0.22, TRUNK_H - 0.15 - rnd() * 0.45, Math.sin(a) * 0.22)));
  }
  const base = new THREE.Color(P.palmFrond), tip = new THREE.Color(P.arecaLeaf).offsetHSL(0.03, 0.05, 0.1);
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const yaw = (i / fronds) * Math.PI * 2 + rnd() * 0.35;
    // Pitch up (rz > 0) so fronds arch out and over like a shuttlecock crown.
    const m = trs(0, TRUNK_H + SHAFT_H - 0.1, 0, 0, yaw, 0.45 + rnd() * 0.35, 0.72 + rnd() * 0.2);
    parts.push(colored(buildFrondGeometry(), (x, _y, z) => tmp.copy(base).lerp(tip, Math.min(1, Math.hypot(x, z) / 2.4)), m));
  }
  return mergeColored(parts);
}

/** Betel vine (dây trầu) climbing the lower trunk: a helix stem with heart-ish leaves facing outward. */
function buildBetelVineGeometry(rnd: () => number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, a = t * Math.PI * 7;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.16, 0.1 + t * 3.4, Math.sin(a) * 0.16));
  }
  const parts = [colored(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 4, false), 0x3d5a2a)];
  const leafA = new THREE.Color(0x4f9a3a), leafB = new THREE.Color(0x2f6e2c), tmp = new THREE.Color();
  for (let i = 0; i < 26; i++) {
    const t = (i + 0.5) / 26, a = t * Math.PI * 7 + 0.6;
    const leaf = new THREE.SphereGeometry(0.12, 5, 3);
    leaf.scale(1, 1.25, 0.25);
    const m = trs(Math.cos(a) * 0.24, 0.15 + t * 3.4, Math.sin(a) * 0.24, (rnd() - 0.5) * 0.6, -a + Math.PI / 2, 0.3);
    parts.push(colored(leaf, tmp.copy(leafA).lerp(leafB, rnd()).getHex(), m));
  }
  return mergeColored(parts);
}

/**
 * Areca palms at ground points [x, y, z] (y on the visual terrain), with betel vines on every
 * `vineEvery`-th trunk. Two InstancedMeshes share the same per-frame sway matrices.
 */
export function buildArecaPalms(pts: number[][], seed: number, vineEvery = 3): SwayingVegetation {
  const g = new THREE.Group();
  g.name = 'areca-palms';
  const rnd = mulberry32(seed);
  const items: SwayInstance[] = pts.map(([x, y, z]) => {
    const s = 0.85 + rnd() * 0.3;
    return { x, y: y - 0.05, z, yaw: rnd() * Math.PI * 2, sx: s, sy: s * (0.9 + rnd() * 0.25), sz: s, phase: rnd() * 6.28 };
  });
  const vineIdx = items.map((_, i) => i).filter((i) => i % vineEvery === 0);
  const mat = vertexColorMaterial({ side: THREE.DoubleSide });
  const palms = new THREE.InstancedMesh(buildArecaPalmGeometry(rnd), mat, Math.max(1, items.length));
  const vines = new THREE.InstancedMesh(buildBetelVineGeometry(rnd), mat, Math.max(1, vineIdx.length));
  palms.name = 'areca-palm'; vines.name = 'betel-vines';
  palms.count = items.length; vines.count = vineIdx.length;
  g.add(palms, vines);

  const m = new THREE.Matrix4();
  let time = 0;
  const write = (): void => {
    let v = 0;
    for (let i = 0; i < items.length; i++) {
      const w = time * WIND_SPEED + items[i].phase;
      swayMatrix(m, items[i], Math.sin(w) * SWAY, Math.cos(w * 0.8) * SWAY);
      palms.setMatrixAt(i, m);
      if (v < vineIdx.length && vineIdx[v] === i) vines.setMatrixAt(v++, m);
    }
    palms.instanceMatrix.needsUpdate = true;
    vines.instanceMatrix.needsUpdate = true;
  };
  write();
  return { group: g, update(dtS: number) { time += dtS; write(); } };
}
