import * as THREE from 'three';

/**
 * Damped 2-axis pendulum for things hanging from a moving pivot (hat lantern, scarf tail).
 * Each frame it measures the pivot's world acceleration, builds the effective gravity
 * (g - a) in the pivot parent's local frame and springs the pivot's X/Z rotation toward the
 * direction that effective gravity points. That makes the object lag behind starts, stops,
 * turns and body bob naturally. All scratch objects are preallocated: no per-frame allocation.
 */
export interface HangingPendulum {
  /** Advance the simulation; `windX`/`windZ` add a small local push (m/s^2) for idle sway. */
  update(dtS: number, windX?: number, windZ?: number): void;
}

const GRAVITY = 9.81;
const MAX_ANGLE = 1.1; // rad, keeps the swing believable even on big spikes
const MAX_STEP_S = 1 / 30; // integration step cap for stability on frame hitches
const AIR_DRAG = 0.6; // (1/s) velocity drag so the object trails behind at constant speed

export function createHangingPendulum(
  pivot: THREE.Object3D,
  lengthM: number,
  damping = 4,
  /** Rest offset added to the X angle (rad); e.g. a scarf tail flaring slightly backward. */
  restX = 0,
): HangingPendulum {
  const stiffness = GRAVITY / Math.max(0.05, lengthM); // natural pendulum frequency^2
  const pos = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const prevVel = new THREE.Vector3();
  const effG = new THREE.Vector3();
  const parentQuat = new THREE.Quaternion();
  let angX = restX;
  let angZ = 0;
  let velX = 0;
  let velZ = 0;
  let primed = 0; // number of samples taken; acceleration is valid after two

  return {
    update(dtRaw, windX = 0, windZ = 0) {
      if (!(dtRaw > 0)) return;
      const dt = Math.min(dtRaw, MAX_STEP_S);
      pivot.getWorldPosition(pos);
      if (primed === 0) {
        prevPos.copy(pos);
        vel.set(0, 0, 0);
        prevVel.set(0, 0, 0);
        primed = 1;
        return;
      }
      // finite-difference velocity and acceleration (use real dt so speed is not overestimated)
      vel.subVectors(pos, prevPos).divideScalar(dtRaw);
      prevPos.copy(pos);
      if (primed === 1) {
        prevVel.copy(vel);
        primed = 2;
      }
      // effective gravity in world: g - a (a = dv/dt), acceleration clamped to avoid spikes
      effG.subVectors(vel, prevVel).divideScalar(dtRaw).clampLength(0, 25).negate();
      effG.y -= GRAVITY;
      effG.addScaledVector(vel, -AIR_DRAG);
      prevVel.copy(vel);
      // into the parent's local frame (the frame the pivot rotation lives in)
      if (pivot.parent) {
        pivot.parent.getWorldQuaternion(parentQuat);
        effG.applyQuaternion(parentQuat.invert());
      }
      effG.x += windX;
      effG.z += windZ;
      // target angles so that the hanging direction (-Y rotated) aligns with effective gravity
      const down = Math.max(0.2, -effG.y);
      const targetX = Math.atan2(-effG.z, down) + restX;
      const targetZ = Math.atan2(effG.x, down);
      velX += (stiffness * (targetX - angX) - damping * velX) * dt;
      velZ += (stiffness * (targetZ - angZ) - damping * velZ) * dt;
      angX = THREE.MathUtils.clamp(angX + velX * dt, -MAX_ANGLE, MAX_ANGLE);
      angZ = THREE.MathUtils.clamp(angZ + velZ * dt, -MAX_ANGLE, MAX_ANGLE);
      pivot.rotation.x = angX;
      pivot.rotation.z = angZ;
    },
  };
}
