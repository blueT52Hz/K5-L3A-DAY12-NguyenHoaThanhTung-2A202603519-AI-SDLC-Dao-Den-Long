import { getNight } from '../../core/nights';

export type DemoNightId = 1 | 2 | 3;

/** Parse ?night=1..3&lit=N. Invalid night -> 1; non-integer lit -> 0; lit clamped to the night's lantern count. */
export function parseDecorDemoQuery(search: string): { night: DemoNightId; lit: number } {
  const p = new URLSearchParams(search);
  const n = Number(p.get('night'));
  const night: DemoNightId = n === 2 || n === 3 ? n : 1;
  const raw = p.get('lit');
  const litNum = raw !== null && /^-?\d+$/.test(raw.trim()) ? Number(raw) : 0;
  const max = getNight(night).lanterns.length;
  return { night, lit: Math.min(max, Math.max(0, litNum)) };
}
