# Task A3 + A4 report

Status: DONE. No types.ts change.
Commits: d2992cb feat(core): pulse, shade ai, player hit and night timer; A4 commit feat(headless): contract v1.0 cli with jsonl output (git log).
Tests: vitest run = 44/44 (31 core, 8 headless, 5 other); tsc clean; npm run build OK; smoke `node dist-headless/headless.mjs --seed 7 --night 1 --ticks 300 --out out/smoke.jsonl` exit 0, last line end.
RED seen before impl for A3 (8 fails) and A4 (module missing).

Files: core/systems/{timers,pulse,shade-ai,shade-zones,player-hit}.ts, step.ts updated; headless/{errors,parse-args,parse-inputs,parse-scenario,serialize,run-headless,cli}.ts.

Decisions/concerns:
- Shade spawned at tick 2700 moves in the same tick (spec order 7 then 8), so its distance from center is ~37.94, not exactly 38. A hidden test with tight tolerance on 38 could differ. Easy switch: skip move for shade spawned this tick.
- Final extra snapshot at end tick is written only if the game ended (status != playing) and tick has no snapshot; --ticks 25 yields 3 snapshots.
- Safe zone clamp: radial push out of lit lanterns, 3 passes with island clamp last.
- Pulse push with shade at exact player pos uses +x.
- Exit codes: usage/other errors 1; bad JSON/shape/unreadable file/unknown lantern id 2.
- Dropped motes use RNG (angle/radius), ids continue M<nextMoteId>.

## Fix: clamp time left
step.ts timeLeftS = max(0, t0 - tick/60); test added (time_left_s 0.01 win). Commit: fix(core): clamp time left at zero on win.
