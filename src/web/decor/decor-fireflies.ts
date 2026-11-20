import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';

/** Island footprint used to spread decor over every base disc: centre and radius. */
export interface IslandFootprint { cx: number; cz: number; r: number }

// Drift + blink computed on the GPU from uTime; soft additive disc sprite (no texture, no DOM).
const VERT = `
uniform float uTime; uniform float uScale;
attribute float aPhase; attribute float aSize;
varying float vBlink;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.45 + aPhase) * 0.9;
  p.y += sin(uTime * 0.8 + aPhase * 1.7) * 0.35;
  p.z += cos(uTime * 0.38 + aPhase * 1.3) * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vBlink = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 1.9 + aPhase * 3.1), 2.0);
  gl_PointSize = aSize * uScale / max(1.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uCore; uniform vec3 uGlow; uniform float uIntensity;
varying float vBlink;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = 1.0 - smoothstep(0.0, 0.3, d);
  float glow = (1.0 - d) * (1.0 - d);
  if (core + glow < 0.03) discard;
  vec3 c = mix(uGlow, uCore, core);
  gl_FragColor = vec4(c * (core * 1.6 + glow) * vBlink * uIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface FirefliesHandle {
  points: THREE.Points;
  setLitRatio(r: number): void;
  update(dtS: number): void;
}

const NIGHT_1_ISLAND: IslandFootprint[] = [{ cx: 0, cz: 0, r: 40 }];

/** Warm fireflies drifting over the island(s); count scales with total area. Brighter as more lanterns are lit. */
export function buildFireflies(lowQuality: boolean, islands: IslandFootprint[] = NIGHT_1_ISLAND, baseY = 0): FirefliesHandle {
  const area = islands.reduce((a, d) => a + d.r * d.r, 0) / 1600;
  const count = Math.round((lowQuality ? 60 : 170) * Math.min(1.4, Math.max(0.6, area)));
  const rnd = mulberry32(7777);
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const d = islands[i % islands.length];
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * d.r * 1.05;
    pos[i * 3] = d.cx + Math.cos(a) * r;
    pos[i * 3 + 1] = baseY + 0.5 + rnd() * 3.2 + (d.r > 40 ? rnd() * 3 : 0);
    pos[i * 3 + 2] = d.cz + Math.sin(a) * r;
    phase[i] = rnd() * Math.PI * 2;
    size[i] = 0.18 + rnd() * 0.22;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 600 }, uIntensity: { value: 0.6 },
      uCore: { value: new THREE.Color(P.moteCore) }, uGlow: { value: new THREE.Color(P.moteGlow) },
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, precision: 'highp',
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'fireflies';
  points.frustumCulled = false; // drift moves points outside the static bounding sphere
  return {
    points,
    setLitRatio(r: number) { mat.uniforms.uIntensity.value = 0.55 + 0.6 * Math.min(1, Math.max(0, r)); },
    update(dtS: number) { mat.uniforms.uTime.value += dtS; },
  };
}
