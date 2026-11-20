import * as THREE from 'three';
import { mulberry32 } from './seeded-random';

const STAR_RADIUS_M = 250; // inside the camera far plane (game 300, demo 400)
export const MOON_POS: [number, number, number] = [45, 34, -225];
const MOON_PLANE_M = 90; // billboard size incl. halo; disc is ~22% of it

// Camera-facing billboard: offset the quad in view space so the moon is always a round disc.
const MOON_VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy;
  gl_Position = projectionMatrix * mv;
}`;
const MOON_FRAG = `
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p);
  float disc = 1.0 - smoothstep(0.215, 0.225, d);
  // Subtle maria: low-frequency blotches on the disc.
  float m = sin(p.x * 23.0 + 1.0) * sin(p.y * 19.0 + 2.0) + sin((p.x + p.y) * 31.0);
  vec3 moonCol = mix(vec3(1.0, 0.96, 0.84), vec3(0.86, 0.82, 0.74), smoothstep(0.6, 1.6, m));
  float halo = pow(max(0.0, 1.0 - d), 2.5) * 0.45 + pow(max(0.0, 1.0 - d), 7.0) * 0.9;
  vec3 haloCol = vec3(0.75, 0.8, 1.0);
  vec3 col = moonCol * disc * 1.4 + haloCol * halo * (1.0 - disc);
  float a = max(disc, halo);
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const STAR_VERT = `
uniform float uTime; attribute float aSize; attribute float aPhase; varying float vA;
void main(){
  vA = 0.55 + 0.45 * sin(uTime * (0.8 + aPhase * 0.3) + aPhase * 6.0);
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const STAR_FRAG = `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = pow(1.0 - d, 1.8) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Sky dome gradient: deep navy zenith, violet-blue band near the horizon, darker below.
const DOME_VERT = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const DOME_FRAG = `
varying vec3 vDir;
void main(){
  float h = vDir.y;
  vec3 zenith = vec3(0.002, 0.003, 0.016);
  vec3 horizon = vec3(0.016, 0.018, 0.075);
  vec3 below = vec3(0.006, 0.01, 0.03);
  vec3 c = h > 0.0 ? mix(horizon, zenith, pow(h, 0.55)) : mix(horizon, below, pow(-h, 0.6));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const DOME_RADIUS_M = 280;

export interface SkyHandle {
  group: THREE.Group;
  update(dtS: number): void;
}

/** Gradient sky dome, twinkling stars (upper hemisphere) and a round billboard moon with a soft halo. */
export function buildSkyMoonAndStars(lowQuality: boolean): SkyHandle {
  const group = new THREE.Group();
  group.name = 'sky';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_RADIUS_M, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false }),
  );
  dome.name = 'sky-dome';
  dome.renderOrder = -10;
  group.add(dome);

  const count = lowQuality ? 180 : 520;
  const rnd = mulberry32(9001);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = rnd() * Math.PI * 2;
    const v = 0.06 + rnd() * 0.94;
    const s = Math.sqrt(1 - v * v);
    pos[i * 3] = Math.cos(u) * s * STAR_RADIUS_M;
    pos[i * 3 + 1] = v * STAR_RADIUS_M;
    pos[i * 3 + 2] = Math.sin(u) * s * STAR_RADIUS_M;
    size[i] = 2 + Math.pow(rnd(), 4) * 6;
    phase[i] = rnd();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.name = 'stars';
  group.add(stars);

  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(MOON_PLANE_M, MOON_PLANE_M),
    new THREE.ShaderMaterial({ vertexShader: MOON_VERT, fragmentShader: MOON_FRAG, transparent: true, depthWrite: false }),
  );
  moon.name = 'moon';
  moon.position.set(...MOON_POS);
  moon.frustumCulled = false; // billboard: geometry bounds do not match the drawn quad
  group.add(moon);

  return {
    group,
    update(dtS: number) { starMat.uniforms.uTime.value += dtS; },
  };
}
