import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { buildSharedProps } from './decor-props-shared';
import { buildNight1Props } from './decor-props-night-1-fishing-village';

export interface PropsHandle {
  group: THREE.Group;
  refreshLitTint(): void;
  update(dtS: number): void;
}

/**
 * Props for a night: shared grass/rocks/sand plus night-specific set.
 * Temporary scope: only Night 1 is drawn; other nights return an empty group.
 */
export function buildPropsLayer(
  cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean,
): PropsHandle {
  const group = new THREE.Group();
  group.name = 'props';
  if (cfg.id !== 1) return { group, refreshLitTint() {}, update() {} };
  const shared = buildSharedProps(cfg, seed, lowQuality, isLitNear);
  group.add(shared.group, buildNight1Props(cfg));
  return { group, refreshLitTint: shared.refreshLitTint, update: shared.update };
}
