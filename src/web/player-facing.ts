// Visual-only: smoothly turn the player model to face the camera's forward direction.
const TURN_RATE_PER_S = 14; // exponential smoothing rate (higher = snappier)

/** Shortest signed angle difference a->b in radians, within (-PI, PI]. */
export function shortestAngle(a: number, b: number): number {
  const twoPi = Math.PI * 2;
  let d = (b - a) % twoPi;
  if (d > Math.PI) d -= twoPi;
  if (d <= -Math.PI) d += twoPi;
  return d;
}

/**
 * Next facing (rad). Camera forward at yaw t is (sin t, 0, cos t); models face +Z at rotation 0,
 * so the target rotation.y equals the camera yaw itself (back of the model toward camera).
 */
export function stepFacing(currentRad: number, camYawDeg: number, dtS: number): number {
  const target = (camYawDeg * Math.PI) / 180;
  const k = 1 - Math.exp(-TURN_RATE_PER_S * dtS);
  return currentRad + shortestAngle(currentRad, target) * k;
}
