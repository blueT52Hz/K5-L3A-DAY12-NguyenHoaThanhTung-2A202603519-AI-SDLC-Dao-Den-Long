// Landing page markup: "Chọn màn" level select. One card per night; clicking a card boots the game
// straight into that night's intro (the card carries data-start + data-start-night, see landing-page.ts).
// Names and durations come from the core night configs so the cards never drift from the game.
import type { NightId } from '../../core/types';
import { getNight } from '../../core/nights';
import { eyebrow } from './landing-ui-primitives';

/** One-line teaser per night (copy only, no gameplay numbers). */
const TEASERS: Record<NightId, string> = {
  1: 'Đảo tròn yên tĩnh - làm quen với đom đóm, đèn lồng và Bóng Mực.',
  2: 'Cầu tre, bục nhảy và Bóng Mực biết hút dầu từ đèn.',
  3: 'Đêm dài nhất - gió nổi từng cơn, dầu đèn cạn rất nhanh.',
};

const NIGHT_IDS: NightId[] = [1, 2, 3];

function levelCard(id: NightId): string {
  const night = getNight(id);
  const label = `Đêm ${id} - ${night.name}`;
  return `
    <button type="button" class="ln-level ln-level-${id}" data-start data-start-night="${id}" data-reveal
      aria-label="Chơi ${label}, ${night.durationS} giây">
      <span class="ln-level-glow" aria-hidden="true"></span>
      <span class="ln-level-kicker">Đêm ${id}</span>
      <span class="ln-level-title">${label}</span>
      <span class="ln-level-teaser">${TEASERS[id]}</span>
      <span class="ln-level-meta"><span>${night.durationS} giây</span><span class="ln-level-go">Chơi màn này</span></span>
    </button>`;
}

/** "Chọn màn" section: heading + 3 night cards. */
export function levelSelectMarkup(): string {
  return `
  <section class="ln-section ln-levels" id="chon-man">
    ${eyebrow('Chọn màn')}
    <h2 class="ln-h2" data-reveal>Chọn đêm bạn muốn giữ đèn</h2>
    <div class="ln-level-grid">${NIGHT_IDS.map(levelCard).join('')}</div>
    <div class="ln-lb-row" id="bang-xep-hang" data-reveal>
      <button type="button" class="ln-btn ln-btn-ghost ln-btn-md" data-leaderboard><span class="ln-btn-label">Bảng xếp hạng</span></button>
    </div>
  </section>`;
}
