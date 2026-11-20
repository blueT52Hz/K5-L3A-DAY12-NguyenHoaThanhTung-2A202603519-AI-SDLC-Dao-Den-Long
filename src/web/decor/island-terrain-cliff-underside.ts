import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { BEACH_DROP_M } from './island-terrain-height-field';

const SEGMENTS = 44;

/** Cliff profile (radius, y) from the beach rim down to the tip; each strip between points is one stratum. */
const PROFILE: readonly (readonly [number, number])[] = [
  [40.05, -BEACH_DROP_M], [40.3, -1.1], [39.3, -2.0], [39.9, -2.6], [38.2, -4.6], [38.7, -5.2],
  [35.0, -8.2], [35.4, -8.8], [30.0, -12.4], [30.3, -13.0], [23.0, -17.2], [23.2, -17.8],
  [15.0, -22.0], [8.0, -26.0], [3.0, -29.0], [0.4, -31.0],
];
const STRIP_COLORS = [
  P.sandWet, P.soil, P.soil, P.rockLight, P.rockLight, P.rockDark, P.rockDark, P.rockLight,
  P.rockLight, P.rockDark, P.rockDark, P.rockLight, P.rockDark, P.rockDark, P.rockDark,
];

/** Deterministic hash noise in [-1, 1] for (segment, profile row) so shared strip edges coincide. */
function hash2(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Island placement for the underside: centre and gameplay rim radius (Night 1 default: (0,0), 40 m). */
export interface UndersideSpot { cx: number; cz: number; r: number }
const NIGHT_1_SPOT: UndersideSpot = { cx: 0, cz: 0, r: 40 };

/**
 * Layered faceted rock underside: separate strips per stratum for crisp colour bands.
 * The Night 1 profile is scaled to the island radius (depth scales a bit less so small islands stay chunky).
 */
export function buildCliffUnderside(spot: UndersideSpot = NIGHT_1_SPOT): THREE.Mesh {
  const k = spot.r / 40;
  const ky = 0.5 + 0.5 * k;
  const segments = Math.max(28, Math.round(SEGMENTS * k));
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  const point = (row: number, seg: number): [number, number, number] => {
    const [r0, y0] = PROFILE[row];
    const s = seg % segments;
    const jr = row <= 1 ? 0.12 : 1.1 * Math.min(1, r0 / 20);
    const r = Math.max(0, (row === 0 ? spot.r + 0.05 : r0 * k) + hash2(s, row) * jr);
    const y = row === 0 ? y0 : (y0 + hash2(row, s + 50) * 0.3) * ky;
    const a = (s / segments) * Math.PI * 2;
    return [spot.cx + Math.cos(a) * r, y, spot.cz + Math.sin(a) * r];
  };
  for (let strip = 0; strip < PROFILE.length - 1; strip++) {
    const base = pos.length / 3;
    c.setHex(STRIP_COLORS[strip] ?? P.rockDark);
    for (let s = 0; s <= segments; s++) {
      for (const row of [strip, strip + 1]) {
        pos.push(...point(row, s));
        const shade = 1 + hash2(s + strip * 7, 3) * 0.06;
        col.push(c.r * shade, c.g * shade, c.b * shade);
      }
    }
    for (let s = 0; s < segments; s++) {
      const t0 = base + s * 2, b0 = t0 + 1, t1 = t0 + 2, b1 = t0 + 3;
      idx.push(t0, t1, b0, t1, b1, b0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = 'island-cliff';
  return mesh;
}

/** Hanging roots under the rim plus floating rock debris around the underside (two InstancedMeshes). */
export function buildRootsAndFloatingRocks(lowQuality: boolean, spot: UndersideSpot = NIGHT_1_SPOT, seed = 6620): THREE.Group {
  const g = new THREE.Group();
  g.name = 'island-roots-rocks';
  const rnd = mulberry32(seed);
  const k = spot.r / 40;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const v = new THREE.Vector3(), sc = new THREE.Vector3();

  const rootGeo = new THREE.ConeGeometry(0.12, 1, 4, 3);
  rootGeo.translate(0, -0.5, 0); // hang from the tip-top anchor
  const rootCount = Math.round((lowQuality ? 30 : 70) * k);
  const roots = new THREE.InstancedMesh(rootGeo, new THREE.MeshLambertMaterial({ color: P.root, flatShading: true }), rootCount);
  for (let i = 0; i < rootCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = spot.r - 3.5 + rnd() * 3.2;
    v.set(spot.cx + Math.cos(a) * r, -1.4 - rnd() * 1.2, spot.cz + Math.sin(a) * r);
    q.setFromEuler(e.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5));
    const len = 1.2 + rnd() * 3.5;
    sc.set(0.6 + rnd() * 0.8, len, 0.6 + rnd() * 0.8);
    roots.setMatrixAt(i, m.compose(v, q, sc));
  }
  g.add(roots);

  const rockCount = Math.round((lowQuality ? 8 : 18) * k);
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), rockCount,
  );
  const cA = new THREE.Color(P.rockLight), cB = new THREE.Color(P.rockDark), tmp = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = (18 + rnd() * 30) * k;
    v.set(spot.cx + Math.cos(a) * r, (-6 - rnd() * 20) * (0.5 + 0.5 * k) + (r > spot.r ? 3 : 0), spot.cz + Math.sin(a) * r);
    q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3));
    const s = 0.5 + rnd() * 1.8;
    sc.set(s, s * (0.6 + rnd() * 0.5), s);
    rocks.setMatrixAt(i, m.compose(v, q, sc));
    rocks.setColorAt(i, tmp.copy(cA).lerp(cB, rnd()));
  }
  g.add(rocks);
  return g;
}
