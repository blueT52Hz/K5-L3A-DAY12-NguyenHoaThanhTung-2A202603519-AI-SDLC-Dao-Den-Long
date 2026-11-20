# Changelog

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
