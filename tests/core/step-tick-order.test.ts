import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { run } from './helpers';

const bare = (extra = {}) => createGame(1, { random_motes: false, random_shades: false, ...extra });
const fourLit = [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }];

describe('deposit (spec 6.4)', () => {
  it('carried 10 next to L1 deposits, lights, scores per mote + per lantern', () => {
    const s = bare({ player: { pos: [0, 0, 23.5], carried: 10 } });
    const ev = run(s, { interact: true }, 1);
    expect(ev).toEqual([
      { tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: 10, deposited: 10 } },
      { tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1' } },
    ]);
    expect(s.score).toBe(200);
  });

  it('out of interact radius (2.1 m) does nothing', () => {
    const s = bare({ player: { pos: [0, 0, 22.9], carried: 10 } });
    expect(run(s, { interact: true }, 1)).toEqual([]);
    expect(s.player.carried).toBe(10);
    expect(s.score).toBe(0);
  });

  it('needs foot height within 1.5 of the lantern', () => {
    const s = bare({ player: { pos: [0, 0, 23.5], carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 1.6, 25] }] });
    expect(run(s, { interact: true }, 1)).toEqual([]);
  });
});

describe('end-of-tick result (spec 6.7)', () => {
  it('lighting the last lantern on the dawn tick wins', () => {
    const s = bare({
      time_left_s: 1 / 60,
      player: { pos: [-23.8, 0, 9.2], carried: 10 },
      lanterns: [...fourLit, { id: 'L5', deposited: 0 }],
    });
    const ev = run(s, { interact: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit', 'lantern_lit', 'game_over']);
    expect(ev[2]).toEqual({ tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
    expect(s.timeLeftS).toBe(0);
    expect(s.status).toBe('won');
    expect(s.score).toBe(10 * 10 + 100 + 0 * 2 + 50 * 3);
  });

  it('flames 0 beats all lit and dawn in the same tick', () => {
    const s = bare({
      time_left_s: 1 / 60,
      player: { flames: 1 },
      lanterns: [...fourLit, { id: 'L5', lit: true }],
      shades: [{ pos: [0.5, 0, 0] }],
    });
    const ev = run(s, {}, 1);
    expect(ev.map((e) => e.name)).toEqual(['player_hit', 'game_over']);
    expect(ev[1]).toEqual({ tick: 1, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
    expect(s.status).toBe('lost');
  });

  it('no mid-tick end: a pulse after the winning deposit still runs, then the win is decided', () => {
    const s = bare({
      player: { pos: [0, 0, 0], carried: 4 },
      lanterns: [...fourLit, { id: 'L5', deposited: 9, pos: [0, 0, 1] }],
      shades: [{ pos: [0, 0, -4] }],
    });
    const ev = run(s, { interact: true, pulse: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit', 'lantern_lit', 'pulse', 'game_over']);
    expect(s.status).toBe('won');
    expect(s.score).toBe(10 + 100 + 5 + 2 * 299 + 50 * 3);
  });

  it('dawn uses simTick and t0', () => {
    const s = bare({ time_left_s: 0.5 });
    const ev = run(s, {}, 40);
    expect(ev).toEqual([{ tick: 30, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
    expect(s.simTick).toBe(30);
  });

  it('night_start is not emitted by the core', () => {
    const s = createGame(1);
    expect(run(s, {}, 5).some((e) => e.name === 'night_start')).toBe(false);
  });
});

describe('timers (step 2)', () => {
  it('player counters tick down', () => {
    const s = bare({ player: { dash_cd_ticks: 3, charm_ticks: 2 } });
    s.player.dashTicks = 1;
    s.player.respawnTicks = 2;
    run(s, {}, 2);
    expect(s.player.dashTicks).toBe(0);
    expect(s.player.dashCooldownTicks).toBe(1);
    expect(s.player.charmTicks).toBe(0);
    expect(s.player.respawnTicks).toBe(0);
  });

  it('charm becomes available on the tick its respawn counter reaches 0', () => {
    const s = bare();
    s.charms = [{ id: 'C1', pos: [30, 0, 0], available: false, respawnTicks: 2 }];
    run(s, {}, 1);
    expect(s.charms[0]).toMatchObject({ available: false, respawnTicks: 1 });
    run(s, {}, 1);
    expect(s.charms[0]).toMatchObject({ available: true, respawnTicks: 0 });
  });
});
