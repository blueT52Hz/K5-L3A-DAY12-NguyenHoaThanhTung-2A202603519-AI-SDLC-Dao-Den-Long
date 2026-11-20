import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runHeadless } from '../../src/headless/run-headless';

const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
const file = (name: string, content: unknown) => {
  const p = join(dir, name);
  writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
  return p;
};
const base = (extra: string[] = [], ticks = '25') => ['--seed', '1', '--night', '1', '--ticks', ticks, '--out', 'x.jsonl', ...extra];
const parse = (lines: string[]) => lines.map((l) => JSON.parse(l));

describe('cli errors', () => {
  it('missing seed -> 1', () => {
    const r = runHeadless(['--ticks', '5', '--out', 'x']);
    expect(r.code).toBe(1);
    expect(r.stderr).not.toBe('');
  });
  it('--night 4 -> 1', () => expect(runHeadless(base().map((v, i, a) => (a[i - 1] === '--night' ? '4' : v))).code).toBe(1));
  it('--night 2 -> 0', () => expect(runHeadless(base().map((v, i, a) => (a[i - 1] === '--night' ? '2' : v))).code).toBe(0));
  it('bad files -> 2', () => {
    expect(runHeadless(base(['--inputs', file('a.json', '{oops')])).code).toBe(2);
    expect(runHeadless(base(['--inputs', file('b.json', { frames: [{ tick: 5 }, { tick: 5 }] })])).code).toBe(2);
    expect(runHeadless(base(['--inputs', file('c.json', { frames: [{ tick: 0, move: [2, 0] }] })])).code).toBe(2);
    expect(runHeadless(base(['--scenario', file('d.json', { lanterns: [{ id: 'L9' }] })])).code).toBe(2);
  });
});

describe('cli run', () => {
  it('empty / out-of-range frames leave player still', () => {
    for (const frames of [[], [{ tick: 99999, move: [0, 1] }]]) {
      const r = runHeadless(base(['--inputs', file('e.json', { frames })], '30'));
      expect(r.code).toBe(0);
      const snaps = parse(r.lines).filter((l) => l.type === 'snapshot');
      expect(snaps[snaps.length - 1].player.pos).toEqual([0, 0, 0]);
    }
  });
  it('is deterministic', () => {
    const a = runHeadless(['--seed', '1', '--night', '1', '--ticks', '600', '--out', 'x']);
    const b = runHeadless(['--seed', '1', '--night', '1', '--ticks', '600', '--out', 'x']);
    expect(a.lines).toEqual(b.lines);
  });
  it('snapshot cadence and end line', () => {
    const r = runHeadless([...base(['--snapshot-every', '10'])]);
    const o = parse(r.lines);
    expect(o[0]).toMatchObject({ type: 'snapshot', tick: 0 });
    expect(o.filter((l) => l.type === 'snapshot').map((l) => l.tick)).toEqual([0, 10, 20]);
    expect(o[o.length - 1]).toMatchObject({ type: 'end', ticks: 25, state: 'playing' });
  });
  it('win scenario ends at tick 1 with game_over', () => {
    const sc = file('w.json', {
      player: { pos: [0, 0, 0], carried: 1 }, random_motes: false, random_shades: false,
      lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', deposited: 9, pos: [0, 0, 1] }],
    });
    const inp = file('wi.json', { frames: [{ tick: 0, interact: true }] });
    const o = parse(runHeadless(base(['--scenario', sc, '--inputs', inp], '100')).lines);
    expect(o.some((l) => l.type === 'event' && l.name === 'game_over')).toBe(true);
    expect(o.filter((l) => l.type === 'snapshot').map((l) => l.tick)).toEqual([0, 1]);
    expect(o[o.length - 1]).toMatchObject({ type: 'end', ticks: 1, state: 'won' });
  });
  it('rounds to 3 decimals', () => {
    const r = runHeadless(['--seed', '3', '--night', '1', '--ticks', '120', '--out', 'x']);
    expect(r.lines.join('\n')).not.toMatch(/\d\.\d{4,}/);
  });
});
