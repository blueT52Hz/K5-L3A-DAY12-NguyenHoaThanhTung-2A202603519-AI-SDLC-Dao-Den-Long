import type { MayCharacter } from './may-character-factory';

/**
 * Walks Mây along a smooth, gently wobbling loop around an island centre (default: Night 1) and drives her
 * animation. Deterministic (no Math.random): the same dt sequence always gives the same path.
 *
 * Night 1 lanterns all sit on a 25 m ring (L1 (0,0,25), L2 (23.8,0,7.7), L3 (14.7,0,-20.2),
 * L4 (-14.7,0,-20.2), L5 (-23.8,0,7.7)), so the loop radius is clamped well inside that ring
 * (max radius + wobble stays <= 21 m, i.e. >= 4 m clearance from every lantern).
 */
export interface MayIslandWalker {
  /** Move, turn and animate the character; call once per frame. */
  update(dtS: number): void;
}

export interface MayIslandWalkerOptions {
  /** Mean loop radius around the centre in metres (default 16, clamped to 4..maxRadius). */
  radius?: number;
  /** Loop centre on the XZ plane (default (0, 0), the Night 1 island centre). */
  centerX?: number;
  centerZ?: number;
  /** Scale of the radial wobble (default 1 = +-2.1 m; lower keeps narrow rings clear of obstacles). */
  wobbleScale?: number;
  /** Upper clamp for the mean radius (default 18.9, i.e. Night 1 lantern clearance at full wobble). */
  maxRadius?: number;
  /** Cruise walking speed (default 1.4 m/s). */
  speedMps?: number;
  /** Walk this many seconds between ~2 s idle pauses (default 9). */
  pauseEveryS?: number;
  /** Optional visual terrain height so the feet follow the ground (default y = 0). */
  heightAt?: (x: number, z: number) => number;
}

const PAUSE_S = 2.2; // idle duration of each stop
const ACCEL_MPS2 = 2.2; // how fast speed ramps up / down (start-stop takes ~0.6 s)
const TURN_RATE = 5; // facing smoothing rate (1/s)
const WOBBLE_A = 1.4; // radial wobble amplitudes (m)
const WOBBLE_B = 0.7;
const MAX_RADIUS = 21 - WOBBLE_A - WOBBLE_B;

/** Wraps an angle difference into [-PI, PI] so turns take the short way round. */
function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function createMayIslandWalker(
  character: MayCharacter,
  opts: MayIslandWalkerOptions = {},
): MayIslandWalker {
  const baseR = Math.min(opts.maxRadius ?? MAX_RADIUS, Math.max(4, opts.radius ?? 16));
  const cx = opts.centerX ?? 0;
  const cz = opts.centerZ ?? 0;
  const wa = WOBBLE_A * Math.max(0, opts.wobbleScale ?? 1);
  const wb = WOBBLE_B * Math.max(0, opts.wobbleScale ?? 1);
  const cruise = Math.max(0, opts.speedMps ?? 1.4);
  const walkS = Math.max(1, opts.pauseEveryS ?? 9);
  const cycleS = walkS + PAUSE_S;
  const heightAt = opts.heightAt;
  const g = character.group;

  let theta = 0; // loop parameter (rad); x = r cos(theta), z = r sin(theta)
  let clock = 0;
  let speed = 0;
  let yaw = 0;
  let yawInit = false;

  // radius and its derivative along the loop: a circle with two slow sine wobbles
  const radiusAt = (t: number) => baseR + wa * Math.sin(3 * t + 0.5) + wb * Math.sin(5 * t + 1.7);
  const radiusDeriv = (t: number) => 3 * wa * Math.cos(3 * t + 0.5) + 5 * wb * Math.cos(5 * t + 1.7);

  const place = () => {
    const r = radiusAt(theta);
    const x = cx + r * Math.cos(theta);
    const z = cz + r * Math.sin(theta);
    g.position.set(x, heightAt ? heightAt(x, z) : 0, z);
    // tangent of the curve for increasing theta; the character faces +Z, so yaw = atan2(dx, dz)
    const dr = radiusDeriv(theta);
    const dx = dr * Math.cos(theta) - r * Math.sin(theta);
    const dz = dr * Math.sin(theta) + r * Math.cos(theta);
    return Math.atan2(dx, dz);
  };

  return {
    update(dtS) {
      if (!(dtS > 0)) return;
      const dt = Math.min(dtS, 0.1); // avoid teleporting after a tab switch
      clock = (clock + dt) % cycleS;
      const target = clock < walkS ? cruise : 0;
      const dv = target - speed;
      speed += Math.sign(dv) * Math.min(Math.abs(dv), ACCEL_MPS2 * dt);

      // advance along the curve by arc length: dTheta = ds / |dP/dTheta|
      const r = radiusAt(theta);
      const dr = radiusDeriv(theta);
      theta = (theta + (speed * dt) / Math.sqrt(r * r + dr * dr)) % (Math.PI * 2);

      const targetYaw = place();
      if (!yawInit) {
        yaw = targetYaw;
        yawInit = true;
      } else {
        yaw += wrapAngle(targetYaw - yaw) * (1 - Math.exp(-TURN_RATE * dt));
      }
      g.rotation.y = yaw;
      character.update(dtS, speed);
    },
  };
}
