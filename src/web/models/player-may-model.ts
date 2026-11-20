import * as THREE from 'three';

/** Mây, child lantern keeper: cylinder body, sphere head, conical non la with a small hanging lantern. Feet y=0, faces +Z. */
export function createPlayerModel(): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xc8553d, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c49a, roughness: 0.7 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xe6c36a, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b1b12 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.9, 10), cloth);
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skin);
  head.position.y = 1.2;
  // flat cone hat, wide brim
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 16), straw);
  hat.position.y = 1.6;
  const brimRing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.03, 6, 20), straw);
  brimRing.rotation.x = Math.PI / 2;
  brimRing.position.y = 1.38;
  for (const x of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark);
    eye.position.set(x, 1.22, 0.27);
    g.add(eye);
  }
  for (const x of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.2), dark);
    leg.position.set(x, 0.1, 0.03);
    g.add(leg);
  }

  // small lantern hanging under the brim at the front
  const lantern = new THREE.Group();
  lantern.position.set(0.55, 1.3, 0.3);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), dark);
  string.position.y = 0.2;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff8a1e, emissiveIntensity: 1.6 }),
  );
  lantern.add(string, glow);

  g.add(body, head, hat, brimRing, lantern);
  return g;
}
