import { TICK_RATE } from './constants';
import { checkHit } from './systems/player-hit';
import { usePulse } from './systems/pulse';
import { moveShades, spawnShade } from './systems/shade-ai';
import { tickTimers } from './systems/timers';
import { depositToLantern } from './systems/lantern-deposit';
import { pickupMotes } from './systems/mote-pickup';
import { movePlayer } from './systems/player-movement';
import { TUNING } from './tuning';
import type { GameEvent, GameState, InputFrame } from './types';

/** Finish the game. On a win add time and flame bonuses (using the already computed timeLeftS). */
export function endGame(
  s: GameState, result: 'won' | 'lost', reason: 'all_lit' | 'dawn' | 'no_flames', events: GameEvent[],
): void {
  if (result === 'won') {
    s.score += TUNING.score.per_second_left * Math.floor(s.timeLeftS) + TUNING.score.per_flame_left * s.player.flames;
  }
  s.status = result;
  events.push({ tick: s.tick, name: 'game_over', data: { result, reason } });
}

/** One simulation step (tick k -> k+1). Mutates s; follows spec section 7 order. */
export function step(s: GameState, input: InputFrame): GameEvent[] {
  if (s.status !== 'playing') return [];
  const events: GameEvent[] = [];
  s.tick += 1;
  s.timeLeftS = Math.max(0, s.t0 - s.tick / TICK_RATE); // sub-step 10 value, needed early for the win bonus

  // 0. timers
  tickTimers(s);
  // 1. button edges
  const prev = s.prevButtons;
  const jumpEdge = input.jump && !prev.jump;
  const interactEdge = input.interact && !prev.interact;
  const pulseEdge = input.pulse && !prev.pulse;
  s.prevButtons = { jump: input.jump, interact: input.interact, pulse: input.pulse, dash: input.dash, pause: input.pause };

  // 2. movement
  movePlayer(s, input, jumpEdge);
  // 3. pickup
  pickupMotes(s, events);
  // 4. interact
  if (interactEdge) {
    depositToLantern(s, events);
    if (s.lanterns.every((l) => l.lit) && events.some((e) => e.name === 'lantern_lit')) {
      endGame(s, 'won', 'all_lit', events);
      return events;
    }
  }
  // 5. pulse
  if (pulseEdge) usePulse(s, events);
  // 7. spawn, 8. shade move
  spawnShade(s, events);
  moveShades(s);
  // 9. hit
  if (checkHit(s, events)) {
    endGame(s, 'lost', 'no_flames', events);
    return events;
  }

  // 10. time
  if (s.timeLeftS <= 0) {
    s.timeLeftS = 0;
    endGame(s, 'lost', 'dawn', events);
  }
  return events;
}
