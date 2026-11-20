// Disk storage for the leaderboard: data/leaderboard.json, read tolerant, written atomically.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isLeaderboardEntry, LEADERBOARD_SIZE, type LeaderboardEntry } from '../src/shared/leaderboard-rules';

/** Missing, unreadable or corrupt file -> empty board (never throws). Invalid entries are dropped. */
export function loadEntries(file: string): LeaderboardEntry[] {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { entries?: unknown };
    if (!Array.isArray(data?.entries)) return [];
    return data.entries.filter(isLeaderboardEntry).slice(0, LEADERBOARD_SIZE);
  } catch {
    return [];
  }
}

/** Writes {"entries":[...]} to a temp file in the same dir then renames it over the target. */
export function saveEntries(file: string, entries: LeaderboardEntry[]): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + '\n');
  renameSync(tmp, file);
}
