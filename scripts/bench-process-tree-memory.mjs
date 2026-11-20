// Sum of resident memory (RSS / Windows working set) of the descendants of a process, in MB.
// Used by scripts/bench.mjs to sample the Chrome process tree. Any failure -> null (bench.json peak_mem_mb null).
import { execFile } from 'node:child_process';

// pids of the listing tools we spawned (wmic / powershell / ps are our own children: never count them).
const toolPids = [];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 5000 }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
    toolPids.push(child.pid);
  });
}

/** [{pid, ppid, bytes}] for every process on the machine. */
async function listProcesses() {
  if (process.platform === 'win32') {
    let out;
    try {
      out = await run('wmic', ['process', 'get', 'ProcessId,ParentProcessId,WorkingSetSize', '/format:csv']);
    } catch {
      // wmic is missing on newer Windows builds: same data through PowerShell CIM.
      out = await run('powershell', ['-NoProfile', '-Command',
        'Get-CimInstance Win32_Process | ForEach-Object { "x,$($_.ParentProcessId),$($_.ProcessId),$($_.WorkingSetSize)" }']);
    }
    // CSV columns (both sources): Node, ParentProcessId, ProcessId, WorkingSetSize.
    return out.split(/\r?\n/).map((l) => l.trim().split(',')).filter((c) => c.length === 4 && /^\d+$/.test(c[2]))
      .map((c) => ({ ppid: Number(c[1]), pid: Number(c[2]), bytes: Number(c[3]) }));
  }
  const out = await run('ps', ['-A', '-o', 'pid=,ppid=,rss=']);
  return out.split('\n').map((l) => l.trim().split(/\s+/).map(Number)).filter((c) => c.length === 3 && c.every(Number.isFinite))
    .map(([pid, ppid, kb]) => ({ pid, ppid, bytes: kb * 1024 }));
}

/**
 * Total MB of every descendant of rootPid (rootPid itself not counted), skipping the subtrees of skipPids.
 * Playwright starts Chrome as a child of the bench node process, so descendants(process.pid) minus the
 * server child = the whole Chrome tree (browser, GPU, renderer, utility processes). null if not measurable.
 */
export async function descendantsRssMb(rootPid, skipPids = []) {
  try {
    toolPids.length = 0;
    const procs = await listProcesses();
    const skip = new Set([...skipPids.filter(Boolean), ...toolPids]);
    const tree = new Set([rootPid]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of procs) if (tree.has(p.ppid) && !tree.has(p.pid) && !skip.has(p.pid)) { tree.add(p.pid); grew = true; }
    }
    tree.delete(rootPid);
    const bytes = procs.filter((p) => tree.has(p.pid)).reduce((a, p) => a + p.bytes, 0);
    return bytes > 0 ? bytes / (1024 * 1024) : null;
  } catch {
    return null;
  }
}
