import type * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { createMayCharacter } from '../decor/may-character-factory';
import { createMayIslandWalker } from '../decor/may-character-island-walker';
import { walkerLoopForNight } from '../decor/may-character-walker-path-per-night';
import { createTerrainHeightAt } from '../decor/island-terrain-height-field';

export interface DemoWalkingCharacter {
  group: THREE.Group;
  update(dtS: number): void;
  dispose(): void;
}

/**
 * Mây walking the night's loop (no light). Feet follow the visual terrain height, which is the
 * gameplay groundBelow() plus the small grass bumps, so she also climbs tiers correctly.
 */
export function createDemoWalkingCharacter(scene: THREE.Scene, cfg: NightConfig): DemoWalkingCharacter {
  const character = createMayCharacter({ withLight: false });
  const walker = createMayIslandWalker(character, { ...walkerLoopForNight(cfg), heightAt: createTerrainHeightAt(cfg) });
  scene.add(character.group);
  walker.update(1 / 60); // place her on the path before the first frame
  return {
    group: character.group,
    update(dtS: number) { walker.update(dtS); },
    dispose() { character.dispose(); },
  };
}
