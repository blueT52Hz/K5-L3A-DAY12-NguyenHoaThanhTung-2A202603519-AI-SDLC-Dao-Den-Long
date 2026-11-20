import * as THREE from 'three';
import { getNight } from '../../core/nights';
import { buildTerrainLayer } from './island-terrain-meshes';
import { buildAtmosphereLayer } from './decor-atmosphere';
import { buildLanternGlowLayer } from './decor-lantern-glow-ring';
import { buildPropsLayer } from './decor-props-per-night';

export { buildPropsLayer } from './decor-props-per-night';

export type DecorLayer = 'terrain' | 'props' | 'atmosphere' | 'glow';

export interface IslandDecorHandle {
  setLitLanterns(litIds: string[]): void;
  setLayerVisible(layer: DecorLayer, v: boolean): void;
  update(dtS: number): void;
  dispose(): void;
}

const DEFAULT_SEED = 20261120;

/** Build all decor layers into `scene`; dispose() removes them and restores fog/background. */
export function buildIslandDecor(
  scene: THREE.Scene, nightId: 1 | 2 | 3, opts: { seed?: number; lowQuality?: boolean } = {},
): IslandDecorHandle {
  const seed = opts.seed ?? DEFAULT_SEED;
  const low = opts.lowQuality ?? false;
  const cfg = getNight(nightId);
  const prevFog = scene.fog;
  const prevBackground = scene.background;

  const terrain = buildTerrainLayer(cfg);
  const atmosphere = buildAtmosphereLayer(scene, cfg, low);
  const glow = buildLanternGlowLayer(cfg, seed);
  const props = buildPropsLayer(cfg, seed, low, glow.isLitNear);
  const layers: Record<DecorLayer, THREE.Object3D> = {
    terrain, props: props.group, atmosphere: atmosphere.group, glow: glow.group,
  };
  const all = Object.values(layers);
  scene.add(...all);
  const knownIds = new Set(cfg.lanterns.map((l) => l.id));

  return {
    setLitLanterns(litIds) {
      glow.setLit(litIds);
      const lit = new Set(litIds.filter((id) => knownIds.has(id))).size;
      atmosphere.setLitRatio(knownIds.size ? lit / knownIds.size : 0);
      props.refreshLitTint();
    },
    setLayerVisible(layer, v) { layers[layer].visible = v; },
    update(dtS) {
      atmosphere.update(dtS);
      glow.update(dtS);
      props.update(dtS);
    },
    dispose() {
      for (const obj of all) {
        scene.remove(obj);
        obj.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else if (mat) mat.dispose();
          const inst = o as THREE.InstancedMesh;
          if (inst.isInstancedMesh) inst.dispose();
        });
      }
      scene.fog = prevFog;
      scene.background = prevBackground;
    },
  };
}
