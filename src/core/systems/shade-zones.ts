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
}
