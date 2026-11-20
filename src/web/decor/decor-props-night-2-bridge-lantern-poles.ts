import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { paperLanternPositions } from './decor-scatter-placement';
import { colored, instancedFrom, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { buildPaperLanternStrings, sagRopeGeometry } from './decor-village-paper-lantern-strings';

const POLE_H = 2.6;
const RAIL_Y = [0.45, 0.95];
const HANG_SWING = 0.12; // rad, lanterns swing gently on their hooks
const SWING_SPEED = 1.3;

/** Paper lantern on a hook: ribbed red body, dark caps and a gold tassel (white body so the material tints it). */
function buildHangingLanternGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(0.26, 10, 7);
  body.scale(1, 1.2, 1);
  body.translate(0, -0.45, 0);
  return mergeColored([
    colored(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 3), 0x2a1a12, trs(0, -0.07, 0)),
    colored(body, 0xffffff),
    colored(new THREE.CylinderGeometry(0.1, 0.13, 0.07, 8), 0x2a1a12, trs(0, -0.12, 0)),
    colored(new THREE.CylinderGeometry(0.13, 0.1, 0.07, 8), 0x2a1a12, trs(0, -0.78, 0)),
    colored(new THREE.ConeGeometry(0.05, 0.22, 5), P.gold, trs(0, -0.93, 0, Math.PI)),
  ]);
}

export interface BridgeLanternsHandle { group: THREE.Group; update(dtS: number): void }

/**
 * Bamboo poles at every paperLanternPositions() point (both bridge sides, z = +-2.3) with an outward
 * arm and a swinging red lantern, bamboo hand rails between poles, and a small lantern string
 * sagging between pole tops. Poles/rails = one merged mesh; lanterns = one InstancedMesh.
 */
export function buildBridgeLanternPoles(cfg: NightConfig): BridgeLanternsHandle {
  const g = new THREE.Group();
  g.name = 'bridge-lantern-poles';
  const posts = paperLanternPositions(cfg);
  if (posts.length === 0) return { group: g, update() {} };
  const node = new THREE.Color(P.bamboo).multiplyScalar(0.6), stem = new THREE.Color(P.bamboo), tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  const hooks: { x: number; y: number; z: number; phase: number }[] = [];
  posts.forEach(([x, y, z], i) => {
    const pole = new THREE.CylinderGeometry(0.07, 0.09, POLE_H + 0.4, 6, 6);
    parts.push(colored(pole, (_x, py) => tmp.copy(((py + 10) / 0.5) % 1 < 0.15 ? node : stem), trs(x, y + POLE_H / 2 - 0.2, z)));
    const side = Math.sign(z) || 1;
    parts.push(colored(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), P.bamboo, trs(x, y + POLE_H - 0.15, z + side * 0.3, Math.PI / 2)));
    hooks.push({ x, y: y + POLE_H - 0.18, z: z + side * 0.6, phase: i * 1.37 });
  });
  // Hand rails: bamboo between consecutive poles on the same side.
  const sides = [posts.filter((p) => p[2] < 0), posts.filter((p) => p[2] > 0)];
  const spans: [THREE.Vector3, THREE.Vector3][] = [];
  for (const row of sides) {
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i], b = row[i + 1];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]), mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2;
      for (const ry of RAIL_Y) parts.push(colored(new THREE.CylinderGeometry(0.05, 0.05, len, 5), P.bamboo, trs(mx, a[1] + ry, mz, 0, 0, Math.PI / 2)));
      spans.push([new THREE.Vector3(a[0], a[1] + POLE_H, a[2]), new THREE.Vector3(b[0], b[1] + POLE_H, b[2])]);
    }
    // Rope ties at the rail joints.
    for (const p of row) parts.push(colored(sagRopeGeometry([new THREE.Vector3(p[0], p[1] + 0.95, p[2] - 0.08), new THREE.Vector3(p[0], p[1] + 0.95, p[2] + 0.08)], 0, 0.06), P.rope));
  }
  g.add(new THREE.Mesh(mergeColored(parts), vertexColorMaterial()));
  g.add(buildPaperLanternStrings(spans, 2, 0.3));

  const mat = new THREE.MeshStandardMaterial({ color: P.paperLantern, emissive: 0xff4a1c, emissiveIntensity: 1.1, roughness: 0.8, vertexColors: true });
  const lanterns = instancedFrom(buildHangingLanternGeometry(), mat, hooks.map((h) => trs(h.x, h.y, h.z)), 'bridge-hanging-lanterns');
  g.add(lanterns);
  // One warm light over the bridge middle so the deck reads cosy (no shadows; one light keeps shading cheap).
  const xs = posts.map((p) => p[0]);
  const light = new THREE.PointLight(P.lanternLit, 22, 16, 2);
  light.position.set((Math.min(...xs) + Math.max(...xs)) / 2, posts[0][1] + 2.4, 0);
  g.add(light);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let time = 0;
  return {
    group: g,
    update(dtS: number) {
      time += dtS;
      for (let i = 0; i < hooks.length; i++) {
        const h = hooks[i];
        const w = time * SWING_SPEED + h.phase;
        q.setFromEuler(e.set(Math.sin(w) * HANG_SWING, 0, Math.cos(w * 0.7) * HANG_SWING * 0.6));
        lanterns.setMatrixAt(i, m.compose(v.set(h.x, h.y, h.z), q, s));
      }
      lanterns.instanceMatrix.needsUpdate = true;
    },
  };
}
