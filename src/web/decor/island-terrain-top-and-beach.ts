import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { ISLAND_R, createTerrainHeightAt, sandBlendAt } from './island-terrain-height-field';

const RING_STEP_M = 0.8;
const SEGMENTS = 128;

/**
 * Island top: polar-grid mesh (grass centre + sloping beach ring) with seeded vertex-colour
 * variation; flatShading gives the faceted low-poly look.
 */
export function buildIslandTopMesh(cfg: NightConfig): THREE.Mesh {
  const heightAt = createTerrainHeightAt(cfg);
  const rnd = mulberry32(7301);
  const rings = Math.round(ISLAND_R / RING_STEP_M);
  const cGrass = new THREE.Color(P.grass), cLight = new THREE.Color(P.grassLight), cDark = new THREE.Color(P.grassDark);
  const cSand = new THREE.Color(P.sand).multiplyScalar(0.82), cWet = new THREE.Color(P.sandWet);
  const tmp = new THREE.Color(), sandTmp = new THREE.Color();

  const pos: number[] = [];
  const col: number[] = [];
  const pushVertex = (x: number, z: number): void => {
    const r = Math.hypot(x, z);
    pos.push(x, heightAt(x, z), z);
    // Grass: dark/light patches from a slow sine field plus a small per-vertex speckle.
    const patch = 0.5 + 0.5 * Math.sin(x * 0.11 + 0.8) * Math.cos(z * 0.13 - 0.3);
    tmp.copy(cDark).lerp(cGrass, Math.min(1, patch * 1.6)).lerp(cLight, Math.max(0, patch - 0.55) * 1.4);
    tmp.offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
    // Sand: drier inside, wet/darker near the rim.
    sandTmp.copy(cSand).lerp(cWet, Math.max(0, (r - (ISLAND_R - 2)) / 2)).offsetHSL(0, 0, (rnd() - 0.5) * 0.03);
    tmp.lerp(sandTmp, sandBlendAt(r));
    col.push(tmp.r, tmp.g, tmp.b);
  };

  pushVertex(0, 0);
  for (let i = 1; i <= rings; i++) {
    const r = Math.min(ISLAND_R, i * RING_STEP_M);
    const off = (i % 2) * 0.5; // stagger alternate rings for nicer triangles
    for (let s = 0; s < SEGMENTS; s++) {
      const a = ((s + off) / SEGMENTS) * Math.PI * 2;
      pushVertex(Math.cos(a) * r, Math.sin(a) * r);
    }
  }

  const idx: number[] = [];
  const ringStart = (i: number): number => 1 + (i - 1) * SEGMENTS;
  for (let s = 0; s < SEGMENTS; s++) idx.push(0, ringStart(1) + ((s + 1) % SEGMENTS), ringStart(1) + s);
  for (let i = 2; i <= rings; i++) {
    const a0 = ringStart(i - 1), b0 = ringStart(i);
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS;
      idx.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'island-top';
  return mesh;
}
