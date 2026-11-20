import { InputFormatError } from './errors';
import type { Scenario, ShadeState, DrifterState, Vec3 } from '../core/types';

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
function vec3(x: unknown, what: string): Vec3 {
  if (!Array.isArray(x) || x.length !== 3 || !x.every(isNum)) throw new InputFormatError(`scenario: ${what} must be [x,y,z]`);
  return [x[0], x[1], x[2]];
}
function opt<T>(o: Record<string, unknown>, k: string, check: (v: unknown) => boolean, what: string): T | undefined {
  if (o[k] === undefined) return undefined;
  if (!check(o[k])) throw new InputFormatError(`scenario: ${what}`);
  return o[k] as T;
}
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate scenario JSON shape (lantern id membership is checked by createGame). */
export function parseScenario(json: unknown): Scenario {
  if (!isObj(json)) throw new InputFormatError('scenario: must be an object');
  const sc: Scenario = {};
  if (json.player !== undefined) {
    if (!isObj(json.player)) throw new InputFormatError('scenario: player must be an object');
    const p = json.player;
    sc.player = {};
    if (p.pos !== undefined) sc.player.pos = vec3(p.pos, 'player.pos');
    sc.player.carried = opt(p, 'carried', isNum, 'player.carried must be a number');
    sc.player.flames = opt(p, 'flames', isNum, 'player.flames must be a number');
    for (const k of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights'] as const) {
      sc.player[k] = opt(p, k, isNum, `player.${k} must be a number`);
    }
  }
  sc.random_motes = opt(json, 'random_motes', (v) => typeof v === 'boolean', 'random_motes must be boolean');
  sc.random_shades = opt(json, 'random_shades', (v) => typeof v === 'boolean', 'random_shades must be boolean');
  sc.random_drifters = opt(json, 'random_drifters', (v) => typeof v === 'boolean', 'random_drifters must be boolean');
  sc.wind_enabled = opt(json, 'wind_enabled', (v) => typeof v === 'boolean', 'wind_enabled must be boolean');
  sc.time_left_s = opt(json, 'time_left_s', isNum, 'time_left_s must be a number');
  if (json.motes !== undefined) {
    if (!Array.isArray(json.motes)) throw new InputFormatError('scenario: motes must be an array');
    sc.motes = json.motes.map((m, i) => vec3(m, `motes[${i}]`));
  }
  if (json.shades !== undefined) {
    if (!Array.isArray(json.shades)) throw new InputFormatError('scenario: shades must be an array');
    sc.shades = json.shades.map((x, i) => {
      if (!isObj(x)) throw new InputFormatError(`scenario: shades[${i}] must be an object`);
      const id = opt<string>(x, 'id', (v) => typeof v === 'string', `shades[${i}].id must be a string`);
      const state = opt<ShadeState>(x, 'state', (v) => typeof v === 'string' && SHADE_STATES.includes(v), `shades[${i}].state invalid`);
      const left = opt<number>(x, 'state_ticks_left', isNum, `shades[${i}].state_ticks_left must be a number`);
      const target = opt<string>(x, 'target_lantern_id', (v) => typeof v === 'string', `shades[${i}].target_lantern_id must be a string`);
      return { ...(id !== undefined ? { id } : {}), pos: vec3(x.pos, `shades[${i}].pos`), ...(state !== undefined ? { state } : {}), ...(left !== undefined ? { state_ticks_left: left } : {}), ...(target !== undefined ? { target_lantern_id: target } : {}) };
    });
  }
  if (json.lanterns !== undefined) {
    if (!Array.isArray(json.lanterns)) throw new InputFormatError('scenario: lanterns must be an array');
    sc.lanterns = json.lanterns.map((x, i) => {
      if (!isObj(x) || typeof x.id !== 'string') throw new InputFormatError(`scenario: lanterns[${i}].id must be a string`);
      const l: NonNullable<Scenario['lanterns']>[number] = { id: x.id };
      if (x.pos !== undefined) l.pos = vec3(x.pos, `lanterns[${i}].pos`);
      l.deposited = opt(x, 'deposited', isNum, `lanterns[${i}].deposited must be a number`);
      l.lit = opt(x, 'lit', (v) => typeof v === 'boolean', `lanterns[${i}].lit must be boolean`);
      l.fuel = opt(x, 'fuel', isNum, `lanterns[${i}].fuel must be a number`);
      l.ever_lit = opt(x, 'ever_lit', (v) => typeof v === 'boolean', `lanterns[${i}].ever_lit must be boolean`);
      return l;
    });
  }
  if (json.drifters !== undefined) {
    if (!Array.isArray(json.drifters)) throw new InputFormatError('scenario: drifters must be an array');
    sc.drifters = json.drifters.map((x, i) => {
      if (!isObj(x)) throw new InputFormatError(`scenario: drifters[${i}] must be an object`);
      const id = opt<string>(x, 'id', (v) => typeof v === 'string', `drifters[${i}].id must be a string`);
      const state = opt<DrifterState>(x, 'state', (v) => typeof v === 'string' && DRIFTER_STATES.includes(v), `drifters[${i}].state invalid`);
      const stolen = opt<number>(x, 'stolen', isNum, `drifters[${i}].stolen must be a number`);
      return { ...(id !== undefined ? { id } : {}), pos: vec3(x.pos, `drifters[${i}].pos`), ...(state !== undefined ? { state } : {}), ...(stolen !== undefined ? { stolen } : {}) };
    });
  }
  if (json.charms !== undefined) {
    if (!Array.isArray(json.charms)) throw new InputFormatError('scenario: charms must be an array');
    sc.charms = json.charms.map((x, i) => {
      if (!isObj(x) || typeof x.id !== 'string') throw new InputFormatError(`scenario: charms[${i}].id must be a string`);
      const c: NonNullable<Scenario['charms']>[number] = { id: x.id };
      if (x.pos !== undefined) c.pos = vec3(x.pos, `charms[${i}].pos`);
      c.available = opt(x, 'available', (v) => typeof v === 'boolean', `charms[${i}].available must be boolean`);
      c.respawn_ticks = opt(x, 'respawn_ticks', isNum, `charms[${i}].respawn_ticks must be a number`);
      return c;
    });
  }
  return sc;
}
