import * as THREE from 'three';
import type { NightConfig } from '../../core/nights/night-config-types';
import { getNight } from '../../core/nights';
import { PALETTE } from './palette';
import { buildNightTerrain } from './night-terrain-meshes';

/** Ambient scale for brightness: 0.15 + 0.55 * lit/total (0.15 dark ... 0.70 fully lit). */
export function brightnessFor(lit: number, total: number): number {
  const t = total > 0 ? Math.min(Math.max(lit / total, 0), 1) : 0;
  return 0.15 + 0.55 * t;
}

/**
 * Night terrain + sky + lights. Second arg may be a NightConfig (default night 1) or, for backward
 * compatibility, a boolean `boost`; boost may also be passed as the third arg.
 */
export function createEnvironment(
  scene: THREE.Scene, cfgOrBoost?: NightConfig | boolean, boostArg = false,
): { setBrightness(lit: number, total?: number): void; brightness: number } {
  const cfg = typeof cfgOrBoost === 'object' ? cfgOrBoost : getNight(1);
  const boost = typeof cfgOrBoost === 'boolean' ? cfgOrBoost : boostArg;
  scene.background = new THREE.Color(PALETTE.skyNight);
  scene.fog = new THREE.Fog(PALETTE.skyNight, 60, 190);
  scene.add(buildNightTerrain(cfg));

  const ambient = new THREE.AmbientLight(0x8d7fc4, 1);
  const hemi = new THREE.HemisphereLight(0xb4a8f0, 0x3a2a55, 1);
  const moon = new THREE.DirectionalLight(0xc9c2ff, 1);
  moon.position.set(-30, 50, 20);
  scene.add(ambient, hemi, moon);

  const skyDark = new THREE.Color(PALETTE.skyNight), skyLit = new THREE.Color(PALETTE.mist), sky = new THREE.Color();
  const env = {
    brightness: 0.15,
    setBrightness(lit: number, total = 5) {
      const b = brightnessFor(lit, total);
      env.brightness = b;
      const k = boost ? 1.35 : 1; // CPU mode: no point lights, lift ambient/hemi
      ambient.intensity = b * 2.2 * k;
      hemi.intensity = b * 1.8 * k;
      moon.intensity = b * 1.8;
      moon.color.setHex(b > 0.45 ? 0xffe2b8 : 0xc9c2ff);
      sky.copy(skyDark).lerp(skyLit, (b - 0.15) / 0.55);
      (scene.background as THREE.Color).copy(sky);
      scene.fog!.color.copy(sky);
    },
  };
  env.setBrightness(0);
  return env;
}
