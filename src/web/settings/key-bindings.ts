// Rebindable keys: action list, defaults, conflict detection, label formatting and the active binding table.
export type Action = 'up' | 'down' | 'left' | 'right' | 'jump' | 'dash' | 'interact' | 'pulse' | 'pause';

export const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause'];

export const ACTION_LABELS: Record<Action, string> = {
  up: 'Đi lên', down: 'Đi xuống', left: 'Sang trái', right: 'Sang phải', jump: 'Nhảy',
  dash: 'Lướt', interact: 'Nạp / thắp đèn', pulse: 'Tỏa sáng', pause: 'Tạm dừng',
};

export const DEFAULT_BINDINGS: Record<Action, string> = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space',
  dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'KeyP',
};

/** Keys with a fixed meaning (Esc always pauses, arrows turn the camera, R restarts): not bindable. */
export const RESERVED_KEYS: readonly string[] = ['Escape', 'ArrowLeft', 'ArrowRight', 'KeyR'];

/** Groups of actions that share one key (only groups of 2+ are returned). */
export function findConflicts(b: Record<Action, string>): Action[][] {
  const byKey = new Map<string, Action[]>();
  for (const a of ACTIONS) byKey.set(b[a], [...(byKey.get(b[a]) ?? []), a]);
  return [...byKey.values()].filter((g) => g.length > 1);
}

/** Keep valid string codes only; fall back to the defaults when anything is missing, reserved or conflicting. */
export function sanitizeBindings(raw: unknown): Record<Action, string> {
  const out = { ...DEFAULT_BINDINGS };
  if (raw && typeof raw === 'object') {
    for (const a of ACTIONS) {
      const v = (raw as Record<string, unknown>)[a];
      if (typeof v === 'string' && v.length > 0 && v.length < 24 && !RESERVED_KEYS.includes(v)) out[a] = v;
    }
  }
  return findConflicts(out).length > 0 ? { ...DEFAULT_BINDINGS } : out;
}

/** Human label of a KeyboardEvent.code ("KeyW" -> "W", "ShiftLeft" -> "Shift trái"). */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'Space', ShiftLeft: 'Shift trái', ShiftRight: 'Shift phải', ControlLeft: 'Ctrl trái',
    ControlRight: 'Ctrl phải', AltLeft: 'Alt trái', AltRight: 'Alt phải', Enter: 'Enter', Tab: 'Tab',
    ArrowUp: 'Mũi tên lên', ArrowDown: 'Mũi tên xuống', Backspace: 'Backspace',
  };
  return map[code] ?? code;
}

let active: Record<Action, string> = { ...DEFAULT_BINDINGS };
let capturing = false;

export const getBindings = (): Record<Action, string> => active;
export function setBindings(b: Record<Action, string>): void { active = { ...b }; }
/** True while the settings panel waits for the next key press (game shortcuts must not fire). */
export const isCapturingKey = (): boolean => capturing;
export function setCapturingKey(v: boolean): void { capturing = v; }
