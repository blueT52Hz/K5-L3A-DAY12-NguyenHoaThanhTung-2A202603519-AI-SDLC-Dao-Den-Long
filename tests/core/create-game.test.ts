import { describe, it, expect } from 'vitest';
import { createGame, ScenarioError } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';

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
    expect(s.motes).toHaveLength(40);
    for (const m of s.motes) {
      const r = distXZ(m.pos, [0, 0, 0]);
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(38);
      for (const l of s.lanterns) expect(distXZ(m.pos, l.pos)).toBeGreaterThan(3);
    }
    expect(s.shades.map((x) => x.id)).toEqual(['S1', 'S2']);
    for (const sh of s.shades) expect(distXZ(sh.pos, [0, 0, 0])).toBeCloseTo(35, 9);
    expect(s.lanterns).toHaveLength(5);
    expect(s.lanterns[0].pos[0]).toBeCloseTo(0, 9);
    expect(s.lanterns[0].pos[2]).toBeCloseTo(25, 9);
    expect(s.spawnEnabled).toBe(true);
    expect(s.spawnTicks).toBe(480); // interim: Night 1 shade interval
    expect(s.nextMoteId).toBe(41);
    expect(s.nextShadeId).toBe(3);
  });

  it('partial scenario keeps other defaults', () => {
    const s = createGame(3, { player: { pos: [1, 0, 2], carried: 4 } });
    expect(s.player.carried).toBe(4);
    expect(s.player.pos).toEqual([1, 0, 2]);
    expect(s.player.flames).toBe(3);
    expect(s.motes).toHaveLength(40);
    expect(s.shades).toHaveLength(2);
  });

  it('random flags off', () => {
    const s = createGame(3, { random_motes: false, random_shades: false });
    expect(s.motes).toHaveLength(0);
    expect(s.shades).toHaveLength(0);
    expect(s.spawnEnabled).toBe(false);
  });

  it('applies shades, lanterns and time', () => {
    const s = createGame(3, { shades: [{ pos: [10, 0, 0] }], lanterns: [{ id: 'L2', lit: true }], time_left_s: 1 });
    expect(s.shades).toHaveLength(1);
    expect(s.shades[0].id).toBe('S1');
    expect(s.shades[0].pos).toEqual([10, 0, 0]);
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
