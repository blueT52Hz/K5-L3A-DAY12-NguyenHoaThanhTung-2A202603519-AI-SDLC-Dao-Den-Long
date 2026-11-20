import { INITIAL_SHADES, LANTERN_RING_RADIUS, MOTE_COUNT, SHADE_SPAWN_TICKS, SHADE_Y } from './constants';
import { distXZ } from './math-xz';
import { nextRandom } from './rng';
import { TUNING } from './tuning';
import type { GameState, Lantern, Mote, Scenario, Shade, Vec3 } from './types';

export class ScenarioError extends Error {}

function defaultLanterns(): Lantern[] {
  const out: Lantern[] = [];
  for (let i = 0; i < TUNING.lantern_count_night1; i++) {
    const a = (i * 72 * Math.PI) / 180;
    out.push({
      id: `L${i + 1}`,
      pos: [LANTERN_RING_RADIUS * Math.sin(a), 0, LANTERN_RING_RADIUS * Math.cos(a)],
      lit: false,
      deposited: 0,
    });
  }
  return out;
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

export function createGame(seed: number, scenario: Scenario = {}): GameState {
  const t0 = scenario.time_left_s ?? TUNING.night1_duration_s;
  const s: GameState = {
    tick: 0, status: 'playing', t0, timeLeftS: t0, score: 0,
    player: { pos: [0, 0, 0], vy: 0, flames: TUNING.flames, carried: 0, invulnTicks: 0, pulseCooldownTicks: 0 },
    motes: [], shades: [], lanterns: defaultLanterns(),
    rngState: seed >>> 0, nextMoteId: 1, nextShadeId: 1,
    spawnTicks: SHADE_SPAWN_TICKS, spawnEnabled: scenario.random_shades !== false,
    prevButtons: { jump: false, interact: false, pulse: false },
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

  // Defaults are always drawn in the same order so the RNG stream is stable per seed.
  const defMotes = randomMotes(s);
  const defShades = randomShades(s);

  const motes: Vec3[] | undefined = scenario.motes ?? (scenario.random_motes === false ? [] : undefined);
  s.motes = motes ? motes.map((pos, i) => ({ id: `M${i + 1}`, pos: [...pos] as Vec3 })) : defMotes;
  s.nextMoteId = maxIdNumber(s.motes.map((m) => m.id)) + 1;

  if (scenario.shades) {
    const used = new Set(scenario.shades.map((x) => x.id).filter((x): x is string => !!x));
    let n = 1;
    s.shades = scenario.shades.map((x) => {
      let id = x.id;
      if (!id) { while (used.has(`S${n}`)) n++; id = `S${n}`; used.add(id); }
      return { id, pos: [...x.pos] as Vec3, state: 'chase', stunTicks: 0 };
    });
  } else {
    s.shades = scenario.random_shades === false ? [] : defShades;
  }
  s.nextShadeId = maxIdNumber(s.shades.map((x) => x.id)) + 1;
  return s;
}

function randomMotes(s: GameState): Mote[] {
  const out: Mote[] = [];
  while (out.length < MOTE_COUNT) {
    const r = Math.sqrt(3 * 3 + nextRandom(s) * (38 * 38 - 3 * 3));
    const a = nextRandom(s) * Math.PI * 2;
    const pos: Vec3 = [r * Math.sin(a), 0, r * Math.cos(a)];
    if (s.lanterns.some((l) => distXZ(l.pos, pos) <= 3)) continue;
    out.push({ id: `M${out.length + 1}`, pos });
  }
  return out;
}

function randomShades(s: GameState): Shade[] {
  const out: Shade[] = [];
  for (let i = 0; i < INITIAL_SHADES; i++) {
    const a = nextRandom(s) * Math.PI * 2;
    out.push({ id: `S${i + 1}`, pos: [35 * Math.sin(a), SHADE_Y, 35 * Math.cos(a)], state: 'chase', stunTicks: 0 });
  }
  return out;
}

