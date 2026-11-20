import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';

const BOB_AMP_M = 0.6;
const BOB_SPEED = 0.35;

export interface CloudSeaHandle {
  mesh: THREE.InstancedMesh;
  update(dtS: number): void;
}

/**
 * Cloud sea: puffy clusters of icosahedron blobs (one InstancedMesh) floating below the island,
 * each cluster bobbing slowly with its own phase. Fog fades distant clusters into the sky.
 */
export function buildCloudSea(lowQuality: boolean): CloudSeaHandle {
  const rnd = mulberry32(4101);
  const clusterCount = lowQuality ? 26 : 52;
  const blobs: { x: number; y: number; z: number; s: number; sy: number; rot: number; cluster: number }[] = [];
  const phases: number[] = [];
  for (let c = 0; c < clusterCount; c++) {
    const a = rnd() * Math.PI * 2;
    // Inner clusters hug the island rim, outer ones spread to the horizon.
    const inner = c < clusterCount * 0.35;
    const d = inner ? 36 + rnd() * 26 : 60 + rnd() * 100;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const cy = inner ? -9 - rnd() * 7 : -14 - rnd() * 8;
    const size = inner ? 3 + rnd() * 3 : 6 + rnd() * 8;
    phases.push(rnd() * Math.PI * 2);
    const n = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const ox = (rnd() - 0.5) * size * 2.6, oz = (rnd() - 0.5) * size * 1.8;
      const s = size * (0.55 + rnd() * 0.6) * (k === 0 ? 1.3 : 1);
      blobs.push({ x: cx + ox, y: cy + (rnd() - 0.2) * size * 0.35, z: cz + oz, s, sy: s * (0.55 + rnd() * 0.25), rot: rnd() * Math.PI, cluster: c });
    }
  }

  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0x0d1030, emissiveIntensity: 0.7, roughness: 1, metalness: 0, flatShading: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, blobs.length);
  mesh.name = 'cloud-sea';
  const cTop = new THREE.Color(P.cloudPuff), cLow = new THREE.Color(P.cloudSea), tmp = new THREE.Color();
  blobs.forEach((b, i) => mesh.setColorAt(i, tmp.copy(cLow).lerp(cTop, 0.25 + rnd() * 0.5)));

  const dummy = new THREE.Object3D();
  let time = 0;
  const write = (): void => {
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      const bob = Math.sin(time * BOB_SPEED + phases[b.cluster]) * BOB_AMP_M;
      dummy.position.set(b.x, b.y + bob, b.z);
      dummy.rotation.set(0, b.rot + time * 0.01, 0);
      dummy.scale.set(b.s, b.sy, b.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  write();
  return {
    mesh,
    update(dtS: number) {
      time += dtS;
      write();
    },
  };
}
