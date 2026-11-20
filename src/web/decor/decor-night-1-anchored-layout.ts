import type { NightConfig } from '../../core/nights';
import type { Vec3 } from '../../core/types';
import { dockAnchor } from './decor-scatter-placement';

/** Local layout (dock frame: +z outward over the rim, +x lateral) of Night 1 anchored props. */
export const DOCK_DECK_WIDTH_M = 3.2;
export const DOCK_PLANK_Z0 = -1.5;
export const DOCK_PLANK_COUNT = 20;
export const DOCK_PLANK_STEP = 0.5; // planks span z -1.5 .. 8 (about 10 m, mostly outward over the void)
export const DOCK_POST_X = 1.5;
export const DOCK_POST_ROWS = [-1.5, 2, 5.5] as const;
/** [x, z, yaw] of basket boats; scale 1.8 so each is ~3.6 m across. */
export const BOAT_SPOTS: readonly (readonly [number, number, number])[] = [
  [-4.6, -2.5, 0.4], [-4.8, -6.8, -0.6], [-8.0, -4.4, 1.1],
];
export const BOAT_SCALE = 1.8;
export const NET_POLE_SPOTS: readonly (readonly [number, number])[] = [[-10, -9], [8, -3]];
export const NET_HALF_SPAN = 1.3;
/** [x, z, yaw] of thatched huts near the dock (local frame); spots hitting exclusion zones are skipped at build. */
export const HUT_SPOTS: readonly (readonly [number, number, number])[] = [[6.2, -9.5, 0.3], [-4.2, -13.2, -0.4]];
/** [x, z] of stacked crates and clay jars (local frame). */
export const CRATE_SPOTS: readonly (readonly [number, number])[] = [[3.6, -7.0], [-2.6, -10.6]];

/** Local (x,z) to world XZ through the dock anchor (yaw rotation about Y, three.js convention). */
export function dockLocalToWorld(
  dock: { pos: Vec3; facingRad: number }, lx: number, lz: number,
): [number, number] {
  const c = Math.cos(dock.facingRad), s = Math.sin(dock.facingRad);
  return [dock.pos[0] + lx * c + lz * s, dock.pos[2] - lx * s + lz * c];
}

/** World XZ of every Night 1 anchored prop (dock deck corners/centre, boats, net poles) plus lantern stone markers. */
export function night1AnchoredPropPositions(cfg: NightConfig): [number, number][] {
  const out: [number, number][] = cfg.lanterns.map((l) => [l.pos[0] + 0.9, l.pos[2] + 0.6]);
  const dock = dockAnchor(cfg);
  if (!dock) return out;
  const half = DOCK_DECK_WIDTH_M / 2;
  for (let i = 0; i < DOCK_PLANK_COUNT; i++) {
    const z = DOCK_PLANK_Z0 + i * DOCK_PLANK_STEP;
    out.push(dockLocalToWorld(dock, -half, z), dockLocalToWorld(dock, 0, z), dockLocalToWorld(dock, half, z));
  }
  for (const [x, z] of BOAT_SPOTS) out.push(dockLocalToWorld(dock, x, z));
  for (const [x, z] of NET_POLE_SPOTS) {
    out.push(dockLocalToWorld(dock, x - NET_HALF_SPAN, z), dockLocalToWorld(dock, x + NET_HALF_SPAN, z));
  }
  return out;
}

/** Radius (m) around dock/boat/net anchors where scattered grass and rocks are dropped. */
export const ANCHORED_CLEARANCE_M = 2.6;

/** True if (x,z) is within the dock+boats+nets footprint (excluding lantern markers). */
export function nearDockFootprint(cfg: NightConfig, x: number, z: number): boolean {
  const dock = dockAnchor(cfg);
  if (!dock) return false;
  const pts: [number, number][] = [];
  for (let i = 0; i < DOCK_PLANK_COUNT; i += 2) pts.push(dockLocalToWorld(dock, 0, DOCK_PLANK_Z0 + i * DOCK_PLANK_STEP));
  for (const [bx, bz] of BOAT_SPOTS) pts.push(dockLocalToWorld(dock, bx, bz));
  for (const [px, pz] of NET_POLE_SPOTS) pts.push(dockLocalToWorld(dock, px, pz));
  for (const [hx, hz] of HUT_SPOTS) pts.push(dockLocalToWorld(dock, hx, hz));
  for (const [cx, cz] of CRATE_SPOTS) pts.push(dockLocalToWorld(dock, cx, cz));
  return pts.some((p) => Math.hypot(x - p[0], z - p[1]) <= ANCHORED_CLEARANCE_M);
}
