// Benchmark page (`?bench=<seed>&duration=<s>`): standard bench scene with full effects, no input, orbiting
// camera, 3 s warmup, then rAF frame times for `duration` s. Result -> window.__benchResult (read by scripts/bench.mjs).
import * as THREE from 'three';
import { createBenchGame } from '../../core/bench-scene';
import { step } from '../../core/step';
import type { InputFrame } from '../../core/types';
import { createRenderer } from '../render-quality';
import { SceneSync } from '../scene-sync';
import { placeBenchCamera } from './bench-camera-orbit';
import { computeBenchStats, type BenchStats } from './bench-frame-stats';

const WARMUP_MS = 3000;
const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;
const IDLE: InputFrame = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };

export interface BenchResult extends BenchStats {
  renderer: string;
  /** performance.now() / epoch ms (performance.timeOrigin based) when the first bench frame was rendered. */
  first_frame_ms: number;
  first_frame_epoch_ms: number;
  duration_s: number;
  seed: number;
}

declare global {
  interface Window { __benchPhase?: 'warmup' | 'measure' | 'done'; __benchResult?: BenchResult }
}

function rendererInfo(renderer: THREE.WebGLRenderer): string {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? 'unknown');
  const api = renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1';
  return `three.js r${THREE.REVISION} ${api} (Chrome) - ${gpu}`;
}

export function runBench(seed: number, durationS: number): void {
  // Full quality like real play on a GPU: antialias + PointLights; CPU mode is never forced here.
  const renderer = createRenderer({ cpu: false, antialias: true, pixelRatioCap: 2, pointLights: true });
  // The HUD stylesheet is not loaded on this page: make the canvas fill the viewport exactly (no margin/scrollbars).
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#000';
  renderer.domElement.style.display = 'block';
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  const sync = new SceneSync(scene, true);
  const state = createBenchGame(seed);
  sync.reset(state);
  sync.setPlayerFacing(0);

  const dts: number[] = [];
  let measured = 0;
  let start = -1;
  let last = 0;
  let acc = 0;
  let firstFrameMs = 0;
  window.__benchPhase = 'warmup';

  const frame = (now: number): void => {
    if (start < 0) { start = now; last = now; }
    const dt = now - last;
    last = now;
    const elapsed = now - start;
    if (elapsed > WARMUP_MS && window.__benchPhase === 'warmup') window.__benchPhase = 'measure';
    else if (window.__benchPhase === 'measure') { dts.push(dt); measured += dt; }

    acc += Math.min(dt, 250);
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) { step(state, IDLE); acc -= STEP_MS; steps++; }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0;
    sync.sync(state);
    sync.animate(dt / 1000);
    placeBenchCamera(camera, elapsed / 1000);
    renderer.render(scene, camera);
    if (firstFrameMs === 0) firstFrameMs = performance.now();

    if (window.__benchPhase === 'measure' && measured >= durationS * 1000) {
      window.__benchPhase = 'done';
      window.__benchResult = {
        ...computeBenchStats(dts), renderer: rendererInfo(renderer), first_frame_ms: Math.round(firstFrameMs),
        first_frame_epoch_ms: Math.round(performance.timeOrigin + firstFrameMs), duration_s: durationS, seed,
      };
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
