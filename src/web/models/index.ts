import * as THREE from 'three';

// Stub: track B replaces bodies, keeps signatures.
function box(color: number, size: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
}

export function createPlayerModel(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0xffcc66, [0.8, 1.6, 0.8]));
  return g;
}

export function createShadeModel(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0x221133, [1.2, 1.2, 1.2]));
  return g;
}

export function createLanternModel(): { group: THREE.Group; setLit(lit: boolean): void } {
  const group = new THREE.Group();
  const mesh = box(0x555555, [0.8, 1.6, 0.8]);
  group.add(mesh);
  return {
    group,
    setLit(lit: boolean) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(lit ? 0xffaa33 : 0x555555);
    },
  };
}

export function createMoteModel(): THREE.Object3D {
  return box(0xffee88, [0.3, 0.3, 0.3]);
}

export function createEnvironment(scene: THREE.Scene): { setBrightness(litCount: number): void } {
  const ground = box(0x2a3a2a, [80, 0.2, 80]);
  ground.position.y = -0.1;
  scene.add(ground);
  return { setBrightness(_litCount: number) {} };
}
