import { ISLAND_RADIUS } from '../constants';
import { clampToIsland } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameState, Vec3 } from '../types';

/** Push a shade out of lit-lantern safe zones and back inside the island. Mutates pos. */
export function clampShade(s: GameState, pos: Vec3): void {
  for (let pass = 0; pass < 3; pass++) {
    for (const l of s.lanterns) {
      if (!l.lit) continue;
      let dx = pos[0] - l.pos[0];
      let dz = pos[2] - l.pos[2];
      let d = Math.hypot(dx, dz);
      if (d >= TUNING.safe_radius) continue;
      if (d === 0) { dx = 1; dz = 0; d = 1; }
      pos[0] = l.pos[0] + (dx / d) * TUNING.safe_radius;
      pos[2] = l.pos[2] + (dz / d) * TUNING.safe_radius;
    }
    clampToIsland(pos, ISLAND_RADIUS);
  }
  // Still inside a zone (lantern near the island edge): snap to the nearest point where
  // the island boundary meets that lantern's safe circle.
  for (const l of s.lanterns) {
    if (!l.lit || Math.hypot(pos[0] - l.pos[0], pos[2] - l.pos[2]) >= TUNING.safe_radius - 1e-12) continue;
    const q = boundaryIntersection(l.pos, pos);
    if (q) { pos[0] = q[0]; pos[2] = q[1]; }
  }
}

/** Intersection of the island circle and the safe circle around lantern, nearest to pos. */
function boundaryIntersection(lp: Vec3, pos: Vec3): [number, number] | null {
  const R = ISLAND_RADIUS;
  const r = TUNING.safe_radius;
  const d = Math.hypot(lp[0], lp[2]);
  if (d === 0) return null;
  const a = (R * R - r * r + d * d) / (2 * d);
  const h2 = R * R - a * a;
  if (h2 < 0) return null;
  const h = Math.sqrt(h2);
  const ux = lp[0] / d, uz = lp[2] / d;
  const cands: [number, number][] = [
    [a * ux - h * uz, a * uz + h * ux],
    [a * ux + h * uz, a * uz - h * ux],
  ];
  const dist = (c: [number, number]) => Math.hypot(c[0] - pos[0], c[1] - pos[2]);
  return dist(cands[0]) <= dist(cands[1]) ? cands[0] : cands[1];
}
