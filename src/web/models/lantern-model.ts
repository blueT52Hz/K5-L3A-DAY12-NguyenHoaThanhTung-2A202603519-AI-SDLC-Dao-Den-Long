import * as THREE from 'three';

/** Đèn Lồng Lớn: wooden post + lantern cage. setLit toggles emissive and a PointLight. */
export function createLanternModel(): { group: THREE.Group; setLit(lit: boolean): void } {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8), wood);
  post.position.y = 1.1;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), wood);
  arm.position.set(0.3, 2.2, 0);

  const cageMat = new THREE.MeshStandardMaterial({
    color: 0x555555, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.6,
  });
  const cage = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), cageMat);
  cage.scale.y = 1.25;
  cage.position.set(0.6, 1.8, 0);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 8), wood);
  cap.position.set(0.6, 2.45, 0);

  const light = new THREE.PointLight(0xffb347, 0, 14, 2);
  light.position.set(0.6, 1.8, 0);

  group.add(post, arm, cage, cap, light);
  return {
    group,
    setLit(lit: boolean) {
      cageMat.color.setHex(lit ? 0xffb347 : 0x555555);
      cageMat.emissiveIntensity = lit ? 1.8 : 0;
      light.intensity = lit ? 40 : 0;
    },
  };
}
