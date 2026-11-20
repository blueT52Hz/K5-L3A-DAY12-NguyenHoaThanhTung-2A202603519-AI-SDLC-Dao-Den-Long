import type { JumpPad, NightConfig } from './night-config-types';
import { ringPoints } from './ring-points';
import type { Vec3 } from '../types';

const LAUNCH_SPEED = 24;

/** Pad that launches toward the centre of the other island at LAUNCH_SPEED m/s. */
function pad(pos: Vec3, target: Vec3): JumpPad {
  const dx = target[0] - pos[0];
  const dz = target[2] - pos[2];
  const d = Math.hypot(dx, dz);
  return { pos, r: 1, vy: 14, horiz: [(dx / d) * LAUNCH_SPEED, (dz / d) * LAUNCH_SPEED] };
}

// Night 2 - Dao Cau: two discs joined by a bamboo bridge (ticket phase-2, Phan 2).
export const NIGHT_2: NightConfig = {
  id: 2,
  name: 'Đảo Cau',
  durationS: 330,
  surfaces: [
    { kind: 'disc', cx: 0, cz: 0, r: 28, y: 0 },
    { kind: 'disc', cx: 70, cz: 0, r: 28, y: 0 },
    { kind: 'rect', xMin: 26, xMax: 44, zMin: -2, zMax: 2, y: 0 },
  ],
  obstacles: [],
  start: [0, 0, 0],
  startFacing: [0, 1],
  lanterns: [
    { id: 'L1', pos: [0, 0, 20] },
    { id: 'L2', pos: [17, 0, -10] },
    { id: 'L3', pos: [-17, 0, -10] },
    { id: 'L4', pos: [70, 0, 20] },
    { id: 'L5', pos: [87, 0, -10] },
    { id: 'L6', pos: [53, 0, -10] },
  ],
  moteSpawnPoints: [
    ...ringPoints(0, 0, 10, 0, 0, 90, 4), ...ringPoints(0, 0, 22, 0, 0, 45, 8),
    ...ringPoints(70, 0, 10, 0, 0, 90, 4), ...ringPoints(70, 0, 22, 0, 0, 45, 8),
  ],
  shadeSpawnPoints: [...ringPoints(0, 0, 26, 0, 22.5, 45, 8), ...ringPoints(70, 0, 26, 0, 22.5, 45, 8)],
  jumpPads: [pad([20, 0, 18], [70, 0, 0]), pad([50, 0, -18], [0, 0, 0])],
  charms: [{ id: 'C1', pos: [35, 0, 0] }],
  shadeIntervalTicks: 420,
  maxShades: 8,
  shadeSpeed: 4,
  drifters: true,
  wind: false,
};
