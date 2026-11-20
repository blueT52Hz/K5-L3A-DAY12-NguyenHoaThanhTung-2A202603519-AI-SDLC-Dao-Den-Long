import * as THREE from 'three';

/** Bóng Mực: squashed purple-black blob with two pale glowing eyes. Origin at center. */
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
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe8e0ff, emissive: 0xcfc4ff, emissiveIntensity: 1.5 });
  for (const x of [-0.25, 0.25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
    eye.position.set(x, 0.1, 0.62);
    g.add(eye);
  }
  return g;
}
