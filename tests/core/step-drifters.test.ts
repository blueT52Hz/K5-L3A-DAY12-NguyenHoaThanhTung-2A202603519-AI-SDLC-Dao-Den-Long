import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { getNight } from '../../src/core/nights';
import type { NightId, Scenario, Vec3 } from '../../src/core/types';
import { run } from './helpers';

const bare = (extra: Scenario = {}, night: NightId = 2, seed = 5) =>
  createGame(seed, { random_motes: false, random_shades: false, wind_enabled: false, ...extra }, night);
const start = (night: NightId = 2): Vec3 => getNight(night).start;
/** Drifter placed dx metres (XZ) from the player start, at drifter height. */
const near = (dx: number, night: NightId = 2): Vec3 => [start(night)[0] + dx, 1.5, start(night)[2]];

describe('drifter schedule (spec 7.1)', () => {
  it('N2: D1 at 1200, D2 at 2400, no D3 while both alive; spawn points are shade spawn points', () => {
    const s = bare();
    run(s, {}, 1199);
    expect(s.drifters).toHaveLength(0);
    run(s, {}, 1);
    expect(s.drifters.map((d) => [d.id, d.state])).toEqual([['D1', 'idle']]);
    const pts = getNight(2).shadeSpawnPoints;
    expect(pts.some((p) => p[0] === s.drifters[0].pos[0] && p[2] === s.drifters[0].pos[2])).toBe(true);
    expect(s.drifters[0].pos[1]).toBe(1.5);
    run(s, {}, 1200);
    expect(s.drifters.map((d) => d.id)).toEqual(['D1', 'D2']);
    run(s, {}, 1200);
    expect(s.drifters).toHaveLength(2);
  });
  it('removed ones do not count toward the cap of 2', () => {
    const s = bare({ drifters: [{ pos: [0, 1.5, 0], state: 'removed' }, { pos: [0, 1.5, 0], state: 'removed' }] });
    run(s, {}, 1200);
    expect(s.drifters).toHaveLength(3);
    expect(s.drifters[2].id).toBe('D3');
  });
  it('N1 never has drifters; random_drifters:false disables the schedule', () => {
    const s = bare({}, 1);
    run(s, {}, 2500);
    expect(s.drifters).toHaveLength(0);
    const t = bare({ random_drifters: false });
    run(t, {}, 1300);
    expect(t.drifters).toHaveLength(0);
  });
  it('scenario ids: missing ids skip used ones, next id continues from max', () => {
    const s = bare({ drifters: [{ id: 'D2', pos: [0, 1.5, 0] }, { pos: [1, 1.5, 0] }] });
    expect(s.drifters.map((d) => d.id)).toEqual(['D2', 'D1']);
    expect(s.nextDrifterId).toBe(3);
  });
});

describe('drifter chase and steal', () => {
  it('idle -> chase when carried >= 5 within 15 m, else stays idle', () => {
    const a = bare({ player: { carried: 5 }, drifters: [{ pos: near(14.9) }] });
    run(a, {}, 1);
    expect(a.drifters[0].state).toBe('chase');
    const b = bare({ player: { carried: 4 }, drifters: [{ pos: near(14.9) }] });
    run(b, {}, 1);
    expect(b.drifters[0].state).toBe('idle');
    const c = bare({ player: { carried: 7 }, drifters: [{ pos: near(15.5) }] });
    run(c, {}, 1);
    expect(c.drifters[0].state).toBe('idle');
  });
  it('chase flies to May at 7 m/s and reverts to idle when the condition is lost', () => {
    const s = bare({ player: { carried: 7 }, drifters: [{ pos: near(10), state: 'chase' }] });
    run(s, {}, 1);
    expect(distXZ(s.drifters[0].pos, s.player.pos)).toBeCloseTo(10 - 7 / 60, 6);
    s.player.carried = 0;
    run(s, {}, 1);
    expect(s.drifters[0].state).toBe('idle');
  });
  it('steal min(3, carried), event, flee 240 ticks then removed, only once; invulnerable still robbed', () => {
    const s = bare({ player: { carried: 7, invuln_ticks: 50 }, drifters: [{ pos: near(1.1), state: 'chase' }] });
    const ev = run(s, {}, 1);
    expect(ev).toContainEqual({ tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 3, carried: 4 } });
    expect(s.player.carried).toBe(4);
    expect(s.drifters[0].state).toBe('flee');
    expect(s.drifters[0].stolen).toBe(3);
    const d0 = distXZ(s.drifters[0].pos, s.player.pos);
    const ev2 = run(s, {}, 238);
    expect(s.drifters[0].state).toBe('flee');
    run(s, {}, 1);
    expect(s.drifters[0].state).toBe('flee');
    expect(distXZ(s.drifters[0].pos, s.player.pos)).toBeGreaterThan(d0);
    run(s, {}, 1);
    expect(s.drifters[0].state).toBe('removed');
    expect(ev2.filter((e) => e.name === 'drifter_steal')).toHaveLength(0);
    expect(s.player.carried).toBe(4);
  });
  it('carried 2 -> amount 2', () => {
    const s = bare({ player: { carried: 2 }, drifters: [{ pos: near(1.1), state: 'chase' }] });
    const ev = run(s, {}, 1);
    expect(ev).toContainEqual({ tick: 1, name: 'drifter_steal', data: { drifter_id: 'D1', amount: 2, carried: 0 } });
  });
  it('no steal while May waits to respawn', () => {
    const s = bare({ player: { carried: 7 }, drifters: [{ pos: near(1.1), state: 'chase' }] });
    s.player.respawnTicks = 30;
    const ev = run(s, {}, 1);
    expect(ev.filter((e) => e.name === 'drifter_steal')).toHaveLength(0);
    expect(s.player.carried).toBe(7);
  });
});

describe('drifter pulse (spec 7.1)', () => {
  it('chase within 5 m -> flee with stolen 0, no steal afterwards', () => {
    const s = bare({ player: { carried: 6 }, drifters: [{ pos: near(1.1), state: 'chase' }] });
    const ev = run(s, { pulse: true }, 1);
    expect(s.drifters[0].state).toBe('flee');
    expect(s.drifters[0].stolen).toBe(0);
    expect(ev.filter((e) => e.name === 'drifter_steal')).toHaveLength(0);
    expect(s.player.carried).toBe(3);
  });
  it('idle is unchanged; chase beyond 3D 5 m is not scared', () => {
    const s = bare({ player: { carried: 6 }, drifters: [{ pos: near(2) }, { pos: near(5.2), state: 'chase' }] });
    run(s, { pulse: true }, 1);
    expect(s.drifters[0].state).toBe('idle');
    expect(s.drifters[1].state).not.toBe('flee');
  });
  it('flee with stolen 3 within 5 m drops 3 motes at its XZ, event, removed after 120 ticks; safe zone does not block', () => {
    const s = bare({ player: { carried: 3 }, drifters: [{ pos: near(3), state: 'flee', stolen: 3 }] });
    s.drifters[0].stateTicks = 200;
    const ev = run(s, { pulse: true }, 1);
    expect(ev).toContainEqual({ tick: 1, name: 'drifter_drop', data: { drifter_id: 'D1', amount: 3 } });
    expect(s.drifters[0].stolen).toBe(0);
    const dropped = s.motes.filter((m) => m.kind === 'dropped');
    expect(dropped).toHaveLength(3);
    for (const m of dropped) expect(Math.abs(m.pos[0] - s.drifters[0].pos[0])).toBeLessThan(0.2);
    run(s, {}, 119);
    expect(s.drifters[0].state).toBe('flee');
    run(s, {}, 1);
    expect(s.drifters[0].state).toBe('removed');
  });
  it('flee with stolen 0 is unchanged by pulse', () => {
    const s = bare({ player: { carried: 3 }, drifters: [{ pos: near(3), state: 'flee', stolen: 0 }] });
    const ev = run(s, { pulse: true }, 1);
    expect(ev.filter((e) => e.name === 'drifter_drop')).toHaveLength(0);
    expect(s.motes).toHaveLength(0);
  });
});
