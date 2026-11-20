import { DRIFTER_FLEE_TICKS, DRIFTER_Y, FUEL_UNITS_PER_FUEL } from './constants';
import { getNight } from './nights';
import { hasSafeZone } from './systems/lantern-fuel';
import { pickInitialMotes } from './systems/mote-spawner';
import { snapShadePos } from './systems/shade-movement-terrain';
import { createShade } from './systems/shade-spawner';
import { TUNING } from './tuning';
import type { GameState, Lantern, NightId, Scenario, Vec3 } from './types';

export class ScenarioError extends Error {}

function defaultLanterns(night: NightId): Lantern[] {
  return getNight(night).lanterns.map((l) => ({ id: l.id, pos: [...l.pos] as Vec3, lit: false, deposited: 0, fuelUnits: 0, everLit: false, relitCount: 0 }));
}

/** Highest numeric suffix among ids like M12 / S3. */
function maxIdNumber(ids: string[]): number {
  let m = 0;
  for (const id of ids) {
    const n = Number(id.slice(1));
    if (Number.isFinite(n) && n > m) m = n;
  }
  return m;
}

export function createGame(seed: number, scenario: Scenario = {}, night: NightId = 1): GameState {
  const cfg = getNight(night);
  const t0 = scenario.time_left_s ?? cfg.durationS;
  const s: GameState = {
    night, tick: 0, simTick: 0, paused: false, status: 'playing', t0, timeLeftS: t0, score: 0,
    player: {
      pos: [...cfg.start], vel: [0, 0, 0], vy: 0, grounded: true, facing: [...cfg.startFacing], flames: TUNING.flames, carried: 0,
      invulnTicks: 0, pulseCooldownTicks: 0, dashTicks: 0, dashCooldownTicks: 0, dashDir: [0, 0],
      charmTicks: 0, launchVel: null, respawnTicks: 0, successfulLights: 0,
    },
    motes: [], shades: [], lanterns: defaultLanterns(night), drifters: [],
    charms: cfg.charms.map((c) => ({ id: c.id, pos: [...c.pos] as Vec3, available: true, respawnTicks: 0 })),
    wind: { warning: false, active: false, dirDeg: 0 },
    rngState: seed >>> 0, nextMoteId: 1, nextShadeId: 1, nextDrifterId: 1,
    shadeSpawnEnabled: scenario.random_shades !== false, safeZoneLanternIds: [],
    windEnabled: scenario.wind_enabled !== false, drifterSpawnEnabled: scenario.random_drifters !== false, moteSpawnEnabled: scenario.random_motes !== false,
    bench: false,
    prevButtons: { jump: false, interact: false, pulse: false, dash: false, pause: false },
  };

  for (const l of scenario.lanterns ?? []) {
    const target = s.lanterns.find((x) => x.id === l.id);
    if (!target) throw new ScenarioError(`unknown lantern id: ${l.id}`);
    if (l.pos) target.pos = [...l.pos];
    if (l.deposited !== undefined) target.deposited = l.deposited;
    if (l.lit !== undefined) target.lit = l.lit;
    const fuel = Math.min(Math.max(l.fuel ?? 100, 0), TUNING.fuel_max);
    target.fuelUnits = target.lit ? Math.round(fuel * FUEL_UNITS_PER_FUEL) : 0;
    target.everLit = l.ever_lit ?? target.lit;
  }
  // Lanterns with a safe zone from the start never evict (spec 6.4: eviction is for a lantern that has just been lit).
  s.safeZoneLanternIds = s.lanterns.filter(hasSafeZone).map((l) => l.id);

  if (scenario.charms) {
    s.charms = scenario.charms.map((c) => {
      const def = cfg.charms.find((x) => x.id === c.id);
      const pos = c.pos ?? def?.pos;
      if (!pos) throw new ScenarioError(`charm needs pos: ${c.id}`);
      const respawnTicks = c.respawn_ticks ?? 0;
      return { id: c.id, pos: [...pos] as Vec3, available: c.available ?? respawnTicks === 0, respawnTicks };
    });
  }

  const p = scenario.player;
  if (p?.pos) s.player.pos = [...p.pos];
  if (p?.carried !== undefined) s.player.carried = p.carried;
  if (p?.flames !== undefined) s.player.flames = p.flames;
  if (p?.invuln_ticks !== undefined) s.player.invulnTicks = p.invuln_ticks;
  if (p?.dash_cd_ticks !== undefined) s.player.dashCooldownTicks = p.dash_cd_ticks;
  if (p?.pulse_cd_ticks !== undefined) s.player.pulseCooldownTicks = p.pulse_cd_ticks;
  if (p?.charm_ticks !== undefined) s.player.charmTicks = p.charm_ticks;
  s.player.successfulLights = p?.successful_lights ?? 0;

  // Initial motes are always drawn so the RNG stream is stable per seed, even when the scenario replaces them.
  // No shades exist at tick 0: the schedule spawns the first ones at simTick 300 (spec 6.6).
  const defMotes = pickInitialMotes(s);

  const motes: Vec3[] | undefined = scenario.motes ?? (scenario.random_motes === false ? [] : undefined);
  s.motes = motes ? motes.map((pos, i) => ({ id: `M${i + 1}`, pos: [...pos] as Vec3, kind: 'random' as const, ttlTicks: null })) : defMotes;
  s.nextMoteId = maxIdNumber(s.motes.map((m) => m.id)) + 1;

  s.shades = [];
  if (scenario.shades) {
    const used = new Set(scenario.shades.map((x) => x.id).filter((x): x is string => !!x));
    let n = 1;
    s.shades = scenario.shades.map((x) => {
      let id = x.id;
      if (!id) { while (used.has(`S${n}`)) n++; id = `S${n}`; used.add(id); }
      // Missing state: chase [TQ 8]; Y snapped to ground + SHADE_Y.
      const shade = createShade(id, snapShadePos(cfg, x.pos), x.state ?? 'chase', x.state_ticks_left ?? 0);
      if (x.target_lantern_id !== undefined) {
        if (!s.lanterns.some((l) => l.id === x.target_lantern_id)) throw new ScenarioError(`unknown target_lantern_id: ${x.target_lantern_id}`);
        shade.targetLanternId = x.target_lantern_id;
      }
      return shade;
    });
  }
  s.nextShadeId = maxIdNumber(s.shades.map((x) => x.id)) + 1;

  if (scenario.drifters) {
    const used = new Set(scenario.drifters.map((x) => x.id).filter((x): x is string => !!x));
    let n = 1;
    s.drifters = scenario.drifters.map((x) => {
      let id = x.id;
      if (!id) { while (used.has(`D${n}`)) n++; id = `D${n}`; used.add(id); }
      const state = x.state ?? 'idle';
      return {
        id, pos: [x.pos[0], DRIFTER_Y, x.pos[2]] as Vec3, state, stolen: x.stolen ?? 0,
        stateTicks: state === 'flee' ? DRIFTER_FLEE_TICKS : 0, heading: [1, 0] as [number, number], headingTicks: 0,
      };
    });
  }
  s.nextDrifterId = maxIdNumber(s.drifters.map((x) => x.id)) + 1;
  return s;
}

