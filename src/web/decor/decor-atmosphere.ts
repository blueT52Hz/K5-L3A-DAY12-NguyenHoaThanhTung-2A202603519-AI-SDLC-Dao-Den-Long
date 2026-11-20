import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';
import { buildCloudSea } from './decor-cloud-sea';
import { buildFireflies } from './decor-fireflies';
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
  scene.background = new THREE.Color(P.sky);
  scene.fog = new THREE.Fog(0x1e2350, 70, 210); // matches the sky-dome horizon band

  const group = new THREE.Group();
  group.name = 'atmosphere';
  const sky = buildSkyMoonAndStars(lowQuality);
  const clouds = buildCloudSea(lowQuality);
  const fireflies = buildFireflies(lowQuality);
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
  const count = lowQuality ? 3 : MIST_COUNT;
  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / count) * Math.PI * 2 + rnd();
    const plane = new THREE.Mesh(mistGeo, mistMat);
    plane.position.set(38 + rnd() * 12, -6 - rnd() * 8, 0);
    plane.rotation.x = -Math.PI / 2;
    pivot.add(plane);
    group.add(pivot);
    pivots.push(pivot);
  }

  // Three 0.170 uses physical units: scale the formula by PI so ambient 0.70 reads as ~0.7x albedo.
  const ambient = new THREE.AmbientLight(0xdfe4ff, ambientIntensityFor(0, 1) * Math.PI);
  // One fixed moonlight, no shadow, from the moon direction.
  const moonLight = new THREE.DirectionalLight(0xc9d2ff, 1.0);
  moonLight.position.set(...MOON_POS);
  group.add(ambient, moonLight);

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
