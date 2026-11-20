---
name: dao-den-long-contract
description: Luật Test Contract v1.1 và thứ tự tick của game Đảo Đèn Lồng (Phase 2). Dùng khi sửa lõi src/core, headless, scenario hoặc evidence, hoặc khi thêm tính năng cần giữ tính tất định.
---

# Đảo Đèn Lồng - contract v1.1

Nguồn sự thật: `game.contract.json` (tuning), `src/core/constants.ts` (số chuẩn khác), `src/core/nights/` (bản đồ), spec `docs/superpowers/specs/2026-11-20-dao-den-long-phase2-design.md` (mọi [TQ] ghi ở README mục Giả định).

## Luật bất biến

- `src/core` là TypeScript thuần: không import three/DOM, không `Math.random`, không `Date`. Ngẫu nhiên chỉ qua `nextRandom(s)` (`src/core/rng.ts`, trạng thái `s.rngState`).
- Tuning chỉ đọc từ `game.contract.json` qua `TUNING`. Không hardcode số tuning trong code.
- Cùng seed + cùng input/scenario = output byte-identical. Thứ tự rút RNG là một phần của hợp đồng: thêm một lần rút RNG sẽ đổi mọi output sau nó.
- Tên trạng thái Bóng Mực đúng: `spawning`, `wander`, `chase`, `recoil`, `stunned`. Gió Lạc: `idle`, `chase`, `flee`, `removed`.
- `invuln` trong snapshot là boolean; `night_start` ghi ngay sau snapshot tick 0; `--night` chỉ 1|2|3 (khác: mã thoát 1; file sai: mã thoát 2).
- Không đưa trạng thái nội bộ (vd `safeZoneLanternIds`) ra snapshot.

## Thứ tự một tick (`src/core/step.ts`)

1. Input: `pause` trước (cạnh bật/tắt, phát `paused`/`resumed`); khi tạm dừng bỏ bước 2-11 nhưng vẫn cập nhật `prevButtons`; snapshot vẫn chạy.
2. Giảm bộ đếm (`tickTimers`: thời gian, cooldown, bất tử, stun/recoil/spawning, bùa, ttl đom đóm rơi, hồi bùa, hồi sinh, hẹn giờ Gió Lạc).
3. Gió (`updateWind`), lướt, di chuyển (nhảy, bục nhảy, gió), rồi kiểm tra rơi (`checkFall`).
4. Nhặt đom đóm và bùa.
5. Nạp đèn (cạnh `interact`).
6. Vùng an toàn (`updateSafeZones`, gắn `evicting`).
7. Tỏa sáng (cạnh `pulse`, gồm `pulseDrifters`).
8. Di chuyển Bóng Mực và Gió Lạc.
9. Gió Lạc cướp, rồi Bóng Mực gây hit.
10. Sinh theo lịch: đom đóm (mỗi 240), Bóng Mực (tick 300 rồi theo chu kỳ Đêm), Gió Lạc (mỗi 1200). Thực thể mới chỉ tương tác từ tick sau.
11. Thắng/thua (`resolveEndOfTick`): hết Ngọn Lửa thua; đủ đèn thắng (kể cả đúng tick hết giờ); `time_left_s <= 0` thua dawn.
12. Snapshot (do người gọi: headless hoặc web), luôn chạy.

Ván đã kết thúc thì `step` không làm gì.

## Ngữ nghĩa bộ đếm

Bộ đếm giảm ở bước 2 trước khi xử lý input. Đặt N ở bước k thì còn hiệu lực đúng N bước kế tiếp. `time_left_s = T0 - simTick/60` (`simTick` không tăng khi tạm dừng). Frame input `tick: k` được áp ở bước tạo ra tick k+1.

## Thêm scenario và evidence

1. Viết `evidence/phase-2/scenarios/<tên>.scenario.json` (+ `<tên>.inputs.json`). Scenario có thể thay: `player`, `motes`, `shades`, `lanterns`, `drifters`, `charms`, `time_left_s`, cờ `random_motes`, `random_shades`, `random_drifters`, `wind_enabled` (false = tắt lịch sinh/gió tương ứng). Đặt `random_*: false` để scenario chỉ có đúng thứ khai báo.
2. Thêm một dòng vào mảng `cases` trong `scripts/generate-evidence-phase-2.mjs`: tên, night, seed, ticks, snapshot-every, các chuỗi bắt buộc phải có trong JSONL (vd `"name":"dash"`). Script báo THIEU và thoát mã 1 nếu thiếu.
3. Chạy lại script; không sửa tay file trong `evidence/`. Thêm test tương ứng trong `tests/` nếu hành vi mới.

## Lệnh kiểm tra

- Kiểu và build: `npm run build` (tsc --noEmit, vite build, esbuild headless).
- Test: `npm test`. (Phase 2 kết thúc mà không chạy lại do quyết định của chủ dự án; mặc định vẫn nên chạy.)
- Headless: `node dist-headless/headless.mjs --seed 1 --night 2 --ticks 600 --out out/x.jsonl --scenario s.json --inputs i.json`.
- Bằng chứng: `npm run build && node scripts/generate-evidence-phase-2.mjs`.
- Dấu gạch: chỉ dùng `-` thường, không dùng en dash hay em dash; kiểm bằng `grep -rnP "\x{2013}|\x{2014}" README.md AGENTS.md docs .claude/skills` (phải rỗng).
