export type Vec3 = [number, number, number];
export type XZ = [number, number];
export type NightId = 1 | 2 | 3;
export type ShadeState = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned' | 'drain';
export type DrifterState = 'idle' | 'chase' | 'flee' | 'removed';
export interface ScoreTuning { per_mote: number; per_lantern: number; per_relight: number; per_stun: number; per_stun_drain: number; dawn_per_lantern: number; per_flame_left: number }
export interface Tuning { player_speed: number; carry_capacity: number; lantern_cost: number; lantern_count_night1: number;
  pickup_radius: number; interact_radius: number; pulse_cost: number; pulse_radius: number; night1_duration_s: number;
  night2_duration_s: number; night3_duration_s: number;
  flames: number; invuln_s: number; hit_drop_ratio: number; pulse_stun_s: number; pulse_push_m: number;
  pulse_cooldown_s: number; safe_radius: number; shade_speed: number; shade_hit_radius: number; fall_enabled: boolean;
  dash_speed: number; dash_duration_s: number; dash_cooldown_s: number;
  fuel_max: number; fuel_decay_per_s: number; fuel_per_mote: number; relight_cost: number; win_ratio: number;
  drain_per_s: number; low_fuel_threshold: number; capacity_max: number; score: ScoreTuning }
export interface InputFrame { move: XZ; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean; dash: boolean; pause: boolean }
export interface Player { pos: Vec3; vel: Vec3; vy: number; grounded: boolean; facing: XZ; flames: number; carried: number;
  invulnTicks: number; pulseCooldownTicks: number; dashTicks: number; dashCooldownTicks: number; dashDir: XZ;
  charmTicks: number; launchVel: XZ | null; respawnTicks: number; successfulLights: number }
export interface Mote { id: string; pos: Vec3; kind: 'random' | 'dropped'; ttlTicks: number | null }
export interface Shade { id: string; pos: Vec3; state: ShadeState; stateTicks: number; pushTicks: number; pushDir: XZ;
  heading: XZ; headingTicks: number; evictTicks: number; evictFrom: XZ | null;
  targetLanternId: string | null; drainTicks: number;
  /** Tick on which the shade left stunned/drain for wander: no wander->chase detection that tick (internal, not in snapshot). */
  noDetectTick: number }
export interface Drifter { id: string; pos: Vec3; state: DrifterState; stolen: number; stateTicks: number; heading: XZ; headingTicks: number }
export interface Charm { id: string; pos: Vec3; available: boolean; respawnTicks: number }
export interface WindState { warning: boolean; active: boolean; dirDeg: number }
export interface Lantern { id: string; pos: Vec3; lit: boolean; deposited: number;
  /** Fuel in 1/60 units (FUEL_UNITS_PER_FUEL per fuel); integer. */
  fuelUnits: number; everLit: boolean; relitCount: number }
export type GameStatus = 'playing' | 'won' | 'lost';
export interface GameEvent { tick: number; name: string; data: Record<string, unknown> }
export interface GameState { night: NightId; tick: number; simTick: number; paused: boolean; status: GameStatus; t0: number; timeLeftS: number; score: number;
  player: Player; motes: Mote[]; shades: Shade[]; lanterns: Lantern[]; drifters: Drifter[]; charms: Charm[]; wind: WindState;
  rngState: number; nextMoteId: number; nextShadeId: number; nextDrifterId: number;
  // shadeSpawnEnabled: scheduled shade spawns (scenario random_shades:false turns them off).
  // safeZoneLanternIds: lit lanterns whose safe zone updateSafeZones has already seen (a lit lantern not in it was just lit).
  shadeSpawnEnabled: boolean; safeZoneLanternIds: string[];
  windEnabled: boolean; drifterSpawnEnabled: boolean; moteSpawnEnabled: boolean;
  // bench: benchmark scene (createBenchGame) - no spawns, hits, pickups, fuel use or end of night. Never in snapshots.
  bench: boolean;
  prevButtons: { jump: boolean; interact: boolean; pulse: boolean; dash: boolean; pause: boolean } }
export interface Scenario {
  player?: { pos?: Vec3; carried?: number; flames?: number; invuln_ticks?: number; dash_cd_ticks?: number; pulse_cd_ticks?: number; charm_ticks?: number; successful_lights?: number };
  random_motes?: boolean; random_shades?: boolean; random_drifters?: boolean; wind_enabled?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3; state?: ShadeState; state_ticks_left?: number; target_lantern_id?: string }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean; fuel?: number; ever_lit?: boolean }[];
  drifters?: { id?: string; pos: Vec3; state?: DrifterState; stolen?: number }[];
  charms?: { id: string; pos?: Vec3; available?: boolean; respawn_ticks?: number }[];
  time_left_s?: number }
