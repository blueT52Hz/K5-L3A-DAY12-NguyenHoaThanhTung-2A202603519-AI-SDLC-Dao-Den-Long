import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { scatterPoints } from './decor-scatter-placement';
import { nearDockFootprint } from './decor-night-1-anchored-layout';
import { colored, flatMaterial, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';

const GRASS_COUNT = 700;
const GRASS_LOW_FRACTION = 0.4;
const GRASS_UNLIT = new THREE.Color(0x9aa6a4); // greyish when no lantern lit nearby
const GRASS_LIT = new THREE.Color(0xffffff).lerp(new THREE.Color(P.lanternCore), 0.35); // warm tint near lit lanterns
const SWAY_AMP = 0.1;
const SWAY_SPEED = 1.6;

export interface SharedProps {
  group: THREE.Group;
  refreshLitTint(): void;
  update(dtS: number): void;
}

/** Grass tuft: 5 bent tapered blades fanning out, dark at the root and light at the tips (vertex colours). */
function buildGrassTuftGeometry(): THREE.BufferGeometry {
  const root = new THREE.Color(P.grass), tip = new THREE.Color(P.grassLight).offsetHSL(0.04, 0.15, 0.2);
  const tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + i * 0.4;
    const h = 0.55 + (i % 3) * 0.18;
    const pos = [-0.045, 0, 0, 0.045, 0, 0, -0.02, h * 0.55, 0.06, 0.02, h * 0.55, 0.06, 0, h, 0.2];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    parts.push(colored(g, (_x, y) => tmp.copy(root).lerp(tip, Math.min(1, y / 0.8)), trs(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05, 0.15, a, 0)));
  }
  const tuft = mergeColored(parts);
  // Up-facing normals: blades light like the ground instead of going black on their back faces.
  const n = tuft.getAttribute('normal');
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return tuft;
}

/** Instanced grass tufts (swaying, tinted by nearby lit lanterns) and rocks, lifted onto the visual terrain. */
export function buildSharedProps(
  cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean,
  heightAt: (x: number, z: number) => number = () => 0,
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
  grassPts.forEach((p) => { p[1] = heightAt(p[0], p[2]) - 0.03; });
  const grass = new THREE.InstancedMesh(buildGrassTuftGeometry(), vertexColorMaterial({ side: THREE.DoubleSide }), Math.max(1, grassPts.length));
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
      dummy.scale.set(scales[i] * 1.2, scales[i], scales[i] * 1.2);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
  };
  writeGrass();
  group.add(grass);

  // Rocks: low-poly dodecahedra, random squash and yaw.
  const rockPts = clear(scatterPoints(cfg, { seed: seed + 2, count: 26, minRadiusFrac: 0.15, maxRadiusFrac: 0.92, minSpacing: 3 }));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), flatMaterial(P.stone), Math.max(1, rockPts.length));
  rocks.count = rockPts.length;
  rockPts.forEach((p, i) => {
    const s = 0.5 + rnd() * 1.1;
    dummy.position.set(p[0], heightAt(p[0], p[2]) + 0.1 * s, p[2]);
    dummy.rotation.set(rnd(), rnd() * Math.PI * 2, rnd());
    dummy.scale.set(s, s * (0.5 + rnd() * 0.4), s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  group.add(rocks);

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
