import { describe, it, expect } from 'vitest';
import contract from '../game.contract.json';
import { TUNING } from '../src/core/tuning';

describe('contract tuning', () => {
  it('loads values', () => {
    expect(TUNING.lantern_count_night1).toBe(5);
    expect(TUNING.score.per_lantern).toBe(100);
  });

  it('contract v1.2 tuning', () => {
    expect(contract.contract_version).toBe('1.2');
    expect(TUNING).toMatchObject({
      lantern_cost: 10, pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5, pulse_cooldown_s: 3,
      pulse_stun_s: 2, safe_radius: 6, invuln_s: 1.5, fall_enabled: true, dash_speed: 14, dash_duration_s: 0.2,
      dash_cooldown_s: 1.5, night2_duration_s: 270, night3_duration_s: 300,
    });
    expect(TUNING.score.per_stun).toBe(5);
  });
});
