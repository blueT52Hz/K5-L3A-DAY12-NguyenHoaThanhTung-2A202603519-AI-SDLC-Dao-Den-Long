import * as THREE from 'three';

// Night 1 disc radius (src/core/nights/night-1-dao-ben.ts); per-night islands come in the web-shell task.
const ISLAND_RADIUS = 40;

/** Floating island (top at y=0), cloud sea below, night sky, fog, dim lights. */
export function createEnvironment(scene: THREE.Scene, boost = false): { setBrightness(litCount: number): void } {
  scene.background = new THREE.Color(0x1a1033);
  scene.fog = new THREE.Fog(0x1a1033, 60, 190);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS - 4, 2, 32),
    new THREE.MeshStandardMaterial({ color: 0x6f9a52, roughness: 1 }),
  );
  top.position.y = -1;
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(ISLAND_RADIUS - 4, 22, 24),
    new THREE.MeshStandardMaterial({ color: 0x7a6488, roughness: 1 }),
  );
  rock.rotation.x = Math.PI;
  rock.position.y = -13;

  // cloud sea: a few flattened spheres around and below
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x9a86d0, roughness: 1 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 55 + (i % 3) * 18;
    const c = new THREE.Mesh(new THREE.SphereGeometry(10 + (i % 4) * 3, 10, 8), cloudMat);
    c.scale.y = 0.35;
    c.position.set(Math.cos(a) * r, -22 - (i % 3) * 3, Math.sin(a) * r);
    clouds.add(c);
  }

  // no shadows anywhere: ambient + hemisphere + one soft moon directional (all brightened by lit lanterns)
  const ambient = new THREE.AmbientLight(0x8d7fc4, 0.9);
  const hemi = new THREE.HemisphereLight(0xb4a8f0, 0x3a2a55, 0.7);
  const moon = new THREE.DirectionalLight(0xc9c2ff, 0.9);
  moon.position.set(-30, 50, 20);
  scene.add(top, rock, clouds, ambient, hemi, moon);

  const sky = new THREE.Color();
  const skyDark = new THREE.Color(0x1a1033);
  const skyLit = new THREE.Color(0x3a2458);

  return {
    setBrightness(litCount: number) {
      const t = Math.min(Math.max(litCount, 0), 5) / 5;
      const b = boost ? 1.35 : 1; // CPU mode: no point lights, so lift ambient/hemi
      ambient.intensity = (0.9 + 0.9 * t) * b;
      hemi.intensity = (0.7 + 0.8 * t) * b;
      moon.intensity = 0.9 + 0.7 * t;
      moon.color.setHex(t > 0.5 ? 0xffe2b8 : 0xc9c2ff); // warmer as the island wakes
      sky.copy(skyDark).lerp(skyLit, t);
      (scene.background as THREE.Color).copy(sky);
      scene.fog!.color.copy(sky);
    },
  };
}
