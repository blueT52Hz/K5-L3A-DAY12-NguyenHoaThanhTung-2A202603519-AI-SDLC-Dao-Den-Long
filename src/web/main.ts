import type { NightId } from '../core/types';
import { mountLanding } from './landing/landing-page';

// Entry point: show the landing page first. The 3D game (Three.js + core) is
// loaded lazily and only boots after the player presses "Bắt đầu chơi".
// `?play=1` skips the landing page (handy for screenshots / quick testing).
// `startNight` (from a landing level card) skips the in-game menu and opens that night's intro.
async function startGame(startNight?: NightId): Promise<void> {
  const { bootGame } = await import('./game-boot');
  bootGame(startNight);
}

const skipLanding = new URLSearchParams(window.location.search).get('play') === '1';
const landingRoot = document.getElementById('landing')!;

if (skipLanding) {
  landingRoot.remove();
  void startGame();
} else {
  mountLanding(landingRoot, (night) => {
    startGame(night).catch((err) => {
      console.error('[landing] failed to boot game', err);
      document.body.insertAdjacentHTML('beforeend',
        '<p style="color:#ffb35c;font:16px system-ui;padding:24px">Không tải được game. Hãy tải lại trang.</p>');
    });
  });
}
