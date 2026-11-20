# Task A1 + A2 report

Status: DONE. No types.ts/constants.ts/tuning.ts change.

Commits: e3f48af feat(core): seeded game creation and scenario setup; second commit feat(core): player movement, pickup and lantern deposit (see git log).

Files: src/core/{rng,create-game,math-xz,step}.ts, src/core/systems/{player-movement,mote-pickup,lantern-deposit}.ts, tests/core/{create-game.test,step-player.test,helpers}.ts.

TDD: A1 RED = module not found (create-game moved away), GREEN 7/7 (impl was written before first RED run, RED verified afterwards by removing it). A2 RED = step module missing, GREEN 18/18 total in tests/core. tsc --noEmit clean for core/tests.

Decisions:
- Movement rotation uses contract formula x'=x cos+z sin, z'=-x sin+z cos.
- Default lanterns: L(i) at (25 sin(72i deg), 0, 25 cos(72i deg)); L1=(0,0,25).
- Mote/shade defaults always drawn in fixed RNG order (motes then shades) even if scenario overrides; stable per seed.
- Scenario shades without id: S1.. skipping explicit ids; next ids = max number + 1.
- Scenario lantern lit:true does not alter deposited.
- step computes timeLeftS = t0 - tick/60 at start; sub-step 10 (dawn loss, timeLeftS clamped to 0) already implemented in step.ts. Win check happens right after interact; early return.
- step.ts has comment slots for A3: sub-step 0 (timers), pulse edge (prevButtons already stores pulse), 5, 7, 8, 9. Move the dawn check after them.
- Dawn check is in step.ts bottom; A3 must keep it last.

Concerns: none blocking. mote_picked data is exactly {carried} per contract.
