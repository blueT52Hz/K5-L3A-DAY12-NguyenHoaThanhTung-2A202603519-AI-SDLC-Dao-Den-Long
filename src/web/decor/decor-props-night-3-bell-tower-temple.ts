import * as THREE from 'three';
import type { CylinderObstacle } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';

const BELL_SWING = 0.05; // rad
const BELL_SPEED = 0.9;

/**
 * Curved đình-style hip roof: concave square pyramid (half-size `half`, rise `h`) whose four
 * corners sweep up by `lift`; tile courses as darker bands, light trim along the eaves.
 */
function buildCurvedRoofGeometry(half: number, h: number, lift: number): THREE.BufferGeometry {
  const N = 12;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1, v = (j / N) * 2 - 1;
      const m = Math.max(Math.abs(u), Math.abs(v));
      const corner = Math.pow(Math.min(Math.abs(u), Math.abs(v)), 3) * Math.pow(m, 4);
      pos.push(u * half, h * Math.pow(1 - m, 1.7) + lift * corner, v * half);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const tile = new THREE.Color(P.roofTile), tileDark = new THREE.Color(P.roofTile).multiplyScalar(0.7);
  const trim = new THREE.Color(0xd8c9a0), tmp = new THREE.Color();
  return colored(g, (x, _y, z) => {
    const m = Math.max(Math.abs(x), Math.abs(z)) / half;
    if (m > 0.92) return tmp.copy(trim);
    return tmp.copy(Math.floor(m * 9) % 2 ? tile : tileDark);
  });
}

/** Corner dragon-tail horns (upturned cones) and a ridge finial for a roof of half-size `half` at height y. */
function roofOrnaments(half: number, y: number, lift: number, parts: THREE.BufferGeometry[]): void {
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const r = half * Math.SQRT2;
    parts.push(colored(new THREE.ConeGeometry(0.12, 0.7, 5), P.gold, trs(Math.cos(a) * r, y + lift + 0.2, Math.sin(a) * r, 0, -a, 0.6)));
  }
}

export interface BellTowerHandle { group: THREE.Group; update(dtS: number): void }

/**
 * Bell tower dressing around the gameplay obstacle (footprint unchanged: everything at ground level
 * stays within r; only the raised roofs overhang): octagonal stone pedestal from `baseY`, a slab,
 * four red lacquered columns, a bronze bell (gently swinging), two tiers of curved đình roofs.
 */
export function buildBellTowerTemple(o: CylinderObstacle, baseY: number): BellTowerHandle {
  const g = new THREE.Group();
  g.name = 'bell-tower-temple';
  g.position.set(o.cx, 0, o.cz);
  const r = o.r;
  const pedTop = baseY + 2.6;
  const colTop = o.yTop - 2.2;
  const parts: THREE.BufferGeometry[] = [];
  const stoneA = new THREE.Color(P.stone), stoneB = new THREE.Color(P.rockLight), tmp = new THREE.Color();
  const ped = new THREE.CylinderGeometry(r * 0.96, r, pedTop - baseY, 8, 5);
  parts.push(colored(ped, (x, y, z) => tmp.copy((Math.floor(y / 0.52) + Math.floor((Math.atan2(z, x) + 4) * 1.3)) % 2 ? stoneA : stoneB), trs(0, (baseY + pedTop) / 2, 0)));
  parts.push(colored(new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.25, 8), 0xa8a294, trs(0, pedTop + 0.12, 0)));
  // Columns + lintels.
  const c = r * 0.72;
  for (const [x, z] of [[c, c], [-c, c], [c, -c], [-c, -c]]) {
    parts.push(colored(new THREE.CylinderGeometry(0.13, 0.15, colTop - pedTop, 7), 0xa3241e, trs(x, (pedTop + colTop) / 2, z)));
  }
  for (const [x, z, ry] of [[0, c, 0], [0, -c, 0], [c, 0, Math.PI / 2], [-c, 0, Math.PI / 2]]) {
    parts.push(colored(new THREE.BoxGeometry(c * 2 + 0.3, 0.22, 0.2), 0x6e1a16, trs(x, colTop - 0.1, z, 0, ry, 0)));
  }
  parts.push(colored(new THREE.BoxGeometry(c * 2 + 0.2, 0.18, 0.18), P.wood, trs(0, colTop - 0.4, 0)));
  // Lower roof, drum, upper roof and finial.
  const lowHalf = r * 1.6, upHalf = r * 1.05;
  parts.push(buildCurvedRoofGeometry(lowHalf, 1.1, 0.55).applyMatrix4(trs(0, colTop, 0)));
  roofOrnaments(lowHalf, colTop, 0.55, parts);
  parts.push(colored(new THREE.BoxGeometry(c * 1.9, 0.9, c * 1.9), 0x8a2a22, trs(0, colTop + 1.0, 0)));
  const upY = colTop + 1.35;
  parts.push(buildCurvedRoofGeometry(upHalf, 1.0, 0.4).applyMatrix4(trs(0, upY, 0, 0, Math.PI / 4)));
  parts.push(colored(new THREE.SphereGeometry(0.22, 8, 6), P.gold, trs(0, upY + 1.15, 0)));
  parts.push(colored(new THREE.ConeGeometry(0.1, 0.5, 6), P.gold, trs(0, upY + 1.5, 0)));
  g.add(new THREE.Mesh(mergeColored(parts), vertexColorMaterial({ side: THREE.DoubleSide })));

  // Bronze bell (lathe) hanging from the beam; pivot at the hook so it can swing.
  const profile = [[0, 0.05], [0.66, 0], [0.62, 0.12], [0.5, 0.45], [0.44, 0.85], [0.38, 1.05], [0.2, 1.12], [0, 1.14]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const bellGeo = new THREE.LatheGeometry(profile, 12);
  bellGeo.translate(0, -1.34, 0);
  const bellMat = new THREE.MeshStandardMaterial({ color: P.bronze, emissive: 0x3a2008, emissiveIntensity: 0.5, roughness: 0.45, metalness: 0.6, flatShading: true, side: THREE.DoubleSide });
  const bell = new THREE.Mesh(bellGeo, bellMat);
  bell.name = 'bronze-bell';
  const pivot = new THREE.Group();
  pivot.position.set(0, colTop - 0.5, 0);
  pivot.add(bell);
  g.add(pivot);
  let time = 0;
  return {
    group: g,
    update(dtS: number) {
      time += dtS;
      pivot.rotation.x = Math.sin(time * BELL_SPEED) * BELL_SWING;
      pivot.rotation.z = Math.cos(time * BELL_SPEED * 0.7) * BELL_SWING * 0.5;
    },
  };
}
