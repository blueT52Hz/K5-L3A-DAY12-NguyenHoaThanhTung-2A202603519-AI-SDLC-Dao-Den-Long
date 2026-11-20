import * as THREE from 'three';
import type { GameState } from '../core/types';
import { getNight } from '../core/nights';
import {
  createDrifterModel, createJumpPadModel, createLanternModel, createWindCharmModel, createWindLeaves,
  GrowableInstancedMesh, moteGeometry, moteMaterial, ShadeInstancedCrowd, type ShadePose,
} from './models';
import { isColorblind } from './colorblind-mode';
import { TICK_RATE } from '../core/constants';
import { fuelMaxUnits, isLowFuel } from '../core/systems/lantern-fuel';
import { shortestAngle } from './player-facing';
import { NightDecorEnvironment } from './night-decor-environment';
import { isReducedMotion } from './settings/accessibility-flags';
import { PlayerMayAnimatedVisual } from './player-may-animated-visual';
import { installGpuFramePacing } from './gpu-frame-pacing-fence';

type LanternModel = ReturnType<typeof createLanternModel>;

/** Owns scene entities and mirrors GameState into them. */
export class SceneSync {
  private root = new THREE.Group();
  private may: PlayerMayAnimatedVisual;
  private player: THREE.Group;
  private lanterns = new Map<string, LanternModel>();
  // Motes and shades are instanced (one draw call per part for the whole crowd, see ShadeInstancedCrowd).
  private motes: GrowableInstancedMesh;
  private moteMatrix = new THREE.Matrix4();
  private shades: ShadeInstancedCrowd;
  private shadeYaw = new Map<string, number>(); // smoothed visual heading per shade id
  private shadePoses: ShadePose[] = [];
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
    installGpuFramePacing(scene); // no multi-frame GPU backlog -> no 100-200 ms hitches without vsync
    this.root.add(this.player);
    this.root.add(this.leaves.points);
    this.motes = new GrowableInstancedMesh(this.root, moteGeometry, moteMaterial, 128);
    this.shades = new ShadeInstancedCrowd(this.root);
  }

  /** Rebuild all entities from a fresh state (initial load and restart). */
  reset(state: GameState): void {
    for (const l of this.lanterns.values()) { this.root.remove(l.group); disposeTree(l.group); }
    for (const o of this.drifters.values()) { this.root.remove(o); disposeTree(o); }
    for (const o of this.charms.values()) { this.root.remove(o); disposeTree(o); }
    for (const o of this.pads) { this.root.remove(o); disposeTree(o); }
    this.shadeYaw.clear();
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
    this.motes.dispose();
    this.shades.dispose();
  }

  sync(state: GameState): void {
    this.player.position.set(...state.player.pos);
    this.may.setFromPlayer(state.player);
    this.player.visible = isReducedMotion() || !(state.player.invulnTicks > 0 && state.tick % 8 < 4); // blink when hit (off in reduced motion)

    this.motes.begin();
    for (const m of state.motes) this.motes.push(this.moteMatrix.makeTranslation(...m.pos));
    this.motes.end();
    this.syncShades(state);

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

    for (const l of state.lanterns) {
      const lm = this.lanterns.get(l.id);
      lm?.setLit(l.lit);
      lm?.setFuel(l.fuelUnits / fuelMaxUnits(), isLowFuel(l), state.tick / TICK_RATE);
    }
    this.decor.syncLanterns(state.lanterns); // ambient 0.15 + 0.55 x lit/total, glow rings, lit tint
  }

  /** Stunned: body #3A3450 at opacity 0.4 and a sideways shake (none in reduced motion); else eyes track May. */
  private syncShades(state: GameState): void {
    this.shades.setColorblind(isColorblind());
    const poses = this.shadePoses;
    poses.length = state.shades.length;
    const alive = new Set<string>();
    state.shades.forEach((s, i) => {
      alive.add(s.id);
      const stunned = s.state === 'stunned';
      const shake = stunned && !isReducedMotion() ? Math.sin(state.tick * 1.7) * 0.15 : 0;
      let yaw = this.shadeYaw.get(s.id) ?? 0;
      if (!stunned) { // eyes (+Z) turn toward the player, smoothed on the shortest arc
        const target = Math.atan2(state.player.pos[0] - s.pos[0], state.player.pos[2] - s.pos[2]);
        yaw += shortestAngle(yaw, target) * 0.25;
        this.shadeYaw.set(s.id, yaw);
      }
      const p = poses[i] ?? (poses[i] = { x: 0, y: 0, z: 0, yaw: 0, stunned: false });
      p.x = s.pos[0] + shake; p.y = s.pos[1]; p.z = s.pos[2]; p.yaw = yaw; p.stunned = stunned;
    });
    for (const id of this.shadeYaw.keys()) if (!alive.has(id)) this.shadeYaw.delete(id);
    this.shades.update(poses);
  }

  private syncById<T extends { id: string }>(
    map: Map<string, THREE.Object3D>, items: T[], make: () => THREE.Object3D,
  ): void {
    const alive = new Set(items.map((i) => i.id));
    for (const [id, obj] of map) {
      if (!alive.has(id)) {
        this.root.remove(obj);
        disposeTree(obj); // drifters / charms own their geometry + materials
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
