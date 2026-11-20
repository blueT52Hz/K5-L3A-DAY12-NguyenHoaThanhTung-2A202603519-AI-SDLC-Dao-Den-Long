import { FUEL_UNITS_PER_FUEL, HEIGHT_TOLERANCE } from '../constants';
import { distXZ } from '../math-xz';
import { TUNING } from '../tuning';
import type { GameEvent, GameState, Lantern } from '../types';
import { fuelMaxUnits, fuelValue } from './lantern-fuel';

/** Motes needed to top a lantern up to full fuel, capped by what the player carries (0 when full). */
const refuelAmount = (l: Lantern, carried: number): number =>
  Math.min(carried, Math.ceil((fuelMaxUnits() - l.fuelUnits) / (TUNING.fuel_per_mote * FUEL_UNITS_PER_FUEL)));

/**
 * Tick step 5: on interact edge, pick the nearest lantern within interact_radius (and height tolerance) that is
 * unlit or can take fuel (ties: lower id). Unlit: deposit toward lantern_cost / relight_cost, lighting when paid.
 * Lit: refuel with as many motes as fit. Full lanterns are never selected.
 */
export function depositToLantern(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (p.carried <= 0) return;
  let best: Lantern | null = null;
  let bestD = Infinity;
  for (const l of s.lanterns) {
    if (Math.abs(p.pos[1] - l.pos[1]) > HEIGHT_TOLERANCE) continue;
    if (l.lit && refuelAmount(l, p.carried) <= 0) continue;
    const d = distXZ(p.pos, l.pos);
    if (d <= TUNING.interact_radius && d < bestD) { best = l; bestD = d; }
  }
  if (!best) return;

  if (best.lit) {
    const used = refuelAmount(best, p.carried);
    best.fuelUnits = Math.min(fuelMaxUnits(), best.fuelUnits + used * TUNING.fuel_per_mote * FUEL_UNITS_PER_FUEL);
    p.carried -= used;
    s.score += TUNING.score.per_mote * used;
    events.push({ tick: s.tick, name: 'refuel', data: { lantern_id: best.id, amount: used, fuel: fuelValue(best) } });
    return;
  }

  const need = (best.everLit ? TUNING.relight_cost : TUNING.lantern_cost) - best.deposited;
  const amount = Math.min(p.carried, need);
  if (amount <= 0) return;
  p.carried -= amount;
  best.deposited += amount;
  s.score += TUNING.score.per_mote * amount;
  events.push({ tick: s.tick, name: 'deposit', data: { lantern_id: best.id, amount, deposited: best.deposited } });
  if (amount >= need) {
    const relight = best.everLit;
    best.lit = true;
    best.fuelUnits = fuelMaxUnits();
    p.successfulLights += 1;
    if (relight) { best.relitCount += 1; s.score += TUNING.score.per_relight; }
    else s.score += TUNING.score.per_lantern;
    best.everLit = true;
    events.push({ tick: s.tick, name: 'lantern_lit', data: { lantern_id: best.id, relight } });
  }
}
