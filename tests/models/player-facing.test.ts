import { describe, expect, it } from 'vitest';
import { shortestAngle, stepFacing } from '../../src/web/player-facing';

describe('player facing', () => {
  it('takes the shortest way around the circle', () => {
    expect(shortestAngle(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6.0, 5);
  });
  it('converges to camera yaw (rad) and never overshoots', () => {
    let f = 0;
    for (let i = 0; i < 120; i++) f = stepFacing(f, 90, 1 / 60);
    expect(f).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
    expect(f).toBeCloseTo(Math.PI / 2, 2);
  });
});
