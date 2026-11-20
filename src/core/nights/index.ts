import type { NightId } from '../types';
import type { NightConfig } from './night-config-types';
import { NIGHT_1 } from './night-1-dao-ben';
import { NIGHT_2 } from './night-2-dao-cau';
import { NIGHT_3 } from './night-3-dao-chuong';

export type { NightConfig, Surface, CylinderObstacle, JumpPad } from './night-config-types';

const NIGHTS: Record<NightId, NightConfig> = { 1: NIGHT_1, 2: NIGHT_2, 3: NIGHT_3 };

export function getNight(id: NightId): NightConfig {
  return NIGHTS[id];
}
