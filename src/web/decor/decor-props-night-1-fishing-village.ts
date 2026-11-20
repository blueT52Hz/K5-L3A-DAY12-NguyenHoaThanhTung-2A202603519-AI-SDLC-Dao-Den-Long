import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { dockAnchor } from './decor-scatter-placement';
import { isExcluded } from './decor-exclusion-zones';
import {
  CRATE_SPOTS, DOCK_DECK_WIDTH_M, DOCK_PLANK_COUNT, DOCK_PLANK_STEP, DOCK_PLANK_Z0, DOCK_POST_X, HUT_SPOTS,
  dockLocalToWorld,
} from './decor-night-1-anchored-layout';
import { colored, flatMaterial, instancedFrom, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { buildBasketBoatsAndNets } from './decor-village-basket-boats-and-nets';
import { buildHutsAndCrates, type VillageSpot } from './decor-village-hut-and-crates';
import { buildPaperLanternStrings, sagRopeGeometry } from './decor-village-paper-lantern-strings';
import { mulberry32 } from './seeded-random';

const DECK_Y = 0.25;
const RAIL_H = 0.95;
const RAIL_Z = [-1.0, 1.3, 3.6, 5.9, 8.2];
const GATE_Z = -1.0; // gate poles double as the first rail posts (clear of the nearby shade spawn)
const GATE_H = 3.1;

/** True when a footprint of radius r around world (x,z) stays clear of all gameplay exclusion zones. */
function spotClear(cfg: NightConfig, x: number, z: number, r: number): boolean {
  if (isExcluded(cfg, x, z)) return false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (isExcluded(cfg, x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
  }
  return true;
}

/**
 * Night 1 fishing village: stone lantern markers, plank dock with rope railing and a lantern gate,
 * basket boats, nets on bamboo frames, thatched huts, crates and jars, strings of paper lanterns.
 * `heightAt` is the visual terrain height (world XZ).
 */
export function buildNight1Props(cfg: NightConfig, heightAt: (x: number, z: number) => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'props-night-1';
  const rnd = mulberry32(3301);

  // Stone markers beside each lantern (one InstancedMesh).
  const markerMs = cfg.lanterns.map((l) => trs(l.pos[0] + 0.9, l.pos[1] + 0.25, l.pos[2] + 0.6));
  g.add(instancedFrom(new THREE.CylinderGeometry(0.28, 0.38, 0.5, 6), flatMaterial(P.stone), markerMs, 'lantern-markers'));

  const dock = dockAnchor(cfg);
  if (!dock) return g;
  // Local frame: +z outward over the edge, +x lateral. Everything below hangs off one anchor group.
  const anchor = new THREE.Group();
  anchor.position.set(dock.pos[0], dock.pos[1], dock.pos[2]);
  anchor.rotation.y = dock.facingRad;
  g.add(anchor);
  const groundAt = (lx: number, lz: number): number => {
    const [wx, wz] = dockLocalToWorld(dock, lx, lz);
    return heightAt(wx, wz);
  };

  // Deck planks: per-plank colour and slight skew for a hand-built feel.
  const plankMs: THREE.Matrix4[] = [];
  for (let i = 0; i < DOCK_PLANK_COUNT; i++) {
    plankMs.push(trs((rnd() - 0.5) * 0.08, DECK_Y + (rnd() - 0.5) * 0.02, DOCK_PLANK_Z0 + i * DOCK_PLANK_STEP, 0, (rnd() - 0.5) * 0.04, 0));
  }
  const planks = instancedFrom(new THREE.BoxGeometry(DOCK_DECK_WIDTH_M, 0.1, 0.44), flatMaterial(0xffffff), plankMs, 'dock-planks');
  const pc = new THREE.Color();
  plankMs.forEach((_, i) => planks.setColorAt(i, pc.setHex(P.wood).offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.4) * 0.12)));
  anchor.add(planks);

  // Frame: stringers under the deck, posts (long stilts outward), rail posts and the lantern gate.
  const z0 = DOCK_PLANK_Z0 - 0.3, z1 = DOCK_PLANK_Z0 + (DOCK_PLANK_COUNT - 1) * DOCK_PLANK_STEP + 0.3;
  const darkWood = new THREE.Color(P.wood).multiplyScalar(0.7).getHex();
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1.2, 1.2]) parts.push(colored(new THREE.BoxGeometry(0.18, 0.16, z1 - z0), darkWood, trs(sx, DECK_Y - 0.13, (z0 + z1) / 2)));
  for (const z of RAIL_Z) {
    const bottom = z < 0 ? groundAt(0, z) - 0.2 : -2.6 - z * 0.1;
    const h = DECK_Y + RAIL_H - bottom;
    for (const side of [-1, 1]) {
      parts.push(colored(new THREE.CylinderGeometry(0.09, 0.12, h, 6), darkWood, trs(side * DOCK_POST_X, bottom + h / 2, z)));
    }
  }
  for (const side of [-1, 1]) {
    const y0 = groundAt(side * DOCK_POST_X, GATE_Z);
    parts.push(colored(new THREE.CylinderGeometry(0.08, 0.1, GATE_H, 6), P.bamboo, trs(side * DOCK_POST_X, y0 + GATE_H / 2, GATE_Z)));
  }
  parts.push(colored(new THREE.BoxGeometry(DOCK_POST_X * 2 + 0.7, 0.12, 0.14), P.roofTile, trs(0, groundAt(0, GATE_Z) + GATE_H - 0.1, GATE_Z)));
  // Rope railings along both sides (sagging between rail posts).
  for (const side of [-1, 1]) {
    const anchors = RAIL_Z.map((z) => new THREE.Vector3(side * DOCK_POST_X, DECK_Y + RAIL_H - 0.05, z));
    parts.push(colored(sagRopeGeometry(anchors, 0.18, 0.03), P.rope));
  }
  anchor.add(new THREE.Mesh(mergeColored(parts), vertexColorMaterial()));

  // Paper lanterns: one string across the gate, one under each rope railing.
  const gateY = groundAt(0, GATE_Z) + GATE_H - 0.15;
  const spans: [THREE.Vector3, THREE.Vector3][] = [[new THREE.Vector3(-DOCK_POST_X, gateY, GATE_Z), new THREE.Vector3(DOCK_POST_X, gateY, GATE_Z)]];
  for (const side of [-1, 1]) {
    for (let i = 0; i < RAIL_Z.length - 1; i += 2) {
      const y = DECK_Y + RAIL_H + 0.25;
      spans.push([new THREE.Vector3(side * (DOCK_POST_X + 0.05), y, RAIL_Z[i]), new THREE.Vector3(side * (DOCK_POST_X + 0.05), y, RAIL_Z[i + 1])]);
    }
  }
  anchor.add(buildPaperLanternStrings(spans, 3, 0.35));
  const warm = new THREE.PointLight(P.lanternLit, 18, 14, 2); // one warm light so the dock reads cosy
  warm.position.set(0, gateY - 0.6, GATE_Z + 1.5);
  anchor.add(warm);

  anchor.add(buildBasketBoatsAndNets(groundAt));

  // Huts / crates: keep only spots whose footprint is clear of gameplay exclusion zones.
  const toSpot = (lx: number, lz: number, yaw: number, r: number): VillageSpot | null => {
    const [wx, wz] = dockLocalToWorld(dock, lx, lz);
    return spotClear(cfg, wx, wz, r) ? { x: lx, y: groundAt(lx, lz), z: lz, yaw } : null;
  };
  const huts = HUT_SPOTS.map(([x, z, yaw]) => toSpot(x, z, yaw, 1.6)).filter((s): s is VillageSpot => s !== null);
  const crates = CRATE_SPOTS.map(([x, z], i) => toSpot(x, z, i * 1.3, 0.9)).filter((s): s is VillageSpot => s !== null);
  anchor.add(buildHutsAndCrates(huts, crates, 3302));
  return g;
}
