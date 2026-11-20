import * as THREE from 'three';
import { createFuelBar } from './lantern-fuel-bar';

export interface LanternModel {
  group: THREE.Group;
  setLit(lit: boolean): void;
  /** fraction 0..1, low = below low-fuel threshold (blinks at 1 Hz), timeS = sim time in seconds. Call after setLit. */
  setFuel(fraction: number, low: boolean, timeS: number): void;
}

/** Đèn Lồng Lớn: wooden post + lantern cage + fuel bar. Unlit cages are squashed to 80% height with torn paper. */
export function createLanternModel(withLight = true): LanternModel {
  const group = new THREE.Group();
  // Matte Lambert (cheaper than standard with 7 point lights); the lit glow comes from the emissive term.
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4a32, emissive: 0x2a1608, emissiveIntensity: 0.6 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8), wood);
  post.position.y = 1.1;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), wood);
  arm.position.set(0.3, 2.2, 0);

  const cageMat = new THREE.MeshLambertMaterial({ color: 0xc9a77a, emissive: 0xffb347, emissiveIntensity: 0.12 });
  const cage = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), cageMat);
  cage.position.set(0.6, 1.8, 0);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 8), wood);
  cap.position.set(0.6, 2.45, 0);

  // torn-paper detail: dark jagged slivers on the cage, visible only while unlit
  const tornMat = new THREE.MeshBasicMaterial({ color: 0x2a2433, side: THREE.DoubleSide });
  const torn = new THREE.Group();
  for (const [x, y, rz] of [[0.25, 0.05, 0.5], [-0.2, -0.15, -0.9], [0.05, 0.2, 1.8]] as const) {
    const sliver = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 3), tornMat);
    sliver.position.set(0.6 + x, 1.8 + y, 0.4);
    sliver.rotation.z = rz;
    torn.add(sliver);
  }

  const light = new THREE.PointLight(0xffb347, 0, 14, 2);
  light.position.set(0.6, 1.8, 0);
  const bar = createFuelBar();

  group.add(post, arm, cage, cap, torn, bar.object);
  if (withLight) group.add(light);

  let lit = false;
  const applyShape = (): void => {
    cage.scale.y = lit ? 1.25 : 1.25 * 0.8; // unlit: squashed 20%
    cage.position.y = lit ? 1.8 : 1.8 - 0.45 * 1.25 * 0.1;
    torn.visible = !lit;
  };
  applyShape();
  return {
    group,
    setLit(l: boolean) {
      lit = l;
      cageMat.color.setHex(l ? 0xffe9b0 : 0x5b5f6e);
      cageMat.emissiveIntensity = l ? 2.6 : 0.12;
      light.intensity = l ? 60 : 0;
      applyShape();
    },
    setFuel(fraction: number, low: boolean, timeS: number) {
      const on = !low || Math.sin(2 * Math.PI * timeS) > 0; // low fuel blinks at 1 Hz
      bar.set(fraction, lit && on, low);
      if (lit && !on) { cageMat.emissiveIntensity = 0.4; light.intensity = 8; }
    },
  };
}
