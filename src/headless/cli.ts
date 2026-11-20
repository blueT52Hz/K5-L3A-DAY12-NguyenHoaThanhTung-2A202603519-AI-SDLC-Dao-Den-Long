import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { runHeadless } from './run-headless';

const argv = process.argv.slice(2);
const r = runHeadless(argv);
if (r.code === 0) {
  const out = argv[argv.indexOf('--out') + 1];
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, r.lines.join('\n') + '\n');
  } catch (e) {
    process.stderr.write(`error: cannot write ${out}: ${(e as Error).message}\n`);
    process.exit(1);
  }
}
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.code);
