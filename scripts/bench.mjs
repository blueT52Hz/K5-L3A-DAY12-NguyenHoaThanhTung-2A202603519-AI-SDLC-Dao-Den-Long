// Benchmark (contract bench_cmd): node scripts/bench.mjs --seed 42 --duration 30 --out bench.json
// Needs `npm run build` first. Uses the running game server on PORT (default 4173) or starts server.mjs itself,
// opens headed Chrome (Playwright) at 1280x720 with vsync / frame cap off on `/?bench=<seed>&duration=<s>`,
// waits for window.__benchResult and writes the 10 bench.json fields of the phase 4 ticket.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { descendantsRssMb } from './bench-process-tree-memory.mjs';

const t0 = Date.now(); // load_ms is measured from here (process start of the bench command)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SAMPLE_MS = 3000; // peak memory sampling period during the measured window

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

async function isUp(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; }
}

/** Reuse whatever answers on the port; otherwise start server.mjs and wait until it answers. */
async function ensureServer(port) {
  const base = `http://localhost:${port}`;
  if (await isUp(base)) return { base, child: null };
  const serverFile = join(ROOT, 'server.mjs');
  if (!existsSync(serverFile)) throw new Error('server.mjs not found: run "npm run build" first');
  const child = spawn(process.execPath, [serverFile], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore', windowsHide: true });
  for (let i = 0; i < 100; i++) {
    if (await isUp(base)) return { base, child };
    if (child.exitCode !== null) throw new Error(`server.mjs exited with code ${child.exitCode}`);
    await sleep(100);
  }
  child.kill();
  throw new Error(`server did not answer on ${base}`);
}

async function launchChrome() {
  const { chromium } = await import('playwright');
  const opts = {
    headless: false,
    args: ['--window-size=1280,720', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
  };
  try { return await chromium.launch({ ...opts, channel: 'chrome' }); } // installed Google Chrome if present
  catch { return chromium.launch(opts); } // Playwright's bundled Chromium (npx playwright install chromium)
}

async function main() {
  const seed = Number.parseInt(arg('--seed', '42'), 10);
  const duration = Number(arg('--duration', '30'));
  const out = resolve(arg('--out', 'bench.json'));
  if (!Number.isInteger(seed) || !(duration > 0)) throw new Error('usage: bench.mjs --seed <int> --duration <s> --out <path>');
  const contract = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));

  const { base, child } = await ensureServer(Number(process.env.PORT ?? 4173));
  const browser = await launchChrome();
  let peak = null;
  let sampling = true;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => process.stderr.write(`pageerror: ${e.message}\n`));
    // RSS of the whole Chrome process tree every 3 s while the page is in its measured window. Each sample
    // spawns wmic / PowerShell (heavy WMI query): sampling every second caused frame hitches on slow machines.
    // Memory of a steady scene plateaus after a few seconds, so 10 samples over 30 s still catch the peak.
    const sampler = (async () => {
      while (sampling) {
        const phase = await page.evaluate(() => window.__benchPhase).catch(() => undefined);
        if (phase === 'measure') {
          const mb = await descendantsRssMb(process.pid, [child?.pid]);
          if (mb !== null) peak = Math.max(peak ?? 0, mb);
        }
        await sleep(phase === 'measure' ? SAMPLE_MS : 250);
      }
    })();
    await page.goto(`${base}/?bench=${seed}&duration=${duration}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__benchResult, null, { timeout: (duration + 120) * 1000, polling: 500 });
    const r = await page.evaluate(() => window.__benchResult);
    sampling = false;
    await sampler;
    const bench = {
      contract_version: contract.contract_version,
      avg_fps: r.avg_fps,
      p1_low_fps: r.p1_low_fps,
      frame_ms_p95: r.frame_ms_p95,
      frames: r.frames,
      load_ms: Math.max(0, r.first_frame_epoch_ms - t0),
      peak_mem_mb: peak === null ? null : Math.round(peak),
      vsync_off: true,
      renderer: r.renderer,
      os: `${os.type()} ${os.release()}`,
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(bench, null, 2) + '\n');
    process.stdout.write(JSON.stringify(bench) + '\n');
  } finally {
    sampling = false;
    await browser.close().catch(() => {});
    child?.kill();
  }
}

main().then(() => process.exit(0), (e) => {
  process.stderr.write(`bench error: ${e.message}\n`);
  process.exit(1);
});
