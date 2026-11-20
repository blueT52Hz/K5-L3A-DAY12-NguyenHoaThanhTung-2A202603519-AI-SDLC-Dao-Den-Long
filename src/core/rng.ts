import type { GameState } from './types';

/** mulberry32 on s.rngState. Returns a float in [0,1). Mutates rngState. */
export function nextRandom(s: GameState): number {
  s.rngState = (s.rngState + 0x6d2b79f5) >>> 0;
  let t = s.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
