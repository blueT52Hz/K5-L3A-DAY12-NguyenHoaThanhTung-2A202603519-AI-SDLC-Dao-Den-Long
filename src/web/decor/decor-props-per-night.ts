import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { buildSharedProps } from './decor-props-shared';
import { buildNight1Props } from './decor-props-night-1-fishing-village';
import { buildNight1Vegetation } from './decor-vegetation-layout';
import { createTerrainHeightAt } from './island-terrain-height-field';

export interface PropsHandle {
  group: THREE.Group;
  refreshLitTint(): void;
  update(dtS: number): void;
}

/**
 * Props for a night: shared grass/rocks, vegetation, plus the night-specific village set.
 * Temporary scope: only Night 1 is drawn; other nights return an empty group.
 */
export function buildPropsLayer(
  cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean,
): PropsHandle {
  const group = new THREE.Group();
  group.name = 'props';
  if (cfg.id !== 1) return { group, refreshLitTint() {}, update() {} };
  const heightAt = createTerrainHeightAt(cfg);
  const shared = buildSharedProps(cfg, seed, lowQuality, isLitNear, heightAt);
  const vegetation = buildNight1Vegetation(cfg, seed, lowQuality, heightAt);
  group.add(shared.group, vegetation.group, buildNight1Props(cfg, heightAt));
  return {
    group,
    refreshLitTint: shared.refreshLitTint,
    update(dtS: number) {
      shared.update(dtS);
      vegetation.update(dtS);
    },
  };
}
