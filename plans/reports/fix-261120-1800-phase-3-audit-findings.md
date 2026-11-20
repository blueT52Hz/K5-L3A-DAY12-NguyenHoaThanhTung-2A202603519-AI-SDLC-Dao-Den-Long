# Fix report: phase 3 audit findings

Status: all 12 items done. `npm run build` + `npm test` green (25 files, 178 tests).

1. Recoil 2 m: `RECOIL_MOVE_TICKS = RECOIL_TICKS - 1` (constants.ts), step = RECOIL_DIST / RECOIL_MOVE_TICKS (shade-ai.ts, recoil branch). Reason: hit is step 9 after movement, last tick ends at step 2 -> 59 moves. State length unchanged. Test tolerance tightened to 1e-6 (step-shades-pulse-hit.test.ts, recoil case). Passes.
2. HUD: `Đèn sáng k/tổng (cần n)` (hud.ts:49). Seen in screenshots ("Đèn sáng 3/5 (cần 3)").
3. Stunned #3A3450: `setShadeStunned` (models/shade-model.ts, exported in models/index.ts), called in scene-sync.ts; dim/shake kept. Also fixed latent bug: `cloneMaterials` made userData rim/eye/body refs point to the originals so colorblind never changed the displayed shade; removed the clone (createShadeModel already builds per-instance materials). Colorblind screenshot shows cyan rim/eyes.
4. UI text #F5F1E6: hud.css line 1 (#hud) and `.panel` color. Accent headings/buttons unchanged.
5. Stun end / drain exit stay wander for that tick: `Shade.noDetectTick` (types.ts, init -1 in shade-spawner.ts), set in `endTimedShadeState` (stunned) and `drainStep` (exit to wander); `wanderOrChase` skips wander->chase when `noDetectTick === s.tick`. Not in snapshot. Recoil end untouched. Test updated (stunned: wander at k+120/121, chase at k+122).
6. Deposit: need = max(0, cost - deposited); deposit/event only if amount > 0; lights when amount >= need (lantern-deposit.ts). New test in tests/core/phase3-audit-fixes.test.ts (deposited 12, carried stays 3, only `lantern_lit`).
7. fuel_drain: decay + all drains first, events queued then emitted with post-tick fuel clamped >= 0, before lantern_out (lantern-fuel.ts). New test: two shades on one lantern report equal fuel.
8. ADR: section 7 rewritten (ticket section 5 defines scores), added 9 (no weak lantern -> Phase 2 random wander), 10 (recoil), 11 (noDetectTick), 12 (fuel_drain), 13 (deposited >= cost). CHANGELOG "Sửa theo audit" lists all + output changes vs Phase 2 evidence.
9. Tests adjusted: only the stunned-end expectation and recoil tolerance; none skipped.
10. Evidence: phase-3 script rerun (vitest.txt, timing refreshed, JSONL byte-identical to before except where not affected). Phase 2 evidence NOT regenerated: `generate-evidence-phase-2.mjs` expects Phase 2 rules (`all_lit`) and reports THIEU under contract 1.2; running it overwrote files, so I reverted `evidence/phase-2` to HEAD (historical Phase 2 snapshot). Screenshots in evidence/phase-3/screenshots: lantern-lit-fuel-bar, lantern-low-fuel, colorblind-shade-warning, lantern-unlit-squashed (+ menu/intro/hud/pause from the measure script). DEV-only `?scenario=fuel-demo&focus=1..5[&shade=1]` in `src/web/dev-fuel-demo-scenario.ts`, hooked in game-boot.ts `loadNight` (web only). `measure-fps-and-screenshots.mjs` now honours `EVIDENCE_DIR`; fps.txt: N1 24.6, N2 26.0, N3 19.3 FPS (SwiftShader, 12 s, below the 30 FPS target on software GL; real GPU not measured). evidence/phase-3/README.md added.
11. Dash grep (README, CHANGELOG, docs, .claude/skills, evidence/phase-3) empty; phase2 plan line 356 now uses `grep -rnP "\x{2013}|\x{2014}"`.
12. out/ already gitignored. Commit contains only my files (see below).

Unresolved / notes:
- Another session is editing the same tree (level select: flow/, landing/, main.ts, settings-panel.ts, evidence/level-select, game-boot.ts startNight hunks) plus an uncommitted vite.config.ts allowedHosts change. Not mine; left out of the commit (game-boot.ts staged with only my 2 hunks).
- FPS below 30 on software GL.
- Phase 2 evidence not refreshed (script obsolete for v1.2).
