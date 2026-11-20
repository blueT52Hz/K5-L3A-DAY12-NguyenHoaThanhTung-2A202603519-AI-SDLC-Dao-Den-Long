import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Faceted standard material (low-poly look), no metalness. */
export function flatMaterial(color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, metalness: 0, ...extra });
}

/** Faceted material that reads per-vertex colours (white base so instance colours still tint). */
export function vertexColorMaterial(extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  // colored() geometry already carries per-face normals; skipping flatShading avoids NaN normals
  // (derivative-based) on sub-pixel slivers, which bloom would smear into blocky artifacts.
  return flatMaterial(0xffffff, { vertexColors: true, flatShading: false, ...extra });
}

type ColorFn = (x: number, y: number, z: number) => THREE.Color;

/**
 * Non-indexed copy of `geo` holding only position/normal/color, so pieces can be merged.
 * `color` is a hex or a per-vertex function of the (already transformed) position.
 */
export function colored(geo: THREE.BufferGeometry, color: number | ColorFn, matrix?: THREE.Matrix4): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  if (matrix) g.applyMatrix4(matrix);
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const fixed = typeof color === 'number' ? new THREE.Color(color) : null;
  for (let i = 0; i < pos.count; i++) {
    const c = fixed ?? (color as ColorFn)(pos.getX(i), pos.getY(i), pos.getZ(i));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Merge pieces built by `colored()` into one geometry (inputs are disposed). */
export function mergeColored(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('mergeColored: incompatible geometry attributes');
  return merged;
}

/** Translation + yaw/pitch/roll + scale as a matrix (helper for building merged pieces). */
export function trs(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** Seeded radial jitter of a geometry's vertices (shared positions move together after merge). */
export function jitterVertices(geo: THREE.BufferGeometry, amount: number, rnd: () => number): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) { d = [(rnd() - 0.5) * amount, (rnd() - 0.5) * amount, (rnd() - 0.5) * amount]; seen.set(key, d); }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  pos.needsUpdate = true;
  return geo;
}

/** Fill an InstancedMesh from a list of matrices (count clamps to the list length). */
export function instancedFrom(
  geo: THREE.BufferGeometry, mat: THREE.Material, matrices: THREE.Matrix4[], name: string,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  mesh.name = name;
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  return mesh;
}

const _q = new THREE.Quaternion(), _qTilt = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

/** Swaying instance placement: base yaw/scale with a small world-space tilt (wind) about the base. */
export interface SwayInstance { x: number; y: number; z: number; yaw: number; sx: number; sy: number; sz: number; phase: number }

/** Write the matrix of `b` tilted by (tiltX, tiltZ) radians into `out` (no allocations). */
export function swayMatrix(out: THREE.Matrix4, b: SwayInstance, tiltX: number, tiltZ: number): THREE.Matrix4 {
  _q.setFromAxisAngle(_up, b.yaw);
  _qTilt.setFromEuler(_e.set(tiltX, 0, tiltZ));
  _q.premultiply(_qTilt);
  return out.compose(_p.set(b.x, b.y, b.z), _q, _s.set(b.sx, b.sy, b.sz));
}
