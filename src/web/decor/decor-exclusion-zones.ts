import type { NightConfig, Surface } from '../../core/nights';
import { groundBelow } from '../../core/terrain/terrain-queries';

/** Exclusion radii (m) around gameplay points where no decor may be scattered. */
export const EXCLUSION_RADII = {
  lantern: 2.5, moteSpawn: 1.5, shadeSpawn: 2, jumpPad: 2, charm: 1.5, start: 3,
  obstacleMargin: 1, rectRampMargin: 1,
} as const;

const near = (x: number, z: number, p: readonly number[], r: number): boolean =>
  Math.hypot(x - p[0], z - p[2]) <= r;

/** True if (x,z) lies on a rect/ramp surface grown by rectRampMargin on every side. */
function inGrownBridge(s: Surface, x: number, z: number): boolean {
  const m = EXCLUSION_RADII.rectRampMargin;
  if (s.kind === 'rect') return x >= s.xMin - m && x <= s.xMax + m && z >= s.zMin - m && z <= s.zMax + m;
  if (s.kind === 'ramp') {
    const a = (s.angleDeg * Math.PI) / 180;
    const along = x * Math.cos(a) + z * Math.sin(a);
    const across = -x * Math.sin(a) + z * Math.cos(a);
    return Math.abs(across) <= s.width / 2 + m && along >= s.rFrom - m && along <= s.rTo + m;
  }
  return false;
}

/** True if decor must not be placed at (x,z) for this night. */
export function isExcluded(cfg: NightConfig, x: number, z: number): boolean {
  const R = EXCLUSION_RADII;
  return (
    near(x, z, cfg.start, R.start) ||
    cfg.lanterns.some((l) => near(x, z, l.pos, R.lantern)) ||
    cfg.moteSpawnPoints.some((p) => near(x, z, p, R.moteSpawn)) ||
    cfg.shadeSpawnPoints.some((p) => near(x, z, p, R.shadeSpawn)) ||
    cfg.jumpPads.some((j) => near(x, z, j.pos, R.jumpPad)) ||
    cfg.charms.some((c) => near(x, z, c.pos, R.charm)) ||
    cfg.obstacles.some((o) => Math.hypot(x - o.cx, z - o.cz) <= o.r + R.obstacleMargin) ||
    cfg.surfaces.some((s) => inGrownBridge(s, x, z))
  );
}

const PROBE_ANGLES = 8;
const PROBE_RADIUS = 1;
const MAX_Y_DELTA = 0.5;

/** Ground Y for scattering at (x,z), or null near island/tier edges or void. */
export function scatterGroundY(cfg: NightConfig, x: number, z: number): number | null {
  const y = groundBelow(cfg, x, z, 100);
  if (y === null) return null;
  for (let i = 0; i < PROBE_ANGLES; i++) {
    const a = (i / PROBE_ANGLES) * Math.PI * 2;
    const py = groundBelow(cfg, x + Math.cos(a) * PROBE_RADIUS, z + Math.sin(a) * PROBE_RADIUS, 100);
    if (py === null || Math.abs(py - y) > MAX_Y_DELTA) return null;
  }
  return y;
}
