import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getNight } from '../../core/nights';
import { buildIslandDecor, type DecorLayer, type IslandDecorHandle } from '../decor';
import { createLanternModel } from '../models/lantern-model';
import { createControlPanel, type DemoState } from './decor-demo-control-panel';
import { parseDecorDemoQuery } from './parse-decor-demo-query';
import { createDemoBloomComposer } from './decor-demo-bloom-composer';
import { applyCameraPreset } from './decor-demo-camera-presets';
import { createDemoWalkingCharacter, type DemoWalkingCharacter } from './decor-demo-walking-character';

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

  const search = window.location.search;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  const composer = createDemoBloomComposer(renderer, scene, camera);
  const useBloom = new URLSearchParams(search).get('bloom') !== '0'; // ?bloom=0 for A/B perf checks
  const follow = new URLSearchParams(search).get('cam') === 'follow'; // ?cam=follow: chase-cam on the character
  const followOffset = new THREE.Vector3(4.5, 3.2, 6.5);

  const query = parseDecorDemoQuery(search);
  const state: DemoState = {
    night: query.night, lit: query.lit,
    layers: { terrain: true, props: true, atmosphere: true, glow: true }, character: true,
  };
  let builtNight = state.night;

  let handle: IslandDecorHandle | null = null;
  let models: Array<{ group: THREE.Group; setLit(lit: boolean): void }> = [];
  let walker: DemoWalkingCharacter | null = null;

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
    getNight(builtNight).lanterns.forEach((l, i) => {
      const on = i < state.lit;
      models[i]?.setLit(on);
      if (on) litIds.push(l.id);
    });
    handle?.setLitLanterns(litIds);
  }

  function applyLayers(): void {
    (Object.keys(state.layers) as DecorLayer[]).forEach((k) => handle?.setLayerVisible(k, state.layers[k]));
    if (walker) walker.group.visible = state.character;
  }

  /** Full dispose + rebuild for state.night: decor, lantern models, walking character, camera framing. */
  function rebuild(): void {
    handle?.dispose();
    models.forEach((m) => disposeModel(m.group));
    models = [];
    walker?.dispose();
    builtNight = state.night;
    const cfg = getNight(builtNight);
    state.lit = Math.min(state.lit, cfg.lanterns.length);
    handle = buildIslandDecor(scene, builtNight);
    cfg.lanterns.forEach((l) => {
      const m = createLanternModel(false);
      m.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
      scene.add(m.group);
      models.push(m);
    });
    walker = createDemoWalkingCharacter(scene, cfg);
    applyCameraPreset(search, builtNight, camera, controls.target);
    controls.update();
    applyLit();
    applyLayers();
  }
  rebuild();

  createControlPanel(
    document.getElementById('panel') as HTMLElement, { night: state.night, lit: state.lit },
    (s) => {
      state.night = s.night;
      state.lit = s.lit;
      state.layers = { ...s.layers };
      state.character = s.character;
      if (state.night !== builtNight) { rebuild(); return; }
      applyLit();
      applyLayers();
    },
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // Sliding 1 s FPS average.
  const stamps: number[] = [];
  let last = performance.now();
  let shownFps = -1;
  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    if (stamps.length !== shownFps) { shownFps = stamps.length; fpsEl.textContent = `${shownFps} FPS`; }
    handle?.update(dt);
    if (walker && state.character) walker.update(dt);
    if (follow && walker) {
      controls.target.copy(walker.group.position).y += 1;
      camera.position.copy(controls.target).add(followOffset);
    }
    controls.update();
    if (useBloom) composer.render();
    else renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

main();
