import { CHARM_RUN_SPEED, GRAVITY, JUMP_VELOCITY, STEP_UP, TICK_RATE } from '../constants';
import { getNight } from '../nights';
import { canWalkTo, groundBelow } from '../terrain/terrain-queries';
import { TUNING } from '../tuning';
import type { GameState, InputFrame, XZ } from '../types';
import { tryLaunchFromPad } from './jump-pads';
import type { ButtonEdges } from './pause-control';
import { dashVelocity } from './player-dash';
import { windVelocity } from './wind-gusts';

/** Move input rotated by camera yaw (contract formula), normalized when its length exceeds 1. */
export function worldMoveDir(input: InputFrame): XZ {
  let [mx, mz] = input.move;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = (input.cam_yaw_deg * Math.PI) / 180;
  return [mx * Math.cos(th) + mz * Math.sin(th), -mx * Math.sin(th) + mz * Math.cos(th)];
}

/** Base horizontal velocity (m/s): dash > pad launch (until landing) > input walking. */
function baseVelocity(s: GameState, input: InputFrame): XZ {
  const p = s.player;
  if (p.dashTicks > 0) return dashVelocity(s);
  if (p.launchVel) return [p.launchVel[0], p.launchVel[1]];
  const [dx, dz] = worldMoveDir(input);
  const speed = p.charmTicks > 0 ? CHARM_RUN_SPEED : TUNING.player_speed;
  return [dx * speed, dz * speed];
}

/** Horizontal velocity (m/s) for this tick: base velocity plus strong-wind drift (also in the air and while dashing). */
export function horizontalVelocity(s: GameState, input: InputFrame): XZ {
  const [bx, bz] = baseVelocity(s, input);
  const [wx, wz] = windVelocity(s);
  return [bx + wx, bz + wz];
}

/**
 * Tick step 3: walk on terrain (per-axis, X then Z, walls slide), jump, gravity, landing, slope following, jump pads.
 * Instant accel/decel. While waiting to respawn the player stands still and ignores input.
 */
export function movePlayer(s: GameState, input: InputFrame, edges: ButtonEdges): void {
  const p = s.player;
  if (p.respawnTicks > 0) { p.vel = [0, 0, 0]; return; }
  const cfg = getNight(s.night);

  const [hx, hz] = horizontalVelocity(s, input);
  const [fx, fz] = worldMoveDir(input);
  const flen = Math.hypot(fx, fz);
  if (flen > 0) p.facing = [fx / flen, fz / flen];

  // Horizontal: try X then Z, each accepted only if the target is not a wall (dropping into void is allowed).
  const [x0, y0, z0] = p.pos;
  const nx = x0 + hx / TICK_RATE;
  if (hx !== 0 && canWalkTo(cfg, y0, nx, p.pos[2], true)) p.pos[0] = nx;
  const nz = z0 + hz / TICK_RATE;
  if (hz !== 0 && canWalkTo(cfg, y0, p.pos[0], nz, true)) p.pos[2] = nz;

  // Vertical (Phase 1 semi-implicit integration).
  const dashing = p.dashTicks > 0;
  if (dashing) p.vy = 0; // dash: no gravity, height kept; vy restarts at 0 afterwards
  if (edges.jump && p.grounded && !dashing) { p.vy = JUMP_VELOCITY; p.grounded = false; }
  if (!p.grounded && !dashing) {
    p.vy += GRAVITY / TICK_RATE;
    p.pos[1] += p.vy / TICK_RATE;
  }
  const g = groundBelow(cfg, p.pos[0], p.pos[2], y0);
  if (!p.grounded) {
    // Land when the feet move down through the ground at the current XZ (also a tier higher than the launch).
    if (p.vy <= 0 && g !== null && p.pos[1] <= g) {
      p.pos[1] = g; p.vy = 0; p.grounded = true; p.launchVel = null;
    }
  } else if (g !== null && g >= p.pos[1] - STEP_UP) {
    p.pos[1] = g; // follow slopes and small steps
  } else {
    p.grounded = false; // walked off a ledge or into void: free fall from next tick
  }

  tryLaunchFromPad(s);
  p.vel = [(p.pos[0] - x0) * TICK_RATE, p.vy, (p.pos[2] - z0) * TICK_RATE];
}
