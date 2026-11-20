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

/** Layered faceted rock underside: separate strips per stratum for crisp colour bands. */
export function buildCliffUnderside(): THREE.Mesh {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  const point = (row: number, seg: number): [number, number, number] => {
    const [r0, y0] = PROFILE[row];
    const s = seg % SEGMENTS;
    const jr = row <= 1 ? 0.12 : 1.1 * Math.min(1, r0 / 20);
    const r = Math.max(0, r0 + hash2(s, row) * jr);
    const y = row === 0 ? y0 : y0 + hash2(row, s + 50) * 0.3;
    const a = (s / SEGMENTS) * Math.PI * 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  for (let strip = 0; strip < PROFILE.length - 1; strip++) {
    const base = pos.length / 3;
    c.setHex(STRIP_COLORS[strip] ?? P.rockDark);
    for (let s = 0; s <= SEGMENTS; s++) {
      for (const row of [strip, strip + 1]) {
        pos.push(...point(row, s));
        const shade = 1 + hash2(s + strip * 7, 3) * 0.06;
        col.push(c.r * shade, c.g * shade, c.b * shade);
      }
    }
    for (let s = 0; s < SEGMENTS; s++) {
      const t0 = base + s * 2, b0 = t0 + 1, t1 = t0 + 2, b1 = t0 + 3;
      idx.push(t0, t1, b0, t1, b1, b0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  mesh.name = 'island-cliff';
  return mesh;
}

/** Hanging roots under the rim plus floating rock debris around the underside (two InstancedMeshes). */
export function buildRootsAndFloatingRocks(lowQuality: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = 'island-roots-rocks';
  const rnd = mulberry32(6620);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const v = new THREE.Vector3(), sc = new THREE.Vector3();

  const rootGeo = new THREE.ConeGeometry(0.12, 1, 4, 3);
  rootGeo.translate(0, -0.5, 0); // hang from the tip-top anchor
  const rootCount = lowQuality ? 30 : 70;
  const roots = new THREE.InstancedMesh(rootGeo, new THREE.MeshStandardMaterial({ color: P.root, flatShading: true, roughness: 1 }), rootCount);
  for (let i = 0; i < rootCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 36.5 + rnd() * 3.2;
    v.set(Math.cos(a) * r, -1.4 - rnd() * 1.2, Math.sin(a) * r);
    q.setFromEuler(e.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5));
    const len = 1.2 + rnd() * 3.5;
    sc.set(0.6 + rnd() * 0.8, len, 0.6 + rnd() * 0.8);
    roots.setMatrixAt(i, m.compose(v, q, sc));
  }
  g.add(roots);

  const rockCount = lowQuality ? 8 : 18;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 }), rockCount,
  );
  const cA = new THREE.Color(P.rockLight), cB = new THREE.Color(P.rockDark), tmp = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 18 + rnd() * 30;
    v.set(Math.cos(a) * r, -6 - rnd() * 20 + (r > 40 ? 3 : 0), Math.sin(a) * r);
    q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3));
    const s = 0.5 + rnd() * 1.8;
    sc.set(s, s * (0.6 + rnd() * 0.5), s);
    rocks.setMatrixAt(i, m.compose(v, q, sc));
    rocks.setColorAt(i, tmp.copy(cA).lerp(cB, rnd()));
  }
  g.add(rocks);
  return g;
}
