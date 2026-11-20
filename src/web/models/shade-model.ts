import * as THREE from 'three';
import { PALETTE } from './palette';

/**
 * Bóng Mực shape, shared by every shade: squashed purple-black blob, faint purple rim ring on the ground side
 * (so the danger reads against the green ground) and two glowing eyes on +Z. Origin at center.
 * Geometries are module singletons (never disposed); each part has a fixed local matrix.
 */
export const SHADE_GEOMETRY = {
  body: new THREE.SphereGeometry(0.7, 12, 9), // x200 shades: keep the poly count modest
  rim: new THREE.TorusGeometry(0.85, 0.05, 4, 20),
  eye: new THREE.SphereGeometry(0.1, 6, 4),
} as const;

export const SHADE_PART_MATRIX = {
  body: new THREE.Matrix4().makeScale(1.15, 0.85, 1.0),
  rim: new THREE.Matrix4().makeTranslation(0, -0.5, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)),
  eyes: [-0.25, 0.25].map((x) => new THREE.Matrix4().makeTranslation(x, 0.1, 0.62)),
} as const;

export interface ShadeMaterials { body: THREE.MeshLambertMaterial; rim: THREE.MeshLambertMaterial; eye: THREE.MeshLambertMaterial }

/** Rim + eye color: #7A3CFF, or #00B3FF in colorblind mode. */
export const shadeAccentColor = (colorblind: boolean): number => (colorblind ? PALETTE.shadeRimColorblind : PALETTE.shadeRim);

/** Materials for one look of the shade (matte Lambert, same diffuse as the old rough standard material). Stunned: body #3A3450 (default #120A1A), every part at opacity 0.4. */
export function createShadeMaterials(stunned: boolean): ShadeMaterials {
  const fade = stunned ? { transparent: true, opacity: 0.4 } : {};
  const accent = shadeAccentColor(false);
  return {
    body: new THREE.MeshLambertMaterial({
      color: stunned ? PALETTE.shadeStunned : PALETTE.shadeBody, emissive: 0x4a1a80, emissiveIntensity: 0.3, ...fade,
    }),
    rim: new THREE.MeshLambertMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.7, ...fade }),
    eye: new THREE.MeshLambertMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.5, ...fade }),
  };
}

/** Single standalone shade (own materials). The game renders shades through ShadeInstancedCrowd instead. */
export function createShadeModel(): THREE.Group {
  const mats = createShadeMaterials(false);
  const g = new THREE.Group();
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat);
    m.decompose(mesh.position, mesh.quaternion, mesh.scale);
    return mesh;
  };
  g.add(part(SHADE_GEOMETRY.body, mats.body, SHADE_PART_MATRIX.body), part(SHADE_GEOMETRY.rim, mats.rim, SHADE_PART_MATRIX.rim));
  for (const m of SHADE_PART_MATRIX.eyes) g.add(part(SHADE_GEOMETRY.eye, mats.eye, m));
  return g;
}
