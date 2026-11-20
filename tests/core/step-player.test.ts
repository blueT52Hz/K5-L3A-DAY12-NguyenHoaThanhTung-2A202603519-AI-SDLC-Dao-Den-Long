import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { step } from '../../src/core/step';
import { idle, run } from './helpers';

const bare = (extra = {}) => createGame(1, { random_motes: false, random_shades: false, ...extra });

describe('movement', () => {
  it('moves forward and rotates with yaw', () => {
    const a = bare();
    run(a, { move: [0, 1] }, 60);
    expect(a.player.pos[0]).toBeCloseTo(0, 9);
    expect(a.player.pos[2]).toBeCloseTo(6, 9);
    const b = bare();
    run(b, { move: [0, 1], cam_yaw_deg: 90 }, 60);
    expect(b.player.pos[0]).toBeCloseTo(6, 9);
    expect(b.player.pos[2]).toBeCloseTo(0, 9);
  });
  it('normalizes diagonal', () => {
    const s = bare();
    run(s, { move: [1, 1] }, 60);
    expect(distXZ(s.player.pos, [0, 0, 0])).toBeCloseTo(6, 9);
  });
  it('no invisible wall at the island edge: walks off and falls (was "clamps to island")', () => {
    const s = bare({ player: { pos: [39.9, 0, 0] } });
    run(s, { move: [1, 0] }, 10);
    expect(distXZ(s.player.pos, [0, 0, 0])).toBeCloseTo(40.9, 9);
    expect(s.player.pos[1]).toBeLessThan(0);
    expect(s.player.grounded).toBe(false);
  });
  it('jumps on edge only', () => {
    const s = bare();
    const ys: number[] = [];
    for (let k = 0; k < 60; k++) { step(s, { ...idle(), jump: true }); ys.push(s.player.pos[1]); }
    expect(ys[9]).toBeGreaterThan(0);
    expect(ys[59]).toBe(0);
    expect(ys.slice(45).every((y) => y === 0)).toBe(true);
  });
  it('tick advances and finished game is frozen', () => {
    const s = bare({ time_left_s: 1 });
    run(s, {}, 60);
    expect(s.status).toBe('lost');
    expect(s.timeLeftS).toBe(0);
    const snap = JSON.stringify(s);
    expect(step(s, { ...idle(), move: [0, 1] })).toEqual([]);
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('pickup', () => {
  it('picks mote in radius', () => {
    const s = bare({ motes: [[0, 0, 1]] });
    const ev = run(s, {}, 1);
    expect(ev).toEqual([{ tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
    expect(s.score).toBe(0); // v1.1: per_mote is scored at deposit, not pickup
    expect(s.motes).toHaveLength(0);
  });
  it('respects capacity', () => {
    const s = bare({ player: { carried: 10 }, motes: [[0, 0, 1]] });
    expect(run(s, {}, 1)).toEqual([]);
    expect(s.motes).toHaveLength(1);
  });
});

describe('deposit', () => {
  it('deposits and lights', () => {
    const s = bare({ player: { pos: [0, 0, 23], carried: 10 } });
    const ev = run(s, { interact: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit', 'lantern_lit']);
    expect(ev[0].data).toEqual({ lantern_id: 'L1', amount: 10, deposited: 10 });
    expect(ev[1].data).toEqual({ lantern_id: 'L1', relight: false });
    expect(s.player.carried).toBe(0);
    expect(s.score).toBe(10 * 5 + 100); // Phase 3: per_mote 5 x amount at deposit + per_lantern
    expect(s.lanterns[0].lit).toBe(true);
  });
  it('partial deposit does not light', () => {
    const s = bare({ player: { pos: [0, 0, 23], carried: 3 } });
    const ev = run(s, { interact: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit']);
    expect(ev[0].data.amount).toBe(3);
    expect(s.lanterns[0].lit).toBe(false);
  });
  it('held interact fires once', () => {
    const t = bare({ player: { pos: [0, 0, 23], carried: 10 } });
    const ev2 = run(t, { interact: true }, 5);
    expect(ev2.filter((e) => e.name === 'deposit')).toHaveLength(1);
    expect(t.player.carried).toBe(0); // cost 10 spent once; held button does not repeat
  });
  it('wins at dawn after lighting the fifth lantern (Phase 3: lighting alone does not end the game)', () => {
    const s = bare({
      time_left_s: 1 / 60,
      player: { pos: [0, 0, 0], carried: 1 },
      lanterns: [
        { id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true },
        { id: 'L5', deposited: 9, pos: [0, 0, 1] },
      ],
    });
    const ev = run(s, { interact: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit', 'lantern_lit', 'game_over']);
    expect(ev[2]).toEqual({ tick: 1, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } });
    // 5 (mote) + 100 (lantern) + 4 x (50 + 99 fuel) + (50 + 100 fuel) + 50 x 3 flames
    expect(s.score).toBe(5 + 100 + 4 * 149 + 150 + 150);
    expect(s.status).toBe('won');
  });
});

describe('time clamp', () => {
  it('win with tiny time left gives no negative bonus', () => {
    const s = bare({
      time_left_s: 0.01,
      player: { pos: [0, 0, 0], carried: 1 },
      lanterns: [
        { id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true },
        { id: 'L5', deposited: 9, pos: [0, 0, 1] },
      ],
    });
    run(s, { interact: true }, 1);
    expect(s.status).toBe('won');
    expect(s.timeLeftS).toBe(0);
    expect(s.score).toBe(5 + 100 + 4 * 149 + 150 + 150); // Phase 3 dawn bonus (see fifth-lantern test)
  });
});
