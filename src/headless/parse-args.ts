import type { NightId } from '../core/types';
import { UsageError } from './errors';

export interface HeadlessArgs {
  seed: number; ticks: number; out: string; every: number; scenario?: string; inputs?: string; night: NightId;
}

function intOf(name: string, v: string | undefined, min: number): number {
  if (v === undefined || !/^-?\d+$/.test(v)) throw new UsageError(`${name} must be an integer`);
  const n = Number(v);
  if (n < min) throw new UsageError(`${name} must be >= ${min}`);
  return n;
}

export function parseArgs(argv: string[]): HeadlessArgs {
  const m = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!k.startsWith('--')) throw new UsageError(`unexpected argument: ${k}`);
    if (argv[i + 1] === undefined) throw new UsageError(`missing value for ${k}`);
    m.set(k, argv[i + 1]);
  }
  for (const req of ['--seed', '--ticks', '--out']) {
    if (!m.has(req)) throw new UsageError(`missing required ${req}`);
  }
  const nightArg = m.get('--night') ?? '1';
  if (!['1', '2', '3'].includes(nightArg)) throw new UsageError('--night must be 1, 2 or 3');
  return {
    seed: intOf('--seed', m.get('--seed'), -Infinity),
    ticks: intOf('--ticks', m.get('--ticks'), 0),
    out: m.get('--out')!,
    every: m.has('--snapshot-every') ? intOf('--snapshot-every', m.get('--snapshot-every'), 1) : 10,
    scenario: m.get('--scenario'),
    inputs: m.get('--inputs'),
    night: Number(nightArg) as NightId,
  };
}
