import { describe, it, expect } from 'vitest';
import { getNight } from '../../src/core/nights';
import { canWalkTo, groundBelow, isWall } from '../../src/core/terrain/terrain-queries';

describe('terrain queries', () => {
  it('Night 1 island edge', () => {
    const n = getNight(1);
    expect(groundBelow(n, 0, 0, 0)).toBe(0);
    expect(groundBelow(n, 41, 0, 0)).toBeNull();
    expect(groundBelow(n, 40, 0, 0)).toBe(0);
  });

  it('Night 2 bridge has no rails', () => {
    const n = getNight(2);
    expect(groundBelow(n, 35, 1.9, 0)).toBe(0);
    expect(groundBelow(n, 35, 2.1, 0)).toBeNull();
  });

  it('Night 3 tier 1 is a wall from below and ground from above', () => {
    const n = getNight(3);
    expect(groundBelow(n, 18, 10, 3)).toBe(3);
    expect(isWall(n, 18, 10, 0)).toBe(true);
    expect(canWalkTo(n, 0, 18, 10, true)).toBe(false);
  });

  it('Night 3 ramp interpolates height', () => {
    const n = getNight(3);
    const a = (30 * Math.PI) / 180;
    expect(groundBelow(n, 27 * Math.cos(a), 27 * Math.sin(a), 1.4)).toBeCloseTo(1.5, 9);
  });

  it('Night 3 tower blocks and tier 1 only exists for z > 0', () => {
    const n = getNight(3);
    expect(isWall(n, 1, 0, 6)).toBe(true);
    expect(isWall(n, 3, 0, 14)).toBe(false);
    expect(groundBelow(n, 0, -18, 3)).toBe(0);
    expect(groundBelow(n, 0, 18, 3)).toBe(3);
  });

  it('canWalkTo respects allowDrop and step-down limit', () => {
    const n = getNight(1);
    expect(canWalkTo(n, 0, 41, 0, false)).toBe(false);
    expect(canWalkTo(n, 0, 41, 0, true)).toBe(true);
    expect(canWalkTo(n, 0, 10, 0, false)).toBe(true);
  });
});

