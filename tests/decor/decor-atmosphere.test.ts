import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { getNight } from '../../src/core/nights';
import { ambientIntensityFor, buildAtmosphereLayer } from '../../src/web/decor/decor-atmosphere';
import { buildLanternGlowLayer } from '../../src/web/decor/decor-lantern-glow-ring';
import { buildTerrainLayer } from '../../src/web/decor/island-terrain-meshes';

describe('decor atmosphere, glow, terrain', () => {
  it('ambientIntensityFor', () => {
    expect(ambientIntensityFor(0, 5)).toBeCloseTo(0.15);
    expect(ambientIntensityFor(5, 5)).toBeCloseTo(0.7);
    expect(ambientIntensityFor(9, 5)).toBeCloseTo(0.7);
    expect(ambientIntensityFor(-1, 5)).toBeCloseTo(0.15);
    expect(ambientIntensityFor(0, 0)).toBeCloseTo(0.15);
  });
  it('glow layer bo qua id la/trung', () => {
    const g = buildLanternGlowLayer(getNight(1), 1);
    expect(() => g.setLit(['L1', 'L1', 'X9'])).not.toThrow();
    expect(g.isLitNear(0, 25)).toBe(true);
    expect(g.isLitNear(0, 19)).toBe(true);
    expect(g.isLitNear(0, 18.9)).toBe(false);
    expect(g.isLitNear(0, -20)).toBe(false);
    expect(() => g.update(0.5)).not.toThrow();
  });
  it('glow layer: setLit la tap day du, den khong co trong tap bi tat', () => {
    const g = buildLanternGlowLayer(getNight(1), 1);
    g.setLit(['L1']);
    g.update(0.5);
    expect(g.isLitNear(0, 25)).toBe(true);
    g.setLit([]);
    expect(g.isLitNear(0, 25)).toBe(false);
    expect(g.group.children.every((c) => !c.visible)).toBe(true);
    g.setLit(['L2']);
    expect(g.isLitNear(0, 25)).toBe(false);
    expect(g.isLitNear(23.8, 7.7)).toBe(true);
  });
  it('terrain Dem 1 co mesh, Dem 2/3 rong', () => {
    expect(buildTerrainLayer(getNight(1)).children.length).toBeGreaterThan(0);
    expect(buildTerrainLayer(getNight(3)).children.length).toBe(0);
    expect(buildTerrainLayer(getNight(2)).children.length).toBe(0);
  });
  it('atmosphere dat background + fog, khong can renderer', () => {
    const scene = new THREE.Scene();
    const a = buildAtmosphereLayer(scene, getNight(1), false);
    expect(scene.background).toBeTruthy();
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    expect(() => { a.setLitRatio(0.5); a.update(0.016); }).not.toThrow();
    expect(a.group.children.length).toBeGreaterThan(0);
  });
});
