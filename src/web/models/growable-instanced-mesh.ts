import * as THREE from 'three';

/**
 * One InstancedMesh (= one draw call) whose instance list is rewritten every frame: begin(), push(matrix)...,
 * end(). Capacity doubles when exceeded (the old mesh is swapped out of the parent). Geometry and material are
 * shared and owned by the caller; dispose() only frees the instance buffers.
 * Frustum culling is off: the instances spread over the whole island, so a single bounding sphere would
 * rarely cull anything and recomputing it every frame is wasted work.
 */
export class GrowableInstancedMesh {
  mesh: THREE.InstancedMesh;
  private n = 0;

  constructor(private parent: THREE.Object3D, private geo: THREE.BufferGeometry, private mat: THREE.Material, capacity = 32) {
    this.mesh = this.make(capacity);
    parent.add(this.mesh);
  }

  private make(capacity: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geo, this.mat, capacity);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    return m;
  }

  begin(): void {
    this.n = 0;
  }

  push(matrix: THREE.Matrix4): void {
    if (this.n >= this.mesh.instanceMatrix.count) this.grow();
    this.mesh.setMatrixAt(this.n++, matrix);
  }

  end(): void {
    this.mesh.count = this.n;
    if (this.n > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Double the capacity, keeping the matrices already pushed this frame. */
  private grow(): void {
    const old = this.mesh;
    const next = this.make(old.instanceMatrix.count * 2);
    (next.instanceMatrix.array as Float32Array).set(old.instanceMatrix.array as Float32Array);
    this.parent.remove(old);
    old.dispose();
    this.parent.add(next);
    this.mesh = next;
  }

  dispose(): void {
    this.parent.remove(this.mesh);
    this.mesh.dispose();
  }
}
