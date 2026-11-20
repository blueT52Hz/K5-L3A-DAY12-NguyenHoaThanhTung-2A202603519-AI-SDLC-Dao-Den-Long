import * as THREE from 'three';
import { PALETTE } from './palette';

/** Bua Gio: red paper charm with gold tassel, floating. Origin at ground point. */
export function createWindCharmModel(): THREE.Group {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, emissive: PALETTE.mayScarf, emissiveIntensity: 0.4 }));
  card.position.y = 1.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: PALETTE.gold, emissiveIntensity: 0.6 }));
  ring.position.set(0, 1.2, 0.04);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold }));
  tassel.rotation.x = Math.PI; tassel.position.y = 0.65;
  g.add(card, ring, tassel);
  return g;
}
