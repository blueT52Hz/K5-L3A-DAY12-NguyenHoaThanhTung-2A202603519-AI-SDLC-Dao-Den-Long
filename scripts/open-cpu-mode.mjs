// Opens Chrome/Chromium/Edge with software (SwiftShader) rendering at http://localhost:4173/?cpu=1
// Usage: npm run preview  (terminal 1), npm run play:cpu  (terminal 2). CHROME_PATH overrides detection.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL_TO_OPEN = process.env.GAME_URL || 'http://localhost:4173/?cpu=1';

function candidates() {
  const env = process.env;
  switch (process.platform) {
    case 'win32': {
      const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);
      const rel = [
        'Google\Chrome\Application\chrome.exe',
        'Microsoft\Edge\Application\msedge.exe',
        'Chromium\Application\chrome.exe',
      ];
      return roots.flatMap((r) => rel.map((p) => path.join(r, p)));
    }
    case 'darwin':
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ];
    default:
      return [
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
        '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge',
      ];
  }
}

const found = [process.env.CHROME_PATH, ...candidates()].filter(Boolean).find((p) => existsSync(p));
if (!found) {
  console.error('Khong tim thay Chrome/Chromium/Edge. Cai trinh duyet hoac dat CHROME_PATH=<duong dan toi chrome>.');
  process.exit(1);
}

const args = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-rasterization',
  `--user-data-dir=${path.join(os.tmpdir(), 'dao-den-long-cpu')}`,
  URL_TO_OPEN,
];
console.log(`Mo ${found}\n -> ${URL_TO_OPEN} (nho chay "npm run preview" truoc)`);
spawn(found, args, { detached: true, stdio: 'ignore' }).unref();
