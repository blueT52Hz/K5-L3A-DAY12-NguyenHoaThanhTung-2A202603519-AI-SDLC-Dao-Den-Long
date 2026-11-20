import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { getNight } from '../../src/core/nights';
import { buildPropsLayer } from '../../src/web/decor';

describe('grass tint follows lit state', () => {
  it('lit -> green, unlit again -> reverts to grey', () => {
    let lit = false;
    const props = buildPropsLayer(getNight(1), 7, true, () => lit);
    const grass = props.group.getObjectByName('grass') as THREE.InstancedMesh;
    const c = new THREE.Color();
    grass.getColorAt(0, c);
    const unlit = c.getHex();
    lit = true; props.refreshLitTint();
    grass.getColorAt(0, c);
    const green = c.getHex();
    expect(green).not.toBe(unlit);
    lit = false; props.refreshLitTint();
    grass.getColorAt(0, c);
    expect(c.getHex()).toBe(unlit);
  });
});
