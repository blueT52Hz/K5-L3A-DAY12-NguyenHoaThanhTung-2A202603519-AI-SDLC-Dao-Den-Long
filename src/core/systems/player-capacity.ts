import { TUNING } from '../tuning';
import type { GameState } from '../types';

/** Carry capacity grows by 2 per successful lighting, capped at capacity_max. */
export const playerCapacity = (s: GameState): number =>
  Math.min(TUNING.capacity_max, TUNING.carry_capacity + 2 * s.player.successfulLights);
