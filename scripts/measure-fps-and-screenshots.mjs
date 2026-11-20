// Playwright: run the built game (vite preview), collect console/page errors, measure FPS per night, take screenshots.
// Usage: npm run preview (note port), then: GAME_URL=http://localhost:4173/ node scripts/measure-fps-and-screenshots.mjs
// Needs playwright (NODE_PATH or D:/VinAI/Day12/node_modules). FPS_SECONDS overrides the 15 s window.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('D:/VinAI/Day12/node_modules/playwright')); }

const BASE = (process.env.GAME_URL || 'http://localhost:4173/').replace(/\/$/, '');
const SECONDS = Number(process.env.FPS_SECONDS || 15);
const OUT = 'evidence/phase-2';
mkdirSync(`${OUT}/screenshots`, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const lines = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runNight(night) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[night ${night}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[night ${night}] pageerror: ${e.message}`));
  const q = night === 1 ? '?play=1' : `?play=1&night=${night}`;
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await sleep(1000);
  if (night === 1) {
    await page.screenshot({ path: `${OUT}/screenshots/01-menu.png` });
    await page.getByRole('button', { name: 'Chơi', exact: true }).click();
    await sleep(500);
  }
  await page.screenshot({ path: `${OUT}/screenshots/night${night}-intro.png` });
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await sleep(1500);
  await page.keyboard.down('KeyW');
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/screenshots/night${night}-hud.png` });
  // FPS over SECONDS via rAF counting while W held (+ gentle strafing).
  const fpsPromise = page.evaluate((s) => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 >= s * 1000) res(n / ((performance.now() - t0) / 1000)); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), SECONDS);
  for (let i = 0; i < SECONDS; i += 3) {
    await page.keyboard.down(i % 6 === 0 ? 'KeyA' : 'KeyD'); await sleep(1500);
    await page.keyboard.up(i % 6 === 0 ? 'KeyA' : 'KeyD'); await sleep(1500);
  }
  const fps = await fpsPromise;
  const info = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  await page.keyboard.up('KeyW');
  if (night === 1) {
    await page.keyboard.press('Escape'); await sleep(600);
    await page.screenshot({ path: `${OUT}/screenshots/night1-pause.png` });
  }
  lines.push(`Night ${night}: avg FPS ${fps.toFixed(1)} over ${SECONDS}s (renderer: ${info})`);
  console.log(lines.at(-1));
  await page.close();
}

for (const n of [1, 2, 3]) await runNight(n);
await browser.close();

writeFileSync(`${OUT}/fps.txt`, [
  'FPS measurement (rAF counting), 1280x720, headless Chromium via Playwright, software GL (SwiftShader/ANGLE).',
  'Game auto-detects the software renderer and uses CPU quality (no AA, pixel ratio 0.85, no point lights).',
  'NOTE: headless SwiftShader FPS is far below a real GPU; a real GPU/desktop browser will differ (usually much higher).',
  `Player holds W with strafing during measurement; window ${SECONDS}s per night.`,
  '', ...lines, '',
  `Console/page errors: ${errors.length}`, ...errors, '',
].join('\n'));
console.log(errors.length ? errors.join('\n') : 'no console/page errors');
