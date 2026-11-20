import { fuelValue } from '../core/systems/lantern-fuel';
import { playerCapacity } from '../core/systems/player-capacity';
import type { GameEvent, GameState, Vec3 } from '../core/types';

const r3 = (x: number): number => Math.round(x * 1000) / 1000 + 0;
const v3 = (p: Vec3): Vec3 => [r3(p[0]), r3(p[1]), r3(p[2])];


const sec = (ticks: number): number => r3(ticks / 60);

export function snapshotLine(s: GameState): string {
  const p = s.player;
  return JSON.stringify({
    type: 'snapshot', tick: s.tick, sim_tick: s.simTick, night: s.night,
    state: s.paused && s.status === 'playing' ? 'paused' : s.status,
    time_left_s: r3(s.timeLeftS), score: s.score,
    wind: { active: s.wind.active, dir_deg: r3(s.wind.dirDeg) },
    player: {
      pos: v3(p.pos), vel: v3(p.vel), grounded: p.grounded, flames: p.flames, carried: p.carried,
      invuln: p.invulnTicks > 0, dash_cd_s: sec(p.dashCooldownTicks), pulse_cd_s: sec(p.pulseCooldownTicks), charm_s: sec(p.charmTicks),
      capacity: playerCapacity(s),
    },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: v3(l.pos), lit: l.lit, deposited: l.deposited, fuel: l.lit ? fuelValue(l) : 0, ever_lit: l.everLit, relit_count: l.relitCount })),
    shades: s.shades.map((x) => ({ id: x.id, pos: v3(x.pos), state: x.state })),
    motes_active: s.motes.length,
    motes: s.motes.map((m) => ({ id: m.id, pos: v3(m.pos), kind: m.kind, ttl_s: m.ttlTicks === null ? null : sec(m.ttlTicks) })),
    drifters: s.drifters.map((d) => ({ id: d.id, pos: v3(d.pos), state: d.state, stolen: d.stolen })),
    charms: s.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: sec(c.respawnTicks) })),
  });
}

export function eventLine(e: GameEvent): string {
  return JSON.stringify({ type: 'event', tick: e.tick, name: e.name, data: e.data });
}

export function endLine(s: GameState): string {
  return JSON.stringify({ type: 'end', ticks: s.tick, state: s.status, score: s.score });
}
