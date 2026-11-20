import './hud.css';
import type { GameState } from '../core/types';

const TOTAL_LANTERNS = 5;
const CARRY_MAX = 10;
const LOSS_REASON_DAWN = 'trời đã sáng';
const LOSS_REASON_HP = 'hết máu';

let els: Record<string, HTMLElement>;

export function initHud(root: HTMLElement, onRestart: () => void): void {
  root.innerHTML = `
    <div class="bar">
      <div class="chip" data-k="hp"></div><div class="chip" data-k="mote"></div>
      <div class="chip" data-k="lantern"></div><div class="chip" data-k="time"></div>
      <div class="chip" data-k="score"></div>
    </div>
    <div class="hint">WASD đi - Space nhảy - E nạp đèn - F tỏa sáng - kéo chuột hoặc phím mũi tên xoay camera</div>
    <div class="overlay" data-k="over"><h1 data-k="title"></h1><div class="final" data-k="final"></div>
      <button data-k="btn">Chơi lại (R)</button></div>`;
  els = {};
  root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => { els[e.dataset.k!] = e; });
  els.btn.addEventListener('click', onRestart);
}

export function updateHud(s: GameState): void {
  const secs = Math.max(0, Math.ceil(s.timeLeftS));
  const lit = s.lanterns.filter((l) => l.lit).length;
  els.hp.textContent = `Máu ${'🏮'.repeat(Math.max(0, s.player.flames))}`;
  els.mote.textContent = `Đom đóm ${s.player.carried}/${CARRY_MAX}`;
  els.lantern.textContent = `Đèn ${lit}/${TOTAL_LANTERNS}`;
  els.time.textContent = `Thời gian ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  els.score.textContent = `Điểm ${s.score}`;
  const over = s.status !== 'playing';
  els.over.classList.toggle('show', over);
  if (over) {
    const reason = s.player.flames <= 0 ? LOSS_REASON_HP : LOSS_REASON_DAWN;
    els.title.textContent = s.status === 'won' ? 'Thắng!' : `Thua - ${reason}`;
    els.final.textContent = `Điểm: ${s.score}`;
  }
}
