import { TICK_RATE } from './constants';
import { pickupCharms } from './systems/charms';
import { drifterSteal, moveDrifters, spawnDrifters } from './systems/drifter-ai';
import { depositToLantern } from './systems/lantern-deposit';
import { burnAndDrainFuel } from './systems/lantern-fuel';
import { pickupMotes } from './systems/mote-pickup';
import { spawnScheduledMote } from './systems/mote-spawner';
import { computeEdges, handlePause } from './systems/pause-control';
import { checkFall } from './systems/player-fall-respawn';
import { checkHit } from './systems/player-hit';
import { startDashIfRequested } from './systems/player-dash';
import { movePlayer } from './systems/player-movement';
import { usePulse } from './systems/pulse';
import { moveShades } from './systems/shade-ai';
import { spawnShades } from './systems/shade-spawner';
import { updateSafeZones } from './systems/shade-zones';
import { tickTimers } from './systems/timers';
import { updateWind } from './systems/wind-gusts';
import { resolveEndOfTick } from './systems/win-lose';
import type { GameEvent, GameState, InputFrame } from './types';

/**
 * One simulation step (tick k -> k+1). Mutates s. Follows the mandated v1.2 tick order (phase 3 spec): 1 input/pause, 2 timers then fuel burn/drain/lantern_out,
 * 3 wind, move/fall, 4 pickups, 5 deposit/refuel, 6 safe zones (by fuel), 7 pulse, 8 shades+drifters move,
 * 9 steal/hit, 10 spawns, 11 win/lose (dawn needs >= win_ratio lanterns lit);
 * step 12 (snapshot) belongs to the caller. A finished game is frozen.
 */
export function step(s: GameState, input: InputFrame): GameEvent[] {
  if (s.status !== 'playing') return [];
  const events: GameEvent[] = [];
  s.tick += 1;
  // 1. input: pause first (reads prevButtons.pause), then edges (always refreshes prevButtons).
  const paused = handlePause(s, input, events);
  const edges = computeEdges(s, input);
  if (paused) return events;
  s.simTick += 1;
  s.timeLeftS = Math.max(0, s.t0 - s.simTick / TICK_RATE);
  tickTimers(s); // 2
  burnAndDrainFuel(s, events); // 2b: fuel burn, drain, lantern_out
  updateWind(s); // 3
  startDashIfRequested(s, input, edges, events);
  movePlayer(s, input, edges);
  checkFall(s, events);
  pickupMotes(s, events); // 4
  pickupCharms(s, events);
  if (edges.interact) depositToLantern(s, events); // 5
  updateSafeZones(s); // 6
  if (edges.pulse) usePulse(s, events); // 7
  moveShades(s); // 8
  moveDrifters(s);
  drifterSteal(s, events); // 9
  checkHit(s, events);
  spawnScheduledMote(s); // 10
  spawnShades(s, events);
  spawnDrifters(s, events);
  resolveEndOfTick(s, events); // 11
  return events;
}
