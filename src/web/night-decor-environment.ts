import type * as THREE from 'three';
import type { Lantern, NightId } from '../core/types';
import { buildIslandDecor, type IslandDecorHandle } from './decor';

/**
 * Game-side owner of the island decor (terrain, sky, fog, lights, props, glow rings) for one night.
 * Replaces the old createEnvironment/buildNightTerrain path: exactly one terrain, one set of
 * lights and one fog in the scene. Lighting follows the lanterns' lit state from GameState.
 */
export class NightDecorEnvironment {
  private handle: IslandDecorHandle | null = null;
  private litKey: string | null = null;

  constructor(private scene: THREE.Scene, private lowQuality: boolean) {}

  /** Dispose the previous night's decor (if any) and build a fresh one for `night`. */
  rebuild(night: NightId): void {
    this.dispose();
    this.handle = buildIslandDecor(this.scene, night, { lowQuality: this.lowQuality });
    this.litKey = null; // force the first setLitLanterns call
  }

  /** Push lit lantern ids to the decor only when the lit set changed (cheap per-frame call). */
  syncLanterns(lanterns: readonly Lantern[]): void {
    if (!this.handle) return;
    const ids = lanterns.filter((l) => l.lit).map((l) => l.id);
    const key = ids.join(',');
    if (key === this.litKey) return;
    this.litKey = key;
    this.handle.setLitLanterns(ids);
  }

  /** Render-rate animation (clouds, mist, fireflies, swinging props). */
  update(dtS: number): void {
    this.handle?.update(dtS);
  }

  /** Remove all decor objects, free GPU resources and restore scene fog/background. */
  dispose(): void {
    this.handle?.dispose();
    this.handle = null;
  }
}
