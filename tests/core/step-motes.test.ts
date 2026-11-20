import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { getNight } from '../../src/core/nights';
import { addDroppedMote } from '../../src/core/systems/mote-spawner';
import type { Vec3 } from '../../src/core/types';
import { run } from './helpers';

const bare = (extra = {}) => createGame(1, { random_motes: false, random_shades: false, ...extra });
const pointIndex = (pos: Vec3) => getNight(1).moteSpawnPoints.findIndex((p) => p[0] === pos[0] && p[1] === pos[1] && p[2] === pos[2]);

describe('initial motes (spec 6.3)', () => {
  it('N1 seed 1: 20 random motes at 20 distinct spawn points', () => {
    const s = createGame(1);
    expect(s.motes).toHaveLength(20);
    expect(s.motes.map((m) => m.id)).toEqual(Array.from({ length: 20 }, (_, i) => `M${i + 1}`));
    const idx = s.motes.map((m) => pointIndex(m.pos));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect(new Set(idx).size).toBe(20);
    for (const m of s.motes) { expect(m.kind).toBe('random'); expect(m.ttlTicks).toBeNull(); }
    expect(s.nextMoteId).toBe(21);
  });

  it('all nights start with 20 distinct spawn-point motes', () => {
    for (const n of [2, 3] as const) {
      const s = createGame(5, {}, n);
      const pts = getNight(n).moteSpawnPoints;
      const idx = s.motes.map((m) => pts.findIndex((p) => p.every((v, i) => v === m.pos[i])));
      expect(new Set(idx).size).toBe(20);
      expect(idx.every((i) => i >= 0)).toBe(true);
    }
  });

  it('initial motes are always drawn from the RNG, even when the scenario replaces them', () => {
    const a = createGame(1).rngState;
    expect(createGame(1, { motes: [[5, 0, 5]] }).rngState).toBe(a);
    expect(createGame(1, { random_motes: false, random_shades: false }).rngState).toBe(a);
  });

  it('scenario motes are random kind with null ttl', () => {
    const s = bare({ motes: [[5, 0, 5]] });
    expect(s.motes).toEqual([{ id: 'M1', pos: [5, 0, 5], kind: 'random', ttlTicks: null }]);
  });
});

describe('mote schedule', () => {
  it('spawns one mote at simTick 240 and 480 at free spawn points', () => {
    const s = createGame(1, { random_shades: false });
    run(s, {}, 239);
    expect(s.motes).toHaveLength(20);
    run(s, {}, 1);
    expect(s.motes).toHaveLength(21);
    const m = s.motes[20];
    expect(m.id).toBe('M21');
    expect(m.kind).toBe('random');
    expect(pointIndex(m.pos)).toBeGreaterThanOrEqual(0);
    run(s, {}, 240);
    expect(s.motes).toHaveLength(22);
    expect(new Set(s.motes.map((x) => pointIndex(x.pos))).size).toBe(22);
  });

  it('does not spawn at the cap of 30', () => {
    const motes: Vec3[] = Array.from({ length: 30 }, (_, i) => [-20 + i, 0, -30]);
    const s = createGame(1, { random_shades: false, motes });
    run(s, {}, 240);
    expect(s.motes).toHaveLength(30);
  });

  it('schedule follows simTick, not tick (paused ticks do not count)', () => {
    const s = createGame(1, { random_shades: false });
    run(s, (k) => ({ pause: k === 0 || k === 10 }), 240); // paused for ticks 1-10, resumed at tick 11
    expect(s.simTick).toBe(230);
    run(s, {}, 9);
    expect(s.motes).toHaveLength(20);
    run(s, {}, 1); // tick 250, simTick 240
    expect(s.motes).toHaveLength(21);
  });
});

describe('pickup (spec 6.3)', () => {
  it('needs foot height within 1.5 of the mote', () => {
    const s = bare({ motes: [[0, 1.6, 0], [0.9, 0, 0]] });
    const ev = run(s, {}, 1);
    expect(ev).toEqual([{ tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
    expect(s.motes.map((m) => m.pos)).toEqual([[0, 1.6, 0]]);
  });

  it('per_mote is not scored on pickup', () => {
    const s = bare({ motes: [[0.9, 0, 0]] });
    run(s, {}, 1);
    expect(s.player.carried).toBe(1);
    expect(s.score).toBe(0);
  });
});

describe('dropped motes', () => {
  it('addDroppedMote: ttl 480, removed at step 2 of the tick its ttl reaches 0', () => {
    const s = bare();
    addDroppedMote(s, [10, 0, 10]);
    expect(s.motes).toEqual([{ id: 'M1', pos: [10, 0, 10], kind: 'dropped', ttlTicks: 480 }]);
    expect(s.nextMoteId).toBe(2);
    run(s, {}, 479);
    expect(s.motes).toHaveLength(1);
    expect(s.motes[0].ttlTicks).toBe(1);
    run(s, {}, 1);
    expect(s.motes).toHaveLength(0);
  });
});
