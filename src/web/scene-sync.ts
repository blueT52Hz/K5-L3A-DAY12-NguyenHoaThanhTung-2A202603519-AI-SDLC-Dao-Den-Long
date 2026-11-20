import * as THREE from 'three';
import type { GameState } from '../core/types';
import {
  createEnvironment, createLanternModel, createMoteModel, createPlayerModel, createShadeModel,
} from './models';

type LanternModel = ReturnType<typeof createLanternModel>;

/** Owns scene entities and mirrors GameState into them. */
export class SceneSync {
  private root = new THREE.Group();
  private player: THREE.Group;
  private lanterns = new Map<string, LanternModel>();
  private motes = new Map<string, THREE.Object3D>();
  private shades = new Map<string, THREE.Object3D>();
  private env: { setBrightness(litCount: number): void };

  constructor(private scene: THREE.Scene, private pointLights = true) {
    this.player = createPlayerModel(pointLights);
    this.env = createEnvironment(scene, !pointLights);
    scene.add(this.root);
    this.root.add(this.player);
  }

  /** Rebuild all entities from a fresh state (initial load and restart). */
  reset(state: GameState): void {
    for (const o of this.motes.values()) this.root.remove(o); // motes share geometry/material: no dispose
    for (const o of this.shades.values()) { this.root.remove(o); disposeTree(o); }
    for (const l of this.lanterns.values()) { this.root.remove(l.group); disposeTree(l.group); }
    this.motes.clear();
    this.shades.clear();
    this.lanterns.clear();
    for (const l of state.lanterns) {
      const model = createLanternModel(this.pointLights);
      model.group.position.set(...l.pos);
      this.root.add(model.group);
      this.lanterns.set(l.id, model);
    }
    this.sync(state);
  }

  sync(state: GameState): void {
    this.player.position.set(...state.player.pos);
    this.player.visible = !(state.player.invulnTicks > 0 && state.tick % 8 < 4); // blink when hit

    this.syncById(this.motes, state.motes, createMoteModel);
    for (const m of state.motes) this.motes.get(m.id)!.position.set(...m.pos);

    this.syncById(this.shades, state.shades, () => cloneMaterials(createShadeModel()));
    for (const s of state.shades) {
      const obj = this.shades.get(s.id)!;
      const stunned = s.state === 'stunned';
      const shake = stunned ? Math.sin(state.tick * 1.7) * 0.15 : 0;
      obj.position.set(s.pos[0] + shake, s.pos[1], s.pos[2]);
      setOpacity(obj, stunned ? 0.4 : 1);
    }

    let lit = 0;
    for (const l of state.lanterns) {
      this.lanterns.get(l.id)?.setLit(l.lit);
      if (l.lit) lit++;
    }
    this.env.setBrightness(lit);
  }

  private syncById<T extends { id: string }>(
    map: Map<string, THREE.Object3D>, items: T[], make: () => THREE.Object3D,
  ): void {
    const alive = new Set(items.map((i) => i.id));
    for (const [id, obj] of map) {
      if (!alive.has(id)) {
        this.root.remove(obj);
        if (map === this.shades) disposeTree(obj); // shades own their geometry + cloned materials
        map.delete(id);
      }
    }
    for (const it of items) {
      if (!map.has(it.id)) {
        const obj = make();
        this.root.add(obj);
        map.set(it.id, obj);
      }
    }
  }
}

/** Free GPU resources of an object that owns its geometry and materials. */
function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((c) => { (c as THREE.Mesh).geometry?.dispose(); });
  forEachMaterial(obj, (m) => m.dispose());
}

function forEachMaterial(obj: THREE.Object3D, fn: (m: THREE.Material) => void): void {
  obj.traverse((c) => {
    const mat = (c as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    (Array.isArray(mat) ? mat : [mat]).forEach(fn);
  });
}

/** Give each shade its own materials so stun fading does not affect others. */
function cloneMaterials(obj: THREE.Object3D): THREE.Object3D {
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.material) return;
    m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
  });
  return obj;
}

function setOpacity(obj: THREE.Object3D, opacity: number): void {
  forEachMaterial(obj, (m) => { m.transparent = opacity < 1; m.opacity = opacity; });
}
