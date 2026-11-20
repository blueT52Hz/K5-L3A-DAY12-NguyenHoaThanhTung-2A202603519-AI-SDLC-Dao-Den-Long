import type { Shade } from '../types';

/** Order shades by the number in their id (S2 before S10). */
export function compareShadeIds(a: Shade, b: Shade): number {
  return Number(a.id.slice(1)) - Number(b.id.slice(1));
}
