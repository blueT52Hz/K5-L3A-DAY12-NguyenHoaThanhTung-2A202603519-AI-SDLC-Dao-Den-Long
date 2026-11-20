// Landing page markup, part 2: how-to-play accordion, controls bento, pinned rules, final CTA + footer.
// All numbers come from game.contract.json (TUNING) or core constants so the guide never drifts from the game.
import { TUNING } from '../../core/tuning';
import { INITIAL_SHADES, ISLAND_RADIUS, MAX_SHADES, SHADE_SPAWN_TICKS, TICK_RATE } from '../../core/constants';
import { eyebrow, lineIcon, shell, startButton } from './landing-ui-primitives';

const T = TUNING;
const S = TUNING.score;
const MINUTES = Math.round(T.night1_duration_s / 60);
const SPAWN_S = SHADE_SPAWN_TICKS / TICK_RATE;

interface Step { key: string; title: string; body: string; visual: string }

const STEPS: Step[] = [
  { key: 'WASD', title: 'Nhặt đom đóm', visual: 'motes',
    body: `Đi ngang qua đom đóm trong bán kính ${T.pickup_radius}m để nhặt. Mang tối đa ${T.carry_capacity} con một lúc.` },
  { key: 'E', title: 'Nạp vào đèn', visual: 'lantern',
    body: `Đứng cách đèn chưa sáng trong ${T.interact_radius}m rồi bấm E. Mỗi đèn cần ${T.lantern_cost} đom đóm để bừng sáng.` },
  { key: 'F', title: 'Tỏa sáng', visual: 'pulse',
    body: `Bấm F để choáng và đẩy lùi Bóng Mực trong ${T.pulse_radius}m suốt ${T.pulse_stun_s} giây. Tốn ${T.pulse_cost} đom đóm, hồi ${T.pulse_cooldown_s} giây.` },
  { key: 'Đèn', title: 'Trú dưới ánh đèn', visual: 'dome',
    body: `Bóng Mực không thể bước vào vùng ${T.safe_radius}m quanh một đèn đã sáng. Đó là chỗ nghỉ chân an toàn.` },
];

const RULES: { icon: string; title: string; body: string }[] = [
  { icon: 'lantern', title: 'Chiến thắng', body: `Thắp đủ ${T.lantern_count_night1} đèn lồng trước khi hết ${MINUTES} phút. Thời gian và máu còn lại được quy thành điểm thưởng.` },
  { icon: 'sunrise', title: 'Thất bại', body: `Hết ${T.flames} máu, hoặc trời sáng trước khi đủ đèn.` },
  { icon: 'shade', title: 'Bóng Mực', body: `Bắt đầu với ${INITIAL_SHADES} con, cứ ${SPAWN_S} giây thêm một con, tối đa ${MAX_SHADES}. Chúng luôn đuổi theo bạn.` },
  { icon: 'heart', title: 'Khi bị chạm', body: `Mất 1 máu, đánh rơi ${Math.round(T.hit_drop_ratio * 100)}% số đom đóm đang mang, rồi được bất tử ${T.invuln_s} giây.` },
  { icon: 'island', title: 'Hòn đảo', body: `Đảo tròn bán kính ${ISLAND_RADIUS}m, mép đảo là tường vô hình nên bạn không thể rơi xuống biển.` },
];

function accordion(): string {
  return STEPS.map((s, i) => shell(`
      <div class="ln-acc-visual ln-vis-${s.visual}" aria-hidden="true"><span></span><span></span><span></span></div>
      <kbd class="ln-acc-key">${s.key}</kbd>
      <div class="ln-acc-copy"><h3>${s.title}</h3><p>${s.body}</p></div>`,
  `ln-acc-panel${i === 0 ? ' is-open' : ''}`, 'tabindex="0"')).join('');
}

function bento(): string {
  const key = (k: string, wide = false) => `<kbd class="ln-key${wide ? ' ln-key-wide' : ''}">${k}</kbd>`;
  const card = (cls: string, inner: string) => shell(inner, `ln-card ${cls}`, 'data-reveal');
  return `
    <div class="ln-bento">
      ${card('ln-card-keys', `
        <div class="ln-card-art ln-keyboard" aria-hidden="true">
          <div class="ln-key-row">${key('E')}${key('W')}${key('F')}</div>
          <div class="ln-key-row">${key('A')}${key('S')}${key('D')}</div>
          <div class="ln-key-row">${key('Space', true)}</div>
        </div>
        <h3>Di chuyển và hành động</h3>
        <p>W A S D đi theo hướng camera, Space để nhảy, E nạp đèn, F tỏa sáng.</p>`)}
      ${card('ln-card-score', `
        <h3>Cách tính điểm</h3>
        <ul class="ln-score-list">
          <li><span>Nhặt 1 đom đóm</span><b>+${S.per_mote}</b></li>
          <li><span>Thắp sáng 1 đèn</span><b>+${S.per_lantern}</b></li>
          <li><span>Choáng 1 Bóng Mực</span><b>+${S.per_stun}</b></li>
          <li><span>Mỗi giây còn lại khi thắng</span><b>+${S.per_second_left}</b></li>
          <li><span>Mỗi máu còn lại khi thắng</span><b>+${S.per_flame_left}</b></li>
        </ul>`)}
      ${card('ln-card-camera', `
        <div class="ln-card-art ln-orbit" aria-hidden="true"><i></i></div>
        <h3>Xoay camera</h3>
        <p>Kéo chuột hoặc dùng phím mũi tên trái, phải.</p>`)}
      ${card('ln-card-pause', `
        <div class="ln-card-art ln-pause-keys" aria-hidden="true">${key('P')}${key('Esc')}${key('R')}</div>
        <h3>Tạm dừng và chơi lại</h3>
        <p>P hoặc Esc để tạm dừng, R để chơi lại khi kết thúc.</p>`)}
    </div>`;
}

export function guideSectionsMarkup(): string {
  const rules = RULES.map((r) => shell(
    `<span class="ln-rule-icon">${lineIcon(r.icon)}</span><div><h3>${r.title}</h3><p>${r.body}</p></div>`,
    'ln-rule', 'data-rule')).join('');
  return `
  <section class="ln-section" id="cach-choi">
    ${eyebrow('Cách chơi')}
    <h2 class="ln-h2" data-reveal>Bốn việc giúp bạn sống sót qua đêm</h2>
    <div class="ln-accordion" data-reveal>${accordion()}</div>
  </section>

  <section class="ln-section" id="dieu-khien">
    ${eyebrow('Điều khiển')}
    <h2 class="ln-h2" data-reveal>Mọi thao tác nằm gọn dưới một bàn tay</h2>
    ${bento()}
  </section>

  <section class="ln-section ln-rules" id="luat-choi">
    <div class="ln-rules-pin" data-pin>
      ${eyebrow('Luật chơi')}
      <h2 class="ln-h2">Luật của một đêm trên đảo</h2>
      <p>Đọc kỹ trước khi xuất phát. Bạn có thể xem lại bất cứ lúc nào trong game bằng phím P.</p>
      ${startButton('Bắt đầu chơi')}
    </div>
    <div class="ln-rules-list">${rules}</div>
  </section>

  <section class="ln-final">
    ${shell(`
      <div class="ln-final-glow" aria-hidden="true"></div>
      ${eyebrow('Sẵn sàng')}
      <h2 class="ln-final-title" data-reveal>Đêm nay, hòn đảo cần ánh sáng của bạn</h2>
      <div data-reveal>${startButton('Bắt đầu chơi', 'xl')}</div>`, 'ln-final-panel')}
  </section>

  <footer class="ln-footer">
    <span>Đảo Đèn Lồng - Đêm 1, Đảo Bến</span>
    <span>Three.js + TypeScript - Nguyễn Hoà Thanh Tùng</span>
    <a href="#top">Lên đầu trang</a>
  </footer>`;
}
