import * as THREE from 'three';
import { createGame } from '../core/create-game';
import { step } from '../core/step';
import type { GameState, NightId } from '../core/types';
import { startLoop } from './fixed-step-loop';
import {
  clearInput, consumeRestart, getCamYawDeg, initInput, readInput, requestPause, setInputLocked,
  setMouseSensitivity, updateYaw,
} from './keyboard-mouse-input';
import { updateCamera } from './camera-rig';
import { SceneSync } from './scene-sync';
import { initHud, resetHud, setHudVisible, updateHud } from './hud';
import { initPause } from './pause-overlay';
import { stepFacing } from './player-facing';
import { createRenderer, detectQuality } from './render-quality';
import { GameFlow } from './flow/game-flow-state-machine';
import { createFlowScreens } from './flow/flow-screens';
import { createSettingsPanel } from './settings/settings-panel';
import { AudioEngine } from './audio/audio-engine';
import { soundForEvent } from './audio/event-to-sound';

let booted = false;
const RESULT_DELAY_S = 1.2;

/** Create renderer, scene, HUD and flow; start the fixed-step loop. Called once after landing "Bắt đầu chơi". */
export function bootGame(): void {
  if (booted) return;
  booted = true;

  const quality = detectQuality();
  const renderer = createRenderer(quality);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  const sync = new SceneSync(scene, quality.pointLights);
  const audio = new AudioEngine();
  audio.init();

  const flow = new GameFlow();
  let state: GameState = createGame(Date.now() % 2147483647, {}, 1);
  let facingRad = 0;
  let resultTimer = 0;
  let lastCountdown = -1;
  let lastWindWarn = false;
  let prevJump = false;
  let hiddenPauseSent = false;

  /** Fresh night: new core state (web shell may use Date for the seed). */
  function loadNight(night: NightId): void {
    state = createGame(Date.now() % 2147483647, {}, night);
    sync.reset(state);
    resetHud(state);
    clearInput();
    lastCountdown = -1; lastWindWarn = false; prevJump = false; resultTimer = 0;
  }

  const hudRoot = document.getElementById('hud')!;
  initInput(renderer.domElement);
  initHud(hudRoot, () => requestPause());
  const settings = createSettingsPanel(hudRoot, (s) => { audio.setVolume(s.volume); setMouseSensitivity(s.mouseSensitivity); });

  const enterPhase = (): void => {
    const ph = flow.phase;
    if (ph.kind === 'playing') { loadNight(ph.night); screens.hide(); audio.setMusic(true); }
    else if (ph.kind !== 'result') audio.setMusic(false);
    if (ph.kind === 'menu') screens.menu();
    else if (ph.kind === 'intro') screens.intro(ph.night);
    else if (ph.kind === 'dawn') screens.dawn(flow.total);
    else if (ph.kind === 'result') {
      audio.setMusic(false);
      const reason = state.player.flames <= 0 ? 'hết máu' : 'trời đã sáng';
      screens.result(ph.night, ph.won, ph.nightScore, flow.total, reason);
    }
    setHudVisible(ph.kind === 'playing');
  };
  const screens = createFlowScreens(hudRoot, {
    onPlay: () => { flow.startRun(); enterPhase(); },
    onSettings: () => settings.open(),
    onBeginNight: () => { flow.beginNight(); enterPhase(); },
    onContinue: () => { flow.continueFromResult(); enterPhase(); },
    onRetry: () => { flow.continueFromResult(); enterPhase(); },
    onMenu: () => { flow.toMenu(); pause.show(false); enterPhase(); },
  });
  const pause = initPause(hudRoot, {
    onResume: () => requestPause(),
    onRetry: () => { flow.retryNight(); pause.show(false); enterPhase(); },
    onSettings: () => settings.open(),
    onMenu: () => { flow.toMenu(); pause.show(false); enterPhase(); },
  });
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat && flow.phase.kind === 'playing') {
      if (document.querySelector('.settings-modal.show')) settings.close();
      else requestPause();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && flow.phase.kind === 'playing' && !state.paused && !hiddenPauseSent) {
      requestPause(); hiddenPauseSent = true;
    }
    if (!document.hidden) hiddenPauseSent = false;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  loadNight(1);
  // Dev-only: ?night=2|3 starts at that night's intro (screenshots / quick testing).
  const devNight = Number(new URLSearchParams(window.location.search).get('night'));
  if (devNight === 2 || devNight === 3) flow.startAtNight(devNight as NightId);
  enterPhase();

  const update = (): void => {
    if (flow.phase.kind !== 'playing' || state.status !== 'playing') return;
    const input = readInput(getCamYawDeg());
    const jumpEdge = input.jump && !prevJump && state.player.grounded && !state.paused;
    prevJump = input.jump;
    const events = step(state, input);
    if (jumpEdge) audio.play('jump');
    for (const e of events) { const id = soundForEvent(e); if (id) audio.play(id); }
    const sec = Math.ceil(state.timeLeftS);
    if (!state.paused && state.timeLeftS <= 10 && sec !== lastCountdown && state.status === 'playing') { lastCountdown = sec; audio.play('tick'); }
    if (state.wind.warning && !lastWindWarn) audio.play('wind');
    lastWindWarn = state.wind.warning;
  };

  startLoop(update, (dtS) => {
    const playing = flow.phase.kind === 'playing';
    setInputLocked(!playing || state.paused || state.status !== 'playing');
    pause.show(playing && state.paused && state.status === 'playing');
    if (playing && !state.paused) {
      if (consumeRestart() && state.status === 'playing') { flow.retryNight(); enterPhase(); }
      updateYaw(dtS);
      facingRad = stepFacing(facingRad, getCamYawDeg(), dtS);
    }
    if (playing && state.status !== 'playing') {
      resultTimer += dtS;
      if (resultTimer >= RESULT_DELAY_S) { flow.finishNight(state.status === 'won', state.score); enterPhase(); }
    }
    sync.setPlayerFacing(facingRad);
    sync.sync(state);
    sync.animate(dtS);
    updateHud(state, camera);
    updateCamera(camera, state.player.pos, getCamYawDeg());
    renderer.render(scene, camera);
  });
}
