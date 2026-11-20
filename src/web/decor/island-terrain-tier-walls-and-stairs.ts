import * as THREE from 'three';
import type { NightConfig, Surface } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, mergeColored, trs } from './decor-geometry-helpers';

const ROW_H = 0.5; // stone course height
const BLOCK_L = 1.15; // nominal block length along the wall
const STONE_SHADES = [P.stone, P.rockLight, 0x9a9488, 0x7d7b86];

type Ramp = Extract<Surface, { kind: 'ramp' }>;

/** Deterministic hash in [0, 1) for block colour / inset. */
function hash01(a: number, b: number): number {
  const s = Math.sin(a * 91.7 + b * 47.3) * 24634.6345;
  return s - Math.floor(s);
}

/** Collects non-indexed coloured triangles for stone facing. */
class StoneWallBuilder {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();

  quad(p: number[][], color: number, shade: number): void {
    this.c.setHex(color).multiplyScalar(shade);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.col.push(this.c.r, this.c.g, this.c.b);
    }
  }

  /**
   * Wall along path(t) (t in 0..1, XZ) of the given length from y0 up to y1: staggered stone courses,
   * per-block colour and slight push along `outward(t)` so each block reads separately; plus a coping lip.
   */
  wall(path: (t: number) => [number, number], outward: (t: number) => [number, number], length: number, y0: number, y1: number, key: number): void {
    const rows = Math.max(1, Math.round((y1 - y0) / ROW_H));
    const blocks = Math.max(1, Math.round(length / BLOCK_L));
    const at = (t: number, y: number, push: number): number[] => {
      const [x, z] = path(t), [ox, oz] = outward(t);
      return [x + ox * push, y, z + oz * push];
    };
    for (let r = 0; r < rows; r++) {
      const ya = y0 + ((y1 - y0) * r) / rows, yb = y0 + ((y1 - y0) * (r + 1)) / rows;
      const off = (r % 2) * 0.5;
      for (let b = -1; b < blocks; b++) {
        const ta = Math.max(0, (b + off) / blocks), tb = Math.min(1, (b + 1 + off) / blocks);
        if (tb <= ta) continue;
        const h = hash01(key + b, r);
        const push = 0.02 + h * 0.07;
        const color = STONE_SHADES[Math.floor(h * STONE_SHADES.length)];
        this.quad([at(ta, ya, push), at(tb, ya, push), at(tb, yb - 0.04, push), at(ta, yb - 0.04, push)], color, 0.78 + h * 0.2);
        // dark mortar strip under each course
        this.quad([at(ta, yb - 0.04, 0), at(tb, yb - 0.04, 0), at(tb, yb, 0), at(ta, yb, 0)], P.rockDark, 0.8);
      }
    }
    // Coping lip: protruding cap with a top face.
    for (let b = 0; b < blocks; b++) {
      const ta = b / blocks, tb = (b + 1) / blocks;
      const shade = 0.9 + hash01(key + b, 99) * 0.15;
      this.quad([at(ta, y1 - 0.18, 0.16), at(tb, y1 - 0.18, 0.16), at(tb, y1 + 0.06, 0.16), at(ta, y1 + 0.06, 0.16)], 0xa8a294, shade);
      this.quad([at(ta, y1 + 0.06, 0.16), at(tb, y1 + 0.06, 0.16), at(tb, y1 + 0.06, -0.25), at(ta, y1 + 0.06, -0.25)], 0xb4ae9e, shade);
    }
  }

  /** Arc wall at radius r around (cx,cz) from angle a0 to a1; `facing` +1 = outward, -1 = toward the centre. */
  arc(cx: number, cz: number, r: number, a0: number, a1: number, y0: number, y1: number, facing: 1 | -1, key: number): void {
    const ang = (t: number) => a0 + (a1 - a0) * t;
    this.wall(
      (t) => [cx + Math.cos(ang(t)) * r, cz + Math.sin(ang(t)) * r],
      (t) => [Math.cos(ang(t)) * facing, Math.sin(ang(t)) * facing],
      Math.abs(a1 - a0) * r, y0, y1, key,
    );
  }

  /** Straight wall from (x0,z0) to (x1,z1) facing along normal (nx,nz). */
  line(x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, y0: number, y1: number, key: number): void {
    this.wall((t) => [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t], () => [nx, nz], Math.hypot(x1 - x0, z1 - z0), y0, y1, key);
  }

  mesh(name: string): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    return m;
  }
}

/** Stone stairs over a gameplay ramp: steps whose tops straddle the slope, with raised side cheeks. */
function buildRampStairs(ramp: Ramp, baseY: number): THREE.BufferGeometry {
  const a = (ramp.angleDeg * Math.PI) / 180;
  const steps = 8;
  const parts: THREE.BufferGeometry[] = [];
  const stepLen = Math.abs(ramp.rTo - ramp.rFrom) / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const along = ramp.rFrom + (ramp.rTo - ramp.rFrom) * t;
    const top = ramp.yFrom + (ramp.yTo - ramp.yFrom) * t;
    const h = top - baseY;
    const x = Math.cos(a) * along, z = Math.sin(a) * along;
    const shade = i % 2 ? 0x9a9488 : 0xaaa497;
    // Box local x = radial direction: yaw -a maps +x to (cos a, sin a).
    parts.push(colored(new THREE.BoxGeometry(stepLen + 0.02, h, ramp.width), shade, trs(x, baseY + h / 2, z, 0, -a, 0)));
    for (const side of [-1, 1]) {
      const ox = -Math.sin(a) * side * (ramp.width / 2 + 0.2), oz = Math.cos(a) * side * (ramp.width / 2 + 0.2);
      parts.push(colored(new THREE.BoxGeometry(stepLen + 0.02, h + 0.35, 0.4), P.rockLight, trs(x + ox, baseY + (h + 0.35) / 2, z + oz, 0, -a, 0)));
    }
  }
  return mergeColored(parts);
}

/** Night 3 tier walls (stone facing, coping), end caps of the half ring, and stone stairs on both ramps. */
export function buildTierWallsAndStairs(cfg: NightConfig): THREE.Group {
  const g = new THREE.Group();
  g.name = 'tier-walls-stairs';
  const b = new StoneWallBuilder();
  let key = 1;
  for (const s of cfg.surfaces) {
    if (s.kind === 'disc' && s.y > 0) b.arc(s.cx, s.cz, s.r, 0, Math.PI * 2, 0, s.y, 1, (key += 100));
    if (s.kind !== 'annulus') continue;
    const half = s.zMinExclusive !== undefined;
    const a1 = half ? Math.PI : Math.PI * 2;
    b.arc(s.cx, s.cz, s.rOut, 0, a1, 0, s.y, 1, (key += 100));
    b.arc(s.cx, s.cz, s.rIn, 0, a1, 0, s.y, -1, (key += 100));
    if (half) {
      b.line(s.cx + s.rIn, s.cz, s.cx + s.rOut, s.cz, 0, -1, 0, s.y, (key += 100));
      b.line(s.cx - s.rOut, s.cz, s.cx - s.rIn, s.cz, 0, -1, 0, s.y, (key += 100));
    }
  }
  if (b.pos.length) g.add(b.mesh('tier-stone-walls'));
  const ramps = cfg.surfaces.filter((s): s is Ramp => s.kind === 'ramp');
  if (ramps.length) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
    const stairs = new THREE.Mesh(mergeColored(ramps.map((r) => buildRampStairs(r, 0))), mat);
    stairs.name = 'ramp-stone-stairs';
    g.add(stairs);
  }
  return g;
}
