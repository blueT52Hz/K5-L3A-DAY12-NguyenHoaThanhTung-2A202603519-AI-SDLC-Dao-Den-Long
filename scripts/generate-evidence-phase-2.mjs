// Sinh bang chung Phase 2 bang cach chay that headless. Khong sua tay output.
// Dung: node scripts/generate-evidence-phase-2.mjs   (can `npm run build` truoc)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ev = join(root, 'evidence', 'phase-2');
const sc = join(ev, 'scenarios');
const bin = join(root, 'dist-headless', 'headless.mjs');
if (!existsSync(bin)) { console.error('Thieu dist-headless/headless.mjs - chay `npm run build` truoc'); process.exit(1); }
mkdirSync(ev, { recursive: true });

function headless(args) {
  const r = spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); throw new Error(`headless exit ${r.status}: ${args.join(' ')}`); }
}

// name, night, seed, ticks, snapshot-every, [chuoi can co trong JSONL]
const cases = [
  ['dash', 1, 1, 60, 1, ['"name":"dash"']],
  ['pad-n2', 2, 1, 200, 5, ['"grounded":false']],
  ['pad-n3', 3, 1, 200, 5, ['"grounded":false']],
  ['fall-respawn-n2', 2, 1, 300, 10, ['"by":"fall"']],
  ['wind-n3', 3, 1, 2000, 30, ['"wind":{"active":true']],
  ['drifter-steal-pulse-n2', 2, 1, 300, 10, ['"name":"drifter_steal"', '"name":"drifter_drop"', '"state":"removed"']],
  ['charm-n2', 2, 1, 120, 10, ['"name":"charm_picked"']],
  ['pause', 1, 1, 60, 1, ['"name":"paused"', '"name":"resumed"', '"state":"paused"']],
  ['shade-states', 1, 1, 1500, 10, ['"state":"spawning"', '"state":"wander"', '"state":"chase"']],
  ['safe-zone-eviction', 1, 1, 200, 5, ['"name":"lantern_lit"']],
  ['win-at-dawn', 1, 1, 100, 1, ['"result":"won"', '"reason":"all_lit"']],
];
const missing = [];
for (const [name, night, seed, ticks, every, expect] of cases) {
  const out = join(ev, `${name}.jsonl`);
  headless(['--seed', String(seed), '--night', String(night), '--scenario', join(sc, `${name}.scenario.json`),
    '--inputs', join(sc, `${name}.inputs.json`), '--ticks', String(ticks), '--snapshot-every', String(every), '--out', out]);
  const text = readFileSync(out, 'utf8');
  const lack = expect.filter((e) => !text.includes(e));
  if (lack.length) missing.push(`${name}: ${lack.join(', ')}`);
  console.log(lack.length ? 'MISSING' : 'ok', name, lack.join(' | '));
}

// Tat dinh: moi Dem seed 42, 1200 tick, chay 2 lan, so sanh byte.
let det = '';
let allSame = true;
for (const night of [1, 2, 3]) {
  const a = join(ev, `default-night${night}-seed42-run1.jsonl`);
  const b = join(ev, `default-night${night}-seed42-run2.jsonl`);
  for (const f of [a, b]) headless(['--seed', '42', '--night', String(night), '--ticks', '1200', '--out', f]);
  const same = Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
  allSame &&= same;
  det += `night=${night} seed=42 ticks=1200: run1 vs run2 byte-identical: ${same ? 'YES' : 'NO'} (${readFileSync(a).length} bytes)\n`;
}
writeFileSync(join(ev, 'determinism.txt'), det);
console.log(det);

// Thoi gian chay: 21600 tick moi Dem, snapshot moi tick, khong Bong Muc / Gio Lac ngau nhien (game khong ket thuc som).
const tmp = join(root, 'out', 'timing-scenario.json');
mkdirSync(dirname(tmp), { recursive: true });
writeFileSync(tmp, JSON.stringify({ random_shades: false, random_drifters: false }));
let timing = 'headless 21600 tick moi Dem, --snapshot-every 1, scenario {random_shades:false, random_drifters:false}, seed 1\n';
for (const night of [1, 2, 3]) {
  const out = join(root, 'out', `timing-night${night}.jsonl`);
  const t0 = process.hrtime.bigint();
  headless(['--seed', '1', '--night', String(night), '--scenario', tmp, '--ticks', '21600', '--snapshot-every', '1', '--out', out]);
  const sec = Number(process.hrtime.bigint() - t0) / 1e9;
  const last = readFileSync(out, 'utf8').trimEnd().split('\n').pop();
  timing += `night ${night}: ${sec.toFixed(2)} s, dong cuoi: ${last}\n`;
  rmSync(out, { force: true });
}
rmSync(tmp, { force: true });
writeFileSync(join(ev, 'headless-timing.txt'), timing);
console.log(timing);

writeFileSync(join(ev, 'vitest.txt'), 'Test suite (npm test) khong chay lai o buoc nay theo quyet dinh cua nguoi dung (het thoi gian). Xem lich su commit de biet lan chay xanh gan nhat.\n');
if (missing.length) console.log('THIEU:\n' + missing.join('\n'));
if (!allSame || missing.length) process.exit(1);
