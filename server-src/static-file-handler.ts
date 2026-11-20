// Serves files from dist/ with basic MIME types; refuses anything that resolves outside dist/.
import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};

function sendText(res: ServerResponse, code: number, text: string): void {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

/** Maps a URL pathname to a file inside root, or null when it escapes root / is malformed. */
export function resolveInside(root: string, pathname: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const full = resolve(root, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded));
  return full === root || full.startsWith(root + sep) ? full : null;
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, distDir: string): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');
  const root = resolve(distDir);
  if (!existsSync(join(root, 'index.html'))) return sendText(res, 500, 'dist/ chua duoc build: chay "npm run build" truoc.');
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  let file = resolveInside(root, pathname);
  if (!file) return sendText(res, 400, 'Bad Request');
  if (!isFile(file) && isFile(join(file, 'index.html'))) file = join(file, 'index.html');
  if (!isFile(file)) {
    // Unknown route without an extension -> SPA fallback; a missing asset stays 404.
    if (extname(file)) return sendText(res, 404, 'Not Found');
    file = join(root, 'index.html');
  }
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600' });
  if (req.method === 'HEAD') return void res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}
