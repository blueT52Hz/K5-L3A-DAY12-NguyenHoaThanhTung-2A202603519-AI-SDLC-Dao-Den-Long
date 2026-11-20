import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import { run } from './helpers';

const bare = (extra = {}) => createGame(1, { random_motes: false, random_shades: false, ...extra });

describe('core pause (spec 7.4)', () => {
  it('pause edge freezes the sim, tick keeps counting, resume moves on the same tick', () => {
    const s = bare();
    run(s, {}, 4); // ticks 1-4
    const ev = run(s, { pause: true }, 1); // tick 5
    expect(ev).toEqual([{ tick: 5, name: 'paused', data: {} }]);
    expect(s.paused).toBe(true);
    expect(s.simTick).toBe(4);
    const time = s.timeLeftS;

    expect(run(s, { pause: true, move: [0, 1] }, 10)).toEqual([]); // held: no new edge
    expect(s.tick).toBe(15);
    expect(s.simTick).toBe(4);
    expect(s.timeLeftS).toBe(time);
    expect(s.player.pos).toEqual([0, 0, 0]);

    run(s, { move: [0, 1] }, 1); // release (tick 16, still paused)
    expect(s.paused).toBe(true);
    expect(s.player.pos).toEqual([0, 0, 0]);
    const ev2 = run(s, { pause: true, move: [0, 1] }, 1); // press again (tick 17)
    expect(ev2).toEqual([{ tick: 17, name: 'resumed', data: {} }]);
    expect(s.paused).toBe(false);
    expect(s.simTick).toBe(5);
    expect(s.player.pos[2]).toBeCloseTo(0.1, 9);
  });

  it('does not tick counters while paused', () => {
    const s = bare({ player: { invuln_ticks: 10, pulse_cd_ticks: 10 } });
    run(s, (k) => ({ pause: k === 0 }), 20);
    expect(s.player.invulnTicks).toBe(10);
    expect(s.player.pulseCooldownTicks).toBe(10);
  });

  it('Review Focus #3: pulse pressed while paused and held through resume does not fire', () => {
    const s = bare({ player: { carried: 3 }, shades: [{ pos: [2, 0, 0] }] });
    // k0: pause on; k1-4: pulse pressed + held while paused; k5: release pause; k6: resume with pulse still held.
    const ev = run(s, (k) => ({ pause: k === 0 || k === 6, pulse: k >= 1 }), 12);
    expect(ev.map((e) => e.name)).toEqual(['paused', 'resumed']);
    expect(s.player.carried).toBe(3);
    expect(s.shades[0].state).toBe('chase');
  });

  it('interact pressed while paused and held through resume does not deposit', () => {
    const s = bare({ player: { pos: [0, 0, 23.5], carried: 10 } });
    const ev = run(s, (k) => ({ pause: k === 0 || k === 6, interact: k >= 1 }), 12);
    expect(ev.map((e) => e.name)).toEqual(['paused', 'resumed']);
    expect(s.lanterns[0].deposited).toBe(0);
  });

  it('a fresh press after resume works', () => {
    const s = bare({ player: { pos: [0, 0, 23.5], carried: 10 } });
    const ev = run(s, (k) => ({ pause: k === 0 || k === 2, interact: k === 4 }), 6);
    expect(ev.map((e) => e.name)).toEqual(['paused', 'resumed', 'deposit', 'lantern_lit']);
  });
});
