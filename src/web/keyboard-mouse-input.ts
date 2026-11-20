import type { InputFrame } from '../core/types';
import { getBindings, isCapturingKey } from './settings/key-bindings';

const held = new Set<string>();
let yawDeg = 0;
let dragging = false;
let restartRequested = false;
let pauseQueued = false;
let locked = true; // true unless a night is actively being played (not paused)
let mouseSens = 1;
const YAW_KEY_SPEED_DEG_S = 120;
const YAW_MOUSE_DEG_PER_PX = 0.3;

/** Gate gameplay input (menus, paused core): held keys are dropped while locked. */
export function setInputLocked(v: boolean): void {
  if (v && !locked) clearInput();
  locked = v;
}
export function setMouseSensitivity(v: number): void { mouseSens = v; }
/** Queue a pause toggle; sent to core as one-tick edge on the next readInput. */
export function requestPause(): void { pauseQueued = true; }

/** Drop all held keys and drag state (called when pausing so nothing sticks). */
export function clearInput(): void {
  held.clear();
  dragging = false;
  restartRequested = false;
  pauseQueued = false;
}

/** Capture-phase keydown: gameplay keys are tracked by code (the pause shortcut itself lives in game-boot). */
export function initInput(target: HTMLElement): void {
  window.addEventListener('keydown', (e) => {
    if (isCapturingKey()) return;
    const k = e.code;
    if (!locked) {
      if (k === 'KeyR' && !e.repeat) restartRequested = true;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
      held.add(k);
    }
  }, true);
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('mousedown', () => { if (!locked) dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (dragging && !locked) yawDeg -= e.movementX * YAW_MOUSE_DEG_PER_PX * mouseSens;
  });
}

/** Advance camera yaw from arrow keys (call once per rendered frame). */
export function updateYaw(dtS: number): void {
  if (held.has('ArrowLeft')) yawDeg += YAW_KEY_SPEED_DEG_S * dtS;
  if (held.has('ArrowRight')) yawDeg -= YAW_KEY_SPEED_DEG_S * dtS;
}

export function getCamYawDeg(): number {
  return yawDeg;
}

/** True once per R press. */
export function consumeRestart(): boolean {
  const r = restartRequested;
  restartRequested = false;
  return r;
}

/** Move is in camera space; core rotates by cam_yaw_deg. up=+z, left=+x, right=-x (keys from bindings). */
export function readInput(camYawDeg: number): InputFrame {
  const b = getBindings();
  let x = 0;
  let z = 0;
  if (held.has(b.up)) z += 1;
  if (held.has(b.down)) z -= 1;
  if (held.has(b.left)) x += 1;
  if (held.has(b.right)) x -= 1;
  const pause = pauseQueued;
  pauseQueued = false;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  return {
    move: [x, z],
    cam_yaw_deg: camYawDeg,
    jump: held.has(b.jump),
    interact: held.has(b.interact),
    pulse: held.has(b.pulse),
    dash: held.has(b.dash) || (b.dash === 'ShiftLeft' && held.has('ShiftRight')),
    pause,
  };
}
