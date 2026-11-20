import { describe, it, expect } from 'vitest';
import { TUNING } from '../src/core/tuning';

describe('contract tuning', () => {
  it('loads values', () => {
    expect(TUNING.lantern_count_night1).toBe(5);
    expect(TUNING.score.per_lantern).toBe(100);
  });
});
