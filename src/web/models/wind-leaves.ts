import * as THREE from 'three';
import { PALETTE } from './palette';

/** Wind leaf particles. setState: 'off' hidden, 'warning' faint, 'active' full. Call update(dt, dirX, dirZ) each frame. */
export function createWindLeaves(count = 60, area = 40): {
  points: THREE.Points; setState(s: 'off' | 'warning' | 'active'): void; update(dt: number, dirX: number, dirZ: number): void;
} {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * area * 2;
    pos[i * 3 + 1] = 0.5 + Math.random() * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * area * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: PALETTE.sand, size: 0.35, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  let state: 'off' | 'warning' | 'active' = 'off';
  return {
    points,
    setState(s) {
      state = s;
      points.visible = s !== 'off';
      mat.opacity = s === 'active' ? 0.9 : 0.35;
    },
    update(dt, dx, dz) {
      if (state === 'off') return;
      const speed = state === 'active' ? 14 : 3;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += dx * speed * dt;
        pos[i * 3 + 2] += dz * speed * dt;
        pos[i * 3 + 1] += Math.sin(performance.now() / 400 + i) * dt;
        if (Math.abs(pos[i * 3]) > area) pos[i * 3] *= -0.98;
        if (Math.abs(pos[i * 3 + 2]) > area) pos[i * 3 + 2] *= -0.98;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
