// Key rebinding UI: one row per action, click to capture the next key, red warning on conflicts, restore defaults.
import {
  ACTIONS, ACTION_LABELS, DEFAULT_BINDINGS, RESERVED_KEYS, findConflicts, keyLabel, setCapturingKey, type Action,
} from './key-bindings';

export interface KeyBindingsEditor { el: HTMLElement; paint(b: Record<Action, string>): void }

/**
 * `onDraft` gets every edited table (possibly conflicting); the caller persists only when findConflicts is empty.
 * While capturing, Esc cancels and the key never reaches the game shortcuts.
 */
export function createKeyBindingsEditor(
  initial: Record<Action, string>, onDraft: (b: Record<Action, string>) => void,
): KeyBindingsEditor {
  let draft = { ...initial };
  let waiting: Action | null = null;
  const el = document.createElement('div');
  el.className = 'bind-box';
  el.innerHTML = `<h2>Phím điều khiển</h2><div class="bind-grid"></div>
    <p class="bind-warn" role="alert" data-k="bwarn"></p>
    <button data-k="bdef" type="button">Khôi phục mặc định</button>`;
  const grid = el.querySelector<HTMLElement>('.bind-grid')!;
  const warn = el.querySelector<HTMLElement>('[data-k="bwarn"]')!;

  const paint = (b: Record<Action, string> = draft): void => {
    draft = { ...b };
    const groups = findConflicts(draft);
    const bad = new Set(groups.flat());
    grid.innerHTML = ACTIONS.map((a) => `<span>${ACTION_LABELS[a]}</span>
      <button type="button" data-a="${a}" class="bind-key${bad.has(a) ? ' conflict' : ''}${waiting === a ? ' waiting' : ''}">
      ${waiting === a ? 'Nhấn phím...' : `${bad.has(a) ? '⚠ ' : ''}${keyLabel(draft[a])}`}</button>`).join('');
    warn.textContent = groups.length
      ? `⚠ Trùng phím: ${groups.map((g) => g.map((a) => ACTION_LABELS[a]).join(' và ')).join('; ')}. Chưa lưu, hãy đổi lại.`
      : '';
  };

  const stop = (): void => { waiting = null; setCapturingKey(false); window.removeEventListener('keydown', onKey, true); };
  function onKey(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === 'Escape') { stop(); paint(); return; }
    if (RESERVED_KEYS.includes(e.code)) { warn.textContent = `⚠ Phím ${keyLabel(e.code)} đã dành riêng (Esc, mũi tên trái/phải, R).`; return; }
    if (waiting) draft[waiting] = e.code;
    stop();
    paint();
    onDraft({ ...draft });
  }

  grid.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a as Action | undefined;
    if (!a) return;
    if (waiting) stop();
    waiting = a;
    setCapturingKey(true);
    window.addEventListener('keydown', onKey, true);
    paint();
  });
  el.querySelector('[data-k="bdef"]')!.addEventListener('click', () => {
    stop();
    paint({ ...DEFAULT_BINDINGS });
    onDraft({ ...DEFAULT_BINDINGS });
  });
  paint();
  return { el, paint: (b) => { stop(); paint(b); } };
}
