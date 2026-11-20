import type { NightId, Vec3, XZ } from '../types';

/** Walkable surface. Angles measured from +X toward +Z: (r*cos a, y, r*sin a). */
export type Surface =
  | { kind: 'disc'; cx: number; cz: number; r: number; y: number }
  | { kind: 'annulus'; cx: number; cz: number; rIn: number; rOut: number; y: number; zMinExclusive?: number }
  | { kind: 'rect'; xMin: number; xMax: number; zMin: number; zMax: number; y: number }
  | { kind: 'ramp'; angleDeg: number; width: number; rFrom: number; rTo: number; yFrom: number; yTo: number };
/** Vertical cylinder that blocks movement below yTop. */
export interface CylinderObstacle { cx: number; cz: number; r: number; yTop: number }
/** horiz = precomputed horizontal launch velocity in m/s. */
export interface JumpPad { pos: Vec3; r: number; vy: number; horiz: XZ }
export interface NightConfig { id: NightId; name: string; durationS: number; surfaces: Surface[]; obstacles: CylinderObstacle[];
  start: Vec3; startFacing: XZ; lanterns: { id: string; pos: Vec3 }[]; moteSpawnPoints: Vec3[]; shadeSpawnPoints: Vec3[];
  jumpPads: JumpPad[]; charms: { id: string; pos: Vec3 }[]; shadeIntervalTicks: number; maxShades: number; shadeSpeed: number;
  drifters: boolean; wind: boolean }
