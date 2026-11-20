import { InputFormatError } from './errors';
import type { Scenario, Vec3 } from '../core/types';

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
  }
  sc.random_motes = opt(json, 'random_motes', (v) => typeof v === 'boolean', 'random_motes must be boolean');
  sc.random_shades = opt(json, 'random_shades', (v) => typeof v === 'boolean', 'random_shades must be boolean');
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
      return { ...(id !== undefined ? { id } : {}), pos: vec3(x.pos, `shades[${i}].pos`) };
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
      return l;
    });
  }
  return sc;
}
