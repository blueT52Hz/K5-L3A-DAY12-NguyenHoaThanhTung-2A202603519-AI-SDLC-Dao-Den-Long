import * as THREE from 'three';
import type { Vec3 } from '../core/types';

const DISTANCE = 10;
const HEIGHT = 7;
const LOOK_HEIGHT = 1;

/** Third-person camera behind the player; yaw 0 looks toward +Z. */
export function updateCamera(camera: THREE.PerspectiveCamera, playerPos: Vec3, yawDeg: number): void {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const [px, py, pz] = playerPos;
  camera.position.set(px - Math.sin(yaw) * DISTANCE, py + HEIGHT, pz - Math.cos(yaw) * DISTANCE);
  camera.lookAt(px, py + LOOK_HEIGHT, pz);
}
