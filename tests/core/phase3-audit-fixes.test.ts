import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import type { Scenario } from '../../src/core/types';
import { run } from './helpers';

const bare = (extra: Scenario = {}) =>
  createGame(1, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, ...extra });

describe('phase 3 audit fixes', () => {
  it('lantern already holding >= cost lights on interact without a negative deposit', () => {
    const s = bare({ lanterns: [{ id: 'L1', deposited: 12 }] });
    s.player.pos = [s.lanterns[0].pos[0], s.lanterns[0].pos[1], s.lanterns[0].pos[2]];
    s.player.carried = 3;
    const ev = run(s, { interact: true }, 1);
    expect(ev.map((e) => e.name)).toEqual(['lantern_lit']);
    expect(s.lanterns[0].lit).toBe(true);
    expect(s.player.carried).toBe(3);
    expect(s.lanterns[0].deposited).toBe(12);
  });

  it('fuel_drain events of two shades on one lantern report the same fuel', () => {
    const pos = bare().lanterns[0].pos;
    const s = bare({
      lanterns: [{ id: 'L1', lit: true, fuel: 25 }],
      shades: [
        { id: 'S1', pos: [pos[0] + 1, pos[1], pos[2]], state: 'drain', target_lantern_id: 'L1' },
        { id: 'S2', pos: [pos[0] - 1, pos[1], pos[2]], state: 'drain', target_lantern_id: 'L1' },
      ],
    });
    s.player.pos = [pos[0] + 60, pos[1], pos[2]];
    const ev = run(s, {}, 60).filter((e) => e.name === 'fuel_drain');
    expect(ev).toHaveLength(2);
    expect(ev[0].data.fuel).toBe(ev[1].data.fuel);
    expect(ev[0].data.fuel).toBeGreaterThanOrEqual(0);
  });
});
