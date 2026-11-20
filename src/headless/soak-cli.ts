// Soak test (bundled to dist-headless/soak.mjs): `node dist-headless/soak.mjs --seed 7 --nights 10 --out soak.json`.
// Runs N nights back to back in this process (night (i % 3) + 1, seed + i, i 0-based), random seeded input,
// counts nights that throw as crashes and keeps going, then writes {nights, crashes, results, mem_start_mb, mem_end_mb, duration_s}.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { setFlagsFromString } from 'node:v8';
import { createGame } from '../core/create-game';
import { getNight } from '../core/nights';
import { step } from '../core/step';
import { TICK_RATE } from '../core/constants';
import type { GameState, NightId } from '../core/types';
import { makeSoakInput } from './soak-random-input';

function argValue(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}

/** global.gc when node runs with --expose-gc, else enable it at runtime; null if neither works. */
function getGc(): (() => void) | null {
  const g = (globalThis as { gc?: () => void }).gc;
  if (g) return g;
  try {
    setFlagsFromString('--expose-gc');
    return runInNewContext('gc') as () => void;
  } catch {
    return null;
  }
}

const gc = getGc();
const rssMb = (): number => {
  gc?.();
  return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
};

/** Plays one night to its end (or its standard duration in sim ticks) and returns the final status. */
function playNight(s: GameState, seed: number): string {
  const input = makeSoakInput(seed);
  const maxTicks = getNight(s.night).durationS * TICK_RATE;
  for (let k = 0; k < maxTicks && s.status === 'playing'; k++) step(s, input(k));
  return s.status;
}

function main(): number {
  const argv = process.argv.slice(2);
  const seed = Number(argValue(argv, '--seed', '7'));
  const nights = Number(argValue(argv, '--nights', '10'));
  const out = argValue(argv, '--out', 'soak.json');
  if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) {
    process.stderr.write('usage: soak.mjs --seed <int> --nights <int >= 1> --out <path>\n');
    return 1;
  }
  const t0 = performance.now();
  const results: string[] = [];
  let crashes = 0;
  let memStart = 0;
  for (let i = 0; i < nights; i++) {
    const night = ((i % 3) + 1) as NightId;
    try {
      const s = createGame(seed + i, {}, night);
      if (i === 0) memStart = rssMb();
      results.push(playNight(s, seed + i));
    } catch (e) {
      crashes++;
      results.push('crash');
      process.stderr.write(`night ${i} (seed ${seed + i}, night ${night}) crashed: ${(e as Error).stack ?? e}\n`);
    }
  }
  // "Reset after the last night": a fresh state like the game's restart, then measure.
  const reset = createGame(seed + nights, {}, ((nights % 3) + 1) as NightId);
  const memEnd = rssMb();
  void reset;
  const report = {
    nights, crashes, results, mem_start_mb: memStart, mem_end_mb: memEnd,
    duration_s: Math.round((performance.now() - t0) / 100) / 10,
  };
  try {
    const target = resolve(out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  } catch (e) {
    process.stderr.write(`error: cannot write ${out}: ${(e as Error).message}\n`);
    return 1;
  }
  process.stdout.write(JSON.stringify(report) + '\n');
  return 0;
}

process.exit(main());
