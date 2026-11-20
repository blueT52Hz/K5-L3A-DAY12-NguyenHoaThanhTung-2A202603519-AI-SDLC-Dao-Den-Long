import * as THREE from 'three';
import type { NightConfig, Surface } from '../../core/nights/night-config-types';
import { PALETTE } from './palette';

const grass = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 });
const sand = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 });
const wood = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });
const stone = new THREE.MeshStandardMaterial({ color: 0x7a6488, roughness: 1 });

function discTop(r: number, y: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 40), mat);
  m.position.y = y - 0.5;
  return m;
}

function surfaceMesh(s: Surface): THREE.Object3D {
  if (s.kind === 'disc') {
    const g = new THREE.Group();
    g.add(discTop(s.r, s.y, s.y === 0 ? grass : sand));
    if (s.y === 0) { // rocky underside for the main island
      const rock = new THREE.Mesh(new THREE.ConeGeometry(s.r - 4, 22, 24), stone);
      rock.rotation.x = Math.PI; rock.position.y = -12;
      g.add(rock);
    } else { // tier wall down to the floor
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r, s.y, 32), stone);
      wall.position.y = s.y / 2 - 0.5;
      g.add(wall);
    }
    g.position.set(s.cx, 0, s.cz);
    return g;
  }
  if (s.kind === 'annulus') {
    // thetaStart so the half ring covers z > 0 when zMinExclusive is set (angle from +X toward +Z)
    const half = s.zMinExclusive !== undefined;
    const geo = new THREE.RingGeometry(s.rIn, s.rOut, 40, 1, 0, half ? Math.PI : Math.PI * 2);
    geo.rotateX(Math.PI / 2); // ring plane -> XZ, theta now runs +X toward +Z
    const top = new THREE.Mesh(geo, sand);
    top.material = (sand as THREE.MeshStandardMaterial).clone();
    (top.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    top.position.set(s.cx, s.y, s.cz);
    const g = new THREE.Group();
    g.add(top);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(s.rOut, s.rOut, s.y, 32, 1, true, 0, half ? Math.PI : Math.PI * 2), stone);
    wall.material = new THREE.MeshStandardMaterial({ color: 0x7a6488, side: THREE.DoubleSide });
    wall.rotation.y = -Math.PI / 2; // cylinder theta starts at +Z; align with +X-toward-+Z
    wall.position.set(s.cx, s.y / 2, s.cz);
    g.add(wall);
    return g;
  }
  if (s.kind === 'rect') { // bamboo bridge
    const w = s.xMax - s.xMin, d = s.zMax - s.zMin;
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), wood);
    deck.position.set((s.xMin + s.xMax) / 2, s.y - 0.15, (s.zMin + s.zMax) / 2);
    g.add(deck);
    const rail = new THREE.MeshStandardMaterial({ color: PALETTE.sand });
    for (const sx of [s.xMin, s.xMax]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, d), rail);
      r.position.set(sx, s.y + 0.8, (s.zMin + s.zMax) / 2);
      g.add(r);
    }
    return g;
  }
  // ramp: slanted plank from (rFrom,yFrom) to (rTo,yTo) along angle
  const a = (s.angleDeg * Math.PI) / 180;
  const dr = s.rTo - s.rFrom, dy = s.yTo - s.yFrom;
  const len = Math.hypot(dr, dy);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, s.width), wood);
  const rm = (s.rFrom + s.rTo) / 2;
  const holder = new THREE.Group();
  plank.rotation.z = Math.atan2(dy, dr); // local +x = outward radial direction
  plank.position.set(rm, (s.yFrom + s.yTo) / 2 - 0.125, 0);
  holder.add(plank);
  holder.rotation.y = -a; // local +x -> (cos a, 0, sin a)
  return holder;
}

/** Builds terrain meshes from a night's surfaces/obstacles (tower, cloud sea). */
export function buildNightTerrain(cfg: NightConfig): THREE.Group {
  const root = new THREE.Group();
  for (const s of cfg.surfaces) root.add(surfaceMesh(s));
  for (const o of cfg.obstacles) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.8, o.r, o.yTop, 12), stone);
    tower.position.set(o.cx, o.yTop / 2, o.cz);
    root.add(tower);
    if (o.yTop >= 8) { // bell tower: roof + bell
      const roof = new THREE.Mesh(new THREE.ConeGeometry(o.r * 1.4, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf }));
      roof.position.set(o.cx, o.yTop + 1.1, o.cz);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8),
        new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: PALETTE.gold, emissiveIntensity: 0.3 }));
      bell.position.set(o.cx, o.yTop - 0.8, o.cz);
      root.add(roof, bell);
    }
  }
  // cloud sea
  const cloudMat = new THREE.MeshStandardMaterial({ color: PALETTE.cloudSea, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 55 + (i % 3) * 18;
    const c = new THREE.Mesh(new THREE.SphereGeometry(10 + (i % 4) * 3, 10, 8), cloudMat);
    c.scale.y = 0.35;
    c.position.set(Math.cos(a) * r, -22 - (i % 3) * 3, Math.sin(a) * r);
    root.add(c);
  }
  return root;
}
