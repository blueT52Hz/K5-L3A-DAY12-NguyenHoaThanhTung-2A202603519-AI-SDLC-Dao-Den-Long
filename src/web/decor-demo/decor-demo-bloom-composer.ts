import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Subtle bloom: only bright emissive things (lanterns, fireflies, moon, windows) glow. */
const BLOOM_STRENGTH = 0.9;
const BLOOM_RADIUS = 0.1; // low: lerpBloomFactor mixes toward (1.2 - f), which would re-boost coarse mips
const BLOOM_THRESHOLD = 0.62;

export interface DemoComposer {
  render(): void;
  setSize(w: number, h: number): void;
}

/**
 * Demo-only render pipeline: ACES filmic tone mapping + sRGB output (applied by OutputPass)
 * with a light UnrealBloomPass.
 */
export function createDemoBloomComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): DemoComposer {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  // Weight the small, soft mips low: on some GPU/ANGLE backends the coarsest bloom mips upsample
  // blocky, so keep the glow tight (mostly the two finest levels).
  bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.75, 0.3, 0.08, 0.0];
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render() { composer.render(); },
    setSize(w: number, h: number) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    },
  };
}
