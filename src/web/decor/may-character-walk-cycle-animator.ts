import { MAY_DIMS } from './may-character-materials-and-geometries';
import { ARM_REST_SPLAY, type MayRigJoints } from './may-character-rig-builder';
import { createHangingPendulum } from './may-character-hanging-pendulum';

/**
 * Procedural locomotion for Mây (no skeleton files). Blends between an idle pose (breathing,
 * small arm sway) and a walk/run cycle whose phase advances with distance travelled.
 *
 * Sign conventions (character faces +Z): rotation.x > 0 on a hip/shoulder swings the limb
 * backward, rotation.x > 0 on a knee folds the shin backward, rotation.x < 0 on an elbow
 * bends the forearm forward, rotation.x > 0 on the torso leans it forward.
 */
export interface MayWalkCycleAnimator {
  update(dtS: number, speedMps: number): void;
}

const TAU = Math.PI * 2;
const STRIDE_M = 1.2; // distance covered per full gait cycle (two steps) at walking pace
const WALK_SPEED = 1.4; // m/s considered a full-amplitude walk
const RUN_SPEED = 6; // m/s considered a full run
const BLEND_TIME_S = 0.2; // idle <-> walk blend time constant
const DEG = Math.PI / 180;

export function createMayWalkCycleAnimator(j: MayRigJoints): MayWalkCycleAnimator {
  const lantern = createHangingPendulum(j.lanternPivot, MAY_DIMS.lanternStringLen + 0.06, 3.2);
  const scarf = createHangingPendulum(j.scarfTailPivot, MAY_DIMS.scarfTailLen, 5, 0.12);
  const restHipY = MAY_DIMS.hipY;
  let phase = 0; // gait phase (rad)
  let walkW = 0; // 0 = idle, 1 = moving (smoothed)
  let runW = 0; // 0 = walk, 1 = run (smoothed)
  let time = 0; // idle clock

  return {
    update(dtS, speedMps) {
      if (!(dtS > 0)) return;
      const speed = Math.max(0, speedMps || 0);
      time += dtS;

      // ---- blend weights (exponential smoothing, ~0.2 s) ----
      const k = 1 - Math.exp(-dtS / BLEND_TIME_S);
      walkW += ((speed > 0.05 ? Math.min(1, speed / (WALK_SPEED * 0.6)) : 0) - walkW) * k;
      const runTarget = Math.min(1, Math.max(0, (speed - 2) / (RUN_SPEED - 2)));
      runW += (runTarget - runW) * k;

      // gait phase: a run takes longer strides, so the cadence grows slower than the speed
      const stride = STRIDE_M * (1 + runW * 0.9);
      phase = (phase + (speed / stride) * TAU * dtS) % TAU;
      const s = Math.sin(phase);
      const c = Math.cos(phase);

      // ---- amplitudes, scaled up toward a run ----
      const w = walkW;
      const thighAmp = (32 + 18 * runW) * DEG * w;
      const kneeAmp = (45 + 45 * runW) * DEG * w;
      const armAmp = (27 + 28 * runW) * DEG * w;
      const elbowBend = (18 + 52 * runW) * DEG * w;
      const bobAmp = (0.04 + 0.04 * runW) * w;
      const lean = (4 + 14 * runW) * DEG * w;

      // ---- idle layer (fades out while walking) ----
      const idle = 1 - w;
      const breath = Math.sin(time * 2.1); // ~3 s breathing cycle
      const sway = Math.sin(time * 0.9);

      // ---- legs: left uses phase, right uses phase + PI ----
      for (let i = 0; i < 2; i++) {
        const ls = i === 0 ? s : -s;
        const lc = i === 0 ? c : -c;
        // thigh swings forward (negative X) on the first half of its cycle
        j.hipJoints[i].rotation.x = -thighAmp * ls;
        // knee folds while the leg travels forward (swing phase) plus a soft rest bend
        const swing = Math.max(0, lc);
        j.knees[i].rotation.x = kneeAmp * swing * swing + 4 * DEG * w + 2 * DEG * idle;
        // keep the foot roughly flat: counter the thigh+knee pitch, toe-off when behind
        j.ankles[i].rotation.x = -(j.hipJoints[i].rotation.x + j.knees[i].rotation.x) * 0.6 + Math.max(0, ls) * 10 * DEG * w;
      }

      // ---- arms: opposite to the legs, elbows slightly bent ----
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1;
        const ls = i === 0 ? s : -s;
        const idleSwing = idle * (0.05 * sway * side + 0.03 * breath);
        j.shoulders[i].rotation.x = armAmp * ls + idleSwing - lean * 0.3;
        j.shoulders[i].rotation.z = side * (ARM_REST_SPLAY + 0.04 * idle * (1 + breath) + 0.05 * runW);
        // elbow folds a bit more when the arm swings forward
        j.elbows[i].rotation.x = -(10 * DEG + elbowBend + Math.max(0, -ls) * 15 * DEG * w);
      }

      // ---- body: 2x-frequency bob, counter-rotation, forward lean, breathing ----
      // highest when legs pass each other (phase 0/PI), lowest at full stride
      const bob = bobAmp * (0.5 * Math.cos(2 * phase) - 0.5);
      j.hips.position.y = restHipY + bob + idle * 0.006 * breath;
      j.hips.rotation.y = -8 * DEG * w * s;
      j.hips.rotation.z = 3 * DEG * w * s; // hip drop toward the swing leg
      j.torso.rotation.y = 14 * DEG * w * s; // counter-rotate the shoulders against the hips
      j.torso.rotation.x = lean + idle * 0.015 * breath;
      j.torso.rotation.z = -3 * DEG * w * s + idle * 0.02 * sway;
      j.torso.scale.y = 1 + idle * 0.012 * breath;

      // ---- head stabilised: cancel the trunk yaw, roll and most of the lean ----
      j.neck.rotation.y = -(j.torso.rotation.y + j.hips.rotation.y);
      j.neck.rotation.z = -(j.torso.rotation.z + j.hips.rotation.z);
      j.neck.rotation.x = -j.torso.rotation.x * 0.7 + idle * 0.04 * Math.sin(time * 0.5);

      // ---- secondary motion: hat lantern and scarf tail lag behind (damped springs) ----
      const windX = 0.35 * Math.sin(time * 1.3) + 0.15 * Math.sin(time * 2.9);
      const windZ = 0.25 * Math.sin(time * 0.8 + 1);
      lantern.update(dtS, windX, windZ);
      scarf.update(dtS, windX * 1.5, windZ - 0.6);
    },
  };
}
