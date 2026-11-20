// Frame-time statistics exactly as defined by the phase 4 ticket (bench.json).

export interface BenchStats { frames: number; avg_fps: number; p1_low_fps: number; frame_ms_p95: number }

const round1 = (x: number): number => Math.round(x * 10) / 10;

/**
 * dts = per-frame times in ms over the measured window.
 * avg_fps = 1000 N / sum(dt); p1_low_fps = 1000 / mean of the k = max(1, ceil(0.01 N)) largest dt;
 * frame_ms_p95 = 95th percentile of dt (nearest rank).
 */
export function computeBenchStats(dts: number[]): BenchStats {
  const n = dts.length;
  if (n === 0) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sorted = [...dts].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(n - k);
  const worstMean = worst.reduce((a, b) => a + b, 0) / k;
  const p95 = sorted[Math.max(0, Math.ceil(0.95 * n) - 1)];
  return {
    frames: n,
    avg_fps: round1((1000 * n) / sum),
    p1_low_fps: round1(1000 / worstMean),
    frame_ms_p95: Math.round(p95 * 100) / 100,
  };
}
