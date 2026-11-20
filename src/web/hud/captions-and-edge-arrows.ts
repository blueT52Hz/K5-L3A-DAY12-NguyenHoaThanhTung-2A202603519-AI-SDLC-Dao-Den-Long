// Visual captions (subtitle-style) + edge-of-screen arrow toward a freshly spawned Bóng Mực.
// Everything is derived from GameState each frame (no audio-only cues): shade ids, wind.warning, timeLeftS, low fuel.
import * as THREE from 'three';
import type { GameState } from '../../core/types';
import { TICK_RATE } from '../../core/constants';
import { isLowFuel } from '../../core/systems/lantern-fuel';
import { warnText } from '../colorblind-mode';
import { edgeArrow } from './lantern-pointer';

const SHADE_CAPTION_S = 5;
const LAST_SECONDS_CAPTION_S = 3;
const LAST_SECONDS = 10;

export interface Captions { reset(s: GameState): void; update(s: GameState, camera: THREE.Camera): void }

/** `box` holds caption lines (aria-live); `arrow` is the shade pointer element. */
export function createCaptions(box: HTMLElement, arrow: HTMLElement): Captions {
  const seenShades = new Set<string>();
  let trackedShade: string | null = null;
  let shadeUntilTick = 0;
  let lastSecondsUntilTick = -1;
  let lastSecondsShown = false;
  const lines = new Map<string, HTMLElement>();

  /** Show/hide one caption line, keyed so DOM only changes on transitions. */
  const setLine = (key: string, text: string | null): void => {
    const cur = lines.get(key);
    if (text === null) { if (cur) { cur.remove(); lines.delete(key); } return; }
    if (cur) { if (cur.textContent !== text) cur.textContent = text; return; }
    const d = document.createElement('div');
    d.className = 'caption-line';
    d.textContent = text;
    box.appendChild(d);
    lines.set(key, d);
  };

  const reset = (s: GameState): void => {
    seenShades.clear();
    for (const sh of s.shades) seenShades.add(sh.id); // pre-existing shades do not announce themselves
    trackedShade = null; shadeUntilTick = 0; lastSecondsUntilTick = -1; lastSecondsShown = false;
    for (const k of [...lines.keys()]) setLine(k, null);
    arrow.style.display = 'none';
  };

  const update = (s: GameState, camera: THREE.Camera): void => {
    for (const sh of s.shades) {
      if (seenShades.has(sh.id)) continue;
      seenShades.add(sh.id);
      trackedShade = sh.id;
      shadeUntilTick = s.tick + SHADE_CAPTION_S * TICK_RATE;
    }
    const shadeOn = s.tick <= shadeUntilTick;
    setLine('shade', shadeOn ? warnText('Bóng Mực xuất hiện') : null);

    const sh = shadeOn ? s.shades.find((x) => x.id === trackedShade) : undefined;
    const a = sh ? edgeArrow(camera, sh.pos, window.innerWidth, window.innerHeight) : null;
    arrow.style.display = a?.visible ? '' : 'none';
    if (a?.visible) arrow.style.transform = `translate(${a.x}px, ${a.y}px) rotate(${-a.angleRad}rad)`;

    setLine('wind', s.wind.warning && !s.wind.active ? warnText('Gió sắp thổi') : null);

    const last = s.timeLeftS <= LAST_SECONDS && s.timeLeftS > 0;
    if (last && !lastSecondsShown) { lastSecondsShown = true; lastSecondsUntilTick = s.tick + LAST_SECONDS_CAPTION_S * TICK_RATE; }
    if (!last) lastSecondsShown = false;
    setLine('last', last && s.tick <= lastSecondsUntilTick ? warnText('10 giây cuối') : null);

    const low = s.lanterns.filter(isLowFuel).map((l) => `Đèn ${l.id}`);
    setLine('fuel', low.length ? warnText(`${low.join(', ')} sắp cạn dầu`) : null);
  };

  return { reset, update };
}
