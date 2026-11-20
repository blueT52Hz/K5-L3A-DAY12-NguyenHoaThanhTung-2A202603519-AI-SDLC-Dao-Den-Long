import * as THREE from 'three';

const ISLAND_RADIUS = 40;

/** Floating island (top at y=0), cloud sea below, night sky, fog, dim lights. */
export function createEnvironment(scene: THREE.Scene): { setBrightness(litCount: number): void } {
  scene.background = new THREE.Color(0x1a1033);
  scene.fog = new THREE.Fog(0x1a1033, 40, 140);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS - 4, 2, 32),
    new THREE.MeshStandardMaterial({ color: 0x2f4a33, roughness: 1 }),
  );
  top.position.y = -1;
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(ISLAND_RADIUS - 4, 22, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a3a52, roughness: 1 }),
  );
  rock.rotation.x = Math.PI;
  rock.position.y = -13;

  // cloud sea: a few flattened spheres around and below
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x6b5a99, roughness: 1 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 55 + (i % 3) * 18;
    const c = new THREE.Mesh(new THREE.SphereGeometry(10 + (i % 4) * 3, 10, 8), cloudMat);
    c.scale.y = 0.35;
    c.position.set(Math.cos(a) * r, -22 - (i % 3) * 3, Math.sin(a) * r);
    clouds.add(c);
  }

  const ambient = new THREE.AmbientLight(0x5a4a8a, 0.25);
  const hemi = new THREE.HemisphereLight(0x8a7ac8, 0x20152e, 0.15);
  scene.add(top, rock, clouds, ambient, hemi);

  return {
    setBrightness(litCount: number) {
      const t = Math.min(Math.max(litCount, 0), 5) / 5;
      ambient.intensity = 0.25 + 0.6 * t;
      hemi.intensity = 0.15 + 0.7 * t;
    },
  };
}
