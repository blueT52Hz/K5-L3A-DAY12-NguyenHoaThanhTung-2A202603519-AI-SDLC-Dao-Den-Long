import { SHADE_Y } from '../constants';
import type { NightConfig } from '../nights/night-config-types';
import { canWalkTo, groundBelow } from '../terrain/terrain-queries';
import type { Shade, Vec3 } from '../types';

/** Foot height of a shade (its body center is SHADE_Y above the ground it stands on). */
export function shadeFootY(sh: Shade): number {
  return sh.pos[1] - SHADE_Y;
}

/** Can the shade stand at (x,z)? Same step rule as May, but never steps off a ledge or into void (spec 6.6 [TQ]). */
export function shadeCanStand(cfg: NightConfig, sh: Shade, x: number, z: number): boolean {
  return canWalkTo(cfg, shadeFootY(sh), x, z, false);
}

/** Put the shade body SHADE_Y above the ground under its XZ (searched from its foot). Over void Y is kept. */
export function settleShadeY(cfg: NightConfig, sh: Shade): void {
  const g = groundBelow(cfg, sh.pos[0], sh.pos[2], shadeFootY(sh));
  if (g !== null) sh.pos[1] = g + SHADE_Y;
}

/**
 * Snap a scenario shade position to ground + SHADE_Y. The given Y may be a foot or body height:
 * the highest surface at or just above it (groundBelow) is used. Over void the position is kept.
 */
export function snapShadePos(cfg: NightConfig, pos: Vec3): Vec3 {
  const g = groundBelow(cfg, pos[0], pos[2], pos[1]);
  return g === null ? [pos[0], pos[1], pos[2]] : [pos[0], g + SHADE_Y, pos[2]];
}

/** Walk by (dx,dz): X then Z, each axis accepted only if standable (walls and ledges block, shade slides). */
export function walkShade(cfg: NightConfig, sh: Shade, dx: number, dz: number): void {
  if (dx !== 0 && shadeCanStand(cfg, sh, sh.pos[0] + dx, sh.pos[2])) sh.pos[0] += dx;
  if (dz !== 0 && shadeCanStand(cfg, sh, sh.pos[0], sh.pos[2] + dz)) sh.pos[2] += dz;
}

/** Unit XZ vector from (fromX,fromZ) to (toX,toZ); coincident points give +X (spec 6.5). */
export function unitXZ(fromX: number, fromZ: number, toX: number, toZ: number): [number, number] {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const d = Math.hypot(dx, dz);
  return d === 0 ? [1, 0] : [dx / d, dz / d];
}
