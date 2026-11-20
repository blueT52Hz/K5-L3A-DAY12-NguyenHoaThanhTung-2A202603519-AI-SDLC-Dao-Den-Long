import * as THREE from 'three';
import type { NightConfig } from '../../core/nights';
import { DECOR_PALETTE as P } from './decor-palette';
import { dockAnchor } from './decor-scatter-placement';

function flat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, metalness: 0 });
}

/** Night 1 fishing-village props: wooden dock, basket boats, net poles, lantern stone markers. */
export function buildNight1Props(cfg: NightConfig): THREE.Group {
  const g = new THREE.Group();
  g.name = 'props-night-1';
  const wood = flat(P.wood);

  // Stone markers beside each lantern (one InstancedMesh).
  const markerGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.5, 6);
  const markers = new THREE.InstancedMesh(markerGeo, flat(P.stone), Math.max(1, cfg.lanterns.length));
  markers.count = cfg.lanterns.length;
  const m = new THREE.Matrix4();
  cfg.lanterns.forEach((l, i) => {
    m.makeTranslation(l.pos[0] + 0.9, l.pos[1] + 0.25, l.pos[2] + 0.6);
    markers.setMatrixAt(i, m);
  });
  g.add(markers);

  const dock = dockAnchor(cfg);
  if (!dock) return g;
  // Local frame: +z outward over the edge, +x lateral. Applied to a single anchor group.
  const anchor = new THREE.Group();
  anchor.position.set(dock.pos[0], dock.pos[1], dock.pos[2]);
  anchor.rotation.y = dock.facingRad;
  g.add(anchor);

  // Dock deck: planks along z with a gap, plus posts.
  const plankGeo = new THREE.BoxGeometry(2.4, 0.12, 0.42);
  const planks = new THREE.InstancedMesh(plankGeo, wood, 14);
  for (let i = 0; i < 14; i++) {
    m.makeTranslation(0, 0.25, -2 + i * 0.5);
    planks.setMatrixAt(i, m);
  }
  anchor.add(planks);
  const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6);
  const posts = new THREE.InstancedMesh(postGeo, wood, 6);
  for (let i = 0; i < 6; i++) {
    m.makeTranslation(i % 2 ? 1.1 : -1.1, -0.45, -1.5 + Math.floor(i / 2) * 2.8);
    posts.setMatrixAt(i, m);
  }
  anchor.add(posts);

  // Basket boats pulled ashore beside the dock: lower hemispheres, open side up.
  const boatGeo = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const boatMat = new THREE.MeshStandardMaterial({
    color: 0xa87b45, flatShading: true, roughness: 1, side: THREE.DoubleSide,
  });
  const boats = new THREE.InstancedMesh(boatGeo, boatMat, 3);
  const boatSpots: [number, number, number][] = [[-3.6, -2.5, 0.4], [3.8, -3.2, -0.6], [-5.2, -4.8, 1.1]];
  boatSpots.forEach(([x, z, yaw], i) => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m.compose(new THREE.Vector3(x, 0.45, z), q, new THREE.Vector3(1.1, 0.55, 1.1));
    boats.setMatrixAt(i, m);
  });
  anchor.add(boats);

  // Bamboo poles with drying nets: two poles + a translucent net strung between them.
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 5);
  const poles = new THREE.InstancedMesh(poleGeo, flat(P.arecaTrunk), 4);
  const netGeo = new THREE.PlaneGeometry(2.6, 1.3);
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xc9c4aa, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 1,
  });
  const nets = new THREE.InstancedMesh(netGeo, netMat, 2);
  [[-7, -6], [7, -7]].forEach(([x, z], k) => {
    m.makeTranslation(x - 1.3, 1.5, z); poles.setMatrixAt(k * 2, m);
    m.makeTranslation(x + 1.3, 1.5, z); poles.setMatrixAt(k * 2 + 1, m);
    m.makeTranslation(x, 1.9, z); nets.setMatrixAt(k, m);
  });
  anchor.add(poles, nets);
  return g;
}
