import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { mulberry32 } from './seeded-random';

export const GLOW_RADIUS_M = 6;
const SPREAD_S = 1;

export interface LanternGlowHandle {
  group: THREE.Group;
  setLit(ids: string[]): void;
  isLitNear(x: number, z: number): boolean;
  update(dtS: number): void;
}

interface Entry {
  id: string; x: number; z: number; lit: boolean; t: number; phase: number;
  ring: THREE.Mesh; mote: THREE.Mesh; ringMat: THREE.ShaderMaterial; moteMat: THREE.MeshBasicMaterial;
}

// Radial falloff disc, additive; no canvas texture so it builds without a DOM.
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const FRAG = 'uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, d)); gl_FragColor = vec4(uColor, a * a * uAlpha); }';

/** One additive mote + expanding ground glow ring per lantern; unknown or duplicate ids are ignored. */
export function buildLanternGlowLayer(cfg: NightConfig, seed: number): LanternGlowHandle {
  const group = new THREE.Group();
  group.name = 'lantern-glow';
  const ringGeo = new THREE.CircleGeometry(1, 40);
  const moteGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const rnd = mulberry32(seed);
  const entries = new Map<string, Entry>();

  for (const l of cfg.lanterns) {
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.moteGlow) }, uAlpha: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(l.pos[0], l.pos[1] + 0.06, l.pos[2]);
    ring.scale.setScalar(0.001);
    ring.visible = false;

    const moteMat = new THREE.MeshBasicMaterial({
      color: P.moteGlow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mote = new THREE.Mesh(moteGeo, moteMat);
    mote.position.set(l.pos[0], l.pos[1] + 1.8, l.pos[2]);
    mote.visible = false;

    group.add(ring, mote);
    entries.set(l.id, { id: l.id, x: l.pos[0], z: l.pos[2], lit: false, t: 0, phase: rnd() * Math.PI * 2, ring, mote, ringMat, moteMat });
  }

  return {
    group,
    setLit(ids: string[]) {
      // ids is the full lit set: anything not listed is switched off and reset.
      const on = new Set(ids);
      for (const e of entries.values()) {
        const want = on.has(e.id);
        if (want === e.lit) continue;
        e.lit = want;
        e.ring.visible = want;
        e.mote.visible = want;
        if (!want) {
          e.t = 0;
          e.ring.scale.setScalar(0.001);
          e.ringMat.uniforms.uAlpha.value = 0;
          e.moteMat.opacity = 0;
        }
      }
    },
    isLitNear(x: number, z: number) {
      for (const e of entries.values()) {
        if (e.lit && Math.hypot(x - e.x, z - e.z) <= GLOW_RADIUS_M) return true;
      }
      return false;
    },
    update(dtS: number) {
      for (const e of entries.values()) {
        if (!e.lit) continue;
        e.t = Math.min(1, e.t + dtS / SPREAD_S);
        e.phase += dtS * 2.2;
        const ease = 1 - (1 - e.t) * (1 - e.t);
        e.ring.scale.setScalar(Math.max(0.001, GLOW_RADIUS_M * ease));
        e.ringMat.uniforms.uAlpha.value = 0.55 * ease;
        e.moteMat.opacity = ease * (0.8 + 0.2 * Math.sin(e.phase));
      }
    },
  };
}
