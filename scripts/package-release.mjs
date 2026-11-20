// Release packager: node scripts/package-release.mjs  (or `npm run release`; needs `npm run build` first)
// Copies what a player needs into release/dao-den-long-v<version>/ and zips it to release/dao-den-long-v<version>.zip.
// Zip tools tried in order: bsdtar (Windows 10+ System32\tar.exe / macOS tar), `zip`, PowerShell Compress-Archive.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '1.0.0';
const NAME = `dao-den-long-v${VERSION}`;
const OUT_DIR = join(ROOT, 'release');
const STAGE = join(OUT_DIR, NAME);
const ZIP = join(OUT_DIR, `${NAME}.zip`);
const ITEMS = ['dist', 'dist-headless', 'server.mjs', 'scripts', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'CREDITS.md', 'game.contract.json'];

const missing = ITEMS.filter((p) => !existsSync(join(ROOT, p)));
if (missing.length) {
  console.error(`missing: ${missing.join(', ')} (run "npm run build" first)`);
  process.exit(1);
}

rmSync(STAGE, { recursive: true, force: true });
rmSync(ZIP, { force: true });
mkdirSync(STAGE, { recursive: true });
for (const p of ITEMS) cpSync(join(ROOT, p), join(STAGE, p), { recursive: true });

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: 'pipe', windowsHide: true }).status === 0;
const bsdtar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\Windows', 'System32', 'tar.exe') : 'tar';
const attempts = [
  () => run(bsdtar, ['-a', '-c', '-f', ZIP, NAME], OUT_DIR),
  () => run('zip', ['-r', '-q', ZIP, NAME], OUT_DIR),
  () => process.platform === 'win32'
    && run('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${STAGE}' -DestinationPath '${ZIP}' -Force`], OUT_DIR),
];
const ok = attempts.some((t) => { rmSync(ZIP, { force: true }); return t() && existsSync(ZIP); });
rmSync(STAGE, { recursive: true, force: true });
if (!ok) {
  console.error('could not create zip: no working bsdtar / zip / Compress-Archive');
  process.exit(1);
}
console.log(`${ZIP} (${(statSync(ZIP).size / 1048576).toFixed(2)} MB)`);
