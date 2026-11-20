# AGENTS.md - quy trình AI cho Đảo Đèn Lồng

Dự án dựng bằng Claude Code với bộ skill `superpowers`. Chủ dự án quyết định phạm vi, luật chơi và mọi lần commit/push; AI làm theo luồng sau.

## Quy trình

1. **Brainstorming** (`superpowers:brainstorming`): làm rõ PRD-0 và Test Contract với chủ dự án, chốt luật chơi và tuning.
2. **Design spec**: `docs/superpowers/specs/2026-11-20-dao-den-long-phase1-design.md` (luật, thứ tự xử lý từng tick, headless I/O, giả định).
3. **Writing plans** (`superpowers:writing-plans`): `docs/superpowers/plans/2026-11-20-dao-den-long-phase1.md` (task 0, A1-A4, B1, C1, D; ràng buộc chung và "Review Focus").
4. **Subagent-driven development** (`superpowers:subagent-driven-development`): ba nhánh song song với file sở hữu riêng:
   - Nhánh A: lõi `src/core` + headless `src/headless` + test (đường găng).
   - Nhánh B: model 3D `src/web/models`.
   - Nhánh C: vỏ web (vòng lặp 60Hz, input, camera, HUD).
   - Task 0 scaffold chạy trước; Task D (ghép, evidence, tài liệu) chạy cuối.
   - Mỗi task có báo cáo; lõi có review riêng (Approved, các lỗi nhỏ đã xử lý hoặc ghi lại); tích hợp được review lần cuối.
5. **Bằng chứng**: `scripts/generate-evidence.mjs` sinh JSONL, determinism và vitest; ảnh chụp lấy từ bản build thật.

## Phase 2 (3 Đêm, contract v1.1)

Cùng bộ skill `superpowers`, luồng: brainstorming -> spec -> plan -> subagent-driven development (mỗi task một implementer, chạy tuần tự hoặc song song theo file sở hữu; task nhỏ có review, task cuối không).

- Spec: `docs/superpowers/specs/2026-11-20-dao-den-long-phase2-design.md` (mọi [TQ] là giả định, ghi ở README).
- Plan: `docs/superpowers/plans/2026-11-20-dao-den-long-phase2.md` (Task 0-11).
- Sổ SDD (ledger, báo cáo từng task, rulings): `.superpowers/sdd/2026-11-20-dao-den-long-phase2/` (`progress.md`, `task-*-report.md`).
- Skill dự án: `.claude/skills/dao-den-long-contract/SKILL.md` (luật contract v1.3, thứ tự 12 bước của tick, cách thêm scenario và evidence, lệnh kiểm tra).
- Bằng chứng: `scripts/generate-evidence-phase-2.mjs` sinh JSONL cho từng tính năng mới, determinism cả 3 Đêm, thời gian chạy; scenario ở `evidence/phase-2/scenarios/`.
- Quyết định của chủ dự án khi hết thời gian: bỏ chạy `npm test` và review từng task ở giai đoạn cuối; chỉ `npx tsc --noEmit` / `npm run build` trước khi commit. `evidence/phase-2/vitest.txt` ghi rõ điều này. Rủi ro: hành vi chưa được test lại có thể hồi quy.
- Không `git add -A`; mỗi agent chỉ thêm file mình sở hữu (nhiều agent commit song song, gặp `index.lock` thì chờ và thử lại). Không push, không tag khi chưa được đồng ý.

## Phase 3 và 4 (contract v1.2, v1.3)

Cùng luồng superpowers. Phase 3: luật dầu đèn và thắng ở bình minh (ADR `docs/adr/0001-lantern-fuel-state-and-dawn-win.md`). Phase 4 (v1.0.0, contract v1.3): bench, soak, server + bảng xếp hạng, trợ năng, đóng gói; spec/plan `docs/superpowers/specs|plans/2026-11-20-dao-den-long-phase4*.md`. Cờ `bench` của lõi mặc định false, không vào snapshot, không rút RNG. Skill dự án đã cập nhật lên v1.3. Retro: `docs/retro.md`.

## Quy tắc làm việc

- Lõi không import three/DOM, không `Math.random`/`Date`; tuning chỉ đọc từ `game.contract.json`.
- Mỗi agent chỉ `git add` file mình sở hữu. Commit local, không push khi chưa được đồng ý.
- Không sửa tay evidence. Không có bằng chứng thì chưa xong.

## Con trỏ

- Spec: `docs/superpowers/specs/`
- Plan: `docs/superpowers/plans/`
- Sổ SDD và báo cáo từng task: `docs/ai-process/phase-1/` (progress.md, task-*-report.md, review-*.md)
- Nhật ký AI và giả định: `docs/ai-log.md`
- Skill Phase 2: `.claude/skills/dao-den-long-contract/SKILL.md`
- Harness: `CLAUDE.md`, `.claude/rules/*.md` và hook Stop thật (`.claude/settings.json` + `.claude/hooks/run-tests-before-stop.sh`: chạy `npm test`, chặn kết thúc khi test đỏ). Đã loại cấu hình cá nhân và khóa/token. Skill đã dùng là skill superpowers toàn cục, không vendor trong repo.
