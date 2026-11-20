import { TUNING } from '../tuning';
import type { NightConfig } from './night-config-types';
import { ringPoints } from './ring-points';

// Night 1 - Dao Ben (ticket phase-2, Phan 2).
export const NIGHT_1: NightConfig = {
  id: 1,
  name: 'Đảo Bến',
  durationS: TUNING.night1_duration_s,
  surfaces: [{ kind: 'disc', cx: 0, cz: 0, r: 40, y: 0 }],
  obstacles: [],
  start: [0, 0, 0],
  startFacing: [0, 1],
  lanterns: [
    { id: 'L1', pos: [0, 0, 25] },
    { id: 'L2', pos: [23.8, 0, 7.7] },
    { id: 'L3', pos: [14.7, 0, -20.2] },
    { id: 'L4', pos: [-14.7, 0, -20.2] },
    { id: 'L5', pos: [-23.8, 0, 7.7] },
  ],
  moteSpawnPoints: [...ringPoints(0, 0, 12, 0, 0, 45, 8), ...ringPoints(0, 0, 33, 0, 0, 22.5, 16)],
  shadeSpawnPoints: ringPoints(0, 0, 37, 0, 15, 30, 12),
  jumpPads: [],
  charms: [],
  shadeIntervalTicks: 480,
  maxShades: 6,
  shadeSpeed: 4,
  drifters: false,
  wind: false,
};
