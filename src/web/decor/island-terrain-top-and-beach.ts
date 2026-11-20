import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { baseDiscs, createTerrainHeightAt, rimDistance, sandBlendFromRim } from './island-terrain-height-field';

const RING_STEP_M = 0.8;

/** Polar patch of a walkable top: centre (cx,cz), radii rIn..rOut, angle range from +X toward +Z. */
export interface TopPatch {
  cx: number; cz: number; rIn: number; rOut: number;
  thetaStart?: number; thetaLen?: number;
  /** 'beach' = sand ring at the base-disc rim; 'paved' = light stone border at both radial edges (tiers). */
  rim: 'beach' | 'paved';
  /** Gameplay level of this patch; vertices whose ground belongs to another tier snap back to it. */
  level: number;
  name: string;
}

/**
 * Island top: polar-grid mesh with seeded vertex-colour grass variation and a sand or paved rim;
 * flatShading gives the faceted low-poly look. Heights come from the shared visual height field.
 */
export function buildTopPatchMesh(cfg: NightConfig, patch: TopPatch, seed: number): THREE.Mesh {
  const heightAt = createTerrainHeightAt(cfg);
  const discs = baseDiscs(cfg);
  const rnd = mulberry32(seed);
  const full = patch.thetaLen === undefined;
  const t0 = patch.thetaStart ?? 0, tLen = patch.thetaLen ?? Math.PI * 2;
  const segs = Math.max(24, Math.round((patch.rOut * tLen) / 2));
  const cols = full ? segs : segs + 1;
  const rings = Math.max(1, Math.round((patch.rOut - patch.rIn) / RING_STEP_M));
  const cGrass = new THREE.Color(P.grass), cLight = new THREE.Color(P.grassLight), cDark = new THREE.Color(P.grassDark);
  const cSand = new THREE.Color(P.sand).multiplyScalar(0.82), cWet = new THREE.Color(P.sandWet);
  const cPave = new THREE.Color(P.stone).multiplyScalar(0.8);
  const tmp = new THREE.Color(), rimTmp = new THREE.Color();

  const pos: number[] = [];
  const col: number[] = [];
  const pushVertex = (x: number, z: number, r: number): void => {
    const h = heightAt(x, z);
    pos.push(x, h > patch.level + 0.45 || h < patch.level - 1 ? patch.level : h, z);
    // Grass: dark/light patches from a slow sine field plus a small per-vertex speckle.
    const pt = 0.5 + 0.5 * Math.sin(x * 0.11 + 0.8) * Math.cos(z * 0.13 - 0.3);
    tmp.copy(cDark).lerp(cGrass, Math.min(1, pt * 1.6)).lerp(cLight, Math.max(0, pt - 0.55) * 1.4);
    tmp.offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
    if (patch.rim === 'beach') {
      const rim = rimDistance(discs, x, z);
      rimTmp.copy(cSand).lerp(cWet, Math.max(0, (2 - rim) / 2)).offsetHSL(0, 0, (rnd() - 0.5) * 0.03);
      tmp.lerp(rimTmp, sandBlendFromRim(rim));
    } else {
      const edge = Math.min(patch.rOut - r, patch.rIn > 0 ? r - patch.rIn : Infinity);
      if (edge < 0.9) tmp.copy(cPave).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
    }
    col.push(tmp.r, tmp.g, tmp.b);
  };

  const hasCentre = patch.rIn <= 0 && full;
  if (hasCentre) pushVertex(patch.cx, patch.cz, 0);
  const firstRing = hasCentre ? 1 : 0;
  for (let i = firstRing; i <= rings; i++) {
    const r = patch.rIn + ((patch.rOut - patch.rIn) * i) / rings;
    const off = full ? (i % 2) * 0.5 : 0; // stagger alternate rings for nicer triangles
    for (let s = 0; s < cols; s++) {
      const a = t0 + ((s + off) / segs) * tLen;
      pushVertex(patch.cx + Math.cos(a) * r, patch.cz + Math.sin(a) * r, r);
    }
  }

  const idx: number[] = [];
  const ringStart = (i: number): number => (hasCentre ? 1 : 0) + (i - firstRing) * cols;
  if (hasCentre) for (let s = 0; s < segs; s++) idx.push(0, ringStart(1) + ((s + 1) % segs), ringStart(1) + s);
  for (let i = firstRing + 1; i <= rings; i++) {
    const a0 = ringStart(i - 1), b0 = ringStart(i);
    for (let s = 0; s < segs; s++) {
      const s1 = full ? (s + 1) % segs : s + 1;
      idx.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = patch.name;
  return mesh;
}

/** Night 1 compatibility: the full island top (grass centre + sloping beach ring). */
export function buildIslandTopMesh(cfg: NightConfig): THREE.Mesh {
  const d = baseDiscs(cfg)[0];
  return buildTopPatchMesh(cfg, { cx: d.cx, cz: d.cz, rIn: 0, rOut: d.r, rim: 'beach', level: d.y, name: 'island-top' }, 7301);
}
