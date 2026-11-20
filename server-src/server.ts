// Entry of server.mjs (bundled by esbuild into the repo root): `npm start` serves dist/ + leaderboard API.
// `node server.mjs --export-leaderboard <path>` (or `npm start --export-leaderboard <path>`) writes
// {"entries":[...]} in board order and exits 0.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleLeaderboardApi } from './leaderboard-api-handler';
import { loadEntries } from './leaderboard-file-store';
import { serveStatic } from './static-file-handler';

// server.mjs lives in the repo root, next to dist/ and data/.
const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(ROOT, 'dist');
const LEADERBOARD_FILE = join(ROOT, 'data', 'leaderboard.json');

function exportPathFromArgs(argv: string[]): string | null {
  const i = argv.indexOf('--export-leaderboard');
  if (i >= 0) return argv[i + 1] ?? '';
  // `npm start --export-leaderboard out.json`: npm eats the flag (env npm_config_export_leaderboard=true)
  // and forwards only the path as a positional arg.
  const fromNpm = process.env.npm_config_export_leaderboard;
  if (!fromNpm) return null;
  return fromNpm === 'true' ? argv[0] ?? '' : fromNpm;
}

function exportLeaderboard(out: string): never {
  if (!out) {
    process.stderr.write('error: --export-leaderboard needs a file path\n');
    process.exit(1);
  }
  try {
    const target = resolve(out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify({ entries: loadEntries(LEADERBOARD_FILE) }, null, 2) + '\n');
  } catch (e) {
    process.stderr.write(`error: cannot write ${out}: ${(e as Error).message}\n`);
    process.exit(1);
  }
  process.exit(0);
}

function startServer(): void {
  const port = Number(process.env.PORT ?? 4173);
  const server = createServer((req, res) => {
    try {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (pathname === '/api/leaderboard') return handleLeaderboardApi(req, res, LEADERBOARD_FILE);
      serveStatic(req, res, DIST_DIR);
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Internal error: ${(e as Error).message}`);
    }
  });
  server.on('error', (e: NodeJS.ErrnoException) => {
    process.stderr.write(e.code === 'EADDRINUSE' ? `error: port ${port} is busy (set PORT=...)\n` : `error: ${e.message}\n`);
    process.exit(1);
  });
  server.listen(port, () => process.stdout.write(`Dao Den Long: http://localhost:${port}\n`));
}

const exportPath = exportPathFromArgs(process.argv.slice(2));
if (exportPath !== null) exportLeaderboard(exportPath);
else startServer();
