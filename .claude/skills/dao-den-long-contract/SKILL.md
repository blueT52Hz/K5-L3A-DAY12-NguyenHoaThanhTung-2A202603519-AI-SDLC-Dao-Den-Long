---
name: dao-den-long-contract
description: Luật Test Contract v1.3 (luật chơi giữ từ v1.2) và thứ tự tick của game Đảo Đèn Lồng (Phase 4, v1.0.0). Dùng khi sửa lõi src/core, headless, scenario hoặc evidence, hoặc khi thêm tính năng cần giữ tính tất định.
---

# Đảo Đèn Lồng - contract v1.3

v1.3 chỉ đổi lệnh trong `game.contract.json` (`run_cmd` `npm start`, `bench_cmd`, `soak_cmd`); tuning và luật chơi giữ nguyên v1.2.

Nguồn sự thật: `game.contract.json` (tuning), `src/core/constants.ts` (số chuẩn khác), `src/core/nights/` (bản đồ), spec `docs/superpowers/specs/2026-11-20-dao-den-long-phase3-design.md` (Phase 3) và `...-phase2-design.md` (mọi [TQ] ghi ở README mục Giả định), ADR `docs/adr/0001-lantern-fuel-state-and-dawn-win.md`.

## Luật bất biến

- `src/core` là TypeScript thuần: không import three/DOM, không `Math.random`, không `Date`. Ngẫu nhiên chỉ qua `nextRandom(s)` (`src/core/rng.ts`, trạng thái `s.rngState`).
- Tuning chỉ đọc từ `game.contract.json` qua `TUNING`. Không hardcode số tuning trong code.
- Cùng seed + cùng input/scenario = output byte-identical. Thứ tự rút RNG là một phần của hợp đồng: thêm một lần rút RNG sẽ đổi mọi output sau nó.
- Tên trạng thái Bóng Mực đúng: `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain`. Gió Lạc: `idle`, `chase`, `flee`, `removed`.
- `invuln` trong snapshot là boolean; `night_start` ghi ngay sau snapshot tick 0; `--night` chỉ 1|2|3 (khác: mã thoát 1; file sai: mã thoát 2).
- Dầu đèn là số nguyên đơn vị 1/60 (`fuelUnits`, max 6000), không dùng số thực; vùng an toàn = lit && fuel >= 30; hút dầu và đi tới đèn yếu không rút RNG. Thắp đủ đèn không kết thúc ván; thắng chỉ ở bình minh (`dawn_survived`).
- Cờ `GameState.bench` (bench, Phase 4): mặc định `false`, không đưa ra snapshot, bật bằng `bench-scene.ts` chỉ cho cảnh đo FPS; khi bật tắt sinh thực thể, hit, nhặt, hao/hút dầu và kết thúc ván; **không rút RNG**. Mọi code mới đọc cờ này phải giữ nguyên thứ tự rút RNG của chế độ thường, để output headless v1.0-v1.2 không đổi.
- Không đưa trạng thái nội bộ (vd `safeZoneLanternIds`) ra snapshot.

## Thứ tự một tick (`src/core/step.ts`)

1. Input: `pause` trước (cạnh bật/tắt, phát `paused`/`resumed`); khi tạm dừng bỏ bước 2-11 nhưng vẫn cập nhật `prevButtons`; snapshot vẫn chạy.
2. Giảm bộ đếm (`tickTimers`: thời gian, cooldown, bất tử, stun/recoil/spawning, bùa, ttl đom đóm rơi, hồi bùa, hồi sinh, hẹn giờ Gió Lạc), rồi dầu (`burnAndDrainFuel`: giảm 1 đơn vị/tick mỗi đèn sáng, 5 đơn vị cho mỗi Bóng Mực `drain`, event `fuel_drain` mỗi 60 tick, đèn dầu <= 0 tắt và phát `lantern_out`).
3. Gió (`updateWind`), lướt, di chuyển (nhảy, bục nhảy, gió), rồi kiểm tra rơi (`checkFall`).
4. Nhặt đom đóm và bùa.
5. Nạp đèn (cạnh `interact`): thắp, thắp lại (`relight`) hoặc châm dầu (`refuel`).
6. Vùng an toàn (`updateSafeZones`, gắn `evicting`).
7. Tỏa sáng (cạnh `pulse`, gồm `pulseDrifters`).
8. Di chuyển Bóng Mực (gồm đi tới đèn yếu và vào/ra `drain`) và Gió Lạc.
9. Gió Lạc cướp, rồi Bóng Mực gây hit.
10. Sinh theo lịch: đom đóm (mỗi 240), Bóng Mực (tick 300 rồi theo chu kỳ Đêm), Gió Lạc (mỗi 1200). Thực thể mới chỉ tương tác từ tick sau.
11. Thắng/thua (`resolveEndOfTick`): hết Ngọn Lửa thua `no_flames`; `time_left_s <= 0`: đèn sáng >= ceil(0.6 x tổng) thắng `dawn_survived` (+ thưởng bình minh), ngược lại thua `dawn`.
12. Snapshot (do người gọi: headless hoặc web), luôn chạy.

Ván đã kết thúc thì `step` không làm gì.

## Ngữ nghĩa bộ đếm

Bộ đếm giảm ở bước 2 trước khi xử lý input. Đặt N ở bước k thì còn hiệu lực đúng N bước kế tiếp. `time_left_s = T0 - simTick/60` (`simTick` không tăng khi tạm dừng). Frame input `tick: k` được áp ở bước tạo ra tick k+1.

## Thêm scenario và evidence

1. Viết `evidence/phase-3/scenarios/<tên>.scenario.json` (+ `<tên>.inputs.json`). Scenario có thể thay: `player`, `motes`, `shades`, `lanterns` (kể cả `lit`, `fuel`, `ever_lit`), `drifters`, `charms`, `time_left_s`, cờ `random_motes`, `random_shades`, `random_drifters`, `wind_enabled` (false = tắt lịch sinh/gió tương ứng). Đặt `random_*: false` để scenario chỉ có đúng thứ khai báo.
2. Thêm một dòng vào mảng `cases` trong `scripts/generate-evidence-phase-3.mjs`: tên, night, seed, ticks, snapshot-every, các chuỗi bắt buộc phải có trong JSONL (vd `"name":"dash"`). Script báo THIEU và thoát mã 1 nếu thiếu.
3. Chạy lại script; không sửa tay file trong `evidence/`. Thêm test tương ứng trong `tests/` nếu hành vi mới.

## Lệnh kiểm tra

- Kiểu và build: `npm run build` (tsc --noEmit, vite build, esbuild headless).
- Test: `npm test` (phải xanh; test cũ hỏng vì luật mới thì sửa kỳ vọng hoặc xóa, không skip, ghi vào `CHANGELOG.md`).
- Headless: `node dist-headless/headless.mjs --seed 1 --night 2 --ticks 600 --out out/x.jsonl --scenario s.json --inputs i.json`.
- Bằng chứng: `npm run build && node scripts/generate-evidence-phase-3.mjs`.
- Bench: `npm run build` rồi `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` (Playwright, Chrome có giao diện 1280x720, tắt vsync; dùng server ở `PORT`, mặc định 4173). Không chạy lại khi không cần: bench.json là số đo đã commit.
- Soak: `node dist-headless/soak.mjs --seed 7 --nights 10 --out soak.json` (input ngẫu nhiên tất định).
- Server và bảng xếp hạng: `npm start` (`node server.mjs`); `node server.mjs --export-leaderboard out.json`.
- Bản phát hành: `npm run release` tạo `release/dao-den-long-v1.0.0.zip`.
- Dấu gạch: chỉ dùng `-` thường, không dùng en dash hay em dash; kiểm bằng `grep -rnP "\x{2013}|\x{2014}" README.md AGENTS.md docs .claude/skills` (phải rỗng).
