import * as THREE from 'three';

const moteGeometry = new THREE.SphereGeometry(0.18, 8, 6);
const moteMaterial = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffd84a, emissiveIntensity: 2 });

/** Đom đóm: small emissive yellow sphere (geometry/material shared across instances). */
export function createMoteModel(): THREE.Object3D {
  return new THREE.Mesh(moteGeometry, moteMaterial);
}
