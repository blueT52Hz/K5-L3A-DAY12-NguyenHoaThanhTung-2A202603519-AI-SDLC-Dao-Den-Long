import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { getNight } from '../../src/core/nights';
import { step } from '../../src/core/step';
import { groundBelow } from '../../src/core/terrain/terrain-queries';
import type { GameState, NightId, Scenario } from '../../src/core/types';
import { idle, run } from './helpers';

const bare = (extra: Scenario = {}, night: NightId = 1) =>
  createGame(1, { random_motes: false, random_shades: false, wind_enabled: false, ...extra }, night);
const onLand = (s: GameState, i = 0) => groundBelow(getNight(s.night), s.shades[i].pos[0], s.shades[i].pos[2], s.shades[i].pos[1] - 1) !== null;

describe('spawn schedule (spec 6.6)', () => {
  it('2 spawning shades at simTick 300, >= 15 m from May, wander at 360, S3 at 780', () => {
    const s = createGame(3);
    expect(s.shades).toHaveLength(0);
    expect(run(s, {}, 299).filter((e) => e.name === 'shade_spawned')).toEqual([]);
    expect(s.shades).toHaveLength(0);
    const ev = run(s, {}, 1);
    expect(ev.filter((e) => e.name === 'shade_spawned')).toEqual([
      { tick: 300, name: 'shade_spawned', data: { id: 'S1' } },
      { tick: 300, name: 'shade_spawned', data: { id: 'S2' } },
    ]);
    const pts = getNight(1).shadeSpawnPoints;
    for (const sh of s.shades) {
      expect(sh.state).toBe('spawning');
      expect(distXZ(sh.pos, s.player.pos)).toBeGreaterThanOrEqual(15);
      expect(pts.some((p) => distXZ(p, sh.pos) < 1e-9)).toBe(true);
      expect(sh.pos[1]).toBe(1);
    }
    expect(distXZ(s.shades[0].pos, s.shades[1].pos)).toBeGreaterThan(1);
    run(s, {}, 59);
    expect(s.shades.map((x) => x.state)).toEqual(['spawning', 'spawning']);
    run(s, {}, 1); // tick 360
    expect(s.shades.map((x) => x.state)).toEqual(['wander', 'wander']);
    const ev2 = run(s, {}, 420).filter((e) => e.name === 'shade_spawned');
    expect(ev2).toEqual([{ tick: 780, name: 'shade_spawned', data: { id: 'S3' } }]);
  });

  it('caps at 6 shades on Night 1', () => {
    const s = createGame(3, { random_motes: false, time_left_s: 1000, player: { flames: 99 } });
    let spawned = 0;
    for (let k = 0; k < 300 + 480 * 8; k++) {
      s.player.invulnTicks = 99;
      spawned += step(s, idle()).filter((e) => e.name === 'shade_spawned').length;
    }
    expect(spawned).toBe(6);
    expect(s.shades).toHaveLength(6);
  });

  it('Night 2 interval 420, Night 3 interval 360', () => {
    const ticks = (n: NightId, len: number) =>
      run(createGame(3, { random_motes: false, wind_enabled: false }, n), {}, len).filter((e) => e.name === 'shade_spawned').map((e) => e.tick);
    expect(ticks(2, 720)).toEqual([300, 300, 720]);
    expect(ticks(3, 660)).toEqual([300, 300, 660]);
  });

  it('random_shades false: no scheduled spawns', () => {
    const s = createGame(3, { random_shades: false });
    expect(run(s, {}, 800).some((e) => e.name === 'shade_spawned')).toBe(false);
  });

  it('never spawns closer than 15 m to May', () => {
    const p0 = getNight(1).shadeSpawnPoints[0];
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame(seed, { random_motes: false, player: { pos: [p0[0], 0, p0[2]] } });
      run(s, {}, 300);
      for (const sh of s.shades) expect(distXZ(sh.pos, s.player.pos)).toBeGreaterThanOrEqual(15);
    }
  });
});

describe('shade states (spec 6.6)', () => {
  it('scenario shade defaults to chase, Y = ground + 1', () => {
    const s = bare({ shades: [{ pos: [10, 0, 0] }] });
    expect(s.shades[0].state).toBe('chase');
    expect(s.shades[0].pos).toEqual([10, 1, 0]);
  });
  it('chases at shade_speed (4/60 m per tick)', () => {
    const s = bare({ shades: [{ pos: [10, 0, 0] }] });
    run(s, {}, 60);
    expect(s.shades[0].pos[0]).toBeCloseTo(6, 9);
  });
  it('Night 3 chase speed 4.5', () => {
    const s = bare({ player: { pos: [0, 0, -20] }, shades: [{ pos: [0, 0, -30] }] }, 3);
    run(s, {}, 60);
    expect(s.shades[0].pos[2]).toBeCloseTo(-25.5, 9);
  });
  it('wander -> chase at XZ <= 12; wander moves 0.5 x speed', () => {
    const s = bare({ shades: [{ pos: [11.9, 0, 0], state: 'wander' }] });
    run(s, {}, 1);
    expect(s.shades[0].state).toBe('chase');
    const t = bare({ shades: [{ pos: [13, 0, 0], state: 'wander' }] });
    run(t, {}, 1);
    expect(t.shades[0].state).toBe('wander');
    expect(distXZ(t.shades[0].pos, [13, 0, 0])).toBeCloseTo(2 / 60, 9);
  });
  it('wander heading changes every 120 ticks', () => {
    const s = bare({ player: { pos: [0, 0, -30] }, shades: [{ pos: [0, 0, 10], state: 'wander' }] });
    run(s, {}, 1);
    const h1 = [...s.shades[0].heading];
    run(s, {}, 119); // tick 120
    expect(s.shades[0].heading).toEqual(h1);
    run(s, {}, 1); // tick 121
    expect(s.shades[0].heading).not.toEqual(h1);
  });
  it('chase -> wander at XZ > 18', () => {
    const s = bare({ shades: [{ pos: [18.5, 0, 0] }] });
    run(s, {}, 1);
    expect(s.shades[0].state).toBe('wander');
  });
  it('after stunned: always wander; after recoil: chase if XZ <= 18 else wander', () => {
    const near = bare({ shades: [{ pos: [17, 0, 0], state: 'stunned', state_ticks_left: 1 }] });
    run(near, {}, 1);
    expect(near.shades[0].state).toBe('wander'); // Phase 3: stun -> wander regardless of distance
    const nearRecoil = bare({ shades: [{ pos: [17, 0, 0], state: 'recoil', state_ticks_left: 1 }] });
    run(nearRecoil, {}, 1);
    expect(nearRecoil.shades[0].state).toBe('chase');
    const far = bare({ shades: [{ pos: [19, 0, 0], state: 'recoil', state_ticks_left: 1 }] });
    run(far, {}, 1);
    expect(far.shades[0].state).toBe('wander');
  });
  it('spawning: stands still and does not hit for 60 ticks', () => {
    const s = bare({ shades: [{ pos: [0.5, 0, 0], state: 'spawning', state_ticks_left: 60 }] });
    expect(run(s, {}, 59)).toEqual([]);
    expect(s.shades[0].state).toBe('spawning');
    expect(s.shades[0].pos).toEqual([0.5, 1, 0]);
    expect(run(s, {}, 1).map((e) => e.tick)).toEqual([60]);
  });
});

describe('edge lantern zone', () => {
  it('pulse near island edge keeps shade outside the lit zone and on land', () => {
    const s = bare({ player: { carried: 3, pos: [0, 0, 36] }, shades: [{ pos: [0, 1, 38.5] }], lanterns: [{ id: 'L1', pos: [0, 0, 38], lit: true }] });
    run(s, { pulse: true }, 1);
    expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(6 - 1e-9);
    expect(distXZ(s.shades[0].pos, [0, 0, 0])).toBeLessThanOrEqual(40 + 1e-9);
    expect(onLand(s)).toBe(true);
  });
});

describe('safe zones (spec 6.4)', () => {
  it('never enters lit lantern zone', () => {
    const s = bare({ player: { pos: [0, 0, 25] }, shades: [{ pos: [0, 0, 15] }], lanterns: [{ id: 'L1', lit: true }] });
    for (let k = 0; k < 300; k++) {
      step(s, idle());
      expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(6 - 1e-9);
    }
  });
  it('lighting a lantern evicts a shade inside within 30 ticks, no hit meanwhile', () => {
    const s = bare({ player: { pos: [0, 0, 23.5], carried: 10 }, shades: [{ pos: [0.5, 0, 23] }] });
    const ev = run(s, (k) => ({ interact: k === 0 }), 1);
    expect(ev.map((e) => e.name)).toEqual(['deposit', 'lantern_lit']);
    expect(s.shades[0].evictFrom).not.toBeNull();
    let prev = distXZ(s.shades[0].pos, s.lanterns[0].pos);
    for (let k = 1; k < 30; k++) {
      expect(step(s, idle()).some((e) => e.name === 'player_hit')).toBe(false);
      const d = distXZ(s.shades[0].pos, s.lanterns[0].pos);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
    expect(prev).toBeGreaterThanOrEqual(6 - 1e-9);
    expect(s.shades[0].evictFrom).toBeNull();
    expect(s.shades[0].state).toBe('chase');
    expect(run(s, {}, 120).some((e) => e.name === 'player_hit')).toBe(false);
  });
  it('eviction near the island edge ends on land outside the zone', () => {
    const s = bare({ player: { pos: [0, 0, 35.5], carried: 1 }, shades: [{ pos: [0, 0, 38.5] }], lanterns: [{ id: 'L1', pos: [0, 0, 37], deposited: 9 }] });
    run(s, (k) => ({ interact: k === 0 }), 30);
    expect(s.lanterns[0].lit).toBe(true);
    expect(s.shades[0].evictFrom).toBeNull();
    expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(6 - 1e-9);
    expect(distXZ(s.shades[0].pos, [0, 0, 0])).toBeLessThanOrEqual(40 + 1e-9);
    expect(onLand(s)).toBe(true);
  });
});

describe('time', () => {
  it('dawn at tick 60', () => {
    const s = bare({ time_left_s: 1 });
    expect(run(s, {}, 100)).toEqual([{ tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
    expect(s.timeLeftS).toBe(0);
    expect(s.tick).toBe(60);
  });
});
