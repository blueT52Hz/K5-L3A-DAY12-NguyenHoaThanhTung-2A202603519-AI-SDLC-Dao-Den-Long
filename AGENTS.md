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

## Quy tắc làm việc

- Lõi không import three/DOM, không `Math.random`/`Date`; tuning chỉ đọc từ `game.contract.json`.
- Mỗi agent chỉ `git add` file mình sở hữu. Commit local, không push khi chưa được đồng ý.
- Không sửa tay evidence. Không có bằng chứng thì chưa xong.

## Con trỏ

- Spec: `docs/superpowers/specs/`
- Plan: `docs/superpowers/plans/`
- Sổ SDD và báo cáo từng task: `docs/ai-process/phase-1/` (progress.md, task-*-report.md, review-*.md)
- Nhật ký AI và giả định: `docs/ai-log.md`
- Harness: `CLAUDE.md` và `.claude/rules/*.md` (đã loại cấu hình cá nhân, hook, skill, khóa/token).
