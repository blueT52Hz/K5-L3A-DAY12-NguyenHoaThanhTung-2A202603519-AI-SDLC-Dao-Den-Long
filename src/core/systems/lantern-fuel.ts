import { FUEL_DRAIN_EVENT_TICKS, FUEL_UNITS_PER_FUEL, TICK_RATE } from '../constants';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Lantern } from '../types';
import { compareShadeIds } from './shade-id-order';

/** Max fuel in integer units (fuel_max * 60 = 6000). */
export const fuelMaxUnits = (): number => TUNING.fuel_max * FUEL_UNITS_PER_FUEL;

/** Low-fuel threshold in units (low_fuel_threshold * 60 = 1800). */
export const lowFuelUnits = (): number => TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL;

/** A lantern projects a safe zone only while lit and not low on fuel. */
export const hasSafeZone = (l: Lantern): boolean => l.lit && l.fuelUnits >= lowFuelUnits();

/** Lit but below the low-fuel threshold: flickers and attracts drain shades. */
export const isLowFuel = (l: Lantern): boolean => l.lit && l.fuelUnits < lowFuelUnits();

/** Fuel units -> fuel with 1 decimal, half up (units / 6 / 10). */
export const fuelValue = (l: Lantern): number => Math.round(l.fuelUnits / 6) / 10;

/**
 * Tick step 2b (right after timers): lit lanterns burn fuel, `drain` shades siphon their target, then
 * emptied lanterns go out. All integer math (decay = 1 unit/tick, drain = 5 units/tick with current tuning).
 */
export function burnAndDrainFuel(s: GameState, events: GameEvent[]): void {
  const decayPerTick = (TUNING.fuel_decay_per_s * FUEL_UNITS_PER_FUEL) / TICK_RATE;
  const drainPerTick = (TUNING.drain_per_s * FUEL_UNITS_PER_FUEL) / TICK_RATE;

  for (const l of s.lanterns) {
    if (l.lit) l.fuelUnits -= decayPerTick;
  }

  for (const sh of [...s.shades].sort(compareShadeIds)) {
    if (sh.state !== 'drain' || sh.targetLanternId === null) continue;
    const l = s.lanterns.find((x) => x.id === sh.targetLanternId);
    if (!l || !l.lit) continue;
    l.fuelUnits -= drainPerTick;
    sh.drainTicks += 1;
    if (sh.drainTicks % FUEL_DRAIN_EVENT_TICKS === 0) {
      // Clamp before reporting: fuel may be negative until the lantern-out pass below.
      const fuel = Math.round(Math.max(0, l.fuelUnits) / 6) / 10;
      events.push({ tick: s.tick, name: 'fuel_drain', data: { lantern_id: l.id, shade_id: sh.id, fuel } });
    }
  }

  for (const l of s.lanterns) {
    if (l.lit && l.fuelUnits <= 0) {
      l.lit = false;
      l.fuelUnits = 0;
      l.deposited = 0;
      l.everLit = true;
      events.push({ tick: s.tick, name: 'lantern_out', data: { lantern_id: l.id } });
    }
  }
}
