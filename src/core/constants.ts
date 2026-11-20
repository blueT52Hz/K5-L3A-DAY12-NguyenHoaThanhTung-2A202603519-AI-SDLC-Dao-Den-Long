// Standard numbers from ticket "phase-2" (Phan 2 maps + contract table). Tuning values live in game.contract.json.
export const SHADE_Y = 1.0;
export const JUMP_VELOCITY = 7;
export const GRAVITY = -20;
export const TICK_RATE = 60;

// Terrain / falling
export const STEP_UP = 0.3;
export const FALL_Y = -10;
export const RESPAWN_WAIT_TICKS = 60;
export const RESPAWN_INVULN_TICKS = 90;

// Motes
export const MOTE_INITIAL = 20;
export const MOTE_CAP = 30;
export const MOTE_SPAWN_EVERY = 240;
export const DROPPED_TTL_TICKS = 480;
export const DROP_RING_MIN = 1.5;
export const DROP_RING_MAX = 2.5;
export const HEIGHT_TOLERANCE = 1.5;

// Pulse
export const PULSE_CENTER_DY = 0.8;
export const PULSE_PUSH_TICKS = 15;

// Shades
export const SHADE_DETECT = 12;
export const SHADE_GIVE_UP = 18;
export const SHADE_FIRST_SPAWN_TICK = 300;
export const SHADE_FIRST_SPAWN_COUNT = 2;
export const SHADE_SPAWN_MIN_DIST = 15;
export const SHADE_SPAWNING_TICKS = 60;
export const SHADE_WANDER_FACTOR = 0.5;
export const HEADING_CHANGE_TICKS = 120;
export const RECOIL_TICKS = 60;
export const RECOIL_DIST = 2;
export const EVICT_MAX_TICKS = 30;

// Wind charm
export const CHARM_TICKS = 600;
export const CHARM_RESPAWN_TICKS = 2700;
export const CHARM_RUN_SPEED = 7.2;

// Drifters (Gio Lac)
export const DRIFTER_SPEED = 7;
export const DRIFTER_IDLE_SPEED = 2;
export const DRIFTER_MAX = 2;
export const DRIFTER_SPAWN_EVERY = 1200;
export const DRIFTER_CHASE_MIN_CARRIED = 5;
export const DRIFTER_DETECT = 15;
export const DRIFTER_TOUCH = 1.2;
export const DRIFTER_STEAL_MAX = 3;
export const DRIFTER_FLEE_TICKS = 240;
export const DRIFTER_DROP_VANISH_TICKS = 120;
export const DRIFTER_Y = 1.5;

// Strong wind (Night 3)
export const WIND_PERIOD_TICKS = 1800;
export const WIND_DURATION_TICKS = 300;
export const WIND_WARN_TICKS = 120;
export const WIND_SPEED = 2;

// Lantern fuel (Phase 3)
export const FUEL_UNITS_PER_FUEL = 60;
export const DRAIN_RANGE_M = 2;
export const DRAIN_CHASE_RADIUS = 6;
export const FUEL_DRAIN_EVENT_TICKS = 60;
