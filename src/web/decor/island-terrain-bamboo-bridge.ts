import * as THREE from 'three';
import type { NightConfig, Surface } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, flatMaterial, instancedFrom, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { mulberry32 } from './seeded-random';

type Rect = Extract<Surface, { kind: 'rect' }>;

const CULM_R = 0.1;
const CULM_STEP = 0.21;

/**
 * Bamboo bridge deck over every rect surface: cross culms (top flush with the gameplay y), two log
 * stringers, lashing bands and stilts dropping into the void at each end. Rails/lantern poles are props.
 */
export function buildBambooBridges(cfg: NightConfig): THREE.Group {
  const g = new THREE.Group();
  g.name = 'bamboo-bridges';
  const rnd = mulberry32(8812);
  const culmMs: THREE.Matrix4[] = [];
  const frame: THREE.BufferGeometry[] = [];
  const dark = new THREE.Color(P.wood).multiplyScalar(0.75).getHex();
  for (const s of cfg.surfaces) {
    if (s.kind !== 'rect') continue;
    const r: Rect = s;
    const depth = r.zMax - r.zMin + 0.5, cz = (r.zMin + r.zMax) / 2;
    // Extend 1.5 m onto each island so the deck tucks into the beach.
    for (let x = r.xMin - 1.5; x <= r.xMax + 1.5; x += CULM_STEP) {
      culmMs.push(trs(x + (rnd() - 0.5) * 0.03, r.y - CULM_R, cz + (rnd() - 0.5) * 0.12, Math.PI / 2, 0, (rnd() - 0.5) * 0.04, 1, depth, 1));
    }
    const len = r.xMax - r.xMin + 3, cx = (r.xMin + r.xMax) / 2;
    for (const z of [r.zMin + 0.4, r.zMax - 0.4]) {
      frame.push(colored(new THREE.CylinderGeometry(0.16, 0.16, len, 6), dark, trs(cx, r.y - 0.33, z, 0, 0, Math.PI / 2)));
    }
    // Rope lashing bands every ~1.5 m.
    for (let x = r.xMin; x <= r.xMax; x += 1.5) {
      for (const z of [r.zMin + 0.4, r.zMax - 0.4]) {
        frame.push(colored(new THREE.TorusGeometry(0.2, 0.035, 4, 8), P.rope, trs(x, r.y - 0.25, z, 0, Math.PI / 2, 0)));
      }
    }
    // Crossed stilt braces under the middle (purely decorative, hang into the cloud gap).
    for (const x of [r.xMin + 4, cx, r.xMax - 4]) {
      for (const z of [r.zMin + 0.4, r.zMax - 0.4]) {
        frame.push(colored(new THREE.CylinderGeometry(0.09, 0.07, 3.2, 5), dark, trs(x, r.y - 1.9, z, 0, 0, 0.12)));
      }
    }
  }
  if (culmMs.length === 0) return g;
  const culms = instancedFrom(new THREE.CylinderGeometry(CULM_R, CULM_R, 1, 6), flatMaterial(0xffffff), culmMs, 'bridge-culms');
  const c = new THREE.Color();
  culmMs.forEach((_, i) => culms.setColorAt(i, c.setHex(P.bamboo).lerp(new THREE.Color(P.thatch), 0.55 + rnd() * 0.3).offsetHSL(0, 0, (rnd() - 0.5) * 0.08)));
  g.add(culms, new THREE.Mesh(mergeColored(frame), vertexColorMaterial()));
  return g;
}
