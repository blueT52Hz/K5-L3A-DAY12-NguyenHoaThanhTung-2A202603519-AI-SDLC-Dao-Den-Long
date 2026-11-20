import * as THREE from 'three';

/** Bóng Mực: squashed purple-black blob with two pale glowing eyes. Origin at center. */
export function createShadeModel(): THREE.Group {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a0f3d, roughness: 0.9, emissive: 0x12051c, emissiveIntensity: 0.6 }),
  );
  blob.scale.set(1.15, 0.85, 1.0);
  g.add(blob);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe8e0ff, emissive: 0xcfc4ff, emissiveIntensity: 1.5 });
  for (const x of [-0.25, 0.25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
    eye.position.set(x, 0.1, 0.62);
    g.add(eye);
  }
  return g;
}
