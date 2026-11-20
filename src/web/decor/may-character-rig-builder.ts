import * as THREE from 'three';
import {
  MAY_DIMS as D,
  type MayCharacterGeometries,
  type MayCharacterMaterials,
} from './may-character-materials-and-geometries';

/**
 * Builds Mây's joint hierarchy out of primitives. Every joint is an empty Group placed at the
 * anatomical pivot, with its meshes hanging below it (-Y), so rotating a joint swings the limb.
 *
 * root (feet, y=0, faces +Z) -> body -> hips -> torso -> neck -> head -> hat -> lanternPivot
 *                                              torso -> shoulderL/R -> elbowL/R
 *                                              torso -> scarfTailPivot
 *                                       hips -> hipL/R -> kneeL/R -> ankleL/R
 */
export interface MayRigJoints {
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  lanternPivot: THREE.Group;
  lanternBody: THREE.Group;
  scarfTailPivot: THREE.Group;
  shoulders: [THREE.Group, THREE.Group]; // [left, right]
  elbows: [THREE.Group, THREE.Group];
  hipJoints: [THREE.Group, THREE.Group];
  knees: [THREE.Group, THREE.Group];
  ankles: [THREE.Group, THREE.Group];
}

/** Rest splay of the arms away from the body (rad, around Z). */
export const ARM_REST_SPLAY = 0.14;

export function buildMayRig(
  root: THREE.Group,
  m: MayCharacterMaterials,
  g: MayCharacterGeometries,
  withLight: boolean,
): MayRigJoints {
  const joint = (parent: THREE.Object3D, x: number, y: number, z: number, name: string) => {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };
  const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mt: THREE.Material, x: number, y: number, z: number) => {
    const me = new THREE.Mesh(geo, mt);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };

  const body = joint(root, 0, 0, 0, 'may-body');
  const hips = joint(body, 0, D.hipY, 0, 'may-hips');
  mesh(hips, g.pelvis, m.trousers, 0, 0.0, 0);

  // ---- torso, scarf and arms ----
  const torso = joint(hips, 0, 0.04, 0, 'may-torso');
  mesh(torso, g.torso, m.shirt, 0, D.torsoLen / 2, 0);
  const scarfRing = mesh(torso, g.scarfRing, m.scarf, 0, D.torsoLen + 0.01, 0);
  scarfRing.rotation.x = Math.PI / 2;
  const scarfTailPivot = joint(torso, 0.07, D.torsoLen - 0.02, -0.12, 'may-scarf-tail');
  const tail = mesh(scarfTailPivot, g.scarfTail, m.scarf, 0, -D.scarfTailLen / 2, 0);
  tail.rotation.set(0, 0.7, 0.08); // ribbon turned partly sideways so it also reads from the side

  const shoulders: THREE.Group[] = [];
  const elbows: THREE.Group[] = [];
  for (const side of [1, -1]) {
    // side +1 = character's left (+X when facing +Z)
    const sh = joint(torso, side * D.shoulderHalfWidth, D.torsoLen - 0.05, 0, side > 0 ? 'may-shoulder-l' : 'may-shoulder-r');
    sh.rotation.z = side * ARM_REST_SPLAY;
    mesh(sh, g.upperArm, m.shirt, 0, -D.upperArmLen / 2, 0);
    const el = joint(sh, 0, -D.upperArmLen, 0, side > 0 ? 'may-elbow-l' : 'may-elbow-r');
    mesh(el, g.forearm, m.shirt, 0, -D.forearmLen / 2, 0);
    mesh(el, g.hand, m.skin, 0, -D.forearmLen - 0.01, 0);
    shoulders.push(sh);
    elbows.push(el);
  }

  // ---- neck, head, hair, eyes ----
  const neck = joint(torso, 0, D.torsoLen, 0, 'may-neck');
  mesh(neck, g.neck, m.skin, 0, 0.04, 0);
  const head = joint(neck, 0, 0.08, 0, 'may-head');
  const headC = D.headRadius * 0.95;
  mesh(head, g.head, m.skin, 0, headC, 0);
  const hairCap = mesh(head, g.hairCap, m.hair, 0, headC + 0.005, -0.012);
  hairCap.rotation.x = -0.6; // tilt back so the face stays clear and hair covers the nape
  mesh(head, g.hairBun, m.hair, 0, headC - 0.02, -D.headRadius * 0.95);
  for (const x of [-0.072, 0.072]) mesh(head, g.eye, m.eye, x, headC + 0.01, D.headRadius * 0.93);

  // ---- nón lá with subtle rings ----
  const hat = joint(head, 0, headC + D.headRadius * 0.55, 0, 'may-hat');
  mesh(hat, g.hat, m.straw, 0, 0, 0);
  for (const t of [0.3, 0.55, 0.8]) {
    // rings follow the cone surface: radius shrinks linearly with height
    const ring = mesh(hat, g.hatRing, m.strawRing, 0, D.hatHeight * (1 - t) * 0.92, 0);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(D.hatBrimRadius * t + 0.004);
  }

  // ---- paper lantern hanging from the brim ----
  const lanternPivot = joint(hat, 0.37, 0.0, 0.14, 'may-lantern-pivot');
  mesh(lanternPivot, g.string, m.string, 0, -D.lanternStringLen / 2, 0);
  const lanternBody = joint(lanternPivot, 0, -D.lanternStringLen - 0.06, 0, 'may-lantern');
  const paper = mesh(lanternBody, g.lanternBody, m.lanternPaper, 0, 0, 0);
  paper.scale.y = 1.2;
  mesh(lanternBody, g.lanternCore, m.lanternCore, 0, 0, 0);
  mesh(lanternBody, g.lanternCap, m.lanternCap, 0, 0.075, 0);
  mesh(lanternBody, g.lanternCap, m.lanternCap, 0, -0.075, 0);
  if (withLight) {
    const light = new THREE.PointLight(0xffb347, 3, 5, 2);
    lanternBody.add(light);
  }

  // ---- legs ----
  const hipJoints: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  const ankles: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const hj = joint(hips, side * D.hipHalfWidth, -0.02, 0, side > 0 ? 'may-hip-l' : 'may-hip-r');
    mesh(hj, g.thigh, m.trousers, 0, -D.thighLen / 2, 0);
    const kn = joint(hj, 0, -D.thighLen, 0, side > 0 ? 'may-knee-l' : 'may-knee-r');
    mesh(kn, g.shin, m.trousers, 0, -D.shinLen / 2, 0);
    const an = joint(kn, 0, -D.shinLen, 0, side > 0 ? 'may-ankle-l' : 'may-ankle-r');
    mesh(an, g.foot, m.shoes, 0, -0.025, 0.035);
    hipJoints.push(hj);
    knees.push(kn);
    ankles.push(an);
  }

  return {
    body, hips, torso, neck, head, lanternPivot, lanternBody, scarfTailPivot,
    shoulders: [shoulders[0], shoulders[1]],
    elbows: [elbows[0], elbows[1]],
    hipJoints: [hipJoints[0], hipJoints[1]],
    knees: [knees[0], knees[1]],
    ankles: [ankles[0], ankles[1]],
  };
}
