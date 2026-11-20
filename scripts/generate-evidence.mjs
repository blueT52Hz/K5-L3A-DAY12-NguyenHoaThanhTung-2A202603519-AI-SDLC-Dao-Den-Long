// Sinh toan bo bang chung Phase 1 bang cach chay that. Khong sua tay output.
// Dung: node scripts/generate-evidence.mjs   (can `npm run build` truoc)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ev = join(root, 'evidence', 'phase-1');
const sc = join(ev, 'scenarios');
const bin = join(root, 'dist-headless', 'headless.mjs');
if (!existsSync(bin)) { console.error('Thieu dist-headless/headless.mjs - chay `npm run build` truoc'); process.exit(1); }
mkdirSync(ev, { recursive: true });

function headless(args) {
  const r = spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); throw new Error(`headless exit ${r.status}: ${args.join(' ')}`); }
}

const cases = [
  { name: 'pickup', seed: 1, ticks: 120 },
  { name: 'deposit-lit', seed: 1, ticks: 10 },
  { name: 'pulse', seed: 1, ticks: 30 },
  { name: 'hit', seed: 1, ticks: 30 },
  { name: 'win', seed: 1, ticks: 100 },
  { name: 'dawn', seed: 1, ticks: 100 },
];
for (const c of cases) {
  headless(['--seed', String(c.seed), '--night', '1', '--scenario', join(sc, `${c.name}.scenario.json`),
    '--inputs', join(sc, `${c.name}.inputs.json`), '--ticks', String(c.ticks), '--out', join(ev, `${c.name}.jsonl`)]);
  console.log('ok', c.name);
}

// Tat dinh: seed 42, 1200 tick, chay 2 lan, so sanh byte.
const a = join(ev, 'default-seed42-run1.jsonl');
const b = join(ev, 'default-seed42-run2.jsonl');
for (const f of [a, b]) headless(['--seed', '42', '--night', '1', '--ticks', '1200', '--out', f]);
const same = Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
writeFileSync(join(ev, 'determinism.txt'),
  `seed=42 night=1 ticks=1200, chay 2 lan
default-seed42-run1.jsonl vs default-seed42-run2.jsonl
byte-identical: ${same ? 'YES' : 'NO'}
size: ${readFileSync(a).length} bytes
`);
console.log('determinism', same ? 'YES' : 'NO');

// Ket qua vitest.
const t = spawnSync('npm test', { cwd: root, encoding: 'utf8', shell: true });
writeFileSync(join(ev, 'vitest.txt'), (t.stdout || '') + (t.stderr || ''));
console.log('vitest exit', t.status);
if (!same || t.status !== 0) process.exit(1);
