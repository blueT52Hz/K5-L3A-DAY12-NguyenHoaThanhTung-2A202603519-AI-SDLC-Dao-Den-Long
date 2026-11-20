// HUD layout (spec 7.7) + pure formatting helpers.
import { TUNING } from '../../core/tuning';
import { TICK_RATE } from '../../core/constants';
import type { Lantern } from '../../core/types';

export const CLOCK_DANGER_S = 30;

/** mm:ss from seconds (ceil, so 0.4 s left still shows 00:01). */
export function formatClock(secs: number): string {
  const t = Math.max(0, Math.ceil(secs - 0.5)); // 65.4 -> 65
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function isClockDanger(secs: number): boolean {
  return secs <= CLOCK_DANGER_S;
}

/** Prompt for the lantern in reach: first light, relight (cheaper), or refuel a low lantern. */
export function interactPrompt(carried: number, l: Lantern): string {
  if (l.lit) return `E - Châm dầu (${carried} đom đóm)`;
  const cost = l.everLit ? TUNING.relight_cost : TUNING.lantern_cost;
  return `E - ${l.everLit ? 'Thắp lại' : 'Nạp ánh sáng'} (${carried}/${cost})`;
}

/** Remaining cooldown fraction 0..1 (1 = just used). */
export function cooldownFraction(ticks: number, cooldownS: number): number {
  return Math.min(1, Math.max(0, ticks / (cooldownS * TICK_RATE)));
}

export const HUD_MARKUP = `
  <div class="hud-flames" data-k="flames"></div>
  <div class="hud-clock" data-k="clock"></div>
  <div class="hud-topright"><div data-k="lanterns"></div><div data-k="score"></div></div>
  <div class="hud-status" data-k="status"></div>
  <div class="hud-warn" data-k="warn"></div>
  <div class="hud-prompt" data-k="prompt"></div>
  <div class="hud-arrow" data-k="arrow"></div>
  <div class="hud-motes" data-k="motes"></div>
  <div class="hud-cds">
    <div class="cd" data-k="dash"><span>Shift</span><b>Lướt</b></div>
    <div class="cd" data-k="pulse"><span>F</span><b>Sáng</b></div>
  </div>
  <button class="pause-btn" data-k="pausebtn" title="Tạm dừng (P / Esc)">II</button>`;
