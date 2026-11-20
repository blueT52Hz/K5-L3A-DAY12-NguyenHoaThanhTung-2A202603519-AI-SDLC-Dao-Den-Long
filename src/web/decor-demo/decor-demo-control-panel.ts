import type { DecorLayer } from '../decor';
import type { DemoNightId } from './parse-decor-demo-query';
import { getNight } from '../../core/nights';

export interface DemoState { night: DemoNightId; lit: number; layers: Record<DecorLayer, boolean>; character: boolean }

const LAYER_LABELS: Record<DecorLayer, string> = {
  terrain: 'Địa hình', props: 'Vật trang trí', atmosphere: 'Khí quyển', glow: 'Vòng sáng đèn',
};

/** Night buttons: every night has terrain, props, atmosphere and a walker path. */
const SHOW_NIGHT_BUTTONS = true;

export function createControlPanel(
  root: HTMLElement, init: { night: DemoNightId; lit: number },
  onChange: (s: DemoState) => void,
): void {
  const maxLit = (n: DemoNightId): number => getNight(n).lanterns.length;
  const state: DemoState = {
    night: init.night, lit: init.lit,
    layers: { terrain: true, props: true, atmosphere: true, glow: true }, character: true,
  };
  root.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = 'Demo trang trí đảo';
  root.append(title);

  const nightRow = document.createElement('div');
  nightRow.hidden = !SHOW_NIGHT_BUTTONS;
  const slider = document.createElement('input');
  const litLabel = document.createElement('label');
  const refreshSlider = (): void => {
    slider.max = String(maxLit(state.night));
    slider.value = String(Math.min(state.lit, Number(slider.max)));
    litLabel.firstChild!.textContent = `Đèn sáng: ${slider.value} `;
  };
  const buttons: HTMLButtonElement[] = [];
  const markActive = (): void => buttons.forEach((b, i) => { b.style.fontWeight = i + 1 === state.night ? 'bold' : 'normal'; });
  ([1, 2, 3] as DemoNightId[]).forEach((n) => {
    const b = document.createElement('button');
    b.textContent = `Đêm ${n}`;
    b.onclick = () => {
      if (state.night === n) return;
      state.night = n; state.lit = Math.min(state.lit, maxLit(n));
      refreshSlider(); markActive(); onChange(state);
    };
    buttons.push(b);
    nightRow.append(b);
  });
  markActive();
  root.append(nightRow);

  slider.type = 'range'; slider.min = '0'; slider.step = '1';
  litLabel.append(document.createTextNode(''), slider);
  slider.oninput = () => { state.lit = Number(slider.value); refreshSlider(); onChange(state); };
  root.append(litLabel);
  refreshSlider();

  (Object.keys(LAYER_LABELS) as DecorLayer[]).forEach((layer) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = true;
    cb.onchange = () => { state.layers[layer] = cb.checked; onChange(state); };
    label.append(cb, ` ${LAYER_LABELS[layer]}`);
    root.append(label);
  });

  const charLabel = document.createElement('label');
  const charCb = document.createElement('input');
  charCb.type = 'checkbox'; charCb.checked = state.character;
  charCb.onchange = () => { state.character = charCb.checked; onChange(state); };
  charLabel.append(charCb, ' Nhân vật');
  root.append(charLabel);
}
