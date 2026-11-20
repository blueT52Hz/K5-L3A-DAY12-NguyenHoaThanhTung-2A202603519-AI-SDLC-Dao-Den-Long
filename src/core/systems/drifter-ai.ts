import type { GameEvent, GameState, Vec3 } from '../types';

/** Tick step 8: move drifters (Gio Lac). Filled by Task 6. */
export function moveDrifters(_s: GameState): void {}

/** Tick step 9 (before shade hits): drifter steals carried motes. Filled by Task 6. */
export function drifterSteal(_s: GameState, _events: GameEvent[]): void {}

/** Tick step 10: scheduled drifter spawn. Filled by Task 6. */
export function spawnDrifters(_s: GameState, _events: GameEvent[]): void {}

/** Tick step 7 hook, called by usePulse after shades: pulse effect on drifters (3D, center = Vec3). Filled by Task 6. */
export function pulseDrifters(_s: GameState, _center: Vec3): void {}
