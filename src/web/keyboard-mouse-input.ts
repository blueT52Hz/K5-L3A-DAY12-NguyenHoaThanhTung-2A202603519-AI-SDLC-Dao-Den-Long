import type { InputFrame } from '../core/types';
import { isPaused } from './pause-overlay';

const held = new Set<string>();
let yawDeg = 0;
let dragging = false;
let restartRequested = false;
const YAW_KEY_SPEED_DEG_S = 120;
const YAW_MOUSE_DEG_PER_PX = 0.3;

/** Drop all held keys and drag state (called when pausing so nothing sticks). */
export function clearInput(): void {
  held.clear();
  dragging = false;
  restartRequested = false;
}

export function initInput(target: HTMLElement): void {
  window.addEventListener('keydown', (e) => {
    if (isPaused()) return; // only P/Esc (handled by pause overlay) act while paused
    const k = e.code;
    if (k === 'KeyR' && !e.repeat) restartRequested = true;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
    held.add(k);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('mousedown', () => { if (!isPaused()) dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (dragging && !isPaused()) yawDeg -= e.movementX * YAW_MOUSE_DEG_PER_PX;
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

/** Move is in camera space; core rotates by cam_yaw_deg. W=+z, A=+x, D=-x. */
export function readInput(camYawDeg: number): InputFrame {
  let x = 0;
  let z = 0;
  if (held.has('KeyW')) z += 1;
  if (held.has('KeyS')) z -= 1;
  if (held.has('KeyA')) x += 1;
  if (held.has('KeyD')) x -= 1;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  return {
    move: [x, z],
    cam_yaw_deg: camYawDeg,
    jump: held.has('Space'),
    interact: held.has('KeyE'),
    pulse: held.has('KeyF'),
    dash: false, // wired in the web-shell task
    pause: false,
  };
}
