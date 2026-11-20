import type * as THREE from 'three';

type Vec3 = [number, number, number];

/** Named demo camera framings (?cam=<name>); "overview" is the default. */
const PRESETS: Record<string, { pos: Vec3; target: Vec3 }> = {
  overview: { pos: [-50, 23, 38], target: [-8, -2.5, -4] },
  dock: { pos: [-22.8, 8, -22.2], target: [-40, 0.3, -14.5] },
  trees: { pos: [10, 7, 22], target: [26, 3, 24] },
};

/** Apply the preset named by the `cam` query param (falls back to "overview"). */
export function applyCameraPreset(search: string, camera: THREE.PerspectiveCamera, target: THREE.Vector3): void {
  const name = new URLSearchParams(search).get('cam') ?? 'overview';
  const p = PRESETS[name] ?? PRESETS.overview;
  camera.position.set(...p.pos);
  target.set(...p.target);
}
