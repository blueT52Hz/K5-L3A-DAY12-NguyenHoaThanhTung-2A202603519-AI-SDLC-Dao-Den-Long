import { step } from '../../src/core/step';
import type { GameEvent, GameState, InputFrame } from '../../src/core/types';

export function idle(): InputFrame {
  return { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
}

/** Run n steps. inputs: constant partial, array (index per step, last repeats as idle past end), or function of step index. */
export function run(
  s: GameState,
  inputs: Partial<InputFrame>[] | Partial<InputFrame> | ((k: number) => Partial<InputFrame>),
  n: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let k = 0; k < n; k++) {
    const p = typeof inputs === 'function' ? inputs(k) : Array.isArray(inputs) ? (inputs[k] ?? {}) : inputs;
    events.push(...step(s, { ...idle(), ...p }));
  }
  return events;
}
