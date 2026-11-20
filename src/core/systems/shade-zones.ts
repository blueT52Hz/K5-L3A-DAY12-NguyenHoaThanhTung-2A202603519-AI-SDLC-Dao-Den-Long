import { SHADE_Y } from '../constants';
import { getNight } from '../nights';
import { groundBelow } from '../terrain/terrain-queries';
import { TUNING } from '../tuning';
import type { GameState, Vec3 } from '../types';

/**
 * Push a shade out of lit-lantern safe zones. Mutates pos.
 * Interim terrain rule (until the shade rewrite): if the result has no ground at the shade's foot level,
 * revert XZ to (prevX, prevZ).
 */
export function clampShade(s: GameState, pos: Vec3, prevX: number, prevZ: number): void {
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
  }
  if (groundBelow(getNight(s.night), pos[0], pos[2], Math.max(0, pos[1] - SHADE_Y)) === null) {
    pos[0] = prevX;
    pos[2] = prevZ;
  }
}
