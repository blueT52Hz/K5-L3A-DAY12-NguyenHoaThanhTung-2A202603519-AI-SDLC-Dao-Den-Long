// Pure leaderboard rules shared by the Node server (server-src) and the web UI.
// No DOM, no node:* imports so both bundles can use it.

export interface LeaderboardEntry { name: string; score: number; nights_won: number; achieved_at: string; seed: number }

export const LEADERBOARD_SIZE = 10;

// 3-12 code points; each one is 0-9, '_', a Latin-script letter (covers A-Z and precomposed
// Vietnamese letters after NFC) or a combining mark that follows a base character.
const NAME_RE = /^(?!\p{M})(?:[0-9_]|(?=\p{L})\p{Script=Latin}|\p{M}){3,12}$/u;

/** Normalizes a player name to NFC (precomposed Vietnamese letters). */
export function normalizeName(name: string): string {
  return name.normalize('NFC');
}

/** True when the name (after NFC) is 3-12 chars of [A-Za-z0-9_] or Latin letters with Vietnamese diacritics. */
export function validName(name: string): boolean {
  return typeof name === 'string' && NAME_RE.test(normalizeName(name));
}

/** Order: score descending, then earlier achieved_at first. */
function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.score !== b.score) return b.score - a.score;
  return Date.parse(a.achieved_at) - Date.parse(b.achieved_at);
}

/**
 * Returns a new top-10 list with e inserted. Array.prototype.sort is stable and e is appended last,
 * so on a full tie (same score, same second) the entry already on the board stays above.
 */
export function insertEntry(entries: LeaderboardEntry[], e: LeaderboardEntry): LeaderboardEntry[] {
  return [...entries, e].sort(compareEntries).slice(0, LEADERBOARD_SIZE);
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local time of d as ISO 8601 with the machine's offset, e.g. 2026-11-20T21:05:09+07:00. */
export function isoWithOffset(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    + `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Shape check for one stored entry (used when loading a possibly hand-edited file). */
export function isLeaderboardEntry(x: unknown): x is LeaderboardEntry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return typeof e.name === 'string' && Number.isSafeInteger(e.score) && Number.isInteger(e.nights_won)
    && typeof e.achieved_at === 'string' && !Number.isNaN(Date.parse(e.achieved_at)) && Number.isSafeInteger(e.seed);
}
