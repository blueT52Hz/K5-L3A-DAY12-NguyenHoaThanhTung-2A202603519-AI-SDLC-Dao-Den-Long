import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { colored, instancedFrom, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';

const POLE_H = 6.2;
const BANNER_H = 4.0;
const BANNER_W = 0.95;
const WIND_SPEED = 1.7;

/** Ground point for an anchored prop. */
export type GroundPoint = [number, number, number];

/**
 * Phướn banner: long vertical cloth strip hanging from the origin (top), red field with a yellow
 * border, a darker central band and a forked swallow-tail; subdivided so the sway reads soft.
 */
function buildBannerGeometry(): THREE.BufferGeometry {
  const cloth = new THREE.PlaneGeometry(BANNER_W, BANNER_H, 2, 10);
  cloth.translate(0, -BANNER_H / 2, 0);
  // Swallow-tail: pull the bottom centre vertex up.
  const p = cloth.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getY(i) + BANNER_H) < 1e-4 && Math.abs(p.getX(i)) < 1e-4) p.setY(i, -BANNER_H + 0.45);
  }
  const red = new THREE.Color(0xc8102e), deep = new THREE.Color(0x8a0c22), yellow = new THREE.Color(P.gold), tmp = new THREE.Color();
  return mergeColored([
    colored(cloth, (x, y) => {
      if (Math.abs(x) > BANNER_W * 0.38 || y > -0.25) return tmp.copy(yellow);
      return tmp.copy(Math.floor(-y / 0.6) % 2 ? red : deep);
    }),
    colored(new THREE.CylinderGeometry(0.03, 0.03, BANNER_W + 0.25, 5), P.bamboo, trs(0, 0, 0, 0, 0, Math.PI / 2)),
  ]);
}

/** Bronze incense burner (lư hương): lathe pot on three legs, two loop handles, incense sticks; `tips` = glowing ends. */
function buildIncenseBurnerGeometry(rnd: () => number): { body: THREE.BufferGeometry; tips: THREE.BufferGeometry } {
  const profile = [[0, 0.3], [0.32, 0.3], [0.46, 0.42], [0.5, 0.6], [0.42, 0.78], [0.47, 0.84], [0.44, 0.86], [0, 0.86]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const bronze = new THREE.Color(P.bronze), dark = new THREE.Color(P.bronze).multiplyScalar(0.55), tmp = new THREE.Color();
  const parts = [colored(new THREE.LatheGeometry(profile, 10), (_x, y) => tmp.copy(y > 0.78 || (y > 0.52 && y < 0.58) ? dark : bronze))];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    parts.push(colored(new THREE.CylinderGeometry(0.05, 0.07, 0.36, 5), dark.getHex(), trs(Math.cos(a) * 0.3, 0.17, Math.sin(a) * 0.3)));
  }
  for (const side of [-1, 1]) parts.push(colored(new THREE.TorusGeometry(0.1, 0.025, 4, 8), dark.getHex(), trs(side * 0.5, 0.9, 0)));
  parts.push(colored(new THREE.CylinderGeometry(0.43, 0.43, 0.02, 10), 0x9a948a, trs(0, 0.83, 0))); // ash bed
  const tips: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const sx = (rnd() - 0.5) * 0.3, sz = (rnd() - 0.5) * 0.3, h = 0.5 + rnd() * 0.15;
    parts.push(colored(new THREE.CylinderGeometry(0.008, 0.008, h, 3), 0xc23a2a, trs(sx, 0.84 + h / 2, sz)));
    tips.push(colored(new THREE.SphereGeometry(0.028, 4, 3), 0xffffff, trs(sx, 0.84 + h, sz)));
  }
  return { body: mergeColored(parts), tips: mergeColored(tips) };
}

export interface BannersAndIncenseHandle { group: THREE.Group; update(dtS: number): void }

/**
 * Banners (phướn) on tall bamboo poles that sway in the wind (stronger on windy nights), and
 * incense burners with a stone base and glowing stick tips. Poles/burners merged; banners instanced.
 */
export function buildBannersAndIncense(bannerPts: GroundPoint[], burnerPts: GroundPoint[], windy: boolean, seed: number): BannersAndIncenseHandle {
  const g = new THREE.Group();
  g.name = 'banners-incense';
  const rnd = mulberry32(seed);
  const node = new THREE.Color(P.bamboo).multiplyScalar(0.6), stem = new THREE.Color(P.bamboo), tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  const tops: { x: number; y: number; z: number; yaw: number; phase: number }[] = [];
  for (const [x, y, z] of bannerPts) {
    parts.push(colored(new THREE.CylinderGeometry(0.06, 0.09, POLE_H, 6, 8), (_x, py) => tmp.copy(((py + 20) / 0.7) % 1 < 0.12 ? node : stem), trs(x, y + POLE_H / 2 - 0.1, z)));
    parts.push(colored(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 6), P.stone, trs(x, y + 0.08, z)));
    parts.push(colored(new THREE.SphereGeometry(0.1, 6, 4), P.gold, trs(x, y + POLE_H, z)));
    tops.push({ x, y: y + POLE_H - 0.35, z, yaw: Math.atan2(x, z), phase: rnd() * 6.28 });
  }
  const burner = buildIncenseBurnerGeometry(rnd);
  const tipParts: THREE.BufferGeometry[] = [];
  for (const [x, y, z] of burnerPts) {
    const m = trs(x, y + 0.18, z, 0, rnd() * 3, 0, 1.1);
    parts.push(colored(new THREE.CylinderGeometry(0.55, 0.62, 0.2, 8), P.stone, trs(x, y + 0.1, z)));
    parts.push(burner.body.clone().applyMatrix4(m));
    tipParts.push(burner.tips.clone().applyMatrix4(m));
  }
  burner.body.dispose();
  burner.tips.dispose();
  if (parts.length) g.add(new THREE.Mesh(mergeColored(parts), vertexColorMaterial()));
  // Glowing incense tips: unlit bright orange so they read (and bloom) in the dark.
  if (tipParts.length) g.add(new THREE.Mesh(mergeColored(tipParts), new THREE.MeshBasicMaterial({ color: 0xffa040 })));

  const bannerMesh = instancedFrom(buildBannerGeometry(), vertexColorMaterial({ side: THREE.DoubleSide, emissive: 0x1a0606 }), tops.map(() => new THREE.Matrix4()), 'phuon-banners');
  g.add(bannerMesh);
  const amp = windy ? 0.32 : 0.14;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let time = 0;
  const write = (): void => {
    for (let i = 0; i < tops.length; i++) {
      const t = tops[i];
      const w = time * WIND_SPEED + t.phase;
      // Billow out of the cloth plane (x) plus a little side flutter (z), always partly blown one way.
      e.set(amp * (0.6 + 0.4 * Math.sin(w)) + Math.sin(w * 2.3) * 0.05, t.yaw, Math.sin(w * 0.9) * amp * 0.3);
      bannerMesh.setMatrixAt(i, m.compose(v.set(t.x, t.y, t.z), q.setFromEuler(e), s));
    }
    bannerMesh.instanceMatrix.needsUpdate = true;
  };
  write();
  return { group: g, update(dtS: number) { time += dtS; write(); } };
}
