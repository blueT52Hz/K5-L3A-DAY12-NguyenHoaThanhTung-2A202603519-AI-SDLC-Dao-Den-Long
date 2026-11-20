import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { distXZ } from '../../src/core/math-xz';
import { getNight } from '../../src/core/nights';
import { step } from '../../src/core/step';
import { groundBelow } from '../../src/core/terrain/terrain-queries';
import type { GameEvent, GameState, NightId, Scenario } from '../../src/core/types';
import { idle, run } from './helpers';

const bare = (night: NightId, extra: Scenario = {}) =>
  createGame(1, { random_motes: false, random_shades: false, ...extra }, night);

/** Step until an event named `name` fires (max n ticks); returns it, or undefined. */
function runUntil(s: GameState, input: Parameters<typeof run>[1], name: string, n: number): GameEvent | undefined {
  for (let k = 0; k < n; k++) {
    const ev = run(s, input, 1).find((e) => e.name === name);
    if (ev) return ev;
  }
  return undefined;
}

describe('fall and respawn', () => {
  it('Night 1: walking +X off the edge falls, loses carried, respawns at start with invuln', () => {
    const s = bare(1, { player: { carried: 4 } });
    run(s, { move: [1, 0] }, 420); // 7 s at 6 m/s: past the r=40 edge
    const hit = runUntil(s, {}, 'player_hit', 120);
    expect(hit?.data).toEqual({ by: 'fall', flames: 2, dropped: 0, lost: 4 });
    expect(s.player.flames).toBe(2);
    expect(s.player.carried).toBe(0);
    expect(s.player.respawnTicks).toBe(60);
    // Waiting: input ignored, no second fall.
    const wait = run(s, { move: [1, 0] }, 59);
    expect(wait.filter((e) => e.name === 'player_hit')).toHaveLength(0);
    expect(s.player.vel).toEqual([0, 0, 0]);
    run(s, {}, 1); // 60th tick after the fall: respawn at step 2
    expect(s.player.pos).toEqual([0, 0, 0]);
    expect(s.player.grounded).toBe(true);
    expect(s.player.facing).toEqual([0, 1]);
    expect(s.player.launchVel).toBeNull();
    expect(s.player.invulnTicks).toBe(90);
    expect(s.player.respawnTicks).toBe(0);
  });

  it('last flame lost by falling ends the game without respawn', () => {
    const s = bare(1, { player: { pos: [40, 0, 0], flames: 1 } });
    const ev = run(s, { move: [1, 0] }, 120);
    expect(ev.filter((e) => e.name === 'player_hit')).toHaveLength(1);
    expect(s.status).toBe('lost');
    expect(s.player.respawnTicks).toBe(0);
  });

  it('Night 2: walking +Z off the bridge falls (bridge has no rails)', () => {
    const s = bare(2, { player: { pos: [35, 0, 0] }, charms: [] }); // no charm: the start spot is where C1 sits
    run(s, { move: [0, 1] }, 40);
    expect(s.player.pos[2]).toBeCloseTo(4, 9);
    expect(s.player.pos[1]).toBeLessThan(0);
    expect(s.player.grounded).toBe(false);
  });
});

describe('jump pads', () => {
  it('Night 2 pad launches toward the other island and lands on it', () => {
    const s = bare(2, { player: { pos: [20, 0, 18] } });
    run(s, {}, 1);
    expect(s.player.vy).toBe(14);
    expect(s.player.grounded).toBe(false);
    run(s, {}, 100);
    expect(s.player.grounded).toBe(true);
    expect(s.player.launchVel).toBeNull();
    const [x, y, z] = s.player.pos;
    expect(groundBelow(getNight(2), x, z, y)).not.toBeNull();
    expect(distXZ(s.player.pos, [70, 0, 0])).toBeLessThan(28);
  });

  it('launchVel replaces move input while airborne', () => {
    const a = bare(2, { player: { pos: [20, 0, 18] } });
    const b = bare(2, { player: { pos: [20, 0, 18] } });
    run(a, {}, 30);
    run(b, (k) => (k === 0 ? {} : { move: [-1, 0] }), 30);
    expect(b.player.pos).toEqual(a.player.pos);
  });

  it('Night 3 pad lands on tier 2 (y = 6)', () => {
    const s = bare(3, { player: { pos: [0, 3, 13] } });
    run(s, {}, 100);
    expect(s.player.grounded).toBe(true);
    expect(s.player.pos[1]).toBe(6);
    expect(distXZ(s.player.pos, [0, 0, 0])).toBeLessThan(8);
  });
});

describe('terrain walking (Night 3)', () => {
  it('climbs the 30 deg ramp to tier 1', () => {
    const a = (30 * Math.PI) / 180;
    const s = bare(3, { player: { pos: [30 * Math.cos(a), 0, 30 * Math.sin(a)] } });
    // move [0,1] rotated by yaw -120 deg = (sin, cos) = (-cos30, -sin30): toward the centre.
    run(s, { move: [0, 1], cam_yaw_deg: -120 }, 70);
    expect(s.player.pos[1]).toBe(3);
    expect(s.player.grounded).toBe(true);
  });

  it('tier 1 edge is a wall from below', () => {
    const s = bare(3, { player: { pos: [0, 0, 26] } });
    run(s, { move: [0, -1] }, 60);
    expect(s.player.pos[2]).toBeGreaterThan(24);
    expect(s.player.pos[2]).toBeLessThan(24.11);
    expect(s.player.pos[1]).toBe(0);
  });
});

describe('velocity units', () => {
  it('vel is m/s: running +Z gives [0,0,6]; with charm [0,0,7.2]', () => {
    const s = bare(1);
    step(s, { ...idle(), move: [0, 1] });
    expect(s.player.vel[0]).toBeCloseTo(0, 9);
    expect(s.player.vel[1]).toBe(0);
    expect(s.player.vel[2]).toBeCloseTo(6, 9);
    const c = bare(1, { player: { charm_ticks: 600 } });
    step(c, { ...idle(), move: [0, 1] });
    expect(c.player.vel[2]).toBeCloseTo(7.2, 9);
  });

  it('facing follows the last non-zero move direction', () => {
    const s = bare(1);
    run(s, { move: [1, 0] }, 1);
    run(s, {}, 5);
    expect(s.player.facing[0]).toBeCloseTo(1, 9);
    expect(s.player.facing[1]).toBeCloseTo(0, 9);
  });
});
