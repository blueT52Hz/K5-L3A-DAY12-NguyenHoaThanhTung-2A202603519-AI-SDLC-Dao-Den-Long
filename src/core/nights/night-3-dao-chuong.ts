import type { NightConfig } from './night-config-types';
import { ringPoints } from './ring-points';

// Night 3 - Dao Chuong: 3 tiers, ramps, bell tower, strong wind (ticket phase-2, Phan 2).
export const NIGHT_3: NightConfig = {
  id: 3,
  name: 'Đảo Chuông',
  durationS: 360,
  surfaces: [
    { kind: 'disc', cx: 0, cz: 0, r: 45, y: 0 },
    { kind: 'annulus', cx: 0, cz: 0, rIn: 12, rOut: 24, y: 3, zMinExclusive: 0 },
    { kind: 'disc', cx: 0, cz: 0, r: 8, y: 6 },
    { kind: 'ramp', angleDeg: 30, width: 3, rFrom: 30, rTo: 24, yFrom: 0, yTo: 3 },
    { kind: 'ramp', angleDeg: 150, width: 3, rFrom: 30, rTo: 24, yFrom: 0, yTo: 3 },
  ],
  obstacles: [{ cx: 0, cz: 0, r: 2, yTop: 14 }],
  start: [0, 0, -20], // (0,0,0) is inside the tier-2 disc and the tower
  startFacing: [0, 1],
  lanterns: [
    { id: 'L1', pos: [0, 6, 6] },
    { id: 'L2', pos: [18, 3, 10] },
    { id: 'L3', pos: [-18, 3, 10] },
    { id: 'L4', pos: [35, 0, -10] },
    { id: 'L5', pos: [-35, 0, -10] },
    { id: 'L6', pos: [20, 0, -35] },
    { id: 'L7', pos: [-20, 0, -35] },
  ],
  moteSpawnPoints: [
    ...ringPoints(0, 0, 34, 0, 0, 20, 18),
    ...ringPoints(0, 0, 18, 3, 20, 20, 8),
    ...ringPoints(0, 0, 5, 6, 45, 90, 4),
  ],
  shadeSpawnPoints: ringPoints(0, 0, 43, 0, 0, 22.5, 16),
  jumpPads: [{ pos: [0, 3, 13], r: 1, vy: 12, horiz: [0, -8] }],
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
  shadeIntervalTicks: 360,
  maxShades: 10,
  shadeSpeed: 4.5,
  drifters: true,
  wind: true,
};
