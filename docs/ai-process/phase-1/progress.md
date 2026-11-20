# SDD ledger - plan: D:\VinAI\Day12\K5-L3A-DAY12-NguyenHoaThanhTung-2A202603519-AI-SDLC-Dao-Den-Long\docs\superpowers\plans\2026-11-20-dao-den-long-phase1.md

Spec: docs/superpowers/specs/2026-11-20-dao-den-long-phase1-design.md (in repo)
Workspace: D:\VinAI\Day12\plans\261120-1422-dao-den-long-phase1\ (outside repo, briefs = plan sections, reports here)

## Rulings
- Ruling: parallel implementers for tracks A/B/C (user explicitly asked) - disjoint file ownership per plan; each agent `git add` only own paths, retry on index.lock - cost if wrong: commit race, fixable.
- Ruling: no sdd bash scripts in main session (user rule: bash only via subagents) - implementers read their plan section directly as brief; reviewers compute `git diff BASE..HEAD -- <owned paths>` themselves - cost: slightly more reviewer tokens.
- Ruling: work on master of a fresh local repo (Task 0 git init, user approved plan) - no worktree.
- Ruling: plan C1 input line fixed (E conflict) before dispatch.

- Ruling: lab docs (README.md etc.) already in repo root; Task D moves them to `lab/` so README.md becomes the game README - cost: graders expecting lab docs at root (unlikely).

## Progress
- Task 0: complete (commits 611edc1, 6d02538; build+test ok). Ruling: no separate review for scaffold - covered by final review. Note: repo already had lab history (9818fc1).
- A1+A2: complete (commits 6d02538..270be21, review clean - Approved, 4 minor). Ruling: fix minor #1 (clamp timeLeftS >= 0 on win) after A3/A4 via same implementer; minor #2 shade Y is spec-intended (keep scenario Y); #3/#4 parked (low risk, documented).
- A3+A4: implemented (d2992cb, 7c2599a; 44/44, build+smoke ok), review dispatched (opus). Ruling: keep spawn-then-move same tick (spec order 7->8) - cost: tight-tolerance test on spawn radius 38 (unlikely, not contract).
- A minor fix (clamp timeLeftS on win): done 57a25ee, 45/45
- Task D: dispatched (sonnet) in parallel - owns README/lab/scripts/evidence/docs/harness
- B1: complete (commit 23e43bc, 4/4 model tests). Ruling: no separate code review for visual-only models - verified visually in Task D browser check + final review; cost if wrong: cosmetic rework.
- C1: implemented (commit eda2255), browser check deferred to Task D (core missing at the time). Review deferred to integration review (check: ambient light double-up with env, material clone per frame for stunned shade).
