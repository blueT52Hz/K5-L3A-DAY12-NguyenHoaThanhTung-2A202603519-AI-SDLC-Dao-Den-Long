import type * as THREE from 'three';
import type { DemoNightId } from './parse-decor-demo-query';

type Vec3 = [number, number, number];
type Preset = { pos: Vec3; target: Vec3 };

/** Named demo camera framings per night (?cam=<name>); "overview" frames the whole island(s) at 1280x720. */
const PRESETS: Record<DemoNightId, Record<string, Preset>> = {
  1: {
    overview: { pos: [-50, 23, 38], target: [-8, -2.5, -4] },
    dock: { pos: [-22.8, 8, -22.2], target: [-40, 0.3, -14.5] },
    trees: { pos: [10, 7, 22], target: [26, 3, 24] },
  },
  2: {
    overview: { pos: [14, 40, 72], target: [35, -3, 0] },
    bridge: { pos: [30, 7, 14], target: [36, 0.5, 0] },
    village: { pos: [50, 10, 24], target: [64, 0, 6] },
  },
  3: {
    overview: { pos: [-40, 36, 60], target: [0, -2, -1] },
    temple: { pos: [-14, 13, 22], target: [0, 9, 0] },
    banyan: { pos: [8, 8, -34], target: [-7, 4, -18] },
  },
};

/** Apply the preset named by the `cam` query param for this night (falls back to its "overview"). */
export function applyCameraPreset(search: string, night: DemoNightId, camera: THREE.PerspectiveCamera, target: THREE.Vector3): void {
  const name = new URLSearchParams(search).get('cam') ?? 'overview';
  const set = PRESETS[night];
  const p = set[name] ?? set.overview;
  camera.position.set(...p.pos);
  target.set(...p.target);
}
