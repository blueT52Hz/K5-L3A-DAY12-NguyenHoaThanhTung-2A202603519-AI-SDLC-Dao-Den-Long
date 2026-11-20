import { TUNING } from '../core/tuning';

// Pause menu (state itself lives in the core: state.paused). Web shell only renders it.
const T = TUNING;

export interface PauseActions {
  onResume(): void;
  onRetry(): void;
  onSettings(): void;
  onMenu(): void;
}

export interface PauseOverlay { show(visible: boolean): void }

/** Mount pause menu: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu, plus a short controls list. */
export function initPause(root: HTMLElement, a: PauseActions): PauseOverlay {
  const el = document.createElement('div');
  el.className = 'overlay pause';
  el.innerHTML = `<div class="panel">
    <h1>Tạm dừng</h1>
    <button data-k="resume">Tiếp tục</button>
    <button data-k="retry">Chơi lại Đêm</button>
    <button data-k="settings">Cài đặt</button>
    <button data-k="menu">Về menu</button>
    <table>
      <tr><td>W A S D / Space</td><td>Di chuyển / nhảy</td></tr>
      <tr><td>Shift</td><td>Lướt (${T.dash_cooldown_s}s hồi chiêu)</td></tr>
      <tr><td>E</td><td>Nạp đèn (trong ${T.interact_radius}m)</td></tr>
      <tr><td>F</td><td>Tỏa sáng (${T.pulse_radius}m, tốn ${T.pulse_cost} đom đóm)</td></tr>
      <tr><td>Kéo chuột / mũi tên</td><td>Xoay camera</td></tr>
      <tr><td>P / Esc</td><td>Tạm dừng / tiếp tục</td></tr>
    </table></div>`;
  root.appendChild(el);
  const wire: Record<string, () => void> = { resume: a.onResume, retry: a.onRetry, settings: a.onSettings, menu: a.onMenu };
  for (const [k, fn] of Object.entries(wire)) el.querySelector(`[data-k="${k}"]`)!.addEventListener('click', fn);
  return { show: (v) => el.classList.toggle('show', v) };
}
