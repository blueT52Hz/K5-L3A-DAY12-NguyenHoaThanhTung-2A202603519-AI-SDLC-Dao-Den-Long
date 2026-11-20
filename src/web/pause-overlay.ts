import { TUNING } from '../core/tuning';

// Pause state + overlay (instructions, controls, scoring). Web shell only; core is untouched.
const T = TUNING;
let paused = false;
let canPause: () => boolean = () => true;
let overlay: HTMLElement;
let onChange: (paused: boolean) => void = () => {};

export function isPaused(): boolean {
  return paused;
}

export function setPaused(value: boolean): void {
  if (value && !canPause()) return; // never pause on the game-over screen
  if (paused === value) return;
  paused = value;
  overlay.classList.toggle('show', paused);
  onChange(paused);
}

export function togglePause(): void {
  setPaused(!paused);
}

/** Mount button + overlay into the HUD root and bind P / Esc and tab-visibility auto-pause. */
export function initPause(
  root: HTMLElement,
  opts: { canPause: () => boolean; onChange: (paused: boolean) => void },
): void {
  canPause = opts.canPause;
  onChange = opts.onChange;
  root.insertAdjacentHTML('beforeend', `
    <button class="pause-btn" data-k="pausebtn" title="Tạm dừng (P / Esc)">II Tạm dừng</button>
    <div class="overlay pause" data-k="pause"><div class="panel">
      <h1>Tạm dừng</h1>
      <p><b>Mục tiêu:</b> nhặt đom đóm (mang tối đa ${T.carry_capacity}), mỗi đèn cần ${T.lantern_cost}, thắp đủ
      ${T.lantern_count_night1} đèn trong ${Math.round(T.night1_duration_s / 60)} phút.</p>
      <p>Bóng Mực chạm vào: mất 1 máu và rơi ${Math.round(T.hit_drop_ratio * 100)}% số đom đóm đang mang.
      Bóng Mực không vào vùng quanh đèn đã sáng (${T.safe_radius}m).</p>
      <table>
        <tr><td>W A S D</td><td>Di chuyển</td></tr>
        <tr><td>Space</td><td>Nhảy</td></tr>
        <tr><td>E</td><td>Nạp đèn (trong ${T.interact_radius}m)</td></tr>
        <tr><td>F</td><td>Tỏa sáng (${T.pulse_radius}m, tốn ${T.pulse_cost} đom đóm)</td></tr>
        <tr><td>Kéo chuột / mũi tên</td><td>Xoay camera</td></tr>
        <tr><td>P / Esc</td><td>Tạm dừng / tiếp tục</td></tr>
        <tr><td>R</td><td>Chơi lại</td></tr>
      </table>
      <p class="score">Điểm: +${T.score.per_mote} mỗi đom đóm, +${T.score.per_lantern} mỗi đèn,
      +${T.score.per_stun} mỗi lần choáng Bóng Mực; thắng thưởng +${T.score.per_second_left}/giây còn lại và
      +${T.score.per_flame_left}/máu còn lại.</p>
      <button data-k="resume">Tiếp tục (P)</button>
    </div></div>`);
  overlay = root.querySelector<HTMLElement>('[data-k="pause"]')!;
  root.querySelector('[data-k="pausebtn"]')!.addEventListener('click', togglePause);
  root.querySelector('[data-k="resume"]')!.addEventListener('click', () => setPaused(false));
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
}
