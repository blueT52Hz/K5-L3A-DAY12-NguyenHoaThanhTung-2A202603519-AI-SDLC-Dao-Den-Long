import type { NightId } from '../../core/types';
import { getNight } from '../../core/nights';
import { createKeyBindingsEditor } from './key-bindings-editor';
import { findConflicts, setBindings } from './key-bindings';
import { applyAccessibility } from './accessibility-flags';
import { clampSettings, loadSettings, saveSettings, type Settings } from './settings-store';

export interface SettingsPanel { open(): void; close(): void; get(): Settings }

const NIGHT_OPTIONS = ([1, 2, 3] as NightId[])
  .map((n) => `<option value="${n}">Đêm ${n} - ${getNight(n).name}</option>`).join('');

/**
 * Modal with volume + mouse sensitivity sliders (persisted on every change) and a level selector.
 * "Chuyển màn" calls onSwitchNight with the chosen night; the level choice itself is never persisted.
 */
export function createSettingsPanel(
  root: HTMLElement, onChange: (s: Settings) => void, onSwitchNight: (night: NightId) => void,
): SettingsPanel {
  let current = loadSettings();
  const el = document.createElement('div');
  el.className = 'overlay settings-modal';
  el.innerHTML = `<div class="panel">
    <h1>Cài đặt</h1>
    <label class="set-row">Âm lượng <output data-k="vo"></output>
      <input type="range" min="0" max="100" step="1" data-k="vol"></label>
    <label class="set-row">Độ nhạy chuột <output data-k="so"></output>
      <input type="range" min="0.2" max="3" step="0.1" data-k="sens"></label>
    <label class="set-row"><span><input type="checkbox" data-k="cb"> Bảng màu dễ phân biệt</span></label>
    <label class="set-row"><span><input type="checkbox" data-k="rm"> Giảm chuyển động (tắt rung, chớp)</span></label>
    <label class="set-row"><span><input type="checkbox" data-k="lt"> Chữ lớn (x1.25)</span></label>
    <div data-k="binds"></div>
    <label class="set-row">Chọn màn <select data-k="lvl">${NIGHT_OPTIONS}</select></label>
    <button data-k="switch">Chuyển màn</button>
    <button data-k="close">Đóng</button></div>`;
  root.appendChild(el);
  const vol = el.querySelector<HTMLInputElement>('[data-k="vol"]')!;
  const sens = el.querySelector<HTMLInputElement>('[data-k="sens"]')!;
  const cb = el.querySelector<HTMLInputElement>('[data-k="cb"]')!;
  const rm = el.querySelector<HTMLInputElement>('[data-k="rm"]')!;
  const lt = el.querySelector<HTMLInputElement>('[data-k="lt"]')!;
  const vo = el.querySelector<HTMLElement>('[data-k="vo"]')!;
  const so = el.querySelector<HTMLElement>('[data-k="so"]')!;

  const paint = (): void => {
    vol.value = String(current.volume);
    sens.value = String(current.mouseSensitivity);
    cb.checked = current.colorblind;
    rm.checked = current.reducedMotion;
    lt.checked = current.largeText;
    editor.paint(current.bindings);
    vo.textContent = `${Math.round(current.volume)}`;
    so.textContent = current.mouseSensitivity.toFixed(1);
  };
  const commit = (bindings = current.bindings): void => {
    current = clampSettings({
      volume: Number(vol.value), mouseSensitivity: Number(sens.value), colorblind: cb.checked,
      bindings, reducedMotion: rm.checked, largeText: lt.checked,
    });
    paint();
    applyAccessibility(current);
    setBindings(current.bindings);
    saveSettings(current);
    onChange(current);
  };
  // Conflicting drafts are shown (red) but never applied or saved.
  const editor = createKeyBindingsEditor(current.bindings, (b) => { if (findConflicts(b).length === 0) commit(b); });
  el.querySelector('[data-k="binds"]')!.appendChild(editor.el);
  vol.addEventListener('input', () => commit());
  sens.addEventListener('input', () => commit());
  cb.addEventListener('change', () => commit());
  rm.addEventListener('change', () => commit());
  lt.addEventListener('change', () => commit());
  el.querySelector('[data-k="close"]')!.addEventListener('click', () => el.classList.remove('show'));
  const lvl = el.querySelector<HTMLSelectElement>('[data-k="lvl"]')!;
  el.querySelector('[data-k="switch"]')!.addEventListener('click', () => {
    const n = Number(lvl.value);
    if (n === 1 || n === 2 || n === 3) onSwitchNight(n);
  });
  paint();
  applyAccessibility(current);
  setBindings(current.bindings);
  onChange(current);
  return {
    open: () => { paint(); el.classList.add('show'); },
    close: () => el.classList.remove('show'),
    get: () => current,
  };
}
