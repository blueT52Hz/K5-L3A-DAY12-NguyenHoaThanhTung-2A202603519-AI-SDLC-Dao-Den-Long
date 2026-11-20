import { GRAVITY, JUMP_VELOCITY, TICK_RATE } from '../constants';
import { getNight } from '../nights';
import { groundBelow } from '../terrain/terrain-queries';
import { TUNING } from '../tuning';
import type { GameState, InputFrame } from '../types';

/** Sub-step 2: rotate move by camera yaw (contract formula), walk (blocked where no ground),  jump physics. */
export function movePlayer(s: GameState, input: InputFrame, jumpEdge: boolean): void {
  const p = s.player;
  let [mx, mz] = input.move;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = (input.cam_yaw_deg * Math.PI) / 180;
  const dx = mx * Math.cos(th) + mz * Math.sin(th);
  const dz = -mx * Math.sin(th) + mz * Math.cos(th);
  const d = TUNING.player_speed / TICK_RATE;
  const nx = p.pos[0] + dx * d;
  const nz = p.pos[2] + dz * d;
  // Interim (until the movement rewrite): moving into void is blocked.
  if (groundBelow(getNight(s.night), nx, nz, p.pos[1]) !== null) { p.pos[0] = nx; p.pos[2] = nz; }

  if (jumpEdge && p.pos[1] <= 0) p.vy = JUMP_VELOCITY;
  if (p.vy !== 0 || p.pos[1] > 0) {
    p.vy += GRAVITY / TICK_RATE;
    p.pos[1] += p.vy / TICK_RATE;
    if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; }
  }
}
