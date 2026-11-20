import type { GameEvent } from '../../core/types';

export type SoundId =
  | 'pickup' | 'light' | 'pulse' | 'hit' | 'jump' | 'dash' | 'win' | 'lose' | 'shade' | 'tick' | 'wind' | 'charm';

/** Map a core event to a sound id (no extra game logic). */
export function soundForEvent(e: GameEvent): SoundId | null {
  switch (e.name) {
    case 'mote_picked': return 'pickup';
    case 'lantern_lit': return 'light';
    case 'pulse': return 'pulse';
    case 'player_hit': return 'hit';
    case 'dash': return 'dash';
    case 'shade_spawned': return 'shade';
    case 'charm_picked': return 'charm';
    case 'game_over': return e.data.result === 'won' ? 'win' : 'lose';
    default: return null;
  }
}
