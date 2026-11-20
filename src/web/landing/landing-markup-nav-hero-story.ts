// Landing page markup, part 1: fluid island nav + full-screen mobile menu, cinematic hero,
// keyword marquee, story text-reveal. Elements with [data-start] boot the game (landing-page.ts).
import { TUNING } from '../../core/tuning';
import { eyebrow, ghostLink, startButton } from './landing-ui-primitives';

const MINUTES = Math.round(TUNING.night1_duration_s / 60);

const NAV_LINKS: [string, string][] = [['#chon-man', 'Chọn màn'], ['#bang-xep-hang', 'Bảng xếp hạng'], ['#cach-choi', 'Cách chơi'], ['#dieu-khien', 'Điều khiển'], ['#luat-choi', 'Luật chơi']];

const MARQUEE_WORDS = ['Nhặt đom đóm', 'Thắp đèn lồng', 'Né Bóng Mực', 'Tỏa sáng', 'Về trước bình minh'];

const STORY =
  'Mỗi đêm, Bóng Mực tràn lên Đảo Bến và nuốt dần từng đốm sáng. Chỉ những con đom đóm còn sót lại ' +
  `mới đủ sức thắp ${TUNING.lantern_count_night1} ngọn đèn cổ, nhưng dầu đèn cạn dần: phải tiếp dầu để giữ đèn cháy. ` +
  'Nếu đến lúc trời hửng bạn còn sống và còn đủ đèn sáng, hòn đảo được cứu; nếu không, nó chìm trong bóng tối thêm một năm nữa.';

function marqueeTrack(): string {
  const items = MARQUEE_WORDS.map((w) => `<span>${w}</span><i aria-hidden="true"></i>`).join('');
  // Two identical halves so the CSS animation can loop seamlessly at -50%.
  return `<div class="ln-marquee-track">${items}${items}</div>`;
}

function storyWords(): string {
  return STORY.split(' ').map((w) => `<span class="ln-word">${w}</span>`).join(' ');
}

function navMarkup(): string {
  const links = NAV_LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  const menuLinks = NAV_LINKS
    .map(([href, label], i) => `<a href="${href}" style="--i:${i}" data-menu-link>${label}</a>`).join('');
  return `
  <header class="ln-nav">
    <a class="ln-brand" href="#top"><span class="ln-brand-dot" aria-hidden="true"></span>Đảo Đèn Lồng</a>
    <nav class="ln-links" aria-label="Điều hướng">${links}</nav>
    ${startButton('Chơi ngay', 'sm')}
    <button class="ln-burger" data-menu-toggle aria-label="Mở menu" aria-expanded="false"><span></span><span></span></button>
  </header>
  <div class="ln-menu" data-menu aria-hidden="true">
    <nav class="ln-menu-links" aria-label="Menu">${menuLinks}</nav>
    <div class="ln-menu-cta" style="--i:${NAV_LINKS.length}">${startButton('Bắt đầu chơi', 'xl')}</div>
  </div>`;
}

export function navHeroStoryMarkup(): string {
  return `
  <div class="ln-grain" aria-hidden="true"></div>
  ${navMarkup()}

  <section class="ln-hero" id="top">
    <div class="ln-hero-sky" aria-hidden="true"></div>
    <div class="ln-hero-orb" aria-hidden="true"></div>
    <div class="ln-fireflies" data-fireflies aria-hidden="true"></div>
    <div class="ln-island" aria-hidden="true"></div>
    <div class="ln-hero-inner">
      <span class="ln-eyebrow" data-hero-reveal><i aria-hidden="true"></i>Đêm 1 - Đảo Bến</span>
      <h1 class="ln-hero-title" data-hero-reveal>
        Thắp sáng hòn đảo
        <span class="ln-inline-lantern" aria-hidden="true"><b></b></span>
        trước khi bình minh kịp lên
      </h1>
      <p class="ln-lede" data-hero-reveal>
        Vào vai Mây, người đội nón lá treo đèn lồng. Nhặt đom đóm, nạp vào
        ${TUNING.lantern_count_night1} Đèn Lồng Lớn, tiếp dầu để đèn không tắt, và giữ khoảng cách với Bóng Mực trong một đêm dài ${MINUTES} phút.
      </p>
      <div class="ln-cta-row" data-hero-reveal>
        ${startButton('Bắt đầu chơi')}
        ${ghostLink('Xem hướng dẫn', '#cach-choi')}
      </div>
    </div>
    <a class="ln-scroll-cue" href="#cau-chuyen" aria-label="Cuộn xuống"><span></span></a>
  </section>

  <div class="ln-marquee" aria-hidden="true">${marqueeTrack()}</div>

  <section class="ln-story" id="cau-chuyen">
    ${eyebrow('Câu chuyện')}
    <p class="ln-story-text" data-scrub-text>${storyWords()}</p>
  </section>`;
}
