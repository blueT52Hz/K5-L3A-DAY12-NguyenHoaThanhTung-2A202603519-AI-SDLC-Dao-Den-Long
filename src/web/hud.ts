import './hud.css';
import type { GameState } from '../core/types';
import { TUNING } from '../core/tuning';

const TOTAL_LANTERNS = TUNING.lantern_count_night1;
const CARRY_MAX = TUNING.carry_capacity;
const LOSS_REASON_DAWN = 'trời đã sáng';
const LOSS_REASON_HP = 'hết máu';

let els: Record<string, HTMLElement>;

/** Write textContent only when changed (avoids per-frame DOM churn). */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function initHud(root: HTMLElement, onRestart: () => void): void {
  root.innerHTML = `
    <div class="bar">
      <div class="chip" data-k="hp"></div><div class="chip" data-k="mote"></div>
      <div class="chip" data-k="lantern"></div><div class="chip" data-k="time"></div>
      <div class="chip" data-k="score"></div>
    </div>
    <div class="hint">WASD đi - Space nhảy - E nạp đèn - F tỏa sáng - kéo chuột hoặc phím mũi tên xoay camera - P/Esc tạm dừng</div>
    <div class="overlay" data-k="over"><h1 data-k="title"></h1><div class="final" data-k="final"></div>
      <button data-k="btn">Chơi lại (R)</button></div>`;
  els = {};
  root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => { els[e.dataset.k!] = e; });
  els.btn.addEventListener('click', onRestart);
}

export function updateHud(s: GameState): void {
  const secs = Math.max(0, Math.ceil(s.timeLeftS));
  const lit = s.lanterns.filter((l) => l.lit).length;
  setText(els.hp, `Máu ${'🏮'.repeat(Math.max(0, s.player.flames))}`);
  setText(els.mote, `Đom đóm ${s.player.carried}/${CARRY_MAX}`);
  setText(els.lantern, `Đèn ${lit}/${TOTAL_LANTERNS}`);
  setText(els.time, `Thời gian ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
  setText(els.score, `Điểm ${s.score}`);
  const over = s.status !== 'playing';
  els.over.classList.toggle('show', over);
  if (over) {
    const reason = s.player.flames <= 0 ? LOSS_REASON_HP : LOSS_REASON_DAWN;
    setText(els.title, s.status === 'won' ? 'Thắng!' : `Thua - ${reason}`);
    setText(els.final, `Điểm: ${s.score}`);
  }
}
