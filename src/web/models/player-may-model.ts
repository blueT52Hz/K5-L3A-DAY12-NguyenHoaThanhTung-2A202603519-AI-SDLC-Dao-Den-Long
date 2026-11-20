import * as THREE from 'three';

/** Mây, child lantern keeper: small body with arms, skin-tone head with face, pointed straw non la, glowing lantern hanging from the brim. Feet y=0, faces +Z. */
export function createPlayerModel(withLight = true): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8 });
  const sash = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c397, roughness: 0.7 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xf0cf6e, roughness: 0.9, emissive: 0xb08a20, emissiveIntensity: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b1b12 });
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => { m.position.set(x, y, z); g.add(m); return m; };

  // body (tunic) + sash
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.75, 10), cloth), 0, 0.55, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 10), sash), 0, 0.5, 0);
  // legs
  for (const x of [-0.13, 0.13]) add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.2), dark), x, 0.1, 0.03);
  // arms (skin hands at the ends)
  for (const s of [-1, 1]) {
    const arm = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.34, 4, 8), cloth), s * 0.36, 0.62, 0.05);
    arm.rotation.z = s * 0.35;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), skin), s * 0.46, 0.4, 0.05);
  }
  // head + face
  add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), skin), 0, 1.15, 0);
  for (const x of [-0.11, 0.11]) add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), dark), x, 1.17, 0.27);
  for (const x of [-0.18, 0.18]) {
    const cheek = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf08a7a })), x, 1.08, 0.24);
    cheek.scale.z = 0.4;
  }
  // pointed non la: tall cone, brim wider than head but clearly a cone
  add(new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.62, 20), straw), 0, 1.65, 0);
  const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.025, 6, 24), straw), 0, 1.35, 0);
  rim.rotation.x = Math.PI / 2;

  // small glowing lantern hanging from the brim on a short string
  const lantern = new THREE.Group();
  lantern.position.set(0.5, 1.35, 0.25);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), dark);
  string.position.y = -0.15;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff8a1e, emissiveIntensity: 2.2 }),
  );
  glow.scale.y = 1.25;
  glow.position.y = -0.4;
  const glowLight = new THREE.PointLight(0xffa040, 6, 7, 2); // 1 of the max 8 point lights (5 lanterns + this)
  glowLight.position.y = -0.4;
  lantern.add(string, glow);
  if (withLight) lantern.add(glowLight);
  g.add(lantern);
  return g;
}
