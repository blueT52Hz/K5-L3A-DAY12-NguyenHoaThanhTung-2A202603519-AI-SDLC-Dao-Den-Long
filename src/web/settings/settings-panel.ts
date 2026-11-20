import { clampSettings, loadSettings, saveSettings, type Settings } from './settings-store';

export interface SettingsPanel { open(): void; close(): void; get(): Settings }

/** Modal with volume + mouse sensitivity sliders. Persists on every change. */
export function createSettingsPanel(root: HTMLElement, onChange: (s: Settings) => void): SettingsPanel {
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
    <button data-k="close">Đóng</button></div>`;
  root.appendChild(el);
  const vol = el.querySelector<HTMLInputElement>('[data-k="vol"]')!;
  const sens = el.querySelector<HTMLInputElement>('[data-k="sens"]')!;
  const cb = el.querySelector<HTMLInputElement>('[data-k="cb"]')!;
  const vo = el.querySelector<HTMLElement>('[data-k="vo"]')!;
  const so = el.querySelector<HTMLElement>('[data-k="so"]')!;

  const paint = (): void => {
    vol.value = String(current.volume);
    sens.value = String(current.mouseSensitivity);
    cb.checked = current.colorblind;
    vo.textContent = `${Math.round(current.volume)}`;
    so.textContent = current.mouseSensitivity.toFixed(1);
  };
  const commit = (): void => {
    current = clampSettings({ volume: Number(vol.value), mouseSensitivity: Number(sens.value), colorblind: cb.checked });
    paint();
    saveSettings(current);
    onChange(current);
  };
  vol.addEventListener('input', commit);
  sens.addEventListener('input', commit);
  cb.addEventListener('change', commit);
  el.querySelector('[data-k="close"]')!.addEventListener('click', () => el.classList.remove('show'));
  paint();
  onChange(current);
  return {
    open: () => { paint(); el.classList.add('show'); },
    close: () => el.classList.remove('show'),
    get: () => current,
  };
}
