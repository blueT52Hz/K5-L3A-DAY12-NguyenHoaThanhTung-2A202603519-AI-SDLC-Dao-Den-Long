import './hud.css';
import * as THREE from 'three';
import type { GameState } from '../core/types';
import { TUNING } from '../core/tuning';
import { playerCapacity } from '../core/systems/player-capacity';
import { isLowFuel } from '../core/systems/lantern-fuel';
import { warnText } from './colorblind-mode';
import { TICK_RATE } from '../core/constants';
import { HUD_MARKUP, cooldownFraction, formatClock, interactPrompt, isClockDanger } from './hud/hud-layout';
import { edgeArrow, nearestNeedyLantern } from './hud/lantern-pointer';

let els: Record<string, HTMLElement> = {};
let maxFlames = 3;
let slotCount = -1;
let root: HTMLElement;

/** Write textContent only when changed (avoids per-frame DOM churn). */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/** Mount the HUD; `onPauseClick` is wired to the top-right pause button. */
export function initHud(hudRoot: HTMLElement, onPauseClick: () => void): void {
  root = hudRoot;
  root.insertAdjacentHTML('afterbegin', `<div class="hud-game" data-k="game">${HUD_MARKUP}</div>`);
  els = {};
  root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => { els[e.dataset.k!] = e; });
  els.pausebtn.addEventListener('click', onPauseClick);
}

export function setHudVisible(v: boolean): void {
  els.game.style.display = v ? '' : 'none';
}

export function resetHud(s: GameState): void {
  slotCount = -1;
  maxFlames = Math.max(s.player.flames, 1);
}

export function updateHud(s: GameState, camera: THREE.Camera): void {
  const p = s.player;
  maxFlames = Math.max(maxFlames, p.flames);
  setText(els.flames, '🔥'.repeat(Math.max(0, p.flames)) + '·'.repeat(maxFlames - Math.max(0, p.flames)));
  const danger = isClockDanger(s.timeLeftS);
  setText(els.clock, danger ? warnText(formatClock(s.timeLeftS)) : formatClock(s.timeLeftS));
  els.clock.classList.toggle('danger', danger);
  const lit = s.lanterns.filter((l) => l.lit).length;
  const need = Math.ceil(TUNING.win_ratio * s.lanterns.length);
  setText(els.lanterns, `Đèn sáng ${lit}/${s.lanterns.length} (cần ${need})`);
  const low = s.lanterns.some(isLowFuel);
  setText(els.warn, low ? warnText('Đèn sắp cạn dầu!') : '');
  setText(els.score, `Điểm ${s.score}`);
  const cap = playerCapacity(s);
  if (cap !== slotCount) { slotCount = cap; els.motes.innerHTML = '<i></i>'.repeat(cap) + '<em></em>'; }
  const slots = els.motes.children;
  for (let i = 0; i < cap; i++) slots[i].classList.toggle('on', i < p.carried);
  setText(slots[cap] as HTMLElement, `${p.carried} / ${cap}`);

  setCooldown(els.dash, cooldownFraction(p.dashCooldownTicks, TUNING.dash_cooldown_s));
  setCooldown(els.pulse, cooldownFraction(p.pulseCooldownTicks, TUNING.pulse_cooldown_s));

  const near = nearestNeedyLantern(s.lanterns, p.pos);
  const inRange = near !== null && Math.hypot(near.pos[0] - p.pos[0], near.pos[2] - p.pos[2]) <= TUNING.interact_radius;
  setText(els.prompt, inRange && near ? interactPrompt(p.carried, near) : '');
  els.prompt.style.display = inRange ? '' : 'none';

  const arrow = near ? edgeArrow(camera, near.pos, window.innerWidth, window.innerHeight) : null;
  els.arrow.style.display = arrow?.visible ? '' : 'none';
  if (arrow?.visible) {
    els.arrow.style.transform = `translate(${arrow.x}px, ${arrow.y}px) rotate(${-arrow.angleRad}rad)`;
  }

  const status: string[] = [];
  if (p.charmTicks > 0) status.push(`Bùa Gió ${Math.ceil(p.charmTicks / TICK_RATE)}s`);
  if (s.wind.active) status.push('Gió đang thổi!');
  else if (s.wind.warning) status.push('Cảnh báo: gió sắp nổi');
  setText(els.status, status.join(' - '));
}

function setCooldown(el: HTMLElement, frac: number): void {
  el.style.setProperty('--cd', `${(frac * 360).toFixed(0)}deg`);
  el.classList.toggle('ready', frac <= 0);
}
