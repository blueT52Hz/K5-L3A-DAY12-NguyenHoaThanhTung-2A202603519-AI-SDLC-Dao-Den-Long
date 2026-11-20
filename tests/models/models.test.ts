import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createPlayerModel, createShadeModel, createLanternModel, createMoteModel, createEnvironment,
} from '../../src/web/models';

function find<T extends THREE.Object3D>(root: THREE.Object3D, pred: (o: THREE.Object3D) => boolean): T[] {
  const out: T[] = [];
  root.traverse((o) => { if (pred(o)) out.push(o as T); });
  return out;
}

describe('models', () => {
  it('factories return non-empty objects', () => {
    expect(createPlayerModel().children.length).toBeGreaterThan(0);
    expect(createShadeModel().children.length).toBeGreaterThan(0);
    expect(createLanternModel().group.children.length).toBeGreaterThan(0);
    const mote = createMoteModel();
    expect(mote instanceof THREE.Mesh || mote.children.length > 0).toBe(true);
  });

  it('player has a cone hat and feet at y=0', () => {
    const p = createPlayerModel();
    const cones = find<THREE.Mesh>(p, (o) => (o as THREE.Mesh).geometry instanceof THREE.ConeGeometry);
    expect(cones.length).toBe(1);
    expect(new THREE.Box3().setFromObject(p).min.y).toBeCloseTo(0, 5);
  });

  it('setLit(true) gives a PointLight with intensity > 0', () => {
    const l = createLanternModel();
    l.setLit(true);
    const lights = find<THREE.PointLight>(l.group, (o) => o instanceof THREE.PointLight);
    expect(lights.length).toBe(1);
    expect(lights[0].intensity).toBeGreaterThan(0);
    l.setLit(false);
    expect(lights[0].intensity).toBe(0);
  });

  it('environment setBrightness works and brightens', () => {
    const scene = new THREE.Scene();
    const env = createEnvironment(scene);
    const amb = find<THREE.AmbientLight>(scene, (o) => o instanceof THREE.AmbientLight)[0];
    const before = amb.intensity;
    expect(() => env.setBrightness(5)).not.toThrow();
    expect(amb.intensity).toBeGreaterThan(before);
    expect(scene.fog).toBeTruthy();
  });
});
