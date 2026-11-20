import { describe, it, expect } from 'vitest';
import { createGame } from '../../src/core/create-game';
import type { NightId, Scenario } from '../../src/core/types';
import { run } from './helpers';

const bare = (night: NightId, extra: Scenario = {}, seed = 1) =>
  createGame(seed, { random_motes: false, random_shades: false, ...extra }, night);
const dashes = (ev: { name: string }[]) => ev.filter((e) => e.name === 'dash').length;

describe('dash', () => {
  it('ground dash: 12 ticks of 14/60 m, one event, ignored re-press, cooldown 90', () => {
    const t = bare(1);
    let z = t.player.pos[2];
    const moved: number[] = [];
    let n = 0;
    for (let k = 0; k < 14; k++) {
      n += dashes(run(t, { move: [0, 1], dash: k === 0 || k === 6 }, 1));
      moved.push(t.player.pos[2] - z); z = t.player.pos[2];
    }
    expect(n).toBe(1);
    for (let k = 0; k < 12; k++) expect(moved[k]).toBeCloseTo(14 / 60, 6);
    expect(moved[12]).toBeCloseTo(0.1, 6); // walking 6 m/s afterwards
  });

  it('press at tick 89 after start is blocked, at tick 90 dashes', () => {
    const a = bare(1);
    expect(dashes(run(a, (k) => ({ dash: k === 0 || k === 89 }), 91))).toBe(1);
    const b = bare(1);
    expect(dashes(run(b, (k) => ({ dash: k === 0 || k === 90 }), 91))).toBe(2);
  });

  it('standing dash at start goes +Z (facing)', () => {
    const s = bare(1);
    run(s, (k) => ({ dash: k === 0 }), 12);
    expect(s.player.pos[2]).toBeCloseTo(12 * 14 / 60, 6);
    expect(s.player.pos[0]).toBeCloseTo(0, 6);
  });

  it('air dash keeps y for 12 ticks, then gravity resumes', () => {
    const s = bare(1);
    run(s, { jump: true }, 1);
    run(s, {}, 5);
    const y = s.player.pos[1];
    expect(s.player.grounded).toBe(false);
    run(s, (k) => ({ dash: k === 0, jump: false, move: [1, 0] }), 1);
    const ys: number[] = [s.player.pos[1]];
    for (let k = 0; k < 11; k++) { run(s, { move: [1, 0] }, 1); ys.push(s.player.pos[1]); }
    for (const v of ys) expect(v).toBeCloseTo(y, 9);
    run(s, { move: [1, 0] }, 1);
    expect(s.player.pos[1]).toBeLessThan(y);
  });

  it('jump during dash ignored', () => {
    const s = bare(1);
    run(s, (k) => ({ dash: k === 0, jump: k === 3 }), 6);
    expect(s.player.pos[1]).toBe(0);
    expect(s.player.grounded).toBe(true);
  });

  it('dash held through pause/resume does not dash', () => {
    const s = bare(1);
    run(s, [{ pause: true }, { pause: true, dash: true }, { dash: true }, { dash: true, pause: true }, { dash: true }], 5);
    expect(s.paused).toBe(false);
    const ev = run(s, { dash: true }, 3);
    expect(dashes(ev)).toBe(0);
    expect(s.player.dashTicks).toBe(0);
  });

  it('dash during respawn wait is ignored', () => {
    const s = bare(1);
    s.player.respawnTicks = 30;
    expect(dashes(run(s, { dash: true }, 1))).toBe(0);
  });
});

describe('wind charm', () => {
  it('N2 charm pickup, respawn after 2700, two dashes 13 ticks apart with charm', () => {
    const s = bare(2, { player: { pos: [35, 0, 0] } });
    const ev = run(s, {}, 1).find((e) => e.name === 'charm_picked');
    expect(ev?.data).toEqual({ charm_id: 'C1', charm_ticks: 600 });
    expect(s.charms[0].available).toBe(false);
    s.player.pos = [20, 0, 0]; // step off so it is not re-picked the moment it respawns
    run(s, {}, 2699);
    expect(s.charms[0].available).toBe(false);
    run(s, {}, 1);
    expect(s.charms[0].available).toBe(true);

    const t = bare(2, { player: { pos: [35, 0, 0], charm_ticks: 600 }, charms: [{ id: 'C1', available: false, respawn_ticks: 5000 }] });
    expect(dashes(run(t, (k) => ({ dash: k === 0 || k === 13 }), 30))).toBe(2);
    expect(t.player.dashCooldownTicks).toBe(0);
  });

  it('scenario charms replace the default list; N1 has none', () => {
    expect(bare(1).charms).toEqual([]);
    const s = bare(1, { charms: [{ id: 'C9', pos: [5, 0, 5] }] });
    expect(s.charms).toEqual([{ id: 'C9', pos: [5, 0, 5], available: true, respawnTicks: 0 }]);
  });

  it('charm speed 7.2 while active', () => {
    const s = bare(1, { player: { charm_ticks: 100 } });
    run(s, { move: [0, 1] }, 1);
    expect(s.player.pos[2]).toBeCloseTo(7.2 / 60, 6);
  });

  it('scenario dash_cd / pulse_cd / invuln applied', () => {
    const s = bare(1, { player: { dash_cd_ticks: 40, pulse_cd_ticks: 30, invuln_ticks: 20 } });
    expect([s.player.dashCooldownTicks, s.player.pulseCooldownTicks, s.player.invulnTicks]).toEqual([40, 30, 20]);
  });
});

describe('strong wind', () => {
  const calm = (extra: Scenario = {}) => bare(3, extra, 7);

  it('N3 warning at 1680, active at 1800, over at 2100, drifts 2/60 m per tick', () => {
    const s = calm();
    run(s, {}, 1679);
    expect(s.wind.warning).toBe(false);
    run(s, {}, 1);
    expect(s.simTick).toBe(1680);
    expect(s.wind.warning).toBe(true);
    const dir = s.wind.dirDeg;
    expect(Number.isInteger(dir) && dir >= 0 && dir < 360).toBe(true);
    run(s, {}, 119);
    expect(s.wind.warning).toBe(true);
    expect(s.wind.active).toBe(false);
    const p0 = [...s.player.pos];
    run(s, {}, 1);
    expect(s.simTick).toBe(1800);
    expect(s.wind.active).toBe(true);
    expect(s.wind.warning).toBe(false);
    const r = (dir * Math.PI) / 180;
    expect(s.player.pos[0] - p0[0]).toBeCloseTo((Math.cos(r) * 2) / 60, 6);
    expect(s.player.pos[2] - p0[2]).toBeCloseTo((Math.sin(r) * 2) / 60, 6);
    run(s, {}, 299);
    expect(s.simTick).toBe(2099);
    expect(s.wind.active).toBe(true);
    run(s, {}, 1);
    expect(s.wind.active).toBe(false);
  });

  it('wind_enabled false never blows; N1/N2 no wind and no rng use', () => {
    const s = calm({ wind_enabled: false });
    run(s, {}, 1900);
    expect(s.wind.active || s.wind.warning).toBe(false);
    for (const n of [1, 2] as const) {
      const g = bare(n);
      const rng = g.rngState;
      run(g, {}, 1900);
      expect(g.wind.active).toBe(false);
      expect(g.rngState).toBe(rng);
    }
  });
});
