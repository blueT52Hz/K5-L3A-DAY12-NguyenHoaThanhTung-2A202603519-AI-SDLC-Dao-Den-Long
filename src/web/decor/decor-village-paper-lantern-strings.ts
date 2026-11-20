import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, flatMaterial, instancedFrom, mergeColored, trs } from './decor-geometry-helpers';

/** Sagging rope tube through consecutive anchor points (catenary-like dip between each pair). */
export function sagRopeGeometry(anchors: THREE.Vector3[], sag: number, radius = 0.025): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * sag, 0)));
    }
  }
  pts.push(anchors[anchors.length - 1].clone());
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, radius, 4, false);
}

/** Point at fraction t along a sagging span a-b (matches sagRopeGeometry). */
export function sagPoint(a: THREE.Vector3, b: THREE.Vector3, t: number, sag: number): THREE.Vector3 {
  return new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * sag, 0));
}

/** Paper lantern: ribbed glowing body with dark caps (white body so the material colour shows). */
function buildPaperLanternGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(0.2, 8, 6);
  body.scale(1, 1.25, 1);
  return mergeColored([
    colored(body, 0xffffff),
    colored(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 8), 0x2a1a12, trs(0, 0.26, 0)),
    colored(new THREE.CylinderGeometry(0.11, 0.09, 0.06, 8), 0x2a1a12, trs(0, -0.26, 0)),
  ]);
}

/**
 * Strings of warm paper lanterns hanging along the given spans (each span = [a, b] anchors, local frame).
 * Returns a group with the ropes (one merged mesh) and the lanterns (one InstancedMesh).
 */
export function buildPaperLanternStrings(spans: [THREE.Vector3, THREE.Vector3][], perSpan: number, sag: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'paper-lantern-strings';
  const ropes = spans.map(([a, b]) => colored(sagRopeGeometry([a, b], sag, 0.018), P.rope));
  if (ropes.length) g.add(new THREE.Mesh(mergeColored(ropes), flatMaterial(0xffffff, { vertexColors: true, flatShading: false })));

  const ms: THREE.Matrix4[] = [];
  for (const [a, b] of spans) {
    for (let k = 1; k <= perSpan; k++) {
      const p = sagPoint(a, b, k / (perSpan + 1), sag);
      ms.push(trs(p.x, p.y - 0.3, p.z, 0, k * 0.7, 0, 0.85 + (k % 3) * 0.12));
    }
  }
  const mat = new THREE.MeshStandardMaterial({
    color: P.paperLantern, emissive: 0xff4a1c, emissiveIntensity: 0.95, roughness: 0.8, vertexColors: true,
  });
  g.add(instancedFrom(buildPaperLanternGeometry(), mat, ms, 'paper-lanterns'));
  return g;
}
