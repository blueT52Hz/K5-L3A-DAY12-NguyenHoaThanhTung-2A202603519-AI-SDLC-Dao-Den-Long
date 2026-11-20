import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/** Finish the game. A win adds floor(time_left_s) * per_second_left + flames * per_flame_left. */
function endGame(s: GameState, result: 'won' | 'lost', reason: 'all_lit' | 'dawn' | 'no_flames', events: GameEvent[]): void {
  if (result === 'won') {
    s.score += TUNING.score.per_second_left * Math.floor(s.timeLeftS) + TUNING.score.per_flame_left * s.player.flames;
  }
  s.status = result;
  events.push({ tick: s.tick, name: 'game_over', data: { result, reason } });
}

/**
 * Tick step 11 (spec 6.7), the only place a game ends: flames 0 -> lost/no_flames; else all lanterns
 * lit -> won/all_lit (also on the dawn tick); else time_left_s <= 0 -> lost/dawn.
 */
export function resolveEndOfTick(s: GameState, events: GameEvent[]): void {
  if (s.player.flames <= 0) endGame(s, 'lost', 'no_flames', events);
  else if (s.lanterns.every((l) => l.lit)) endGame(s, 'won', 'all_lit', events);
  else if (s.timeLeftS <= 0) endGame(s, 'lost', 'dawn', events);
}
