import type { GameEvent, GameState, InputFrame } from '../types';

/** Rising edges (false -> true) of the non-pause buttons for this tick. */
export interface ButtonEdges { jump: boolean; interact: boolean; pulse: boolean; dash: boolean }

/**
 * Tick step 1 (spec 7.4): a `pause` edge toggles s.paused and emits `paused` / `resumed`.
 * Returns true when the game is paused after handling, i.e. steps 2-11 must be skipped.
 * Must run before computeEdges, which overwrites s.prevButtons.pause.
 */
export function handlePause(s: GameState, input: InputFrame, events: GameEvent[]): boolean {
  if (input.pause && !s.prevButtons.pause) {
    s.paused = !s.paused;
    events.push({ tick: s.tick, name: s.paused ? 'paused' : 'resumed', data: {} });
  }
  return s.paused;
}

/**
 * Button edges vs the previous tick. Always updates s.prevButtons (also while paused), so an edge that
 * arises while paused is dropped when the step returns early and does not fire on resume.
 */
export function computeEdges(s: GameState, input: InputFrame): ButtonEdges {
  const prev = s.prevButtons;
  const edges: ButtonEdges = {
    jump: input.jump && !prev.jump,
    interact: input.interact && !prev.interact,
    pulse: input.pulse && !prev.pulse,
    dash: input.dash && !prev.dash,
  };
  s.prevButtons = { jump: input.jump, interact: input.interact, pulse: input.pulse, dash: input.dash, pause: input.pause };
  return edges;
}
