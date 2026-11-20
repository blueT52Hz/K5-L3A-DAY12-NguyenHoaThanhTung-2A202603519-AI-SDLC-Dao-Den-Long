import { describe, it, expect } from 'vitest';
import { getNight } from '../../src/core/nights';
import { isExcluded, scatterGroundY } from '../../src/web/decor/decor-exclusion-zones';
import { scatterPoints, paperLanternPositions, dockAnchor } from '../../src/web/decor/decor-scatter-placement';

describe('decor scatter placement', () => {
  it('tat dinh theo seed', () => {
    const o = { seed: 7, count: 200, minSpacing: 0.8 };
    expect(scatterPoints(getNight(1), o)).toEqual(scatterPoints(getNight(1), o));
    expect(scatterPoints(getNight(1), { ...o, seed: 8 })).not.toEqual(scatterPoints(getNight(1), o));
  });
  it('moi diem hop le, dung khoang cach va vanh ban kinh', () => {
    for (const id of [1, 2, 3] as const) {
      const cfg = getNight(id);
      const pts = scatterPoints(cfg, { seed: 1, count: 150, minSpacing: 1, minRadiusFrac: 0.75, maxRadiusFrac: 0.95 });
      expect(pts.length).toBeGreaterThan(0);
      expect(pts.length).toBeLessThanOrEqual(150);
      for (const [x, y, z] of pts) {
        expect(isExcluded(cfg, x, z)).toBe(false);
        expect(scatterGroundY(cfg, x, z)).toBe(y);
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][2] - pts[j][2])).toBeGreaterThanOrEqual(1);
    }
  });
  it('den giay doc cau Dem 2', () => {
    const p = paperLanternPositions(getNight(2));
    expect(p.length).toBeGreaterThan(0);
    expect(p.every(([x, , z]) => x >= 26 && x <= 44 && Math.abs(Math.abs(z) - 2.3) < 1e-9)).toBe(true);
    expect(paperLanternPositions(getNight(1))).toEqual([]);
  });
  it('ben go chi o Dem 1, tai mep dao', () => {
    const d = dockAnchor(getNight(1))!;
    expect(Math.hypot(d.pos[0], d.pos[2])).toBeCloseTo(40, 5);
    expect(dockAnchor(getNight(2))).toBeNull();
  });
});
