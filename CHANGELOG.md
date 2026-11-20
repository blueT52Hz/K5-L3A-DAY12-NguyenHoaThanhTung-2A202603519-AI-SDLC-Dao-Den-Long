# Changelog

## Phase 4 - "Bình minh" v1.0.0 (contract v1.3)

### Breaking changes
- `game.contract.json`: `contract_version` 1.3; `run_cmd` đổi thành `npm start` (`node server.mjs`, cổng `PORT` mặc định 4173, phục vụ `dist/` và `/api/leaderboard`); thêm `bench_cmd` (`node scripts/bench.mjs`) và `soak_cmd` (`node dist-headless/soak.mjs`). Tuning giữ nguyên v1.2.
- `tests/smoke.test.ts`: kỳ vọng contract đổi từ 1.2 sang 1.3 (không test nào bị skip hay xóa).
- `npm run build` bundle thêm `dist-headless/soak.mjs` và `server.mjs`; `server.mjs` bị gitignore (sinh ra khi build).
- Lõi: thêm cờ `GameState.bench` (mặc định false, không có trong snapshot, không rút RNG) nên output headless của v1.0-v1.2 không đổi.

### Added
- Bench: `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` (Playwright, Chrome có giao diện 1280x720, tắt vsync); trang `/?bench=<seed>&duration=<s>` tự đo FPS, p1 low, p95, load, bộ nhớ (RSS cả cây tiến trình lấy mẫu mỗi 3 s).
- Soak: `node dist-headless/soak.mjs --seed 7 --nights 10 --out soak.json` (input ngẫu nhiên tất định).
- Server Node thuần và bảng xếp hạng top 10 (nhập tên sau bình minh hoặc khi thua; xem từ landing, chọn Đêm, menu trong game); `node server.mjs --export-leaderboard out.json`.
- Trợ năng: đổi phím cho 9 hành động (cảnh báo trùng phím, khôi phục mặc định, Esc luôn tạm dừng), phụ đề và mũi tên mép màn hình chỉ Bóng Mực mới, cảnh báo gió, 10 giây cuối, đèn dầu thấp; giảm chuyển động; chữ UI >= 18 px, chữ lớn x1.25.
- Chọn Đêm ở landing và trong Cài đặt.
- Đóng gói: `scripts/package-release.mjs` (`npm run release`) tạo `release/dao-den-long-v1.0.0.zip`; `CREDITS.md`, `LICENSE` (MIT), `docs/retro.md`, ảnh chụp ở `docs/screenshots/`.

### Performance
- Bóng Mực và đom đóm vẽ bằng `InstancedMesh` (khoảng 800 xuống khoảng 100 draw call); vật liệu Lambert cho phần mờ đục; rào nhịp khung hình theo GPU.
- `bench.json` (GT 730): avg_fps 100.7, p1_low_fps 33.1, frame_ms_p95 18, load_ms 3736, peak_mem_mb 515. `soak.json`: 10 Đêm, 0 crash, bộ nhớ 51 đến 57 MB.

### Evidence
- `evidence/phase-4/` (ảnh chụp trợ năng, bảng xếp hạng; README liệt kê lệnh sinh lại). JSONL của Phase 1 và 2 giữ nguyên bản sinh bởi contract cũ (xem ghi chú trong từng thư mục).

## Phase 3 - "Đèn cạn dầu" (contract v1.2)

### Breaking changes
- `game.contract.json`: `contract_version` 1.2; tuning mới `fuel_max 100`, `fuel_decay_per_s 1.0`, `fuel_per_mote 10`, `relight_cost 5`, `win_ratio 0.6`, `drain_per_s 5`, `low_fuel_threshold 30`, `capacity_max 20`.
- Thời lượng Đêm: 300/330/360 s đổi thành 240/270/300 s.
- Luật thắng: bỏ `game_over {reason: "all_lit"}`; thắp đủ đèn không kết thúc ván. Hết giờ: >= ceil(0.6 x tổng) đèn sáng thì thắng `dawn_survived`, ngược lại thua `dawn`; hết Ngọn Lửa vẫn thua `no_flames` trước.
- Điểm: `per_mote` 10 -> 5; thêm `per_relight 40`, `per_stun_drain 15`, `dawn_per_lantern 50`; bỏ `per_second_left`. Thưởng cuối: mỗi đèn sáng 50 + dầu, mỗi Ngọn Lửa 50.
- Snapshot: đèn thêm `fuel`, `ever_lit`, `relit_count`; player thêm `capacity`; Bóng Mực có state `drain`.
- Scenario: đèn thêm `fuel`, `ever_lit` (`lit` không kèm `fuel` -> 100); player thêm `successful_lights`; shades thêm `target_lantern_id`.
- Event mới: `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm `relight` (boolean).
- Hết choáng: Bóng Mực luôn về `wander` (trước đây `chase` nếu May <= 18 m).
- Sức chứa đom đóm không còn cố định 10: tăng 2 mỗi lần thắp thành công, tối đa 20.
- Vùng an toàn chỉ có ở đèn sáng với dầu >= 30.
- Web: màu viền và mắt Bóng Mực là `#7A3CFF`, đổi `#00B3FF` ở chế độ dễ phân biệt; landing mô tả mục tiêu mới.

### Test cũ sửa hoặc xóa (không có test nào bị skip hay xóa)
| Test | Hành động | Lý do |
|---|---|---|
| `tests/smoke.test.ts` contract tuning | sửa | version 1.2, `night2/3_duration_s` 270/300 |
| `tests/core/create-game.test.ts` builds defaults | sửa | `t0` 300 -> 240 |
| `tests/core/step-player.test.ts` deposits and lights | sửa | `lantern_lit` có `relight: false`; điểm 5/đom đóm |
| `tests/core/step-player.test.ts` wins on fifth lantern | sửa | thắng ở bình minh (`time_left_s: 1/60`), `dawn_survived`, điểm dawn mới |
| `tests/core/step-player.test.ts` win with tiny time left | sửa | điểm dawn mới (không còn thưởng giây) |
| `tests/core/step-tick-order.test.ts` carried 10 deposits | sửa | `relight: false`; điểm 150 |
| `tests/core/step-tick-order.test.ts` last lantern on dawn tick | sửa | `dawn_survived`, điểm dawn mới |
| `tests/core/step-tick-order.test.ts` no mid-tick end | sửa | thêm `time_left_s: 1/60` (thắp đủ không kết thúc); điểm mới |
| `tests/core/step-shades.test.ts` after stunned / recoil | sửa | stunned -> `wander`; thêm ca recoil -> `chase` giữ luật cũ |
| `tests/headless/run-headless.test.ts` win scenario | sửa | thêm `time_left_s: 1/60` để thắng ở bình minh |

### Sửa lỗi không liên quan Phase 3
- `tests/core/step-dash-wind-charm.test.ts` "wind_enabled false never blows; N1/N2 no wind and no rng use": đã đỏ từ trước Phase 3 (kiểm trên HEAD). Đêm 2 sinh Gió Lạc ở tick 1200 và rút RNG theo thiết kế Phase 2; test chưa tắt `random_drifters`. Sửa test (thêm `random_drifters: false`), code không đổi.

### Sửa theo audit (cùng commit Phase 3)
- Recoil sau hit đi đủ 2 m trong 60 tick (`RECOIL_MOVE_TICKS`; trước đó 59 bước = 1.967 m). Đổi output so với evidence Phase 2: vị trí Bóng Mực sau hit lệch tối đa 0.033 m.
- Hết choáng hoặc rời `drain` về `wander`: tick đó không xét `wander -> chase` (`noDetectTick`). Đổi output so với Phase 2: Bóng Mực hết choáng gần May vào `chase` chậm 1 tick.
- Đèn có `deposited >= cost` (scenario) sáng ngay khi tương tác, không nạp số âm.
- `fuel_drain` nhiều Bóng Mực cùng đèn cùng tick báo cùng giá trị dầu sau tick (kẹp >= 0).
- HUD: `Đèn sáng k/tổng (cần n)`; màu thân Bóng Mực choáng `#3A3450` được dùng thật (sửa luôn lỗi vật liệu nhân bản làm đổi màu mù màu không tác dụng); chữ HUD/panel `#F5F1E6`.
- Evidence Phase 2 và 3 sinh lại (output đổi do recoil/choáng); thêm ảnh chụp, `fps.txt`, `README.md` ở `evidence/phase-3/`.
- Test: `tests/core/step-shades-pulse-hit.test.ts` (stunned ends at k+120: `wander`, chase từ k+122; recoil chính xác 2 m); thêm `tests/core/phase3-audit-fixes.test.ts`.
- ADR 0001: sửa mục 7, thêm mục 9-13.

### Evidence
- `evidence/phase-3/` sinh bằng `scripts/generate-evidence-phase-3.mjs`: `fuel-out`, `refuel`, `relight`, `drain`, `win-dawn`, `lose-dawn`, determinism 3 Đêm, `headless-timing.txt`, `vitest.txt`.

## Phase 2 - "Ba Đêm" (contract v1.1)

### Breaking changes
- `game.contract.json` 1.1: tuning theo đề mới (`lantern_cost` 5 -> 10, `pickup_radius` 1.5 -> 1, `interact_radius` 3 -> 2, `pulse_cost` 1 -> 3, `pulse_radius` 6 -> 5, `invuln_s` 2 -> 1.5, `pulse_stun_s` 3 -> 2...); thêm lướt (`dash_speed` 14, `dash_duration_s` 0.2, `dash_cooldown_s` 1.5), `night2_duration_s`, `night3_duration_s`, `fall_enabled` true.
- Headless nhận `--night 1|2|3` (giá trị khác: mã thoát 1); snapshot có `invuln` (boolean), event `night_start`, trạng thái tạm dừng `paused`.
- Bóng Mực có 5 trạng thái (`spawning`, `wander`, `chase`, `recoil`, `stunned`); không còn tường ở mép đảo (rơi xuống y < -10 mất 1 Ngọn Lửa).

### Added
- Đêm 2 (Đảo Cầu, hai đĩa nối cầu tre) và Đêm 3 (Đảo Chuông, 3 tầng); lướt, bục nhảy, gió mạnh, Bùa Gió, Gió Lạc cướp đom đóm, tạm dừng ở lõi.
- Web: luồng 3 Đêm, menu tạm dừng, cài đặt lưu `localStorage`, âm thanh WebAudio tổng hợp, HUD đầy đủ, bảng màu chuẩn; đồ họa đảo stylized và nhân vật Mây có khớp.
- Evidence `evidence/phase-2/` sinh bằng `scripts/generate-evidence-phase-2.mjs`; skill dự án `dao-den-long-contract`.

### Ghi chú
- Hết thời gian nên bỏ chạy `npm test` và review từng task từ Task 6 (ghi ở `docs/ai-log.md`).

## Phase 1 - "Đêm đầu tiên" (contract v1.0)

### Added
- Lõi mô phỏng thuần TypeScript 60 tick/giây, tất định theo seed: di chuyển, nhặt đom đóm, thắp 5 đèn, tỏa sáng, Bóng Mực, Ngọn Lửa, hết giờ.
- Headless CLI `dist-headless/headless.mjs` xuất JSONL (snapshot, event, end), nhận `--scenario` và `--inputs`.
- Web: game 3D Three.js (model dựng từ khối cơ bản), vòng lặp 60 Hz, camera, HUD, restart, landing page có hướng dẫn, chế độ CPU `?cpu=1`.
- Evidence `evidence/phase-1/` sinh bằng `scripts/generate-evidence.mjs`; AGENTS.md, hook chặn kết thúc khi test đỏ, nhật ký AI.
