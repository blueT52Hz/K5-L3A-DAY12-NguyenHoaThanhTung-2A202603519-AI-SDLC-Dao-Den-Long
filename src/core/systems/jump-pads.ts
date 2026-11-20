import { getNight } from '../nights';
import type { GameState } from '../types';

/** Feet must be this close to the pad surface to count as standing on it. */
const PAD_Y_TOLERANCE = 0.01;

/**
 * Called at the end of movement: a grounded player within pad.r (XZ) of a pad centre, feet on the pad surface,
 * is launched with the pad's vy and horizontal launchVel (which replaces move input until landing).
 */
export function tryLaunchFromPad(s: GameState): void {
  const p = s.player;
  if (!p.grounded) return;
  for (const pad of getNight(s.night).jumpPads) {
    const onPad = Math.hypot(p.pos[0] - pad.pos[0], p.pos[2] - pad.pos[2]) <= pad.r
      && Math.abs(p.pos[1] - pad.pos[1]) <= PAD_Y_TOLERANCE;
    if (onPad) {
      p.vy = pad.vy;
      p.launchVel = [pad.horiz[0], pad.horiz[1]];
      p.grounded = false;
      return;
    }
  }
}
