import * as THREE from 'three';
import type { GameState } from '../core/types';
import { getNight } from '../core/nights';
import {
  createDrifterModel, createJumpPadModel, createLanternModel, createMoteModel,
  createShadeModel, createWindCharmModel, createWindLeaves,
} from './models';
import { shortestAngle } from './player-facing';
import { NightDecorEnvironment } from './night-decor-environment';
import { PlayerMayAnimatedVisual } from './player-may-animated-visual';

type LanternModel = ReturnType<typeof createLanternModel>;

/** Owns scene entities and mirrors GameState into them. */
export class SceneSync {
  private root = new THREE.Group();
  private may: PlayerMayAnimatedVisual;
  private player: THREE.Group;
  private lanterns = new Map<string, LanternModel>();
  private motes = new Map<string, THREE.Object3D>();
  private shades = new Map<string, THREE.Object3D>();
  private drifters = new Map<string, THREE.Object3D>();
  private charms = new Map<string, THREE.Object3D>();
  private pads: THREE.Object3D[] = [];
  private leaves = createWindLeaves();
  private decor: NightDecorEnvironment;
  private lastWind = { x: 1, z: 0 };

  constructor(scene: THREE.Scene, private pointLights = true) {
    this.may = new PlayerMayAnimatedVisual(pointLights); // hat-lantern light only when PointLights are allowed
    this.player = this.may.group;
    this.decor = new NightDecorEnvironment(scene, !pointLights); // CPU mode -> low-quality decor
    scene.add(this.root);
    this.root.add(this.player);
    this.root.add(this.leaves.points);
  }

  /** Rebuild all entities from a fresh state (initial load and restart). */
  reset(state: GameState): void {
    for (const o of this.motes.values()) this.root.remove(o); // motes share geometry/material: no dispose
    for (const o of this.shades.values()) { this.root.remove(o); disposeTree(o); }
    for (const l of this.lanterns.values()) { this.root.remove(l.group); disposeTree(l.group); }
    for (const o of this.drifters.values()) { this.root.remove(o); disposeTree(o); }
    for (const o of this.charms.values()) { this.root.remove(o); disposeTree(o); }
    for (const o of this.pads) { this.root.remove(o); disposeTree(o); }
    this.motes.clear();
    this.shades.clear();
    this.lanterns.clear();
    this.drifters.clear();
    this.charms.clear();
    this.pads = [];
    this.decor.rebuild(state.night); // island decor: terrain, sky, fog, lights, props (old one disposed)
    for (const p of getNight(state.night).jumpPads) {
      const pad = createJumpPadModel(p.r);
      pad.position.set(...p.pos);
      this.root.add(pad);
      this.pads.push(pad);
    }
    for (const l of state.lanterns) {
      const model = createLanternModel(this.pointLights);
      model.group.position.set(...l.pos);
      this.root.add(model.group);
      this.lanterns.set(l.id, model);
    }
    this.sync(state);
  }

  /** Visual-only heading of the player model (rad about Y; 0 faces +Z). */
  setPlayerFacing(rad: number): void {
    this.player.rotation.y = rad;
  }

  /** Per-frame animation at render rate (wind leaves, island decor, Mây's walk cycle). */
  animate(dtS: number): void {
    this.leaves.update(dtS, this.lastWind.x, this.lastWind.z);
    this.decor.update(dtS);
    this.may.animate(dtS);
  }

  /** Free the decor and the player character (e.g. when the game view is torn down). */
  dispose(): void {
    this.decor.dispose();
    this.may.dispose();
  }

  sync(state: GameState): void {
    this.player.position.set(...state.player.pos);
    this.may.setFromPlayer(state.player);
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
      if (!stunned) { // eyes (+Z) turn toward the player, smoothed on the shortest arc
        const target = Math.atan2(state.player.pos[0] - s.pos[0], state.player.pos[2] - s.pos[2]);
        obj.rotation.y += shortestAngle(obj.rotation.y, target) * 0.25;
      }
    }

    this.syncById(this.drifters, state.drifters.filter((d) => d.state !== 'removed'), createDrifterModel);
    for (const d of state.drifters) this.drifters.get(d.id)?.position.set(...d.pos);
    this.syncById(this.charms, state.charms, createWindCharmModel);
    for (const c of state.charms) {
      const o = this.charms.get(c.id)!;
      o.position.set(...c.pos);
      o.visible = c.available;
      o.rotation.y = state.tick * 0.03;
    }
    const w = state.wind;
    this.leaves.setState(w.active ? 'active' : w.warning ? 'warning' : 'off');
    const rad = (w.dirDeg * Math.PI) / 180;
    this.lastWind = { x: Math.cos(rad), z: Math.sin(rad) };
    this.leaves.points.position.set(state.player.pos[0], 0, state.player.pos[2]);

    for (const l of state.lanterns) this.lanterns.get(l.id)?.setLit(l.lit);
    this.decor.syncLanterns(state.lanterns); // ambient 0.15 + 0.55 x lit/total, glow rings, lit tint
  }

  private syncById<T extends { id: string }>(
    map: Map<string, THREE.Object3D>, items: T[], make: () => THREE.Object3D,
  ): void {
    const alive = new Set(items.map((i) => i.id));
    for (const [id, obj] of map) {
      if (!alive.has(id)) {
        this.root.remove(obj);
        if (map !== this.motes) disposeTree(obj); // shades own their geometry + cloned materials
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
