# Audit Phase 3 (TICKET-03 "Den can dau", contract v1.2)

Date: 2026-11-20. Scope: HEAD 903c4d8 (branch after merge decor). Read-only.
Source of truth: `D:\VinAI\Day12\phase-3.html`; accepted interpretation: `docs/superpowers/specs/2026-11-20-dao-den-long-phase3-design.md`.

## Summary

| Status | Count |
|---|---|
| PASS | 49 |
| PARTIAL | 3 |
| FAIL | 1 |
| CANNOT-VERIFY | 7 |

Build: `npm run build` exit 0 (tsc + vite + esbuild). Tests: `npm test` 24 files / 176 tests pass, 0 skip/todo/only (`grep -rn "\.skip|\.todo|it\.only" tests` empty).
Headless edge scenarios: `out/audit/*.scenario.json|inputs.json|jsonl` (16 cases, runner in scratchpad, all ran exit 0).

## FAIL / PARTIAL

| # | Item | Status | Evidence | Fix |
|---|---|---|---|---|
| 1 | Tag submission `phase-3` | FAIL | `git tag` -> only `phase-1`, `phase-2`; `vite.config.ts` uncommitted (M) | after user approval: commit/discard vite.config.ts, `git tag phase-3` (local) |
| 2 | Wander with no weak lantern -> "di ve den tat gan nhat nhu truoc" | PARTIAL | `src/core/systems/shade-ai.ts:46-53` random heading; design spec says "giu wander ngau nhien". Ticket literal says go to nearest unlit lantern. Phase 1/2 tickets never defined wander target, so "nhu truoc" = team's previous behaviour (random) is defensible, but spec contradicts ticket wording | keep (RNG/headless stability) but record the interpretation in ADR; or implement deterministic walk to nearest unlit lantern when no weak lantern (changes RNG stream vs Phase 2 outputs) |
| 3 | Stun end -> wander (also drain -> wander) | PARTIAL | `shade-ai.ts:23` sets wander at step 2, but `wanderOrChase` (`shade-ai.ts:39`) flips to chase in step 8 same tick if May <= 12 m. Pulse needs May <= 5 m, push 4 m -> shade always <= ~9 m -> snapshot at stun end never shows `wander` (case J: tick 121 `S1:chase`, `S2:chase`). Same for drain exit on lantern_out with May <= 12 m | decide: if hidden test expects `wander` at end tick, skip the detect check on the tick a shade just left stunned/drain (flag set in endTimedShadeState / drainStep). Otherwise document in ADR as intended |
| 4 | DoD evidence | PARTIAL | `evidence/phase-3/` has headless jsonl + determinism + timing, but `vitest.txt` stale (16 files/149 tests vs current 24/176), no README, no screenshot of fuel bar / blink / colorblind / torn lantern | regenerate `scripts/generate-evidence-phase-3.mjs` after merge; add screenshots (normal vs colorblind, low-fuel lantern) + short README |

## Checklist

### 1. Fuel
| Req | Status | Evidence |
|---|---|---|
| max 100 | PASS | contract `fuel_max 100`; `lantern-fuel.ts:7`; scenario clamp `create-game.ts:51` |
| fuel=100 on light/relight | PASS | `lantern-deposit.ts:48`; case G tick1 `L4:on/100` |
| decay 1/s (1/60 per tick) | PASS | `lantern-fuel.ts:27,31`; case D1 100 -> 99 at tick 60 |
| integer 1/60 units, round on output | PASS | `fuelUnits` int, `fuelValue` `lantern-fuel.ts:19`; drain 5 units/tick |
| refuel formula | PASS | `lantern-deposit.ts:8-9,37-41`; case A (95.5, tick5 fuel 95.42) -> refuel amount 1, fuel 100, carried 3->2, +5; B2 50 -> amount 6 (carried 12) |
| full lantern not selectable, no event/score | PASS* | `lantern-deposit.ts:25`. *Note: decay runs at step 2 before interact step 5, so a lit lantern is never at 100 at interact time (case B: scenario fuel 100, interact tick1 -> fuel 99.98 -> refuel amount 1, nearer full-ish L1 chosen over unlit L2). Consistent with ticket formula + tick order; see Q1 |
| receivable-only, nearest, tie lower id | PASS | `lantern-deposit.ts:22-28` (strict `<` over id-ordered array) |
| fuel<=0 -> off, deposited 0, lantern_out, ever_lit | PASS | `lantern-fuel.ts:47-55`; case E tick110 `L1:off/0/d0/e1` + `lantern_out`; D1 tick60 |
| relight 5 vs 10 | PASS | `lantern-deposit.ts:43`; case G deposit 5 -> lit relight:true |
| fuel bar on lit lantern | CANNOT-VERIFY | code `lantern-fuel-bar.ts`, `lantern-model.ts:61-65`, `scene-sync.ts:127-130`; visual |
| blink 1 Hz when < 30 (lantern + bar) | CANNOT-VERIFY | `lantern-model.ts:62` `sin(2*pi*t)>0` (1 Hz) hides bar + dims cage; visual |
| ambient light drops | CANNOT-VERIFY | `scene-sync.ts:131` decor.syncLanterns ambient by lit count; visual |

### 2. Shade drain
| Req | Status | Evidence |
|---|---|---|
| zone lost < 30 | PASS | `hasSafeZone` `lantern-fuel.ts:13`, used by `shade-zones.ts:18` |
| exactly 30 keeps zone | PASS | case K: units 1800 at tick2 -> random wander; 1799 tick3 -> shade heads to L1 |
| only wander picks weak, nearest / lower id | PASS | `shade-drain-behavior.ts:15-24`, called only from wander branch `shade-ai.ts:46`; case L tie L2 vs L5 -> moves +X (L2) |
| no weak lantern -> nearest unlit | PARTIAL | see table #2 |
| chase keeps target | PASS | chase branch `shade-ai.ts:39-44` ignores lanterns |
| <= 2 m XZ -> drain, stand still | PASS | `shade-drain-behavior.ts:34-38`; case E shades static |
| 5/s per shade stacking + own decay | PASS | case E: 11 units/tick, 1200 units -> out tick 110 (= ceil(1200/11)) |
| drain -> chase (May <= 6 m) | PASS | `shade-drain-behavior.ts:50`; case I tick1 chase |
| drain -> stunned (pulse) | PASS | `pulse.ts:30-34`; case J |
| drain -> wander (out / >=30 / > 2 m) | PASS | case E (out), H (refuel 34.9), M (5 m away) |
| stun end -> wander | PARTIAL | see table #3 |
| refuel >= 30 with shade in 6 m -> pushed out <= 30 ticks, no damage | PASS | `shade-zones.ts:52-65` + `evictStep`; `player-hit.ts:35` excludes evicting; case H: out at r=6 by tick30, no player_hit |

### 3. Win
| Req | Status | Evidence |
|---|---|---|
| 240/270/300 s | PASS | contract + `nights/*.ts durationS`; timing evidence ends 14400/16200/18000 ticks |
| ceil(0.6 x total) 3/5, 4/6, 5/7 | PASS | `win-lose.ts:31`; node: ceil(0.6*5)=3, 6->4, 7->5 (0.6*5 === 3 exact) |
| no early win | PASS | no all_lit path; `tests/core/step-tick-order.test.ts` updated |
| no_flames first even on dawn tick | PASS | `win-lose.ts:28`; case C tick1 hit + `no_flames` with 5/5 lit |
| lose dawn below threshold | PASS | case D1 lantern out on tick 60 = last tick -> lost `dawn` |
| reasons dawn_survived/dawn/no_flames | PASS | `win-lose.ts:5`; cases C, D1, D2 |
| tick order: fuel in step 2, out right after, win/lose last | PASS | `step.ts:35-36,56` |

### 4. Capacity
| Req | Status | Evidence |
|---|---|---|
| 10 + 2 x successful_lights, max 20 | PASS | `player-capacity.ts:5-6`; case F successful_lights 6 -> cap 20; G 10 -> 12 |
| relight counts | PASS | `lantern-deposit.ts:49` |
| scenario lanterns don't count, reset per night | PASS | `create-game.ts:34,76`; web `game-boot.ts:53` new createGame per night |
| HUD carried / capacity | PASS | `hud.ts:53-57` |

### 5. Score
| Req | Status | Evidence |
|---|---|---|
| +5 per mote (light/relight/refuel) | PASS | `lantern-deposit.ts:40,57` |
| +100 first light | PASS | `lantern-deposit.ts:51` |
| +40 relight | PASS | case G score 65 = 25 + 40 |
| stun 5 / 15 if was drain | PASS | case J: S1 drain + S2 wander -> 20 |
| dawn: 50 + floor(fuel) per lit | PASS | case D2: 3 flames x50 + 2x(50+99) + (50+0) = 498 |
| dawn: +50 per flame | PASS | same |
| no time bonus | PASS | `per_second_left` removed (grep empty) |
| game total / replay unchanged | PASS | `game-flow-state-machine.ts` untouched since phase-2 |

### 6. Colorblind
| Req | Status | Evidence |
|---|---|---|
| setting "Bang mau de phan biet" persisted | PASS | `settings-store.ts:2,18`, `settings-panel.ts:16,33-35`, `game-boot.ts:63` |
| shade outline + eyes #7A3CFF -> #00B3FF | CANNOT-VERIFY | `shade-model.ts:30-35`, `scene-sync.ts:100`; visual |
| UI warning #FF5A5F -> #FFFFFF + warning icon | CANNOT-VERIFY | `hud.css:9-11`, `colorblind-mode.ts:12`, `hud.ts:45,51`; visual |
| unlit squashed 20% + torn paper; low fuel blink | CANNOT-VERIFY | `lantern-model.ts:47-52` (0.8 of lit scale, torn group visible only unlit); visual |

### 7. Contract v1.2
| Req | Status | Evidence |
|---|---|---|
| contract_version 1.2 + 8 tuning keys/values | PASS | `game.contract.json` all present, values match |
| night durations in tuning | PASS | 240/270/300 |
| snapshot lantern fuel (1 dp, off = 0), ever_lit, relit_count; player capacity | PASS | `serialize.ts:21-23` |
| shade state drain | PASS | `parse-scenario.ts:15`, snapshot case E |
| scenario lit/fuel/ever_lit, successful_lights, target_lantern_id, lit w/o fuel -> 100 | PASS | `parse-scenario.ts`, `create-game.ts:45-53,70-73`; case F L1 lit -> 100, L2 lit:false fuel 50 -> 0 |
| events refuel / lantern_out / fuel_drain every 60 ticks | PASS | cases A, E (fuel_drain tick 60 per shade) |
| lantern_lit relight true/false | PASS | case G; tests updated `relight:false` |
| game_over dawn_survived; all_lit gone | PASS | grep `all_lit` in src empty |

### DoD
| Req | Status | Evidence |
|---|---|---|
| evidence | PARTIAL | see table #4 |
| ADR on lantern state model + win | PASS | `docs/adr/0001-lantern-fuel-state-and-dawn-win.md` (minor: item 7 says scores "de khong neu" - wrong, ticket section 5 defines them) |
| old tests updated/deleted with reason, no silent skip | PASS | CHANGELOG table; diffs in 6 test files; no skip |
| CHANGELOG with breaking changes | PASS | `CHANGELOG.md` Phase 3 section |
| Phase 1-2 non-replaced behaviour (hidden tests) | CANNOT-VERIFY | local 176 tests pass; determinism byte-identical 3 nights |
| submission tag phase-3 | FAIL | see table #1 |

## Real bugs / risks found (not checklist failures)

1. Low - scenario `lit:true, fuel:0` keeps a lit lantern with fuel 0 in snapshot tick 0, goes out at tick 1 (case F L3). `create-game.ts:51-52`. Fix: if lit and fuel <= 0 -> lit=false, ever_lit=true (or reject as ScenarioError).
2. Low - lantern with `deposited >= cost` (e.g. scenario ever_lit + deposited 7) can never be lit: `need <= 0 -> return` (`lantern-deposit.ts:43-45`, case N carried 7 untouched). Fix: if need <= 0 light immediately, or clamp deposited at create.
3. Low - two shades draining one lantern on same tick report different `fuel` in `fuel_drain` (case E: S1 9.1, S2 9.0) because event emitted inside per-shade loop (`lantern-fuel.ts:36-44`). Fix: collect drain first, emit events after all subtractions.
4. Medium - no new unit tests for any Phase 3 rule (design spec explicitly opted out). Fuel/drain/capacity/score are only covered by headless evidence. Suggest add vitest cases mirroring audit scenarios A, C, D1/D2, E, G, H, J, K.
5. Info - wander shade aiming at a weak lantern inside another lantern's safe zone is clamped at edge forever (cannot drain). Acceptable, maybe note in ADR.
6. Info - HUD prompt `interactPrompt` (`hud/hud-layout.ts:20`) shows only for unlit/low-fuel lanterns although refuel works on any non-full lit lantern. UX only.

## Unresolved questions

1. Q1: "Den day dau (used=0) khong duoc chon" - with decay before interact, used=0 is unreachable in play; a hidden test that seeds `fuel:100` and expects the farther unlit lantern would fail. Is "full" meant as fuel at tick start (pre-decay) or at step 5? Current code = step 5 (strict ticket order).
2. Q2: stun end / drain exit -> `wander`: must the snapshot show `wander` on that tick even when May <= 12 m? (table #3)
3. Q3: ticket "khong co thi di ve den tat gan nhat nhu truoc" vs spec random wander - accepted? (table #2)
4. `vite.config.ts` uncommitted change - intended for phase-3 tag?
