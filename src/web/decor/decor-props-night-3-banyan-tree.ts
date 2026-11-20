import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { colored, jitterVertices, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';

const CANOPY_SWAY = 0.012;
const WIND_SPEED = 0.6;
const CANOPY_R = 6.2;

export interface BanyanHandle { group: THREE.Group; update(dtS: number): void }

/**
 * Big banyan (cây đa) at a ground point: braided multi-stem trunk with root buttresses, thick limbs,
 * a wide lumpy canopy (darker underneath), pillar aerial roots reaching the ground and short dangling
 * roots that sway with the canopy. `rootOk(x, z)` filters pillar roots (world XZ) against exclusion zones.
 */
export function buildBanyanTree(x: number, y: number, z: number, seed: number, rootOk: (x: number, z: number) => boolean): BanyanHandle {
  const g = new THREE.Group();
  g.name = 'banyan-tree';
  g.position.set(x, y, z);
  const rnd = mulberry32(seed);
  const bark = new THREE.Color(0x5b4634), barkDark = new THREE.Color(0x3b2c22), tmp = new THREE.Color();
  const barkFn = (_x: number, py: number) => tmp.copy(barkDark).lerp(bark, Math.min(1, py / 4));
  const fixed: THREE.BufferGeometry[] = [];

  // Braided trunk: 5 leaning stems around the centre, plus flared buttress roots.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const stem = new THREE.CylinderGeometry(0.42, 0.62, 5.2, 6, 3);
    stem.translate(0, 2.6, 0);
    fixed.push(colored(jitterVertices(stem, 0.12, rnd), barkFn, trs(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45, Math.sin(a) * 0.12, a, -Math.cos(a) * 0.12)));
    const butt = new THREE.ConeGeometry(0.5, 1.8, 4);
    butt.translate(0, 0.9, 0);
    fixed.push(colored(butt, barkDark.getHex(), trs(Math.cos(a + 0.6) * 1.0, -0.1, Math.sin(a + 0.6) * 1.0, Math.sin(a + 0.6) * 0.55, 0, -Math.cos(a + 0.6) * 0.55)));
  }
  // Limbs reaching out toward the canopy edge.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rnd() * 0.4;
    const limb = new THREE.CylinderGeometry(0.16, 0.32, 4.6, 5);
    limb.translate(0, 2.3, 0);
    fixed.push(colored(limb, barkFn, trs(Math.cos(a) * 0.5, 4.2, Math.sin(a) * 0.5, Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05)));
  }
  // Pillar aerial roots: from the limbs/canopy underside straight down to the ground.
  for (let k = 0; k < 22; k++) {
    const a = rnd() * Math.PI * 2, d = 2.0 + rnd() * (CANOPY_R - 2.8);
    const px = Math.cos(a) * d, pz = Math.sin(a) * d;
    if (!rootOk(x + px, z + pz)) continue;
    const top = 5.2 + rnd() * 1.2;
    const thick = k % 4 === 0 ? 0.13 : 0.05 + rnd() * 0.04;
    fixed.push(colored(new THREE.CylinderGeometry(thick * 0.7, thick, top, 4), k % 4 === 0 ? bark.getHex() : 0x6b5440, trs(px, top / 2 - 0.05, pz, (rnd() - 0.5) * 0.06, 0, (rnd() - 0.5) * 0.06)));
  }
  const trunkMesh = new THREE.Mesh(mergeColored(fixed), vertexColorMaterial());
  trunkMesh.name = 'banyan-trunk-roots';

  // Canopy (+ dangling short roots) as one swaying mesh pivoting at the trunk top.
  const canopyParts: THREE.BufferGeometry[] = [];
  const tones = [new THREE.Color(P.canopy), new THREE.Color(0x24583e), new THREE.Color(P.canopy).offsetHSL(0.02, 0.05, 0.05)];
  const under = new THREE.Color();
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + rnd() * 0.3;
    const d = k < 2 ? rnd() * 1.2 : 2.2 + rnd() * (CANOPY_R - 3.4);
    const r = k < 2 ? 2.8 : 1.8 + rnd() * 1.0;
    const by = 1.6 + rnd() * 1.4 + (k < 2 ? 1.0 : 0);
    const top = tones[k % tones.length];
    under.copy(top).multiplyScalar(0.42);
    const geo = jitterVertices(new THREE.IcosahedronGeometry(1, 1), 0.22, rnd);
    canopyParts.push(colored(geo, (_x, py) => tmp.copy(under).lerp(top, Math.min(1, Math.max(0, (py - (by - r * 0.7)) / (1.4 * r)))),
      trs(Math.cos(a) * d, by, Math.sin(a) * d, 0, rnd() * 3, 0, r, r * 0.62, r)));
  }
  for (let k = 0; k < 34; k++) {
    const a = rnd() * Math.PI * 2, d = 1.5 + rnd() * (CANOPY_R - 2);
    const len = 1.2 + rnd() * 2.6;
    canopyParts.push(colored(new THREE.CylinderGeometry(0.015, 0.035, len, 3), 0x7a6250, trs(Math.cos(a) * d, 1.3 - len / 2, Math.sin(a) * d)));
  }
  const canopy = new THREE.Mesh(mergeColored(canopyParts), vertexColorMaterial());
  canopy.name = 'banyan-canopy';
  const pivot = new THREE.Group();
  pivot.position.y = 5.0;
  pivot.add(canopy);
  g.add(trunkMesh, pivot);

  let time = 0;
  return {
    group: g,
    update(dtS: number) {
      time += dtS;
      const w = time * WIND_SPEED;
      pivot.rotation.x = Math.sin(w) * CANOPY_SWAY;
      pivot.rotation.z = Math.cos(w * 0.8) * CANOPY_SWAY;
    },
  };
}
