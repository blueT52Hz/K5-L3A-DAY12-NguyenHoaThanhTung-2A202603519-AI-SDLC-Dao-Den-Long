import * as THREE from 'three';
import { GrowableInstancedMesh } from './growable-instanced-mesh';
import { createShadeMaterials, SHADE_GEOMETRY, SHADE_PART_MATRIX, shadeAccentColor, type ShadeMaterials } from './shade-model';

/** Per-frame pose of one shade: world position and heading about Y (eyes face +Z at 0). */
export interface ShadePose { x: number; y: number; z: number; yaw: number; stunned: boolean }

/** Body, rim and eyes of one look (normal or stunned) as three InstancedMeshes = three draw calls. */
class ShadeLook {
  readonly mats: ShadeMaterials;
  private body: GrowableInstancedMesh;
  private rim: GrowableInstancedMesh;
  private eyes: GrowableInstancedMesh;

  constructor(parent: THREE.Object3D, stunned: boolean) {
    this.mats = createShadeMaterials(stunned);
    this.body = new GrowableInstancedMesh(parent, SHADE_GEOMETRY.body, this.mats.body);
    this.rim = new GrowableInstancedMesh(parent, SHADE_GEOMETRY.rim, this.mats.rim);
    this.eyes = new GrowableInstancedMesh(parent, SHADE_GEOMETRY.eye, this.mats.eye, 64);
  }

  begin(): void { this.body.begin(); this.rim.begin(); this.eyes.begin(); }
  end(): void { this.body.end(); this.rim.end(); this.eyes.end(); }

  /** Append one shade whose root transform is `root`; `tmp` is scratch space. */
  push(root: THREE.Matrix4, tmp: THREE.Matrix4): void {
    this.body.push(tmp.multiplyMatrices(root, SHADE_PART_MATRIX.body));
    this.rim.push(tmp.multiplyMatrices(root, SHADE_PART_MATRIX.rim));
    for (const e of SHADE_PART_MATRIX.eyes) this.eyes.push(tmp.multiplyMatrices(root, e));
  }

  setAccent(hex: number): void {
    for (const m of [this.mats.rim, this.mats.eye]) { m.color.setHex(hex); m.emissive.setHex(hex); }
  }

  dispose(): void {
    this.body.dispose(); this.rim.dispose(); this.eyes.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
  }
}

/**
 * Every Bóng Mực of the scene drawn with 6 draw calls in total (normal + stunned look, 3 parts each) instead
 * of 4 meshes per shade. Same shape, colors and opacity as createShadeModel; colorblind swaps the accent color
 * of the shared rim/eye materials.
 */
export class ShadeInstancedCrowd {
  private normal: ShadeLook;
  private stunned: ShadeLook;
  private colorblind = false;
  private root = new THREE.Matrix4();
  private tmp = new THREE.Matrix4();
  private pos = new THREE.Vector3();
  private rot = new THREE.Quaternion();
  private one = new THREE.Vector3(1, 1, 1);
  private yAxis = new THREE.Vector3(0, 1, 0);

  constructor(parent: THREE.Object3D) {
    this.normal = new ShadeLook(parent, false);
    this.stunned = new ShadeLook(parent, true);
  }

  setColorblind(cb: boolean): void {
    if (cb === this.colorblind) return;
    this.colorblind = cb;
    const hex = shadeAccentColor(cb);
    this.normal.setAccent(hex);
    this.stunned.setAccent(hex);
  }

  /** Rewrite all instances from this frame's poses. */
  update(poses: Iterable<ShadePose>): void {
    this.normal.begin();
    this.stunned.begin();
    for (const p of poses) {
      this.rot.setFromAxisAngle(this.yAxis, p.yaw);
      this.root.compose(this.pos.set(p.x, p.y, p.z), this.rot, this.one);
      (p.stunned ? this.stunned : this.normal).push(this.root, this.tmp);
    }
    this.normal.end();
    this.stunned.end();
  }

  dispose(): void {
    this.normal.dispose();
    this.stunned.dispose();
  }
}
