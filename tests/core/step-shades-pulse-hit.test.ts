import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { getNight } from '../../src/core/nights';
import { groundBelow } from '../../src/core/terrain/terrain-queries';
import type { NightId, Scenario } from '../../src/core/types';
import { run } from './helpers';

const bare = (extra: Scenario = {}, night: NightId = 1) =>
  createGame(1, { random_motes: false, random_shades: false, wind_enabled: false, ...extra }, night);
/** XZ of a shade at 3D distance d from the pulse center (player at origin: center y 0.8, shade center y 1.0). */
const at3d = (d: number) => Math.sqrt(d * d - 0.2 * 0.2);

describe('pulse (spec 6.5)', () => {
  it('3D 4.9 m hits: stun, carried 0, +5, pushed exactly 4 m over 15 ticks', () => {
    const x0 = at3d(4.9);
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [x0, 0, 0] }] });
    expect(run(s, { pulse: true }, 1)).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } }]);
    expect(s.player.carried).toBe(0);
    expect(s.score).toBe(5);
    expect(s.shades[0].state).toBe('stunned');
    expect(s.shades[0].pos[0]).toBeCloseTo(x0 + 4 / 15, 9);
    run(s, {}, 14);
    expect(s.shades[0].pos[0]).toBeCloseTo(x0 + 4, 9);
    run(s, {}, 1);
    expect(s.shades[0].pos[0]).toBeCloseTo(x0 + 4, 9);
  });
  it('3D distance counts: 5.1 misses, XZ 4.998 with height 0.2 misses', () => {
    for (const x of [at3d(5.1), 4.998]) {
      const s = bare({ player: { carried: 3 }, shades: [{ pos: [x, 0, 0] }] });
      expect(run(s, { pulse: true }, 1)).toEqual([{ tick: 1, name: 'pulse', data: { stunned_ids: [] } }]);
      expect(s.shades[0].state).toBe('chase');
      expect(s.score).toBe(0);
    }
  });
  it('needs a mote', () => {
    const s = bare({ shades: [{ pos: [5, 0, 0] }] });
    expect(run(s, { pulse: true }, 1)).toEqual([]);
  });
  it('held pulse fires once; cooldown 180 ticks', () => {
    const s = bare({ player: { carried: 5 }, shades: [{ pos: [50, 0, 0] }] });
    const ev = run(s, (k) => ({ pulse: k === 0 || k === 179 }), 180); // up at 0, edge at 179
    expect(ev.filter((e) => e.name === 'pulse')).toHaveLength(1);
    const t = bare({ player: { carried: 6 }, shades: [{ pos: [50, 0, 0] }] });
    const ev2 = run(t, (k) => ({ pulse: k === 0 || k === 180 }), 181);
    expect(ev2.filter((e) => e.name === 'pulse').map((e) => e.tick)).toEqual([1, 181]);
    const u = bare({ player: { carried: 5 }, shades: [{ pos: [50, 0, 0] }] });
    expect(run(u, { pulse: true }, 300).filter((e) => e.name === 'pulse')).toHaveLength(1);
  });
  it('same XZ pushes +X', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [0, 0, 0] }] });
    run(s, { pulse: true }, 15);
    expect(s.shades[0].pos[0]).toBeCloseTo(4, 9);
    expect(s.shades[0].pos[2]).toBeCloseTo(0, 9);
  });
  it('stunned through tick k+119, changes at k+120', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [3, 0, 0] }] });
    run(s, { pulse: true }, 1);
    run(s, {}, 119); // tick 120
    expect(s.shades[0].state).toBe('stunned');
    run(s, {}, 1); // tick 121
    expect(s.shades[0].state).toBe('chase');
  });
  it('pulse on a stunned shade refreshes stun (120) and push (15)', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [3, 0, 0], state: 'stunned', state_ticks_left: 50 }] });
    run(s, { pulse: true }, 1);
    expect(s.shades[0].stateTicks).toBe(120);
    expect(s.shades[0].pushTicks).toBe(15);
    const t = bare({ player: { carried: 6 }, shades: [{ pos: [1, 0, 0] }] }); // pushed to 3.67 m by tick 10
    run(t, { pulse: true }, 1);
    run(t, {}, 9);
    t.player.pulseCooldownTicks = 0;
    expect(run(t, { pulse: true }, 1)[0].data).toEqual({ stunned_ids: ['S1'] });
    expect(t.shades[0].stateTicks).toBe(120);
    expect(t.shades[0].pushTicks).toBe(15);
    expect(t.score).toBe(10);
  });
  it('spawning shade becomes stunned but is not pushed', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [3, 0, 0], state: 'spawning', state_ticks_left: 60 }] });
    expect(run(s, { pulse: true }, 1)[0].data).toEqual({ stunned_ids: ['S1'] });
    run(s, {}, 15);
    expect(s.shades[0].state).toBe('stunned');
    expect(s.shades[0].pos).toEqual([3, 1, 0]);
  });
  it('ids in id order, +5 each', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ id: 'S2', pos: [2, 0, 0] }, { id: 'S1', pos: [-2, 0, 0] }] });
    expect(run(s, { pulse: true }, 1)[0].data).toEqual({ stunned_ids: ['S1', 'S2'] });
    expect(s.score).toBe(10);
  });
  it('push stops at a wall (Night 3 tier-1 edge)', () => {
    const s = bare({ player: { carried: 3, pos: [0, 0, 30] }, shades: [{ pos: [0, 0, 26] }] }, 3);
    run(s, { pulse: true }, 15);
    expect(s.shades[0].pos[2]).toBeCloseTo(26 - 7 * (4 / 15), 9);
    expect(s.shades[0].pos[1]).toBe(1);
    expect(s.shades[0].pushTicks).toBe(0);
  });
  it('push is clamped outside lit lantern zone and island', () => {
    const s = bare({ player: { carried: 3, pos: [0, 0, 14] }, shades: [{ pos: [0, 0, 18] }], lanterns: [{ id: 'L1', lit: true }] });
    for (let k = 0; k < 15; k++) {
      run(s, { pulse: k === 0 }, 1);
      expect(distXZ(s.shades[0].pos, s.lanterns[0].pos)).toBeGreaterThanOrEqual(6 - 1e-9);
    }
    const t = bare({ player: { carried: 3, pos: [36, 0, 0] }, shades: [{ pos: [38, 0, 0] }] });
    run(t, { pulse: true }, 15);
    expect(distXZ(t.shades[0].pos, [0, 0, 0])).toBeLessThanOrEqual(40 + 1e-9);
  });
});


describe('hit (spec 6.6)', () => {
  it('chase shade at 0.9 m: hit, drops floor(c/2) in a 1.5-2.5 ring, recoil ~2 m in 60 ticks', () => {
    const s = bare({ player: { carried: 5 }, shades: [{ pos: [0.9, 0, 0] }] });
    expect(run(s, {}, 1)).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } }]);
    expect(s.player.carried).toBe(3);
    expect(s.motes).toHaveLength(2);
    for (const m of s.motes) {
      expect(m.kind).toBe('dropped');
      expect(m.ttlTicks).toBe(480);
      expect(m.pos[1]).toBe(0);
      const d = distXZ(m.pos, s.player.pos);
      expect(d).toBeGreaterThanOrEqual(1.5 - 1e-9);
      expect(d).toBeLessThanOrEqual(2.5 + 1e-9);
    }
    expect(s.shades[0].state).toBe('recoil');
    const d0 = distXZ(s.shades[0].pos, s.player.pos);
    run(s, {}, 59); // tick 60: last recoil tick
    expect(s.shades[0].state).toBe('recoil');
    expect(Math.abs(distXZ(s.shades[0].pos, s.player.pos) - d0 - 2)).toBeLessThanOrEqual(0.05);
    run(s, {}, 1);
    expect(s.shades[0].state).toBe('chase');
    const ev2 = run(s, {}, 60).filter((e) => e.name === 'player_hit');
    expect(ev2[0].tick).toBe(91); // invuln 90 ticks
  });
  it('carried 0 or 1 drops nothing', () => {
    for (const c of [0, 1]) {
      const s = bare({ player: { carried: c }, shades: [{ pos: [0.5, 0, 0] }] });
      expect(run(s, {}, 1)).toEqual([{ tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 0 } }]);
      expect(s.motes).toHaveLength(0);
      expect(s.player.carried).toBe(c);
    }
  });
  it('two shades touching: one hit, lowest id', () => {
    const s = bare({ shades: [{ id: 'S2', pos: [0.5, 0, 0] }, { id: 'S1', pos: [-0.5, 0, 0] }] });
    expect(run(s, {}, 1).filter((e) => e.name === 'player_hit')).toHaveLength(1);
    expect(s.shades.find((x) => x.id === 'S1')!.state).toBe('recoil');
    expect(s.shades.find((x) => x.id === 'S2')!.state).toBe('chase');
  });
  it('touch while invulnerable does nothing (no recoil)', () => {
    const s = bare({ player: { invuln_ticks: 50 }, shades: [{ pos: [0.5, 0, 0] }] });
    expect(run(s, {}, 10)).toEqual([]);
    expect(s.shades[0].state).toBe('chase');
  });
  it('height difference > 1.5 does not hit', () => {
    const s = bare({ player: { pos: [0, 3, 23.9] }, shades: [{ pos: [0, 0, 24.6] }] }, 3);
    expect(run(s, {}, 10).filter((e) => e.name === 'player_hit')).toEqual([]);
  });
  it('stunned shades do not hit', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [0.5, 0, 0] }] });
    expect(run(s, { pulse: true }, 1).map((e) => e.name)).toEqual(['pulse']);
  });
  it('last flame loses', () => {
    const s = bare({ player: { flames: 1 }, shades: [{ pos: [0.5, 0, 0] }] });
    const ev = run(s, {}, 1);
    expect(ev.map((e) => e.name)).toEqual(['player_hit', 'game_over']);
    expect(ev[1].data).toEqual({ result: 'lost', reason: 'no_flames' });
    expect(s.status).toBe('lost');
  });
  it('drops over void fall back to the player XZ at ground Y', () => {
    const s = bare({ player: { pos: [39.5, 0, 0], carried: 10 }, shades: [{ pos: [39.4, 0, 0.3] }] });
    expect(run(s, {}, 1)[0].data).toEqual({ by: 'shade', flames: 2, dropped: 5 });
    const cfg = getNight(1);
    for (const m of s.motes) {
      const d = distXZ(m.pos, s.player.pos);
      const fallback = d < 1e-9;
      expect(fallback || (d >= 1.5 - 1e-9 && d <= 2.5 + 1e-9)).toBe(true);
      expect(groundBelow(cfg, m.pos[0], m.pos[2], 0)).toBe(m.pos[1]);
    }
  });
  it('Review Focus #4: fall and shade touch in the same tick cost 1 flame; no hit while waiting to respawn', () => {
    const s = bare({ player: { pos: [0, -9.999, 45], invuln_ticks: 2 }, shades: [{ pos: [0.5, -9, 45] }] });
    const ev = run(s, {}, 61).filter((e) => e.name === 'player_hit');
    expect(ev).toEqual([{ tick: 2, name: 'player_hit', data: { by: 'fall', flames: 2, dropped: 0, lost: 0 } }]);
    expect(s.player.flames).toBe(2);
  });
});
