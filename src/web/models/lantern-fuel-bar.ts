import * as THREE from 'three';

/** Small camera-facing fuel bar (two sprites) floating above a lantern. Width of the fill = fuel fraction. */
export function createFuelBar(): { object: THREE.Group; set(fraction: number, visible: boolean, warn: boolean): void } {
  const W = 1.1;
  const object = new THREE.Group();
  object.position.set(0.6, 2.95, 0);
  const back = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1b1030, transparent: true, opacity: 0.85, depthTest: false }));
  back.scale.set(W + 0.1, 0.2, 1);
  const fillMat = new THREE.SpriteMaterial({ color: 0xffc247, depthTest: false });
  const fill = new THREE.Sprite(fillMat);
  fill.center.set(0, 0.5);
  fill.position.x = -W / 2;
  fill.renderOrder = 2;
  back.renderOrder = 1;
  object.add(back, fill);
  return {
    object,
    set(fraction, visible, warn) {
      object.visible = visible;
      fill.scale.set(Math.max(0.001, W * Math.min(1, Math.max(0, fraction))), 0.12, 1);
      fillMat.color.setHex(warn ? 0xff7a45 : 0xffc247);
    },
  };
}
