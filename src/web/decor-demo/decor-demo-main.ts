import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getNight } from '../../core/nights';
import { buildIslandDecor, type DecorLayer, type IslandDecorHandle } from '../decor';
import { createLanternModel } from '../models/lantern-model';
import { createControlPanel, type DemoState } from './decor-demo-control-panel';
import { parseDecorDemoQuery } from './parse-decor-demo-query';

// Temporary scope: always Night 1 (night buttons hidden, query night ignored).
const NIGHT = 1 as const;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps') as HTMLDivElement;

function main(): void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    document.body.textContent = 'Trình duyệt không hỗ trợ WebGL';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 30, 45);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.update();

  const cfg = getNight(NIGHT);
  const query = parseDecorDemoQuery(window.location.search);
  const state: DemoState = {
    night: NIGHT, lit: Math.min(query.lit, cfg.lanterns.length),
    layers: { terrain: true, props: true, atmosphere: true, glow: true },
  };

  let handle: IslandDecorHandle | null = null;
  let models: Array<{ group: THREE.Group; setLit(lit: boolean): void }> = [];

  /** Free GPU resources of a reference lantern (geometry + material, array-safe). */
  function disposeModel(g: THREE.Group): void {
    scene.remove(g);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
  }

  /** Light the first `state.lit` lanterns (id order) on models and decor handle. No rebuild. */
  function applyLit(): void {
    const litIds: string[] = [];
    cfg.lanterns.forEach((l, i) => {
      const on = i < state.lit;
      models[i].setLit(on);
      if (on) litIds.push(l.id);
    });
    handle?.setLitLanterns(litIds);
  }

  function applyLayers(): void {
    (Object.keys(state.layers) as DecorLayer[]).forEach((k) => handle?.setLayerVisible(k, state.layers[k]));
  }

  /** Full dispose + rebuild (night change path only), then re-apply layers + lit count. */
  function rebuild(): void {
    handle?.dispose();
    models.forEach((m) => disposeModel(m.group));
    models = [];
    handle = buildIslandDecor(scene, NIGHT);
    cfg.lanterns.forEach((l) => {
      const m = createLanternModel(false);
      m.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
      scene.add(m.group);
      models.push(m);
    });
    applyLit();
    applyLayers();
  }
  rebuild();

  createControlPanel(
    document.getElementById('panel') as HTMLElement, { night: NIGHT, lit: state.lit },
    (s) => {
      state.lit = s.lit;
      state.layers = { ...s.layers };
      if (s.night !== state.night) { rebuild(); return; } // hidden: demo is Night 1 only
      applyLit();
      applyLayers();
    },
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Sliding 1 s FPS average.
  const stamps: number[] = [];
  let last = performance.now();
  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    fpsEl.textContent = `${stamps.length} FPS`;
    handle?.update(dt);
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

main();
