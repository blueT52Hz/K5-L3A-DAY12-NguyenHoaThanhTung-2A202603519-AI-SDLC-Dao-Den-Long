import { describe, it, expect } from 'vitest';
import { getNight } from '../../src/core/nights';
import { EXCLUSION_RADII } from '../../src/web/decor/decor-exclusion-zones';
import { nearDockFootprint, night1AnchoredPropPositions } from '../../src/web/decor/decor-night-1-anchored-layout';

describe('night 1 anchored props keep clear of gameplay points', () => {
  const cfg = getNight(1);
  const pts = night1AnchoredPropPositions(cfg);
  const minDist = (set: readonly number[][]) =>
    Math.min(...pts.flatMap(([x, z]) => set.map((p) => Math.hypot(x - p[0], z - p[2]))));
  it('has dock, boats, poles and markers', () => { expect(pts.length).toBeGreaterThan(60); });
  it('shade spawns', () => { expect(minDist(cfg.shadeSpawnPoints)).toBeGreaterThanOrEqual(EXCLUSION_RADII.shadeSpawn); });
  it('mote spawns', () => { expect(minDist(cfg.moteSpawnPoints)).toBeGreaterThanOrEqual(EXCLUSION_RADII.moteSpawn); });
  it('start', () => { expect(minDist([cfg.start])).toBeGreaterThanOrEqual(3); });
  it('scatter filter covers dock footprint but not island centre', () => {
    const dockEnd = pts[pts.length - 12];
    expect(nearDockFootprint(cfg, dockEnd[0], dockEnd[1])).toBe(true);
    expect(nearDockFootprint(cfg, 0, 0)).toBe(false);
  });
});
