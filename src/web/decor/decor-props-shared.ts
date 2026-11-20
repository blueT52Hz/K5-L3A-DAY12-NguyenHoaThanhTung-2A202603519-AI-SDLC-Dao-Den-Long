import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { scatterPoints } from './decor-scatter-placement';
import { nearDockFootprint } from './decor-night-1-anchored-layout';

const GRASS_COUNT = 700;
const GRASS_LOW_FRACTION = 0.4;
const GRASS_UNLIT = new THREE.Color(0x4a5a5c); // greyish when no lantern lit nearby
const GRASS_LIT = new THREE.Color(P.grass);
const SWAY_AMP = 0.12;
const SWAY_SPEED = 1.6;

export interface SharedProps {
  group: THREE.Group;
  refreshLitTint(): void;
  update(dtS: number): void;
}

function flat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, metalness: 0 });
}

/** Instanced grass (swaying, tinted by nearby lit lanterns), rocks and sand-rim accents. */
export function buildSharedProps(
  cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean,
): SharedProps {
  const group = new THREE.Group();
  group.name = 'props-shared';
  const rnd = mulberry32(seed ^ 0x9e3779b1);

  // Grass: thin 4-sided cones, base at y=0 so they sway around their roots.
  // Drop points inside the dock/boats/nets footprint so nothing pokes through them.
  const clear = (pts: ReturnType<typeof scatterPoints>) => pts.filter((p) => !nearDockFootprint(cfg, p[0], p[2]));
  const grassPts = clear(scatterPoints(cfg, {
    seed: seed + 1, count: Math.round(GRASS_COUNT * (lowQuality ? GRASS_LOW_FRACTION : 1)),
    minRadiusFrac: 0.1, maxRadiusFrac: 0.93, minSpacing: 0.6,
  }));
  const bladeGeo = new THREE.ConeGeometry(0.09, 0.8, 4);
  bladeGeo.translate(0, 0.4, 0);
  const grass = new THREE.InstancedMesh(bladeGeo, flat(0xffffff), Math.max(1, grassPts.length));
  grass.count = grassPts.length;
  grass.name = 'grass';
  const phases = new Float32Array(grassPts.length);
  const scales = new Float32Array(grassPts.length);
  const lit = new Uint8Array(grassPts.length);
  grassPts.forEach((_, i) => { phases[i] = rnd() * Math.PI * 2; scales[i] = 0.7 + rnd() * 0.9; grass.setColorAt(i, GRASS_UNLIT); });
  const dummy = new THREE.Object3D(); // reused, no per-frame allocation
  let time = 0;
  const writeGrass = () => {
    for (let i = 0; i < grassPts.length; i++) {
      const p = grassPts[i];
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(Math.sin(time * SWAY_SPEED + phases[i]) * SWAY_AMP, phases[i], Math.cos(time * SWAY_SPEED * 0.8 + phases[i]) * SWAY_AMP);
      dummy.scale.set(1, scales[i], 1);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
  };
  writeGrass();
  group.add(grass);

  // Rocks: low-poly dodecahedra, random squash and yaw.
  const rockPts = clear(scatterPoints(cfg, { seed: seed + 2, count: 26, minRadiusFrac: 0.15, maxRadiusFrac: 0.92, minSpacing: 3 }));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), flat(P.stone), Math.max(1, rockPts.length));
  rocks.count = rockPts.length;
  rockPts.forEach((p, i) => {
    const s = 0.5 + rnd() * 1.1;
    dummy.position.set(p[0], p[1] + 0.15 * s, p[2]);
    dummy.rotation.set(rnd(), rnd() * Math.PI * 2, rnd());
    dummy.scale.set(s, s * (0.5 + rnd() * 0.4), s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  group.add(rocks);

  // Sand accents: flat pale patches near the rim.
  const sandPts = scatterPoints(cfg, { seed: seed + 3, count: 18, minRadiusFrac: 0.8, maxRadiusFrac: 0.93, minSpacing: 2.5 });
  const sand = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.06, 10), flat(P.sand), Math.max(1, sandPts.length));
  sand.count = sandPts.length;
  sandPts.forEach((p, i) => {
    const s = 0.8 + rnd() * 1.4;
    dummy.position.set(p[0], p[1] + 0.03, p[2]);
    dummy.rotation.set(0, rnd() * Math.PI, 0);
    dummy.scale.set(s, 1, s * 0.7);
    dummy.updateMatrix();
    sand.setMatrixAt(i, dummy.matrix);
  });
  group.add(sand);

  return {
    group,
    refreshLitTint() {
      let changed = false;
      for (let i = 0; i < grassPts.length; i++) {
        const l = isLitNear(grassPts[i][0], grassPts[i][2]) ? 1 : 0;
        if (l === lit[i]) continue;
        lit[i] = l;
        grass.setColorAt(i, l ? GRASS_LIT : GRASS_UNLIT);
        changed = true;
      }
      if (changed && grass.instanceColor) grass.instanceColor.needsUpdate = true;
    },
    update(dtS: number) {
      time += dtS;
      writeGrass();
    },
  };
}
