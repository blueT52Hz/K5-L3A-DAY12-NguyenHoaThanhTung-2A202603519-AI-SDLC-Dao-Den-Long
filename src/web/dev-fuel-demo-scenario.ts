import { getNight } from '../core/nights';
import type { NightId, Scenario } from '../core/types';

/**
 * Dev-only (web shell, never core/headless): `?scenario=fuel-demo[&focus=1..5]` preloads a calm Night 1 with lanterns
 * in every fuel state (L1 fuel 80, L2 fuel 20 low, L3 out after being lit, L4 full, L5 never lit) and May parked
 * 8 m behind lantern `focus` (default 1), for screenshots. `&shade=1` adds a Bóng Mực draining L2 (L2 fuel 29). Returns null when the param is absent.
 */
export function devScenarioFromUrl(search: string, night: NightId): Scenario | null {
  const q = new URLSearchParams(search);
  if (q.get('scenario') !== 'fuel-demo') return null;
  const focus = Math.min(5, Math.max(1, Number(q.get('focus')) || 1));
  const [lx, ly, lz] = getNight(night).lanterns[focus - 1].pos;
  const shade = q.get('shade') === '1';
  const l2 = getNight(night).lanterns[1].pos;
  return {
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [lx, ly, lz - 8], carried: 5 },
    lanterns: [
      { id: 'L1', lit: true, fuel: 80, ever_lit: true },
      { id: 'L2', lit: true, fuel: shade ? 29 : 20, ever_lit: true },
      { id: 'L3', lit: false, ever_lit: true },
      { id: 'L4', lit: true, fuel: 100, ever_lit: true },
      { id: 'L5' },
    ],
    ...(shade ? { shades: [{ id: 'S1', pos: [l2[0], l2[1], l2[2] + 1.5] as [number, number, number], state: 'drain' as const, target_lantern_id: 'L2' }] } : {}),
  };
}
