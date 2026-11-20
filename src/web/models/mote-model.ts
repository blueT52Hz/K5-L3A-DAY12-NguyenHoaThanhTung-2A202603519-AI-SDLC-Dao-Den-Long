import * as THREE from 'three';

/** Đom đóm look, shared by every mote (the game draws all motes as one InstancedMesh of these). */
export const moteGeometry = new THREE.SphereGeometry(0.18, 8, 6);
export const moteMaterial = new THREE.MeshLambertMaterial({ color: 0xfff6c2, emissive: 0xffe58a, emissiveIntensity: 2 });

/** Đom đóm: small emissive yellow sphere (geometry/material shared across instances). */
export function createMoteModel(): THREE.Object3D {
  return new THREE.Mesh(moteGeometry, moteMaterial);
}
