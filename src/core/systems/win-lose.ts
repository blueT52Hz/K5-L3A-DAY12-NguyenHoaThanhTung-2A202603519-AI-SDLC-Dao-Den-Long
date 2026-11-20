import { FUEL_UNITS_PER_FUEL } from '../constants';
import { TUNING } from '../tuning';
import type { GameEvent, GameState } from '../types';

/** Finish the game. */
function endGame(s: GameState, result: 'won' | 'lost', reason: 'dawn_survived' | 'dawn' | 'no_flames', events: GameEvent[]): void {
  s.status = result;
  events.push({ tick: s.tick, name: 'game_over', data: { result, reason } });
}

/** Dawn bonus: per lit lantern (dawn_per_lantern + whole fuel left) plus per_flame_left * flames. */
function dawnBonus(s: GameState): number {
  let bonus = TUNING.score.per_flame_left * s.player.flames;
  for (const l of s.lanterns) {
    if (l.lit) bonus += TUNING.score.dawn_per_lantern + Math.floor(Math.max(0, l.fuelUnits) / FUEL_UNITS_PER_FUEL);
  }
  return bonus;
}

/**
 * Tick step 11, the only place a game ends: flames 0 -> lost/no_flames (always first, even at dawn);
 * else at dawn (time_left_s <= 0): lit >= ceil(win_ratio * lanterns) -> won/dawn_survived + bonus, else lost/dawn.
 * Lighting every lantern no longer ends the night.
 */
export function resolveEndOfTick(s: GameState, events: GameEvent[]): void {
  if (s.player.flames <= 0) { endGame(s, 'lost', 'no_flames', events); return; }
  if (s.timeLeftS > 0) return;
  const lit = s.lanterns.filter((l) => l.lit).length;
  if (lit >= Math.ceil(TUNING.win_ratio * s.lanterns.length)) {
    s.score += dawnBonus(s);
    endGame(s, 'won', 'dawn_survived', events);
  } else endGame(s, 'lost', 'dawn', events);
}
