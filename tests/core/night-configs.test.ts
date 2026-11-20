import { describe, it, expect } from 'vitest';
import { getNight } from '../../src/core/nights';

describe('night configs', () => {
  it('Night 1 lanterns and shade spawn', () => {
    const n = getNight(1);
    expect(n.lanterns).toHaveLength(5);
    const l2 = n.lanterns[1].pos;
    expect(l2[0]).toBeCloseTo(23.8, 1);
    expect(l2[1]).toBe(0);
    expect(l2[2]).toBeCloseTo(7.7, 1);
    const a = (15 * Math.PI) / 180;
    expect(n.shadeSpawnPoints[0][0]).toBeCloseTo(37 * Math.cos(a), 9);
    expect(n.shadeSpawnPoints[0][2]).toBeCloseTo(37 * Math.sin(a), 9);
    expect(n.startFacing).toEqual([0, 1]);
  });

  it('mote and shade spawn point counts', () => {
    expect([1, 2, 3].map((i) => getNight(i as 1 | 2 | 3).moteSpawnPoints.length)).toEqual([24, 24, 30]);
    expect([1, 2, 3].map((i) => getNight(i as 1 | 2 | 3).shadeSpawnPoints.length)).toEqual([12, 16, 16]);
  });

  it('Night 2 pad launches toward the other island centre at 24 m/s', () => {
    const pad = getNight(2).jumpPads[0];
    expect(Math.hypot(pad.horiz[0], pad.horiz[1])).toBeCloseTo(24, 9);
    const dx = 70 - pad.pos[0];
    const dz = 0 - pad.pos[2];
    const d = Math.hypot(dx, dz);
    expect(pad.horiz[0]).toBeCloseTo((dx / d) * 24, 9);
    expect(pad.horiz[1]).toBeCloseTo((dz / d) * 24, 9);
    expect(pad.vy).toBe(14);
  });

  it('Night 3 has 7 lanterns and tier-2 motes at y 6', () => {
    const n = getNight(3);
    expect(n.lanterns).toHaveLength(7);
    expect(n.moteSpawnPoints.slice(26).every((p) => p[1] === 6)).toBe(true);
    expect(n.moteSpawnPoints.slice(18, 26).every((p) => p[1] === 3)).toBe(true);
    expect(n.shadeSpeed).toBe(4.5);
    expect(n.wind).toBe(true);
  });
});
