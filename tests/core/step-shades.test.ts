import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { step } from '../../src/core/step';
import { idle, run } from './helpers';

const bare = (extra = {}) => createGame(1, { random_motes: false, random_shades: false, ...extra });

describe('pulse', () => {
  it('stuns, pushes, costs a mote, scores', () => {
    const s = bare({ player: { carried: 1 }, shades: [{ pos: [5, 0, 0] }] });
    const ev = run(s, { pulse: true }, 1);
    expect(ev).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } }]);
    expect(s.player.carried).toBe(0);
    expect(s.score).toBe(20);
    expect(s.shades[0].pos[0]).toBeCloseTo(9, 9);
    expect(s.shades[0].state).toBe('stunned');
    run(s, {}, 179); // tick 180
    expect(s.shades[0].state).toBe('stunned');
    run(s, {}, 1); // tick 181
    expect(s.shades[0].state).toBe('chase');
  });
  it('needs a mote', () => {
    const s = bare({ shades: [{ pos: [5, 0, 0] }] });
    expect(run(s, { pulse: true }, 1)).toEqual([]);
  });
  it('held pulse fires once; cooldown 120 ticks', () => {
    const s = bare({ player: { carried: 5 }, shades: [{ pos: [50, 0, 0] }] });
    const ev = run(s, (k) => ({ pulse: k === 0 || k === 119 }), 120); // up at 0, edge at 119
    expect(ev.filter((e) => e.name === 'pulse')).toHaveLength(1);
    const t = bare({ player: { carried: 5 }, shades: [{ pos: [50, 0, 0] }] });
    const ev2 = run(t, (k) => ({ pulse: k === 0 || k === 120 }), 121);
    expect(ev2.filter((e) => e.name === 'pulse').map((e) => e.tick)).toEqual([1, 121]);
    const u = bare({ player: { carried: 5 }, shades: [{ pos: [50, 0, 0] }] });
    expect(run(u, { pulse: true }, 300).filter((e) => e.name === 'pulse')).toHaveLength(1);
  });
  it('push is clamped outside lit lantern zone and island', () => {
    const s = bare({ player: { carried: 1, pos: [0, 0, 14] }, shades: [{ pos: [0, 0, 18] }], lanterns: [{ id: 'L1', lit: true }] });
    run(s, { pulse: true }, 1);
    expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(5 - 1e-9);
    const t = bare({ player: { carried: 1, pos: [36, 0, 0] }, shades: [{ pos: [38, 0, 0] }] });
    run(t, { pulse: true }, 1);
    expect(distXZ(t.shades[0].pos, [0, 0, 0])).toBeLessThanOrEqual(40 + 1e-9);
  });
});

describe('shade ai', () => {
  it('chases at shade_speed', () => {
    const s = bare({ shades: [{ pos: [10, 0, 0] }] });
    run(s, {}, 60);
    expect(s.shades[0].pos[0]).toBeCloseTo(6, 9);
  });
  it('never enters lit lantern zone', () => {
    const s = bare({ player: { pos: [0, 0, 25] }, shades: [{ pos: [0, 0, 15] }], lanterns: [{ id: 'L1', lit: true }] });
    for (let k = 0; k < 300; k++) {
      step(s, idle());
      expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(5 - 1e-9);
    }
  });
});

describe('hit', () => {
  it('drops half, spawns motes, invuln 120 ticks', () => {
    const s = bare({ player: { carried: 5 }, shades: [{ pos: [0.5, 0, 0] }] });
    const ev = run(s, {}, 1);
    expect(ev).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } }]);
    expect(s.player.carried).toBe(3);
    expect(s.motes).toHaveLength(2);
    for (const m of s.motes) {
      const d = distXZ(m.pos, s.player.pos);
      expect(d).toBeGreaterThanOrEqual(2.5 - 1e-9);
      expect(d).toBeLessThanOrEqual(4 + 1e-9);
    }
    const ev2 = run(s, {}, 125).filter((e) => e.name === 'player_hit');
    expect(ev2[0].tick).toBe(121);
  });
  it('carried 0 or 1 drops nothing', () => {
    for (const c of [0, 1]) {
      const s = bare({ player: { carried: c }, shades: [{ pos: [0.5, 0, 0] }] });
      const ev = run(s, {}, 1);
      expect(ev).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 0 } }]);
      expect(s.motes).toHaveLength(0);
      expect(s.player.carried).toBe(c);
    }
  });
  it('last flame loses', () => {
    const s = bare({ player: { flames: 1 }, shades: [{ pos: [0.5, 0, 0] }] });
    const ev = run(s, {}, 1);
    expect(ev.map((e) => e.name)).toEqual(['player_hit', 'game_over']);
    expect(ev[1].data).toEqual({ result: 'lost', reason: 'no_flames' });
    expect(s.status).toBe('lost');
  });
  it('stunned shades do not hit', () => {
    const s = bare({ player: { carried: 1 }, shades: [{ pos: [0.5, 0, 0] }] });
    const ev = run(s, { pulse: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['pulse']);
  });
});

describe('time and spawn', () => {
  it('dawn at tick 60', () => {
    const s = bare({ time_left_s: 1 });
    const ev = run(s, {}, 100);
    expect(ev).toEqual([{ tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
    expect(s.timeLeftS).toBe(0);
    expect(s.tick).toBe(60);
  });
  it('spawns a shade at tick 2700 near radius 38', () => {
    const s = createGame(1, { random_motes: false, shades: [], player: { pos: [0, 0, -20] } });
    const ev = run(s, {}, 2700);
    const sp = ev.filter((e) => e.name === 'shade_spawned');
    expect(sp).toEqual([{ tick: 2700, name: 'shade_spawned', data: { id: 'S1' } }]);
    expect(Math.abs(distXZ(s.shades[0].pos, [0, 0, 0]) - 38)).toBeLessThan(0.1); // spawns at 38, then moves 4/60 in the same tick
    expect(s.shades[0].pos[1]).toBe(1);
  });
  it('caps at 6 shades', () => {
    const s = createGame(1, { random_motes: false, shades: [], time_left_s: 1000, player: { pos: [0, 0, 0], flames: 99 } });
    s.player.invulnTicks = 0;
    for (let k = 0; k < 2700 * 8 && s.status === 'playing'; k++) { s.player.invulnTicks = 99; step(s, idle()); }
    expect(s.shades.length).toBeLessThanOrEqual(6);
  });
});
