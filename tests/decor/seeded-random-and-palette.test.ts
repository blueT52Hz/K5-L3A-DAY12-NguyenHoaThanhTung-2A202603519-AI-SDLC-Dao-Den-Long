import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../../src/web/decor/seeded-random';
import { DECOR_PALETTE } from '../../src/web/decor/decor-palette';

describe('seeded random + palette', () => {
  it('mulberry32 deterministic and in [0,1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 5 }, a), ys = Array.from({ length: 5 }, b);
    expect(xs).toEqual(ys);
    expect(xs.every(v => v >= 0 && v < 1)).toBe(true);
    expect(Array.from({ length: 5 }, mulberry32(43))).not.toEqual(xs);
  });
  it('DECOR_PALETTE matches canonical table', () => {
    expect(DECOR_PALETTE.sky).toBe(0x0e1430);  expect(DECOR_PALETTE.mist).toBe(0x1b2350);
    expect(DECOR_PALETTE.grass).toBe(0x2f5d50); expect(DECOR_PALETTE.sand).toBe(0xc9b48a);
    expect(DECOR_PALETTE.wood).toBe(0x6b4a2f);  expect(DECOR_PALETTE.cloudSea).toBe(0x12384a);
    expect(DECOR_PALETTE.lanternLit).toBe(0xffb347); expect(DECOR_PALETTE.moteGlow).toBe(0xffe58a);
    expect(DECOR_PALETTE.gold).toBe(0xf2c14e);
  });
  it('exact lantern and mote core colors', () => {
    expect(DECOR_PALETTE.lanternCore).toBe(0xffe9b0);
    expect(DECOR_PALETTE.lanternOff).toBe(0x5b5f6e);
    expect(DECOR_PALETTE.moteCore).toBe(0xfff6c2);
  });
  it('has prop colors and all values are numbers', () => {
    for (const k of ['stone','roofTile','bronze','arecaLeaf','arecaTrunk','paperLantern'] as const)
      expect(typeof DECOR_PALETTE[k]).toBe('number');
  });
});
