### Spec Compliance
- ✅ Move rotation x'=x cos+z sin, z'=-x sin+z cos, normalize only when len>1: player-movement.ts:11-14. Speed/60 per tick :15.
- ✅ Clamp to island radius 40 (XZ scale): math-xz.ts:10-17, called after move player-movement.ts:18.
- ✅ Edge-trigger jump/interact: step.ts:28-32 (prevButtons updated every live step); held interact fires once (test step-player).
- ✅ Pickup in id order, `<= pickup_radius`, capacity checked per mote, +per_mote, event: mote-pickup.ts:9-14.
- ✅ Deposit: nearest unlit within `<=` interact_radius, strict `<` + id-ordered array => lower id on tie: lantern-deposit.ts:10-14; amount=min(carried, cost-deposited), amount<=0 no event :16-17; lit -> +100, lantern_lit :21-25.
- ✅ Win: bonus uses timeLeftS of tick k+1 (step.ts:24, 13), floor, + per_flame*flames, then game_over, early return (step.ts:41-43). Frozen when not playing :21.
- ✅ Time loss `<=0` -> timeLeftS=0, lost/dawn: step.ts:49-52 (T0=1 loses at tick 60; FP exact since k*60/60... t0-60/60 = 0).
- ✅ Scenario (create-game.ts:44-76): lanterns update by id (pos/deposited/lit), motes/shades replace, [] ok, setup emits no events/score, random flags, auto shade ids skip explicit ones, counters continue. Unknown lantern id throws ScenarioError (cli must map to exit 2 - later task).
- ✅ Determinism: rng only via nextRandom; no Math.random/Date/three/DOM in src/core (grepped committed tree); defaults always drawn in fixed order (create-game.ts:57-59); no Set/Map iteration affecting order.
- ✅ Tuning from game.contract.json via tuning.ts; constants in constants.ts.
- ⚠️ Did not run suite/tsc (told not to). Report claims unverified; `let best = null` (lantern-deposit.ts:8) and `const kept = []` (mote-pickup.ts:8) rely on TS evolving-type inference - should compile under strict but not confirmed.

### Strengths
- Small focused modules, each <200 lines, kebab-case; spec step numbering mapped in comments.
- Tests cover rotation 0/90, diagonal normalize, clamp, jump edge, freeze after end, capacity, partial deposit, held interact, win bonus exact value, scenario variants.
- RNG stream stability per seed (defaults drawn even when overridden) is a thoughtful determinism choice.

### Issues
Critical: none.
Important: none.
Minor:
1. step.ts:13/24 - win bonus with non-integer or tiny `time_left_s` (e.g. 0.01) can have negative timeLeftS at a winning step (time check only at :49 and skipped on win), giving negative bonus and negative time_left_s in end snapshot. Fix: `s.timeLeftS = Math.max(0, ...)` (or clamp before endGame; floor of max(0,..)).
2. create-game.ts:71 - scenario shades keep given Y (contract example gives 0) while spec says center Y=1.0 (SHADE_Y). Distances are XZ so no gameplay effect; snapshot shows y=0 until moved. Decide/normalize to SHADE_Y (or document). A3 shade-move should set Y consistently.
3. create-game.ts:48-49 - scenario lantern `lit:true` with deposited<cost or `deposited>=cost` with lit unset leaves inconsistent state; contract-legal inputs only, low risk. Tests: tie-break (equal-distance lanterns), interact edge re-arm after release, pickup of multiple motes hitting capacity mid-list, and win-vs-dawn same tick are not covered.
4. step.ts:41 - win check keyed on `lantern_lit` event in this tick: if scenario starts with all 5 lit, game never wins (arguably correct per spec: "Đủ 5 đèn" on lighting). Note only.

### Assessment
Task quality: Approved. Core A1+A2 semantics match spec sections 6-7 and the contract (formula, clamp, edge, ordering, tie-break, bonus, scenario); only minor edge-case polish (negative time on non-integer T0, shade Y, a few missing tests).
