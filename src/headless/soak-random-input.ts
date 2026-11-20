import type { InputFrame } from '../core/types';

/** Ticks between two random move-direction picks (ticket: every 30 ticks). */
const DIRECTION_EVERY = 30;
const P_JUMP = 0.05;
const P_DASH = 0.03;
const P_PULSE = 0.02;
const P_INTERACT = 0.1;

/** Own mulberry32 stream: the soak input never touches the game RNG (s.rngState). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded random input for the soak test: a new unit move direction every 30 ticks, and each tick
 * independent button presses with jump 5%, dash 3%, pulse 2%, interact 10%. Never pauses.
 * Call with consecutive ticks 0, 1, 2, ... (the direction is redrawn when tick % 30 === 0).
 */
export function makeSoakInput(seed: number): (tick: number) => InputFrame {
  const rnd = mulberry32(seed);
  let move: [number, number] = [0, 0];
  return (tick) => {
    if (tick % DIRECTION_EVERY === 0) {
      const a = rnd() * Math.PI * 2;
      move = [Math.cos(a), Math.sin(a)];
    }
    return {
      move: [move[0], move[1]], cam_yaw_deg: 0, pause: false,
      jump: rnd() < P_JUMP, dash: rnd() < P_DASH, pulse: rnd() < P_PULSE, interact: rnd() < P_INTERACT,
    };
  };
}
