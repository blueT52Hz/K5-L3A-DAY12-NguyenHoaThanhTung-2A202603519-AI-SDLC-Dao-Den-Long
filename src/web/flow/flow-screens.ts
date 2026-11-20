// DOM screens for the flow: main menu, night intro, result, dawn.
import type { NightId } from '../../core/types';
import { getNight } from '../../core/nights';
import { OLD_MAN_LINES } from './night-intro-text';

export interface FlowScreenActions {
  onPlay(): void;
  onSettings(): void;
  onBeginNight(): void;
  onContinue(): void;
  onRetry(): void;
  onMenu(): void;
}

export interface FlowScreens {
  menu(): void;
  intro(night: NightId): void;
  result(night: NightId, won: boolean, nightScore: number, total: number, reason: string): void;
  dawn(total: number): void;
  hide(): void;
}

export function createFlowScreens(root: HTMLElement, a: FlowScreenActions): FlowScreens {
  const el = document.createElement('div');
  el.className = 'overlay flow-screen';
  root.appendChild(el);

  const show = (html: string, wire: Record<string, () => void>): void => {
    el.innerHTML = `<div class="panel">${html}</div>`;
    el.classList.add('show');
    for (const [k, fn] of Object.entries(wire)) el.querySelector(`[data-k="${k}"]`)?.addEventListener('click', fn);
  };

  return {
    menu: () => show(
      `<h1>Đảo Đèn Lồng</h1><p class="sub">Ba đêm, ba hòn đảo, một ngọn lửa nhỏ.</p>
       <button data-k="play">Chơi</button><button data-k="set">Cài đặt</button>`,
      { play: a.onPlay, set: a.onSettings }),
    intro: (night) => show(
      `<div class="kicker">Đêm ${night}</div><h1>${getNight(night).name}</h1>
       <p class="quote">"${OLD_MAN_LINES[night]}"</p><p class="sub">- Ông Đăng</p>
       <button data-k="go">Bắt đầu</button>`,
      { go: a.onBeginNight }),
    result: (night, won, nightScore, total, reason) => show(
      won
        ? `<div class="kicker">Đêm ${night}</div><h1>Thắng!</h1>
           <p class="final">Điểm đêm: ${nightScore}</p><p class="final">Tổng: ${total}</p>
           <button data-k="next">${night === 3 ? 'Đón bình minh' : `Sang Đêm ${night + 1}`}</button>`
        : `<div class="kicker">Đêm ${night}</div><h1>Thua - ${reason}</h1>
           <p class="final">Điểm đêm: ${nightScore}</p><p class="final">Tổng: ${total}</p>
           <button data-k="retry">Chơi lại Đêm ${night}</button><button data-k="menu">Về menu</button>`,
      { next: a.onContinue, retry: a.onRetry, menu: a.onMenu }),
    dawn: (total) => show(
      `<h1>Bình Minh</h1><p class="quote">Ba ngọn đèn cuối đã sáng, đảo thoát khỏi bóng đêm.</p>
       <p class="final">Tổng điểm: ${total}</p><button data-k="menu">Về menu</button>`,
      { menu: a.onMenu }),
    hide: () => { el.classList.remove('show'); el.innerHTML = ''; },
  };
}
