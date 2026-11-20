import * as THREE from 'three';

/**
 * Shared materials and geometries for one Mây character instance.
 * Every mesh of the rig references these, so dispose() frees the whole character in one pass.
 */

export interface MayCharacterMaterials {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  scarf: THREE.MeshStandardMaterial;
  trousers: THREE.MeshStandardMaterial;
  shoes: THREE.MeshStandardMaterial;
  straw: THREE.MeshStandardMaterial;
  strawRing: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  string: THREE.MeshStandardMaterial;
  lanternPaper: THREE.MeshStandardMaterial;
  lanternCore: THREE.MeshStandardMaterial;
  lanternCap: THREE.MeshStandardMaterial;
}

export interface MayCharacterGeometries {
  torso: THREE.CylinderGeometry;
  pelvis: THREE.CylinderGeometry;
  neck: THREE.CylinderGeometry;
  head: THREE.SphereGeometry;
  hairCap: THREE.SphereGeometry;
  hairBun: THREE.SphereGeometry;
  eye: THREE.SphereGeometry;
  hat: THREE.LatheGeometry;
  hatRing: THREE.TorusGeometry;
  upperArm: THREE.CapsuleGeometry;
  forearm: THREE.CapsuleGeometry;
  hand: THREE.SphereGeometry;
  thigh: THREE.CapsuleGeometry;
  shin: THREE.CapsuleGeometry;
  foot: THREE.BoxGeometry;
  scarfRing: THREE.TorusGeometry;
  scarfTail: THREE.BoxGeometry;
  string: THREE.CylinderGeometry;
  lanternBody: THREE.SphereGeometry;
  lanternCore: THREE.SphereGeometry;
  lanternCap: THREE.CylinderGeometry;
}

/** Key rig dimensions (metres) shared by the rig builder and the animator. */
export const MAY_DIMS = {
  hipY: 0.62, // hips pivot height above the feet
  hipHalfWidth: 0.09,
  thighLen: 0.28,
  shinLen: 0.26,
  torsoLen: 0.36,
  shoulderHalfWidth: 0.2,
  upperArmLen: 0.21,
  forearmLen: 0.19,
  headRadius: 0.21,
  hatBrimRadius: 0.44,
  hatHeight: 0.22,
  lanternStringLen: 0.16,
  scarfTailLen: 0.24,
} as const;

function mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
}

export function createMayMaterials(): MayCharacterMaterials {
  return {
    skin: mat(0xf0c39a, { roughness: 0.7 }),
    hair: mat(0x1d1410),
    shirt: mat(0xe8e2d0),
    scarf: mat(0xc8102e, { roughness: 0.75 }),
    trousers: mat(0x2a2733),
    shoes: mat(0x3b2a20),
    // a faint warm emissive keeps the hat readable in the night scene
    straw: mat(0xd9c38a, { emissive: 0x4a3a14, emissiveIntensity: 0.35, roughness: 0.95, side: THREE.DoubleSide }),
    strawRing: mat(0xb89c5e, { roughness: 0.95 }),
    eye: mat(0x1a1210, { roughness: 0.4 }),
    string: mat(0x3a2a1a),
    lanternPaper: mat(0xffb347, { emissive: 0xffb347, emissiveIntensity: 1.6, roughness: 0.6 }),
    lanternCore: new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffe9b0, emissiveIntensity: 2.4 }),
    lanternCap: mat(0x5a2a18),
  };
}

/** Conical nón lá profile: wide flat-ish brim rising to a pointed apex (x = radius, y = height). */
function createHatGeometry(): THREE.LatheGeometry {
  const r = MAY_DIMS.hatBrimRadius;
  const h = MAY_DIMS.hatHeight;
  const pts = [
    new THREE.Vector2(0.0001, h),
    new THREE.Vector2(r * 0.25, h * 0.72),
    new THREE.Vector2(r * 0.55, h * 0.38),
    new THREE.Vector2(r * 0.85, h * 0.1),
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.97, -0.012), // tiny lip so the brim has thickness
    new THREE.Vector2(0.0001, h * 0.55), // underside back up to the inside apex
  ];
  return new THREE.LatheGeometry(pts, 18);
}

export function createMayGeometries(): MayCharacterGeometries {
  const d = MAY_DIMS;
  return {
    torso: new THREE.CylinderGeometry(0.15, 0.19, d.torsoLen, 10),
    pelvis: new THREE.CylinderGeometry(0.17, 0.15, 0.14, 10),
    neck: new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8),
    head: new THREE.SphereGeometry(d.headRadius, 14, 10),
    hairCap: new THREE.SphereGeometry(d.headRadius * 1.04, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairBun: new THREE.SphereGeometry(0.07, 8, 6),
    eye: new THREE.SphereGeometry(0.024, 6, 4),
    hat: createHatGeometry(),
    hatRing: new THREE.TorusGeometry(1, 0.006, 4, 24),
    upperArm: new THREE.CapsuleGeometry(0.052, d.upperArmLen - 0.07, 3, 8),
    forearm: new THREE.CapsuleGeometry(0.045, d.forearmLen - 0.06, 3, 8),
    hand: new THREE.SphereGeometry(0.05, 8, 6),
    thigh: new THREE.CapsuleGeometry(0.068, d.thighLen - 0.09, 3, 8),
    shin: new THREE.CapsuleGeometry(0.058, d.shinLen - 0.07, 3, 8),
    foot: new THREE.BoxGeometry(0.11, 0.07, 0.19),
    scarfRing: new THREE.TorusGeometry(0.1, 0.045, 6, 14),
    scarfTail: new THREE.BoxGeometry(0.095, d.scarfTailLen, 0.035),
    string: new THREE.CylinderGeometry(0.006, 0.006, d.lanternStringLen, 4),
    lanternBody: new THREE.SphereGeometry(0.065, 10, 8),
    lanternCore: new THREE.SphereGeometry(0.035, 8, 6),
    lanternCap: new THREE.CylinderGeometry(0.035, 0.045, 0.025, 8),
  };
}

/** Frees every shared resource of one character. */
export function disposeMayResources(mats: MayCharacterMaterials, geos: MayCharacterGeometries): void {
  for (const m of Object.values(mats)) m.dispose();
  for (const g of Object.values(geos)) g.dispose();
}
