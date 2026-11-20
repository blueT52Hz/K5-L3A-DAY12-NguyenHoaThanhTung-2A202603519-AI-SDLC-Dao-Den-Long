import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';

/** Ambient light level: 0.15 base up to 0.70 when all lanterns are lit. */
export function ambientIntensityFor(lit: number, total: number): number {
  if (total <= 0) return 0.15;
  const l = Math.min(Math.max(lit, 0), total);
  return 0.15 + 0.55 * (l / total);
}

const MIST_COUNT = 6;
const MIST_SPEED = 0.03; // rad/s

export interface AtmosphereHandle {
  group: THREE.Group;
  setLitRatio(r: number): void;
  update(dtS: number): void;
}

function buildStars(count: number): THREE.Points {
  const rnd = mulberry32(9001);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Upper hemisphere, far away (fog disabled on the material).
    const u = rnd() * Math.PI * 2;
    const v = 0.08 + rnd() * 0.92;
    const r = 420;
    const s = Math.sqrt(1 - v * v);
    pos[i * 3] = Math.cos(u) * s * r;
    pos[i * 3 + 1] = v * r;
    pos[i * 3 + 2] = Math.sin(u) * s * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false });
  return new THREE.Points(geo, mat);
}

/** Sky background, fog, stars, moon, drifting mist planes and lights. */
export function buildAtmosphereLayer(scene: THREE.Scene, cfg: NightConfig, lowQuality: boolean): AtmosphereHandle {
  scene.background = new THREE.Color(P.sky);
  scene.fog = new THREE.Fog(0x0e1430, 60, 190);

  const group = new THREE.Group();
  group.name = 'atmosphere';
  group.add(buildStars(lowQuality ? 150 : 450));

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(14, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false }),
  );
  moon.position.set(-160, 190, -300);
  group.add(moon);

  // Mist: translucent planes on pivots around the island rim; pivots rotate slowly.
  const mistGeo = new THREE.PlaneGeometry(38, 9);
  const mistMat = new THREE.MeshBasicMaterial({
    color: P.mist, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
  });
  const pivots: THREE.Group[] = [];
  const rnd = mulberry32(5150 + cfg.id);
  const count = lowQuality ? 3 : MIST_COUNT;
  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / count) * Math.PI * 2 + rnd();
    const plane = new THREE.Mesh(mistGeo, mistMat);
    plane.position.set(46 + rnd() * 10, -2 + rnd() * 4, 0);
    plane.rotation.y = Math.PI / 2;
    pivot.add(plane);
    group.add(pivot);
    pivots.push(pivot);
  }

  const ambient = new THREE.AmbientLight(0x8fa0d8, ambientIntensityFor(0, 1));
  const hemi = new THREE.HemisphereLight(0x6f86c8, P.grass, ambientIntensityFor(0, 1) * 0.5);
  group.add(ambient, hemi);

  return {
    group,
    setLitRatio(r: number) {
      const v = ambientIntensityFor(r, 1);
      ambient.intensity = v;
      hemi.intensity = v * 0.5;
    },
    update(dtS: number) {
      for (let i = 0; i < pivots.length; i++) pivots[i].rotation.y += MIST_SPEED * dtS * (i % 2 ? 1 : -0.7);
    },
  };
}
