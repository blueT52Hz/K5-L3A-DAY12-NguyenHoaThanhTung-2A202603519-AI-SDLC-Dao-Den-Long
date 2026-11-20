import { readFileSync } from 'node:fs';
import { createGame, ScenarioError } from '../core/create-game';
import { step } from '../core/step';
import type { InputFrame } from '../core/types';
import { InputFormatError, UsageError } from './errors';
import { parseArgs } from './parse-args';
import { parseInputs } from './parse-inputs';
import { parseScenario } from './parse-scenario';
import { endLine, eventLine, snapshotLine } from './serialize';

export { InputFormatError };

function readJson(path: string): unknown {
  let text: string;
  try { text = readFileSync(path, 'utf8'); } catch (e) { throw new InputFormatError(`cannot read ${path}: ${(e as Error).message}`); }
  try { return JSON.parse(text); } catch (e) { throw new InputFormatError(`invalid JSON in ${path}: ${(e as Error).message}`); }
}

/** Pure w.r.t. output: returns the JSONL lines, never writes the out file. */
export function runHeadless(argv: string[]): { code: number; lines: string[]; stderr: string } {
  try {
    const a = parseArgs(argv);
    const scenario = a.scenario ? parseScenario(readJson(a.scenario)) : undefined;
    const frames = a.inputs ? parseInputs(readJson(a.inputs)) : [];
    const s = createGame(a.seed, scenario, a.night);
    const lines: string[] = [snapshotLine(s), eventLine({ tick: 0, name: 'night_start', data: { night: a.night } })];
    const cur: InputFrame = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
    let fi = 0;
    let lastSnap = 0;
    for (let k = 0; k < a.ticks; k++) {
      while (fi < frames.length && frames[fi].tick < k) fi++;
      if (fi < frames.length && frames[fi].tick === k) Object.assign(cur, frames[fi++].frame);
      for (const e of step(s, { ...cur, move: [cur.move[0], cur.move[1]] })) lines.push(eventLine(e));
      if (s.tick % a.every === 0) { lines.push(snapshotLine(s)); lastSnap = s.tick; }
      if (s.status !== 'playing') break;
    }
    if (s.status !== 'playing' && s.tick !== lastSnap) lines.push(snapshotLine(s));
    lines.push(endLine(s));
    return { code: 0, lines, stderr: '' };
  } catch (e) {
    const code = e instanceof UsageError ? 1 : e instanceof InputFormatError || e instanceof ScenarioError ? 2 : 1;
    return { code, lines: [], stderr: `error: ${(e as Error).message}\n` };
  }
}
