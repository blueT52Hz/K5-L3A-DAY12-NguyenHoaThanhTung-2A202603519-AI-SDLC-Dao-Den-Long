import * as THREE from 'three';
import { PALETTE } from './palette';

/** Gio Lac: a drifting silk ribbon (grey-blue) with a soft glow core. Origin at center. */
export function createDrifterModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.drifter, emissive: PALETTE.drifter, emissiveIntensity: 0.4,
    transparent: true, opacity: 0.8, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.35, 8, 1), mat);
    ribbon.rotation.set(0, i * 0.5, i * 0.6 - 0.6);
    ribbon.position.y = 0.2 * i;
    g.add(ribbon);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.uiText, emissive: PALETTE.drifter, emissiveIntensity: 1.5 }));
  g.add(core);
  return g;
}
