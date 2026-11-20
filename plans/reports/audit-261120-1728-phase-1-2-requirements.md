# Audit - Phase 1 + Phase 2 requirements vs current repo (after Phase 3)

Date: 2026-11-20. Read-only audit. HEAD `903c4d8` (merge decor into phase 3), tags `phase-1`, `phase-2` present.
Sources: `D:\VinAI\Day12\phase-2.html` (TICKET-02 + contract v1.1 + DoD), `D:\VinAI\Day12\phase1.html` (PRD-0 + contract v1.0, found in parent dir, used together with `docs/superpowers/specs/2026-11-20-dao-den-long-phase1-design.md`), `D:\VinAI\Day12\phase-3.html` ([THAY THE] markers only).

## Method
- `npm run build` OK (tsc + vite + esbuild -> `dist-headless/headless.mjs`). `npm test`: 24 files, 176/176 pass.
- Read all of `src/core/**`, `src/headless/**`, key `src/web/**` (flow, pause, settings, audio, HUD, palette, ambient).
- Probe script (scratchpad, outside repo) ran 115 headless checks against built CLI, outputs only in `out/audit/`. 111 pass first run; the other 4 were mistakes in my probe (wrong expectation or snapshot cadence). Rechecked by hand: 3 PASS, 1 real deviation (recoil, F15).
- Working tree: `vite.config.ts` has an uncommitted change (allowedHosts for a demo domain). It does not affect any requirement.

Legend: PASS / FAIL / R3 = REPLACED-BY-P3 (not a failure) / R2 = P1 self-chosen rule superseded by P2 standard (not a failure) / CV = CANNOT-VERIFY.

## Summary counts
| Status | Count |
|---|---|
| PASS | 81 |
| FAIL | 4 (all low severity) |
| R3 (replaced by P3) | 9 |
| R2 (P1 own choice superseded by P2) | 3 |
| CV | 7 |

## A. Contract file / tuning
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| A1 | `game.contract.json` at root with team/build_cmd/run_cmd/headless_cmd | PASS | game.contract.json:1-6 |
| A2 | contract_version "1.1" | R3 | now "1.2" (P3 sec 7) |
| A3 | tuning = P2 standard numbers (speed 6, cap 10, cost 10, pickup 1, interact 2, pulse 3/5/3s, stun 2s, push 4, invuln 1.5s, drop 0.5, safe 6, shade 4, hit 1, flames 3, fall_enabled true) | PASS | game.contract.json:7-26 |
| A4 | v1.1 keys dash_speed/dash_duration_s/dash_cooldown_s/night2/night3_duration_s | PASS | game.contract.json:44-49 |
| A5 | durations 300/330/360 | R3 | 240/270/300 |
| A6 | score keys incl per_second_left, P2 score formula | R3 | P3 sec 5 replaces whole formula |
| A7 | core reads tuning from contract (single source) | PASS | src/core/tuning.ts:1-4 |
| A8 | lantern_count_night1 = 5 | PASS | game.contract.json:11 |

## B. CLI / output
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| B1 | `--seed --night --ticks --out [--scenario --inputs --snapshot-every]` | PASS | src/headless/parse-args.ts:15-36 |
| B2 | missing seed/ticks/out -> exit 1 + stderr | PASS | probe: 3/3 exit 1, "error: missing required --ticks" |
| B3 | `--night` accepts 1,2,3; other -> 1 | PASS | parse-args.ts:27; probe night 0/4 -> 1, 1/2/3 -> 0 |
| B4 | malformed inputs/scenario -> exit 2 (bad JSON, types, tick not strictly increasing, move out of [-1,1], unknown lantern id) | PASS | run-headless.ts:41; probe 9/9 |
| B5 | stop at N steps or on game end, exit 0 | PASS | run-headless.ts:30-36; `end.ticks` = steps |
| B6 | snapshot tick 0 + every k (default 10) | PASS | probe cadence [0,10,20] |
| B7 | `end` always last line | PASS | run-headless.ts:38 |
| B8 | extra snapshot at end tick if missing | PASS | run-headless.ts:37 |
| B9 | coords/time rounded to 3 decimals | PASS | serialize.ts:5; tests/headless/run-headless.test.ts:64 |
| B10 | full night (<=21600 ticks) <= 30 s | PASS | probe 184-351 ms per night (game ends early); evidence/phase-2/headless-timing.txt 0.76-1.17 s for full 18000-21600 ticks |
| B11 | determinism (same seed/scenario/inputs byte-identical, incl ids) | PASS | probe: nights 1/2/3, seed 777, 6000 ticks, snapshot every tick: identical (15.7/7.3/20.5 MB); evidence/phase-2/determinism.txt |
| B12 | no Math.random/Date/three/DOM in core+headless | PASS | grep returned nothing |
| B13 | no window/GPU needed for headless | PASS | pure Node bundle |

## C. Tick model
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| C1 | snapshot tick 0 = after scenario, before input | PASS | run-headless.ts:26 |
| C2 | step k emits events with tick k+1, before snapshot k+1 | PASS | probe mote_picked tick 1 before snapshot |
| C3 | time_left_s = duration - sim steps/60 | PASS | step.ts:37; probe T0=1 -> dawn at tick 60 |
| C4 | sim_tick = tick when not paused | PASS | step.ts:31-36 |
| C5 | mandated 12-step order (pause, timers, move+fall, pickups, lantern, safe zone, pulse, shade+drifter move, steal then hit, spawns, win/lose, snapshot) | PASS | step.ts:28-57 |
| C6 | paused: tick advances, sim_tick/time/cooldowns/spawns/TTL frozen, snapshot state "paused" | PASS | step.ts:33-35, serialize.ts:15; probe sim_tick frozen at 10 for ticks 11-20 |
| C7 | entities spawned at step 10 interact only next tick | PASS | step.ts:53-55 after hits |
| C8 | inputs: defaults, fields persist, edges false->true (jump/interact/pulse/dash/pause), yaw rotation formula, normalize >1 | PASS | parse-inputs.ts, player-movement.ts:12-18; probe yaw 90 -> -Z, diagonal len 6 |

## D. Snapshot / events (v1.0 + v1.1)
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| D1 | root: type,tick,sim_tick,state,time_left_s,score,player,lanterns,shades,motes_active + night, wind{active,dir_deg} | PASS | serialize.ts:13-29; probe keys |
| D2 | player: pos,flames,carried + vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s | PASS | serialize.ts:18-22 |
| D3 | arrays motes(id,pos,kind random/dropped,ttl_s), drifters(id,pos,state,stolen), charms(id,available,respawn_s) | PASS | serialize.ts:26-28 |
| D4 | shade states named spawning/wander/chase/recoil/stunned | PASS | types.ts:4; probe saw only those (+drain from P3) |
| D5 | events v1.0 (mote_picked, deposit, lantern_lit, pulse, player_hit, shade_spawned, game_over) + v1.1 (dash, charm_picked, drifter_steal, drifter_drop, night_start, paused, resumed, player_hit fall `lost`) | PASS | all observed in probe; player-fall-respawn.ts:16 |
| D6 | game_over reason all_lit | R3 | dawn_survived (P3 sec 7) |

## E. Scenario
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| E1 | player pos/carried/flames + invuln_ticks/dash_cd_ticks/pulse_cd_ticks/charm_ticks | PASS | create-game.ts:68-75 |
| E2 | random_motes/random_shades/random_drifters/wind_enabled flags | PASS | create-game.ts:40-41 |
| E3 | motes/shades/drifters/charms replace default lists (empty = none) | PASS | create-game.ts:58-117 |
| E4 | shades id optional (auto S1..), state, state_ticks_left | PASS | create-game.ts:87-101 |
| E5 | lanterns updated by id (pos/deposited/lit); unknown id -> exit 2 | PASS | create-game.ts:45-54 |
| E6 | time_left_s override | PASS | create-game.ts:28 |
| E7 | setup emits no events, adds no score | PASS | probe score 0 at tick 0 |

## F. Rules (P2 Part 1; P1 rules superseded where P2 standardizes)
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| F1 | run 6 m/s, accel/stop <= 0.1 s, full air control | PASS | player-movement.ts:21-28; probe z=6.000 after 60 ticks |
| F2 | jump 7 m/s, g -20, grounded only | PASS | player-movement.ts:61; probe no double jump (apex 1.167, see CV6) |
| F3 | dash 14 m/s / 0.2 s / cd 1.5 s from start; dir = move else facing; keeps height in air; no invuln | PASS | player-dash.ts:15-25; probe 2.8 m, dash ticks [1,91] |
| F4 | carry capacity 10 | R3 | P3 sec 4: 10 + 2 x successful_lights, max 20 (base 10 kept) |
| F5 | pickup XZ <= 1.0 and height diff <= 1.5 | PASS | mote-pickup.ts:17; probe 2 of 3 picked |
| F6 | 20 initial motes at distinct points, cap 30, +1 at 240/480/... at free point, skip if none | PASS | mote-spawner.ts:15-38; probe 21 motes at tick 240 on all nights |
| F7 | lantern cost 10, multiple deposits, keeps progress | PASS | lantern-deposit.ts:38-45; probe 6+4 -> lit |
| F8 | interact r 2.0, min(carried, missing), nearest, tie -> lower id | PASS | lantern-deposit.ts:21-26; probe tie -> L2 |
| F8b | only unlit lanterns considered | R3 | P3 sec 1 (refuel lit lanterns) |
| F9 | lit lantern safe zone r 6, shade blocked at edge | PASS | shade-zones.ts:95-120; probe min dist 6.000, 0 hits |
| F9b | zone always present while lit | R3 | P3 sec 2: fuel < 30 loses zone |
| F10 | shade inside on lighting pushed out within 30 ticks, no damage meanwhile | PASS | shade-zones.ts:52-87, player-hit.ts:38; probe out by tick 31, 0 hits |
| F11 | pulse: cost 3, r 5 (3D to shade center, center feet+0.8), cd 3 s, stun 120 ticks, push 4 m over 15 ticks, stop on obstacle, +X on coincide, re-pulse refreshes, no kill, < 3 motes no activation | PASS | pulse.ts:15-37, shade-ai.ts:28-35; probe all sub-checks |
| F12 | shade speed 4.0 (night 3: 4.5) | PASS | nights/*: shadeSpeed |
| F13 | detect 12 m / give up 18 m | PASS | shade-ai.ts:41-42 |
| F14 | touch XZ <= 1.0 and height <= 1.5; max 1 flame lost per tick; by id order | PASS | player-hit.ts:37-41; probe hits at 1,91,181 with 2 shades touching |
| F15 | hit shade recoils 2 m over 60 ticks | FAIL (low) | player-hit.ts:47-50 + timers.ts:38/shade-ai.ts:77-80: recoil set at step 9 after movement, counter decremented first next tick, so only 59 moves = 1.967 m (probe: x 0.433 -> 2.400) |
| F16 | touching while invulnerable does nothing | PASS | player-hit.ts:36 |
| F17 | 2 shades at tick 300 then 1 per interval (480/420/360), ids S1.., >= 15 m from player, max 6/8/10, skip if no point | PASS | shade-spawner.ts:15-40; probe schedules N1 300,300,780,1260; N2 ...720,1140; N3 ...660,1020 |
| F18 | hit: -1 flame, drop floor(carried/2) on ring 1.5-2.5 m, TTL 480, pickable next tick, invuln 90 | PASS | player-hit.ts:42-46; probe dropped 3, ring ok, ttl_s 8 |
| F19 | fall Y < -10: once, ignores invuln, -1 flame, lose all motes, 60-tick wait (no pickup/touch), respawn start, vel 0, invuln 90; no flames -> lose, no respawn | PASS | player-fall-respawn.ts:10-31; probe all |
| F20 | 3 flames, refilled each night | PASS | create-game.ts:32; game-boot.ts:52-53 (new state per night) |
| F21 | after each tick no flames -> always lost/no_flames | PASS | win-lose.ts:26 |
| F21b | all lit -> win (also on last tick); timeout -> dawn | R3 | P3 sec 3 (win at dawn with >= ceil(0.6 x n) lit) |
| F22 | game total = sum of won nights | PASS | flow/game-flow-state-machine.ts:170-172 |
| F22b | P2 score formula (+10/mote, +100/lantern, +5/stun, time bonus, +50/flame) | R3 | P3 sec 5 |
| P1a | P1 own tuning (lantern_cost 5, pickup 1.5, interact 3, etc.) | R2 | replaced by P2 standard table |
| P1b | P1 own map/spawn rules (40 random motes, shades every 45 s, 2 at start, invisible wall, fall off) | R2 | replaced by P2 Part 2 maps |
| P1c | `--night` other than 1 -> exit 1 | R2 | P2 v1.1 accepts 1,2,3 |

## G. Maps (P2 Part 2)
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| G1 | N1: disc r 40, start (0,0,0) facing +Z, L1-L5 coords, 8 pts r 12 + 16 pts r 33, 12 shade pts r 37 (15 deg + 30 k) | PASS | nights/night-1-dao-ben.ts:10-26 |
| G2 | N2: discs r 28 at (0,0,0)/(70,0,0), bridge x[26,44] z[-2,2], pads (20,0,18)/(50,0,-18) vy 14 + 24 m/s toward other island center, held until landing, dash allowed, ~1.4 s flight; points; L1-L6; every 7 s, max 8 | PASS | night-2-dao-cau.ts:9-48; probe launch tick 1, land tick 84 (1.38 s) at (51.2,0,6.4) on island B |
| G3 | N3: disc r 45; tier 1 annulus 12-24 z>0 Y 3; tier 2 disc r 8 Y 6; cliffs; ramps 30/150 deg r 30->24; pad (0,3,13) vy 12, 8 m/s -Z -> tier 2; tower r 2 h 8; 18+8+4 mote pts; 16 shade pts r 43; L1-L7; every 6 s, max 10 | PASS | night-3-dao-chuong.ts:10-41; probe cliff blocks, ramp to Y 3, pad lands Y 6 |
| G4 | wind N3: every 30 s, 5 s, random dir, 2 m/s, 2 s warning (leaves + sound) | PASS | wind-gusts.ts:11-26; probe active [1800,2100), 2.000 m/s; web wind-leaves.ts, game-boot.ts:129 |
| G5 | angle convention (+X, toward +Z) consistent with tier 1 z > 0 | PASS | ring-points.ts:4-10 (cos, sin -> x, z) |

## H. P2 Part 3 features (web + core)
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| H1 | Gio Lac: 7 m/s, max 2, spawn 1200/2400 on mist points, ids D1..; idle 2 m/s -> chase (>= 5 motes, <= 15 m, every tick) -> back to idle; touch 1.2 steals min(3,carried) once, flee 240 ticks then removed; pulse chase -> flee no steal; pulse flee with loot -> drop all, removed after 120; no flame loss; safe zone does not block; invuln does not prevent | PASS | drifter-ai.ts:36-127; probe 9 sub-checks |
| H2 | Bua Gio: C1 (35,0,0) N2; C1/C2 (+-30,0,25) N3; pickup like motes; 600 ticks refreshable; 7.2 m/s; dash no cooldown (press during dash ignored, still 12 ticks at 14 m/s); respawn 2700 | PASS | charms.ts:10-21, player-dash.ts:17-23; probe speed 7.2, dash ticks [1,15], respawn_s 45 |
| H3 | 3-night flow: menu -> intro (island name, Ong Dang line) -> play -> result -> next; dawn screen with total after N3; retry on loss | PASS | game-flow-state-machine.ts, flow-screens.ts:251-272 (code review; see CV7) |
| H4 | pause Esc/P, logic fully stopped; Tiep tuc / Choi lai Dem / Cai dat / Ve menu | PASS | pause-overlay.ts:294-299, game-boot.ts:92-97 (core pause input) |
| H5 | settings: volume + mouse sensitivity persisted | PASS | settings/settings-store.ts:35-51 (localStorage) |
| H6 | audio: night music + SFX pickup, light, pulse, hit, jump, dash, win, lose, shade appear, 10 s countdown | PASS | audio/event-to-sound.ts:7-20, game-boot.ts:122-128 |
| H7 | HUD: flames TL, mm:ss TC red + blink <= 30 s, mote bar (10 slots), dash/pulse cooldown BR, "E - Nap anh sang (x/10)" near lantern, arrow to nearest unlit lantern off-screen | PASS | hud.ts:61-99, hud.css:6-9, hud/lantern-pointer.ts |
| H7b | HUD "den k/n" (lit / total) top-right | FAIL (low) | hud.ts:69-70 shows `Den sang ${lit}/${need}` with need = ceil(0.6 x n), not total n. Arguably an adaptation to the P3 win rule, but P3 did not mark this HUD rule as [THAY THE] |
| H8 | palette: sky, mist, grass, sand, wood, cloud sea, lantern lit/core/off, mote core/halo, shade body/rim, May robe/scarf, charm, gold, drifter, UI danger | PASS | models/palette.ts + uses in models/*.ts, hud.css:9 (#ff5a5f); score text #ffb35c is within 10% of #F2C14E |
| H8b | stunned shade color #3A3450 | FAIL (low) | PALETTE.shadeStunned defined (models/palette.ts:7) but never used; stun shown via opacity 0.4 + shake (scene-sync.ts:101-104) |
| H8c | UI text color #F5F1E6 | FAIL (low) | hud.css:1 `color: #ffb35c`, panels #ffd9a8 (hud.css:44); G/B channels differ by ~24% from F5F1E6 |
| H9 | ambient = 0.15 + 0.55 x lit/total | PASS | decor/decor-atmosphere.ts:11-14, 84 (formula x PI for three.js physical units - documented in comment) |

## I. Deliverables / DoD
| ID | Requirement | Status | Evidence |
|---|---|---|---|
| I1 | tags phase-1, phase-2 | PASS | `git tag` |
| I2 | README: <= 3 install/run commands, controls, scoring, assumptions, "Sang tao cua toi" | PASS | README.md:9-16, 36, 91, 105, 141 |
| I3 | P1 evidence (vitest, JSONL pickup/deposit/pulse/hit/win/dawn, determinism diff, screenshots), generated by script | PASS | evidence/phase-1/* |
| I4 | P2 evidence per phase requirement | PASS | evidence/phase-2/* (13 feature JSONL + scenarios, determinism 3 nights, timing, fps, 8 screenshots) |
| I5 | AI log + assumptions | PASS | docs/ai-log.md (P1 sec 1-38, P2 sec 39-66) |
| I6 | harness AGENTS.md/CLAUDE.md, skills, hooks in repo; updated for P2 in git history | PASS | AGENTS.md:19-28; .claude/skills/dao-den-long-contract/SKILL.md; .claude/settings.json + hooks/run-tests-before-stop.sh; commit 4c24f8c |
| I7 | spec with acceptance criteria per Part 3 item | PASS | README.md:128-139; spec phase2 line 181 points to plan + README |
| I8 | >= 1 headless scenario per new feature | PASS | tests/core/step-drifters, step-dash-wind-charm, step-pause tests (createGame scenarios) + evidence/phase-2/scenarios. UI-only items (flow, settings, audio, HUD, palette) cannot be headless; no unit tests for GameFlow/settings-store (note) |
| I9 | npm test green now / build compiles | PASS | 176/176, build OK |

## CANNOT-VERIFY
| ID | Item | Why |
|---|---|---|
| CV1 | >= 30 FPS avg at 1280x720 on the CURRENT build | evidence/phase-2/fps.txt (N3 31.9 on SwiftShader) predates decor merge; README.md:147 says ~35-38 FPS for in-game decor, but there is no measured file for HEAD. Re-run `scripts/measure-fps-and-screenshots.mjs` to out/ |
| CV2 | runs on macOS/Linux | README.md:168 says Windows only so far |
| CV3 | hidden P1/P2 tests (regression DoD) | hidden; own suite green |
| CV4 | snapshot `invuln` type (boolean chosen) | ticket gives name only; documented in SKILL.md:16 |
| CV5 | `night_start` written after snapshot tick 0 with tick 0 | ticket does not fix position; documented in SKILL.md:16 |
| CV6 | jump kinematics exactness | semi-implicit Euler: apex 1.167 m, airtime 41 ticks vs analytic 1.225 m / 42 ticks; ticket fixes only v and g |
| CV7 | web flow/audio/settings runtime behaviour | code review only, no browser run in this audit (screenshots in evidence/phase-2/screenshots support menu/intro/hud/pause) |

## Risks / notes (not failures)
- Timer convention: invuln 90 set at hit tick T -> next hit possible at T+90 (probe hits 1,91,181). Stun 120: stunned at T..T+119. Consistent everywhere except recoil (F15).
- Scenario shade Y is snapped to ground + 1.0 (create-game.ts:94), P1 spec said keep given Y. XZ logic unchanged; Y only matters for 3D pulse distance.
- Nights hardcode shadeSpeed 4 / 4.5 (night-*.ts) instead of reading TUNING.shade_speed; values match today, drift risk if the contract changes.
- evidence/phase-2/vitest.txt records that tests were NOT rerun at phase-2 tag (owner decision); current suite is green.
- Uncommitted `vite.config.ts` change (allowedHosts) in working tree.

## Recommended fixes (low effort)
1. F15: start recoil motion on the hit tick, or set `stateTicks = RECOIL_TICKS + 1`, or use step `RECOIL_DIST / (RECOIL_TICKS - 1)`, so total = 2.0 m. Add a test.
2. H7b: show `Den ${lit}/${total}` and put the threshold elsewhere (e.g. `can ${need}`).
3. H8b: in scene-sync.ts shade update, set body color to PALETTE.shadeStunned while stunned (keep the opacity effect if wanted).
4. H8c: set HUD/panel text color to #F5F1E6 (hud.css:1, :44); keep orange only for accents.
5. CV1: re-measure FPS on HEAD and save the result under evidence (when allowed).

## Unresolved questions
- Is the HUD lantern count (H7b) expected to stay lit/total after P3, or is lit/needed acceptable to the grader?
- Does the grader's palette check cover HUD text color and stunned shade color, or only the 3D scene?
- Should FPS evidence be refreshed for HEAD (decor merge added heavy scenery after the phase-2 measurement)?
