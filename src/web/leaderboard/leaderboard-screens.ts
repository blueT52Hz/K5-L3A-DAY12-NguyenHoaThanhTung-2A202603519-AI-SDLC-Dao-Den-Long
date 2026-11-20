// Leaderboard modals (own DOM + CSS, usable from the landing page and from the game):
//  - showLeaderboard(): top 10 table (rank, name, score, nights won, time)
//  - showScoreEntry(): name form after dawn / a lost night, live validation, "Bỏ qua", network errors never block play
import './leaderboard.css';
import { validName, type LeaderboardEntry } from '../../shared/leaderboard-rules';
import { fetchLeaderboard, submitScore, type ScoreSubmission } from './leaderboard-api';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** "21:05 20/11/2026" from an ISO 8601 string with offset (kept in the entry's own local time). */
function formatWhen(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}` : iso;
}

function tableHtml(entries: LeaderboardEntry[], highlight: number | null): string {
  if (entries.length === 0) return '<p class="lb-empty">Chưa có ai trên bảng. Hãy là người đầu tiên!</p>';
  const rows = entries.map((e, i) => `<tr${highlight === i + 1 ? ' class="lb-me"' : ''}><td>${i + 1}</td><td>${esc(e.name)}</td>`
    + `<td>${e.score}</td><td>${e.nights_won}</td><td>${formatWhen(e.achieved_at)}</td></tr>`).join('');
  return `<table class="lb-table"><thead><tr><th>Hạng</th><th>Tên</th><th>Điểm</th><th>Số Đêm</th><th>Thời gian</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** Create a modal (focus trapped on its first control, Esc closes); returns the panel and a close function. */
function openModal(html: string, onClose?: () => void): { panel: HTMLElement; close: () => void } {
  const back = document.createElement('div');
  back.className = 'lb-modal';
  back.innerHTML = `<div class="lb-panel" role="dialog" aria-modal="true">${html}</div>`;
  const panel = back.firstElementChild as HTMLElement;
  const close = (): void => { window.removeEventListener('keydown', onKey, true); back.remove(); onClose?.(); };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  window.addEventListener('keydown', onKey, true);
  document.body.appendChild(back);
  return { panel, close };
}

/** Top 10 board. Shows an empty state or an error message instead of the table when needed. */
export function showLeaderboard(entriesNow?: LeaderboardEntry[], rank: number | null = null, onClose?: () => void): void {
  const { panel, close } = openModal(`<h2>Bảng xếp hạng</h2><div data-k="body" class="lb-body">Đang tải...</div>
    <button class="lb-btn" data-k="close">Đóng</button>`, onClose);
  panel.querySelector('[data-k="close"]')!.addEventListener('click', close);
  panel.querySelector<HTMLElement>('[data-k="close"]')!.focus();
  const body = panel.querySelector<HTMLElement>('[data-k="body"]')!;
  const render = (entries: LeaderboardEntry[]): void => { body.innerHTML = tableHtml(entries, rank); };
  if (entriesNow) render(entriesNow);
  else fetchLeaderboard().then(render, (e: Error) => { body.innerHTML = `<p class="lb-error" role="alert">${esc(e.message)}</p>`; });
}

/** Score-entry form. `onDone` fires once when the form closes (saved, skipped or dismissed) so play can continue. */
export function showScoreEntry(sub: Omit<ScoreSubmission, 'name'>, onDone: () => void): void {
  let finished = false;
  const done = (): void => { if (!finished) { finished = true; onDone(); } };
  const { panel, close } = openModal(`<h2>Ghi điểm lên bảng</h2>
    <p class="lb-sub">Điểm: <b>${sub.score}</b> - Đêm đã thắng: <b>${sub.nights_won}</b></p>
    <label class="lb-field">Tên của bạn (3-12 ký tự: chữ, số hoặc _)
      <input data-k="name" maxlength="12" autocomplete="off" spellcheck="false" aria-describedby="lb-hint"></label>
    <p id="lb-hint" class="lb-hint" data-k="hint" aria-live="polite"></p>
    <div class="lb-actions"><button class="lb-btn lb-primary" data-k="save" disabled>Lưu điểm</button>
    <button class="lb-btn" data-k="skip">Bỏ qua</button></div>`, done);
  const input = panel.querySelector<HTMLInputElement>('[data-k="name"]')!;
  const hint = panel.querySelector<HTMLElement>('[data-k="hint"]')!;
  const save = panel.querySelector<HTMLButtonElement>('[data-k="save"]')!;
  const skip = panel.querySelector<HTMLButtonElement>('[data-k="skip"]')!;
  input.focus();
  const check = (): boolean => {
    const ok = validName(input.value.trim());
    save.disabled = !ok;
    input.classList.toggle('lb-bad', input.value.length > 0 && !ok);
    hint.className = input.value.length > 0 && !ok ? 'lb-hint lb-error' : 'lb-hint';
    hint.textContent = ok || input.value.length === 0 ? '' : 'Tên cần 3-12 ký tự: chữ cái (có dấu), số hoặc dấu gạch dưới.';
    return ok;
  };
  input.addEventListener('input', check);
  // Keep game shortcuts (WASD, P, R...) out of the text field.
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && check()) save.click(); });
  skip.addEventListener('click', close);
  save.addEventListener('click', () => {
    if (!check()) return;
    save.disabled = true; skip.disabled = true; hint.className = 'lb-hint'; hint.textContent = 'Đang lưu...';
    submitScore({ ...sub, name: input.value.trim().normalize('NFC') }).then((r) => {
      close();
      showLeaderboard(r.entries, r.rank);
    }, (e: Error) => {
      hint.className = 'lb-hint lb-error'; hint.setAttribute('role', 'alert');
      hint.textContent = `${e.message} Bạn vẫn có thể thử lại hoặc bấm Bỏ qua để chơi tiếp.`;
      save.disabled = false; skip.disabled = false;
    });
  });
}
