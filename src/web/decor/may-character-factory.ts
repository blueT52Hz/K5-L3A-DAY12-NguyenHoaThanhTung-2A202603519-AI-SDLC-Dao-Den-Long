import * as THREE from 'three';
import {
  createMayGeometries,
  createMayMaterials,
  disposeMayResources,
} from './may-character-materials-and-geometries';
import { buildMayRig } from './may-character-rig-builder';
import { createMayWalkCycleAnimator } from './may-character-walk-cycle-animator';

/**
 * Mây, the young lantern keeper of Đảo Đèn Lồng: stylized low-poly chibi (~1.6 m tall with the
 * nón lá), group origin at the feet, facing +Z. Arms and legs swing procedurally with speed.
 */
export interface MayCharacter {
  /** Add this to the scene; move/rotate it to place the character (origin = feet). */
  group: THREE.Group;
  /** Advance the animation; `speedMps` = current ground speed (0 = idle, ~1.4 walk, ~6 run). */
  update(dtS: number, speedMps: number): void;
  /** Free the character's geometries and materials and detach it from its parent. */
  dispose(): void;
}

export interface MayCharacterOptions {
  /** Attach a small warm PointLight inside the hat lantern (default false). */
  withLight?: boolean;
}

export function createMayCharacter(opts: MayCharacterOptions = {}): MayCharacter {
  const materials = createMayMaterials();
  const geometries = createMayGeometries();
  const group = new THREE.Group();
  group.name = 'may-character';
  const joints = buildMayRig(group, materials, geometries, opts.withLight === true);
  const animator = createMayWalkCycleAnimator(joints);
  let disposed = false;

  return {
    group,
    update(dtS, speedMps) {
      if (disposed) return;
      animator.update(dtS, speedMps);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.traverse((o) => {
        if (o instanceof THREE.PointLight) o.dispose();
      });
      disposeMayResources(materials, geometries);
    },
  };
}
