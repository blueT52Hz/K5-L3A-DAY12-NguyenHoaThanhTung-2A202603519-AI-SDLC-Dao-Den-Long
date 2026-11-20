// Thin fetch client for the Node leaderboard API (GET/POST /api/leaderboard). Errors are thrown as Error
// with a short Vietnamese message; callers show it and never block the player.
import type { LeaderboardEntry } from '../../shared/leaderboard-rules';

const URL_PATH = '/api/leaderboard';

export interface ScoreSubmission { name: string; score: number; nights_won: number; seed: number }
export interface SubmitResult { entries: LeaderboardEntry[]; rank: number | null }

async function readJson(res: Response): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  try { body = (await res.json()) as Record<string, unknown>; } catch { /* non-JSON body */ }
  if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `Máy chủ trả lỗi ${res.status}`);
  return body;
}

/** Top 10 entries, best first. Rejects when the server is unreachable. */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const body = await readJson(await fetch(URL_PATH, { cache: 'no-store' }));
    return (body.entries as LeaderboardEntry[]) ?? [];
  } catch (e) {
    throw new Error(e instanceof TypeError ? 'Không kết nối được máy chủ bảng xếp hạng.' : (e as Error).message);
  }
}

/** Submit one score; resolves with the updated top 10 and the 1-based rank (null when not in the top 10). */
export async function submitScore(p: ScoreSubmission): Promise<SubmitResult> {
  try {
    const body = await readJson(await fetch(URL_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
    }));
    return { entries: (body.entries as LeaderboardEntry[]) ?? [], rank: (body.rank as number | null) ?? null };
  } catch (e) {
    throw new Error(e instanceof TypeError ? 'Không kết nối được máy chủ bảng xếp hạng.' : (e as Error).message);
  }
}
