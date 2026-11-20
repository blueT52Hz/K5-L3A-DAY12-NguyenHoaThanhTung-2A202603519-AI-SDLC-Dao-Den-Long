// Persisted player settings (volume, sensitivity, colorblind, key bindings, reduced motion, large text).
// localStorage access is always guarded.
import { DEFAULT_BINDINGS, sanitizeBindings, type Action } from './key-bindings';

export interface Settings {
  volume: number; mouseSensitivity: number; colorblind: boolean;
  bindings: Record<Action, string>; reducedMotion: boolean; largeText: boolean;
}

export const SETTINGS_KEY = 'dao-den-long.settings.v1';
export const DEFAULT_SETTINGS: Settings = {
  volume: 70, mouseSensitivity: 1.0, colorblind: false,
  bindings: { ...DEFAULT_BINDINGS }, reducedMotion: false, largeText: false,
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Clamp to the allowed ranges: volume 0-100, sensitivity 0.2-3.0. */
export function clampSettings(s: Partial<Settings>): Settings {
  return {
    volume: clamp(num(s.volume, DEFAULT_SETTINGS.volume), 0, 100),
    mouseSensitivity: clamp(num(s.mouseSensitivity, DEFAULT_SETTINGS.mouseSensitivity), 0.2, 3.0),
    colorblind: s.colorblind === true,
    bindings: sanitizeBindings(s.bindings),
    reducedMotion: s.reducedMotion === true,
    largeText: s.largeText === true,
  };
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return clampSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(clampSettings(s)));
  } catch {
    /* storage unavailable: settings stay in memory only */
  }
}

function safeStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
