import * as THREE from 'three';
import { createGame } from '../core/create-game';
import { step } from '../core/step';
import type { GameState } from '../core/types';
import { startLoop } from './fixed-step-loop';
import { clearInput, consumeRestart, getCamYawDeg, initInput, readInput, updateYaw } from './keyboard-mouse-input';
import { updateCamera } from './camera-rig';
import { SceneSync } from './scene-sync';
import { initHud, updateHud } from './hud';
import { initPause, isPaused } from './pause-overlay';
import { stepFacing } from './player-facing';
import { createRenderer, detectQuality } from './render-quality';

const quality = detectQuality();
const renderer = createRenderer(quality);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

const sync = new SceneSync(scene, quality.pointLights);
let state: GameState;
let facingRad = 0;

function restart(): void {
  state = createGame(Date.now() % 2147483647); // web shell may use Date
  sync.reset(state);
  updateHud(state);
}

initInput(renderer.domElement);
initHud(document.getElementById('hud')!, restart);
initPause(document.getElementById('hud')!, {
  canPause: () => state.status === 'playing',
  onChange: () => clearInput(),
});
restart();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startLoop(
  () => {
    if (state.status === 'playing') step(state, readInput(getCamYawDeg()));
  },
  (dtS) => {
    if (!isPaused()) {
      if (consumeRestart() && state.status !== 'playing') restart();
      updateYaw(dtS);
      facingRad = stepFacing(facingRad, getCamYawDeg(), dtS);
    }
    sync.setPlayerFacing(facingRad);
    sync.sync(state);
    updateHud(state);
    updateCamera(camera, state.player.pos, getCamYawDeg());
    renderer.render(scene, camera);
  },
  isPaused,
);
