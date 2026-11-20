import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { buildCloudSea } from './decor-cloud-sea';
import { buildFireflies, type IslandFootprint } from './decor-fireflies';
import { baseDiscs } from './island-terrain-height-field';
import { MOON_POS, buildSkyMoonAndStars } from './decor-sky-moon-and-stars';

/** Ambient light level: 0.15 base up to 0.70 when all lanterns are lit. */
export function ambientIntensityFor(lit: number, total: number): number {
  if (total <= 0) return 0.15;
  const l = Math.min(Math.max(lit, 0), total);
  return 0.15 + 0.55 * (l / total);
}

const MIST_COUNT = 6;
const MIST_SPEED = 0.03; // rad/s
// Soft radial falloff for mist discs; ShaderMaterial so it builds without a DOM canvas.
const MIST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const MIST_FRAG = 'uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)) * 2.0; float a = 1.0 - smoothstep(0.0, 1.0, d); gl_FragColor = vec4(uColor, a * a * uAlpha); }';

export interface AtmosphereHandle {
  group: THREE.Group;
  setLitRatio(r: number): void;
  update(dtS: number): void;
}

/** Sky background, fog, stars, moon, cloud sea, fireflies, drifting mist planes and lights. */
export function buildAtmosphereLayer(scene: THREE.Scene, cfg: NightConfig, lowQuality: boolean): AtmosphereHandle {
  // Everything is centred on the night's base discs (Night 2 spans x -28..98).
  const discs = baseDiscs(cfg);
  const islands: IslandFootprint[] = discs.length ? discs.map((d) => ({ cx: d.cx, cz: d.cz, r: d.r })) : [{ cx: 0, cz: 0, r: 40 }];
  const mx = islands.reduce((a, d) => a + d.cx, 0) / islands.length;
  const mz = islands.reduce((a, d) => a + d.cz, 0) / islands.length;
  const ext = Math.max(...islands.map((d) => Math.hypot(d.cx - mx, d.cz - mz) + d.r));
  const fogPad = Math.max(0, ext - 40);

  scene.background = new THREE.Color(P.sky);
  scene.fog = new THREE.Fog(0x1e2350, 70 + fogPad, 210 + fogPad * 0.6); // matches the sky-dome horizon band

  const group = new THREE.Group();
  group.name = 'atmosphere';
  const sky = buildSkyMoonAndStars(lowQuality);
  sky.group.position.set(mx, 0, mz);
  const clouds = buildCloudSea(lowQuality, islands);
  const fireflies = buildFireflies(lowQuality, islands, discs.length ? discs[0].y : 0);
  group.add(sky.group, clouds.mesh, fireflies.points);

  // Mist: soft horizontal discs drifting below the island rim on slowly rotating pivots.
  const mistGeo = new THREE.PlaneGeometry(40, 40);
  const mistMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(P.mist) }, uAlpha: { value: 0.2 } },
    vertexShader: MIST_VERT, fragmentShader: MIST_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const pivots: THREE.Group[] = [];
  const rnd = mulberry32(5150 + cfg.id);
  const count = Math.ceil(((lowQuality ? 3 : MIST_COUNT) * (1 + (islands.length - 1) * 0.5)) / islands.length) * islands.length;
  for (let i = 0; i < count; i++) {
    const isl = islands[i % islands.length];
    const pivot = new THREE.Group();
    pivot.position.set(isl.cx, 0, isl.cz);
    pivot.rotation.y = (i / count) * Math.PI * 2 + rnd();
    const plane = new THREE.Mesh(mistGeo, mistMat);
    plane.position.set(isl.r - 2 + rnd() * 12, -6 - rnd() * 8, 0);
    plane.rotation.x = -Math.PI / 2;
    pivot.add(plane);
    group.add(pivot);
    pivots.push(pivot);
  }

  // Three 0.170 uses physical units: scale the formula by PI so ambient 0.70 reads as ~0.7x albedo.
  const ambient = new THREE.AmbientLight(0xdfe4ff, ambientIntensityFor(0, 1) * Math.PI);
  // One fixed moonlight, no shadow, from the moon direction.
  const moonLight = new THREE.DirectionalLight(0xc9d2ff, 1.0);
  moonLight.position.set(MOON_POS[0] + mx, MOON_POS[1], MOON_POS[2] + mz);
  moonLight.target.position.set(mx, 0, mz);
  group.add(ambient, moonLight, moonLight.target);

  return {
    group,
    setLitRatio(r: number) {
      ambient.intensity = ambientIntensityFor(r, 1) * Math.PI;
      fireflies.setLitRatio(r);
    },
    update(dtS: number) {
      sky.update(dtS);
      clouds.update(dtS);
      fireflies.update(dtS);
      for (let i = 0; i < pivots.length; i++) pivots[i].rotation.y += MIST_SPEED * dtS * (i % 2 ? 1 : -0.7);
    },
  };
}
