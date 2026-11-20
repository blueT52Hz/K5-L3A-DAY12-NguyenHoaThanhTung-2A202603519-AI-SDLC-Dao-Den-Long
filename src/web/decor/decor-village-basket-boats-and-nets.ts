import * as THREE from 'three';
import { DECOR_PALETTE as P } from './decor-palette';
import { colored, flatMaterial, instancedFrom, mergeColored, trs, vertexColorMaterial } from './decor-geometry-helpers';
import { BOAT_SCALE, BOAT_SPOTS, NET_HALF_SPAN, NET_POLE_SPOTS } from './decor-night-1-anchored-layout';

const NET_POLE_H = 2.7;

/** Basket boat ("thuyen thung"): woven lathe bowl with checker weave tint, darker thick rim, a seat plank. */
function buildBasketBoatGeometry(): THREE.BufferGeometry {
  const profile = [[0, 0], [0.4, 0.02], [0.72, 0.1], [0.92, 0.25], [1.0, 0.42], [1.0, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
  const weaveA = new THREE.Color(P.basket), weaveB = new THREE.Color(P.basket).multiplyScalar(0.72);
  const tmp = new THREE.Color();
  const bowl = colored(new THREE.LatheGeometry(profile, 18), (x, y, z) => {
    const a = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 18);
    return tmp.copy((a + Math.floor(y * 12)) % 2 ? weaveA : weaveB);
  });
  const rim = new THREE.TorusGeometry(1.0, 0.06, 4, 18);
  rim.rotateX(Math.PI / 2);
  return mergeColored([
    bowl,
    colored(rim, P.basketRim, trs(0, 0.5, 0)),
    colored(new THREE.BoxGeometry(1.7, 0.05, 0.22), P.wood, trs(0, 0.38, 0)),
  ]);
}

/** Small 8x8 alpha grid texture for the fishing nets (DataTexture: no DOM needed). */
function buildNetTexture(): THREE.DataTexture {
  const n = 8;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const line = x === 0 || y === 0;
      data.set(line ? [255, 255, 255, 255] : [0, 0, 0, 0], (y * n + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, n, n);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 9);
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Basket boats beside the dock and two fishing nets hung on bamboo frames (dock local frame).
 * `groundAt(lx, lz)` returns the visual ground height at a local point.
 */
export function buildBasketBoatsAndNets(groundAt: (lx: number, lz: number) => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'village-boats-nets';
  const boatMs = BOAT_SPOTS.map(([x, z, yaw], i) =>
    trs(x, groundAt(x, z) + 0.1, z, (i - 1) * 0.06, yaw, 0.05, BOAT_SCALE * 0.85, BOAT_SCALE * 0.6, BOAT_SCALE * 0.85));
  g.add(instancedFrom(buildBasketBoatGeometry(), vertexColorMaterial({ side: THREE.DoubleSide }), boatMs, 'basket-boats'));

  // Frames: two poles + crossbar per net; a sagging net panel below the crossbar.
  const frameParts: THREE.BufferGeometry[] = [];
  const netMs: THREE.Matrix4[] = [];
  NET_POLE_SPOTS.forEach(([x, z], k) => {
    const y = groundAt(x, z);
    const yaw = k ? 0.5 : -0.35;
    const frame = trs(x, y, z, 0, yaw, 0);
    for (const side of [-1, 1]) {
      const pole = new THREE.CylinderGeometry(0.05, 0.07, NET_POLE_H, 5);
      pole.translate(side * NET_HALF_SPAN, NET_POLE_H / 2, 0);
      frameParts.push(colored(pole, P.bamboo, frame));
    }
    const bar = new THREE.CylinderGeometry(0.04, 0.04, NET_HALF_SPAN * 2 + 0.5, 5);
    bar.rotateZ(Math.PI / 2);
    bar.translate(0, NET_POLE_H - 0.15, 0);
    frameParts.push(colored(bar, P.bamboo, frame));
    netMs.push(new THREE.Matrix4().multiplyMatrices(frame, trs(0, NET_POLE_H - 1.0, 0)));
  });
  g.add(new THREE.Mesh(mergeColored(frameParts), vertexColorMaterial()));

  const netGeo = new THREE.PlaneGeometry(NET_HALF_SPAN * 2 - 0.1, 1.6, 10, 6);
  const np = netGeo.getAttribute('position');
  for (let i = 0; i < np.count; i++) {
    const u = np.getX(i) / NET_HALF_SPAN, v = (np.getY(i) + 0.8) / 1.6; // v=1 at the crossbar
    np.setZ(i, Math.cos(u * Math.PI * 0.5) * (1 - v) * 0.35);
    np.setY(i, np.getY(i) - Math.cos(u * Math.PI * 0.5) * 0.15 * (1 - v));
  }
  netGeo.computeVertexNormals();
  const tex = buildNetTexture();
  const netMat = flatMaterial(P.net, { map: tex, alphaTest: 0.5, side: THREE.DoubleSide, flatShading: false });
  netMat.addEventListener('dispose', () => tex.dispose()); // texture freed with its material
  g.add(instancedFrom(netGeo, netMat, netMs, 'fishing-nets'));
  return g;
}
