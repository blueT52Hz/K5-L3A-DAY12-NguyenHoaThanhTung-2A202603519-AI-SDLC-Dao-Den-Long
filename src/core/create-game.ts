import { SHADE_Y } from './constants';
import { getNight } from './nights';
import { nextRandom } from './rng';
import { pickInitialMotes } from './systems/mote-spawner';
import { TUNING } from './tuning';
import type { GameState, Lantern, NightId, Scenario, Shade, Vec3 } from './types';

// Interim Phase 1 default shades (Task 5 replaces them with the simTick spawn schedule).
const INITIAL_SHADES = 2;

export class ScenarioError extends Error {}

function defaultLanterns(night: NightId): Lantern[] {
  return getNight(night).lanterns.map((l) => ({ id: l.id, pos: [...l.pos] as Vec3, lit: false, deposited: 0 }));
}

function newShade(id: string, pos: Vec3, state: Shade['state'] = 'chase', stateTicks = 0): Shade {
  return { id, pos, state, stateTicks, pushTicks: 0, pushDir: [0, 0], heading: [0, 0], headingTicks: 0, evictTicks: 0, evictFrom: null };
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
      charmTicks: 0, launchVel: null, respawnTicks: 0,
    },
    motes: [], shades: [], lanterns: defaultLanterns(night), drifters: [], charms: [],
    wind: { warning: false, active: false, dirDeg: 0 },
    rngState: seed >>> 0, nextMoteId: 1, nextShadeId: 1, nextDrifterId: 1,
    spawnTicks: cfg.shadeIntervalTicks, spawnEnabled: scenario.random_shades !== false,
    windEnabled: true, drifterSpawnEnabled: true, moteSpawnEnabled: scenario.random_motes !== false,
    prevButtons: { jump: false, interact: false, pulse: false, dash: false, pause: false },
  };

  for (const l of scenario.lanterns ?? []) {
    const target = s.lanterns.find((x) => x.id === l.id);
    if (!target) throw new ScenarioError(`unknown lantern id: ${l.id}`);
    if (l.pos) target.pos = [...l.pos];
    if (l.deposited !== undefined) target.deposited = l.deposited;
    if (l.lit !== undefined) target.lit = l.lit;
  }

  const p = scenario.player;
  if (p?.pos) s.player.pos = [...p.pos];
  if (p?.carried !== undefined) s.player.carried = p.carried;
  if (p?.flames !== undefined) s.player.flames = p.flames;
  if (p?.invuln_ticks !== undefined) s.player.invulnTicks = p.invuln_ticks;
  if (p?.dash_cd_ticks !== undefined) s.player.dashCooldownTicks = p.dash_cd_ticks;
  if (p?.pulse_cd_ticks !== undefined) s.player.pulseCooldownTicks = p.pulse_cd_ticks;
  if (p?.charm_ticks !== undefined) s.player.charmTicks = p.charm_ticks;

  // Defaults are always drawn in the same order (initial motes first) so the RNG stream is stable per seed,
  // even when the scenario replaces them.
  const defMotes = pickInitialMotes(s);
  const defShades = randomShades(s);

  const motes: Vec3[] | undefined = scenario.motes ?? (scenario.random_motes === false ? [] : undefined);
  s.motes = motes ? motes.map((pos, i) => ({ id: `M${i + 1}`, pos: [...pos] as Vec3, kind: 'random' as const, ttlTicks: null })) : defMotes;
  s.nextMoteId = maxIdNumber(s.motes.map((m) => m.id)) + 1;

  if (scenario.shades) {
    const used = new Set(scenario.shades.map((x) => x.id).filter((x): x is string => !!x));
    let n = 1;
    s.shades = scenario.shades.map((x) => {
      let id = x.id;
      if (!id) { while (used.has(`S${n}`)) n++; id = `S${n}`; used.add(id); }
      return newShade(id, [...x.pos] as Vec3, x.state ?? 'chase', x.state_ticks_left ?? 0);
    });
  } else {
    s.shades = scenario.random_shades === false ? [] : defShades;
  }
  s.nextShadeId = maxIdNumber(s.shades.map((x) => x.id)) + 1;
  return s;
}

function randomShades(s: GameState): Shade[] {
  const out: Shade[] = [];
  for (let i = 0; i < INITIAL_SHADES; i++) {
    const a = nextRandom(s) * Math.PI * 2;
    out.push(newShade(`S${i + 1}`, [35 * Math.sin(a), SHADE_Y, 35 * Math.cos(a)]));
  }
  return out;
}

