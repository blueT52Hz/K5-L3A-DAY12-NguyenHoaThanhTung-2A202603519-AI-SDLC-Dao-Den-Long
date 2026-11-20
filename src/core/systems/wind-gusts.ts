import { WIND_DURATION_TICKS, WIND_PERIOD_TICKS, WIND_SPEED, WIND_WARN_TICKS } from '../constants';
import { getNight } from '../nights';
import { nextRandom } from '../rng';
import type { GameState, XZ } from '../types';

/**
 * Tick step 3 (start): strong wind (Night 3). Warning for simTick in [P*k - 120, P*k), blowing in [P*k, P*k + 300), k >= 1.
 * The direction (integer degrees) is drawn from the RNG on the first warning tick of each cycle.
 * Does nothing (and never consumes RNG) unless the night has wind and the scenario did not disable it.
 */
export function updateWind(s: GameState): void {
  const w = s.wind;
  if (!getNight(s.night).wind || !s.windEnabled) { w.warning = false; w.active = false; return; }
  const t = s.simTick;
  const phase = t % WIND_PERIOD_TICKS;
  w.active = t >= WIND_PERIOD_TICKS && phase < WIND_DURATION_TICKS;
  w.warning = phase >= WIND_PERIOD_TICKS - WIND_WARN_TICKS;
  if (phase === WIND_PERIOD_TICKS - WIND_WARN_TICKS) w.dirDeg = Math.floor(nextRandom(s) * 360);
}

/** Wind drift (m/s) added to the player's horizontal velocity; zero when not blowing. */
export function windVelocity(s: GameState): XZ {
  if (!s.wind.active) return [0, 0];
  const r = (s.wind.dirDeg * Math.PI) / 180;
  return [Math.cos(r) * WIND_SPEED, Math.sin(r) * WIND_SPEED];
}
