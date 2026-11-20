import { describe, it, expect } from 'vitest';
import { createGame, ScenarioError } from '../../src/core/create-game';
import { getNight } from '../../src/core/nights';

describe('createGame', () => {
  it('is deterministic per seed', () => {
    expect(JSON.stringify(createGame(1))).toBe(JSON.stringify(createGame(1)));
    expect(JSON.stringify(createGame(2))).not.toBe(JSON.stringify(createGame(1)));
  });

  it('builds defaults', () => {
    const s = createGame(7);
    expect(s.tick).toBe(0);
    expect(s.status).toBe('playing');
    expect(s.t0).toBe(300);
    expect(s.player.flames).toBe(3);
    // v1.1: 20 initial motes at distinct Night 1 spawn points (was 40 random-in-disc).
    expect(s.motes).toHaveLength(20);
    const pts = getNight(1).moteSpawnPoints;
    const idx = s.motes.map((m) => pts.findIndex((p) => p.every((v, i) => v === m.pos[i])));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect(new Set(idx).size).toBe(20);
    // v1.1: no shades at tick 0 (first scheduled spawn at simTick 300).
    expect(s.shades).toEqual([]);
    expect(s.lanterns).toHaveLength(5);
    expect(s.lanterns[0].pos[0]).toBeCloseTo(0, 9);
    expect(s.lanterns[0].pos[2]).toBeCloseTo(25, 9);
    expect(s.shadeSpawnEnabled).toBe(true);
    expect(s.nextMoteId).toBe(21);
    expect(s.nextShadeId).toBe(1);
  });

  it('partial scenario keeps other defaults', () => {
    const s = createGame(3, { player: { pos: [1, 0, 2], carried: 4 } });
    expect(s.player.carried).toBe(4);
    expect(s.player.pos).toEqual([1, 0, 2]);
    expect(s.player.flames).toBe(3);
    expect(s.motes).toHaveLength(20);
    expect(s.shades).toHaveLength(0);
  });

  it('random flags off', () => {
    const s = createGame(3, { random_motes: false, random_shades: false });
    expect(s.motes).toHaveLength(0);
    expect(s.shades).toHaveLength(0);
    expect(s.shadeSpawnEnabled).toBe(false);
    expect(s.moteSpawnEnabled).toBe(false);
  });

  it('applies shades, lanterns and time', () => {
    const s = createGame(3, { shades: [{ pos: [10, 0, 0] }], lanterns: [{ id: 'L2', lit: true }], time_left_s: 1 });
    expect(s.shades).toHaveLength(1);
    expect(s.shades[0].id).toBe('S1');
    expect(s.shades[0].pos).toEqual([10, 1, 0]); // Y snapped to ground + SHADE_Y
    expect(s.lanterns[1].lit).toBe(true);
    expect(s.t0).toBe(1);
    expect(s.timeLeftS).toBe(1);
    expect(s.score).toBe(0);
    expect(s.nextShadeId).toBe(2);
  });

  it('keeps explicit shade ids and continues counters', () => {
    const s = createGame(3, { motes: [[5, 0, 5]], shades: [{ id: 'S4', pos: [1, 0, 1] }, { pos: [2, 0, 2] }] });
    expect(s.shades.map((x) => x.id)).toEqual(['S4', 'S1']);
    expect(s.nextShadeId).toBe(5);
    expect(s.nextMoteId).toBe(2);
  });

  it('throws on unknown lantern', () => {
    expect(() => createGame(1, { lanterns: [{ id: 'L9' }] })).toThrow(ScenarioError);
  });
});
