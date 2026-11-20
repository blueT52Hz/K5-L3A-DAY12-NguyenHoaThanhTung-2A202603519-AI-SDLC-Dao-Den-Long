import { describe, it, expect } from 'vitest';
import { getNight } from '../../src/core/nights';
import { isExcluded, scatterGroundY } from '../../src/web/decor/decor-exclusion-zones';

const n1 = getNight(1), n2 = getNight(2), n3 = getNight(3);

describe('decor exclusion zones', () => {
  it('vung cam Dem 1', () => {
    expect(isExcluded(n1, 0, 27)).toBe(true); // den L1 (0,25), 2 m
    expect(isExcluded(n1, 0, 2.9)).toBe(true); // diem xuat phat
    expect(isExcluded(n1, 35.74, 11.0)).toBe(true); // diem sinh Bong Muc 15 deg r37
    expect(isExcluded(n1, 0, 29)).toBe(false);
  });
  it('vung cam cau Dem 2', () => {
    expect(isExcluded(n2, 30, 2.9)).toBe(true); // rect z in [-2,2] + 1 m
    expect(isExcluded(n2, 30, 3.5)).toBe(false);
  });
  it('scatterGroundY loai mep va lay dung tang', () => {
    expect(scatterGroundY(n1, 20, 0)).toBe(0);
    expect(scatterGroundY(n1, 39.5, 0)).toBeNull(); // mep dao r=40
    expect(scatterGroundY(n3, 0, 18)).toBe(3); // tang 1, z>0
    expect(scatterGroundY(n3, 0, -18)).toBe(0);
    expect(scatterGroundY(n3, 0, 23.5)).toBeNull(); // sat mep ngoai tang 1 (24)
    expect(scatterGroundY(n2, 35, 5)).toBeNull(); // bien may giua 2 dao
  });
});
