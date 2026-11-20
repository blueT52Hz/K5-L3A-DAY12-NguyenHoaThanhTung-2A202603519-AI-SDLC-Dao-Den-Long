// GET/POST /api/leaderboard. Node handles one request callback at a time and the store uses sync fs,
// so read-insert-write is never interleaved between two POSTs.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { insertEntry, isoWithOffset, normalizeName, validName, type LeaderboardEntry } from '../src/shared/leaderboard-rules';
import { loadEntries, saveEntries } from './leaderboard-file-store';

const MAX_BODY_BYTES = 4096;

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** Validates the POST body; returns an error message or the entry without achieved_at. */
function parseSubmission(raw: string): string | Omit<LeaderboardEntry, 'achieved_at'> {
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw) as Record<string, unknown>; } catch { return 'body is not valid JSON'; }
  if (typeof b !== 'object' || b === null || Array.isArray(b)) return 'body must be a JSON object';
  if (typeof b.name !== 'string' || !validName(b.name)) return 'name must be 3-12 characters: letters, digits or _';
  if (!Number.isSafeInteger(b.score) || (b.score as number) < 0) return 'score must be a non-negative integer';
  const nw = b.nights_won as number;
  if (!Number.isInteger(nw) || nw < 0 || nw > 3) return 'nights_won must be an integer 0-3';
  if (!Number.isSafeInteger(b.seed)) return 'seed must be an integer';
  return { name: normalizeName(b.name), score: b.score as number, nights_won: nw, seed: b.seed as number };
}

function handlePost(req: IncomingMessage, res: ServerResponse, file: string): void {
  const chunks: Buffer[] = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c: Buffer) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY_BYTES) {
      aborted = true;
      sendJson(res, 413, { error: 'body too large (max 4 KB)' });
      req.resume();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    const parsed = parseSubmission(Buffer.concat(chunks).toString('utf8'));
    if (typeof parsed === 'string') return sendJson(res, 400, { error: parsed });
    const entry: LeaderboardEntry = { ...parsed, achieved_at: isoWithOffset(new Date()) };
    try {
      const entries = insertEntry(loadEntries(file), entry);
      saveEntries(file, entries);
      const idx = entries.indexOf(entry);
      sendJson(res, 200, { entries, rank: idx >= 0 ? idx + 1 : null });
    } catch (e) {
      sendJson(res, 500, { error: `cannot save leaderboard: ${(e as Error).message}` });
    }
  });
  req.on('error', () => res.destroy());
}

export function handleLeaderboardApi(req: IncomingMessage, res: ServerResponse, file: string): void {
  if (req.method === 'GET') return sendJson(res, 200, { entries: loadEntries(file) });
  if (req.method === 'POST') return handlePost(req, res, file);
  res.setHeader('Allow', 'GET, POST');
  sendJson(res, 405, { error: 'method not allowed' });
}
