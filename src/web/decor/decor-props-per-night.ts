import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { buildSharedProps } from './decor-props-shared';
import { buildNight1Props } from './decor-props-night-1-fishing-village';
import { buildNight1Vegetation } from './decor-vegetation-layout';
import { nearDockFootprint } from './decor-night-1-anchored-layout';
import { buildNight2Props } from './decor-props-night-2-areca-island';
import { buildNight3Props } from './decor-props-night-3-bell-island';
import { createTerrainHeightAt } from './island-terrain-height-field';

export interface PropsHandle {
  group: THREE.Group;
  refreshLitTint(): void;
  update(dtS: number): void;
}

/** Ground kept free of scattered grass/rocks per night (anchored prop footprints). */
function sharedBlocked(cfg: NightConfig): (x: number, z: number) => boolean {
  if (cfg.id === 2) return (x, z) => Math.hypot(x + 4.5, z - 5) < 3.2 || Math.hypot(x - 63, z - 7) < 2.6;
  if (cfg.id === 3) return (x, z) => Math.hypot(x + 7, z + 18) < 1.8;
  return (x, z) => nearDockFootprint(cfg, x, z);
}

/**
 * Props for a night: shared grass/rocks plus the night-specific set
 * (Night 1 fishing village + vegetation, Night 2 areca island, Night 3 bell island).
 */
export function buildPropsLayer(
  cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean,
): PropsHandle {
  const group = new THREE.Group();
  group.name = 'props';
  const heightAt = createTerrainHeightAt(cfg);
  const shared = buildSharedProps(cfg, seed, lowQuality, isLitNear, heightAt, sharedBlocked(cfg));
  let night: { group: THREE.Group; update(dtS: number): void };
  if (cfg.id === 2) night = buildNight2Props(cfg, seed, lowQuality, heightAt);
  else if (cfg.id === 3) night = buildNight3Props(cfg, seed, lowQuality, heightAt);
  else {
    const vegetation = buildNight1Vegetation(cfg, seed, lowQuality, heightAt);
    const village = buildNight1Props(cfg, heightAt);
    const g = new THREE.Group();
    g.add(vegetation.group, village);
    night = { group: g, update: vegetation.update };
  }
  group.add(shared.group, night.group);
  return {
    group,
    refreshLitTint: shared.refreshLitTint,
    update(dtS: number) {
      shared.update(dtS);
      night.update(dtS);
    },
  };
}
