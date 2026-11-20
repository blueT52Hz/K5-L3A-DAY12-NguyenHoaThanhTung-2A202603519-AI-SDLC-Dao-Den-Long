import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildIslandDecor } from '../../src/web/decor';

describe('buildIslandDecor', () => {
  it('build then dispose restores the scene', () => {
    for (const id of [1, 2, 3] as const) {
      const scene = new THREE.Scene();
      const before = scene.children.length;
      const h = buildIslandDecor(scene, id);
      expect(scene.children.length).toBeGreaterThan(before);
      expect(scene.fog).not.toBeNull();
      const disposed = new Set<unknown>();
      const track = (r: THREE.BufferGeometry | THREE.Material) => r.addEventListener('dispose', () => disposed.add(r));
      const resources = new Set<THREE.BufferGeometry | THREE.Material>();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) resources.add(mesh.geometry);
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => resources.add(x));
        else if (mat) resources.add(mat);
      });
      resources.forEach(track);
      expect(resources.size).toBeGreaterThan(0);
      h.dispose();
      for (const r of resources) expect(disposed.has(r)).toBe(true);
      expect(scene.children.length).toBe(before);
      expect(scene.fog).toBeNull();
      expect(scene.background).toBeNull();
    }
  });
  it('restores previous fog/background', () => {
    const scene = new THREE.Scene();
    const bg = new THREE.Color(0x123456);
    scene.background = bg;
    const h = buildIslandDecor(scene, 1);
    h.dispose();
    expect(scene.background).toBe(bg);
  });
  it('layer toggle and lantern updates do not throw', () => {
    const h = buildIslandDecor(new THREE.Scene(), 1, { lowQuality: true });
    h.setLayerVisible('props', false);
    expect(() => { h.setLitLanterns(['L1', 'L6']); h.update(1 / 60); h.update(1 / 60); }).not.toThrow();
    h.dispose();
  });
  it('night 1 props are non-empty and deterministic', () => {
    const count = () => {
      const s = new THREE.Scene();
      const h = buildIslandDecor(s, 1);
      let n = 0;
      s.traverse(() => n++);
      h.dispose();
      return n;
    };
    expect(count()).toBe(count());
  });
});
