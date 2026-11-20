import * as THREE from 'three';
import { PALETTE } from './palette';

/** Jump pad: flat glowing disc with a gold rim. Origin at pad position. */
export function createJumpPadModel(r = 1): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.15, 20),
    new THREE.MeshStandardMaterial({ color: PALETTE.lanternLit, emissive: PALETTE.lanternLit, emissiveIntensity: 0.8 }));
  disc.position.y = 0.075;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 24),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: PALETTE.gold, emissiveIntensity: 0.5 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.15;
  g.add(disc, rim);
  return g;
}
