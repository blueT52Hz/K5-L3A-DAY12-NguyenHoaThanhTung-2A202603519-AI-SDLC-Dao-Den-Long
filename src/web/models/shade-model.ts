import * as THREE from 'three';
import { PALETTE } from './palette';

/** Bóng Mực: squashed purple-black blob with two glowing eyes (#7A3CFF). Origin at center. */
export function createShadeModel(): THREE.Group {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x120a1a, roughness: 0.9, emissive: 0x4a1a80, emissiveIntensity: 0.3 }),
  );
  blob.scale.set(1.15, 0.85, 1.0);
  // faint purple rim ring so the danger reads against the green ground
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x7a3cff, emissive: 0x7a3cff, emissiveIntensity: 0.7 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.5;
  g.add(blob, rim);
  g.userData.rimMat = rim.material;
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x7a3cff, emissive: 0x7a3cff, emissiveIntensity: 1.5 });
  g.userData.eyeMat = eyeMat;
  for (const x of [-0.25, 0.25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
    eye.position.set(x, 0.1, 0.62);
    g.add(eye);
  }
  return g;
}

/** Colorblind palette: outline (rim) and eyes #00B3FF; default keeps #7A3CFF for rim and eyes. */
export function setShadeColorblind(g: THREE.Object3D, cb: boolean): void {
  const rim = g.userData.rimMat as THREE.MeshStandardMaterial | undefined;
  const eye = g.userData.eyeMat as THREE.MeshStandardMaterial | undefined;
  if (rim) { const c = cb ? PALETTE.shadeRimColorblind : PALETTE.shadeRim; rim.color.setHex(c); rim.emissive.setHex(c); }
  if (eye) { const c = cb ? PALETTE.shadeRimColorblind : PALETTE.shadeRim; eye.color.setHex(c); eye.emissive.setHex(c); }
}
