import { TUNING } from '../core/tuning';
import { getBindings, keyLabel } from './settings/key-bindings';

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
    <table data-k="keys"></table></div>`;
  root.appendChild(el);
  const keys = el.querySelector('[data-k="keys"]')!;
  /** Controls table from the current key bindings (re-rendered each time the menu opens, after any rebinding). */
  const renderKeys = (): void => {
    const b = getBindings();
    const L = (...a: Array<keyof typeof b>): string => a.map((x) => keyLabel(b[x])).join(' ');
    keys.innerHTML = `
      <tr><td>${L('up', 'left', 'down', 'right')} / ${L('jump')}</td><td>Di chuyển / nhảy</td></tr>
      <tr><td>${L('dash')}</td><td>Lướt (${T.dash_cooldown_s}s hồi chiêu)</td></tr>
      <tr><td>${L('interact')}</td><td>Nạp / thắp lại (${T.relight_cost} đom đóm) / châm dầu đèn (trong ${T.interact_radius}m)</td></tr>
      <tr><td>${L('pulse')}</td><td>Tỏa sáng (${T.pulse_radius}m, tốn ${T.pulse_cost} đom đóm)</td></tr>
      <tr><td>Kéo chuột / mũi tên</td><td>Xoay camera</td></tr>
      <tr><td>${L('pause')} / Esc</td><td>Tạm dừng / tiếp tục</td></tr>
      <tr><td>Mục tiêu</td><td>Giữ &ge; ${Math.round(T.win_ratio * 100)}% đèn sáng tới bình minh; đèn cạn dầu sẽ tắt</td></tr>`;
  };
  renderKeys();
  const wire: Record<string, () => void> = { resume: a.onResume, retry: a.onRetry, settings: a.onSettings, menu: a.onMenu };
  for (const [k, fn] of Object.entries(wire)) el.querySelector(`[data-k="${k}"]`)!.addEventListener('click', fn);
  return { show: (v) => { if (v && !el.classList.contains('show')) renderKeys(); el.classList.toggle('show', v); } };
}
