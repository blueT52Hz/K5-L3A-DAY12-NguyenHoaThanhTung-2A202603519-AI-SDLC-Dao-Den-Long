# Đảo Đèn Lồng - Phase 3 "Đèn cạn dầu" - thiết kế

Nguồn yêu cầu: `D:\VinAI\Day12\phase-3.html` (TICKET-03, contract v1.2, tag `phase-3`).

## Mục đích

Playtest: người giỏi thắp hết đèn trong 2 phút, cuối Đêm hết căng thẳng. Đèn thắp rồi vẫn tắt được (cạn dầu, bị Bóng Mực hút); mục tiêu đổi thành giữ đảo sáng tới bình minh.

## Mục tiêu / không làm / phản mục tiêu

- Mục tiêu: làm đúng mọi luật, số liệu, Test Contract v1.2 của ticket; giữ tất định; giữ phần sáng tạo Phase 1-2 không xung đột.
- Không làm (quyết định chủ dự án vì hết giờ): không viết test mới.
- Bắt buộc vẫn làm: test cũ bị luật mới làm sai phải được sửa tối thiểu hoặc xóa, ghi lý do trong changelog (DoD, và Stop hook `npm test` phải xanh). Không skip.
- Phản mục tiêu: đổi thứ tự rút RNG khi không có đèn yếu (làm lệch output cũ ngoài phạm vi luật mới); hardcode số tuning; số thực trôi làm lệch ngưỡng 30/0.

## Hướng làm (Approaches)

- Chọn: mở rộng tại chỗ. `Lantern` thêm `fuelUnits` (nguyên, đơn vị 1/60 fuel, max 6000), `everLit`, `relitCount`; `Player` thêm `successfulLights`; `Shade` thêm state `drain`, `targetLanternId`, `drainTicks`. Sửa trong các system có sẵn.
- Bỏ: fuel số thực (sai số 5/60 cộng dồn, ngưỡng lệch tick). Bỏ: module fuel riêng giữ state (dầu là thuộc tính đèn, thêm gián tiếp, khó serialize).

## Thiết kế

### Contract (`game.contract.json`)
- `contract_version: "1.2"`; tuning thêm `fuel_max 100`, `fuel_decay_per_s 1.0`, `fuel_per_mote 10`, `relight_cost 5`, `win_ratio 0.6`, `drain_per_s 5`, `low_fuel_threshold 30`, `capacity_max 20`; duration 240/270/300.
- `score` (quyết định của mình): `per_mote 5`, `per_lantern 100`, `per_relight 40`, `per_stun 5`, `per_stun_drain 15`, `dawn_per_lantern 50`, `per_flame_left 50`; bỏ `per_second_left`.
- Hằng mới trong `constants.ts`: `FUEL_UNITS_PER_FUEL = 60`, `DRAIN_RANGE_M = 2`, `DRAIN_CHASE_RADIUS = 6`, `FUEL_DRAIN_EVENT_TICKS = 60`.

### Dầu (bước 2, sau tickTimers)
- Mỗi tick đang playing: mỗi đèn sáng trừ `fuel_decay_per_s` (1 unit) + `drain_per_s` (5 unit) cho mỗi Bóng Mực `drain` nhắm đèn đó (cộng dồn). Bóng drain tăng `drainTicks`; khi `drainTicks % 60 == 0` phát `fuel_drain {lantern_id, shade_id, fuel}` (fuel sau trừ).
- Ngay sau đó: đèn `fuelUnits <= 0` -> `lit=false`, `fuelUnits=0`, `deposited=0`, `everLit=true`, phát `lantern_out`.
- Bóng vào drain ở bước 8 bắt đầu hút từ bước 2 tick sau.

### Tương tác (bước 5, `lantern-deposit.ts`)
- Ứng viên: trong `interact_radius` + dung sai Y, và "nhận được": chưa sáng, hoặc sáng nhưng `fuelUnits < 6000` **và** `used > 0`. Gần nhất, hòa thì id nhỏ.
- Đèn chưa sáng: cần = (everLit ? relight_cost : lantern_cost) - deposited; nạp một phần như cũ, +5 điểm/đom đóm. Đủ -> lit, fuel 6000, `successfulLights++`; lần đầu +100, thắp lại +40 và `relitCount++`. `lantern_lit {lantern_id, relight}`.
- Đèn sáng: `used = min(carried, ceil((6000 - units) / 600))`, `units = min(6000, units + 600*used)`, +5*used, `refuel {lantern_id, amount: used, fuel}`.
- Sức chứa = `min(capacity_max, carry_capacity + 2*successfulLights)`; nhặt đom đóm dùng sức chứa này. Đặt lại khi tạo Đêm.

### Vùng an toàn (`shade-zones.ts`)
- "Đèn có vùng" = lit && `fuelUnits >= 30*60`. Mọi chỗ dùng `litLanterns` đổi sang hàm này.
- `safeZoneLanternIds` = tập đèn có vùng; đèn mới vào tập (thắp, thắp lại, châm lên >= 30) -> Bóng trong 6 m bị evict tối đa 30 tick, không gây hit trong lúc evict (giữ cơ chế Phase 2). Evict ở bước 6, trước hit bước 9.

### Bóng Mực (`shade-ai.ts`)
- `wander`: nếu có đèn sáng `fuel < 30` thì đi tới đèn gần nhất (hòa id nhỏ) ở tốc độ wander, không rút RNG; ghi `targetLanternId`. Không có thì giữ wander ngẫu nhiên như Phase 2 (RNG như cũ). Wander vẫn chuyển chase khi May <= SHADE_DETECT như cũ.
- Cách đèn mục tiêu <= 2 m XZ -> `drain`, đứng yên, `drainTicks=0`.
- Từ `drain` (xét ở bước 8): May <= 6 m -> chase; đèn tắt, fuel >= 30, hoặc > 2 m -> wander. Stun ở bước 7 như cũ. Hết choáng -> luôn `wander` (ticket mục 2, thay luật Phase 2 "chase nếu May <= SHADE_GIVE_UP"); recoil giữ luật cũ.
- Bóng drain được phép đứng trong vùng của đèn yếu (đèn yếu không có vùng).

### Tỏa sáng (`pulse.ts`)
- Trúng: +`per_stun_drain` nếu state ngay trước là drain, ngược lại +`per_stun`.

### Thắng/thua (`win-lose.ts`, bước 11)
- flames <= 0 -> lost `no_flames` (luôn trước). Else nếu `timeLeftS <= 0`: lit >= ceil(win_ratio * tổng) -> won `dawn_survived` + mỗi đèn sáng (50 + floor(fuel)) + 50/Ngọn Lửa; else lost `dawn`. Thắp đủ không kết thúc.

### Headless
- Snapshot: đèn thêm `fuel` (1 chữ số, round half up, tắt = 0), `ever_lit`, `relit_count`; player thêm `capacity`; state `drain` hiển thị.
- Scenario: đèn `lit`, `fuel`, `ever_lit` (lit không fuel -> 100); player `successful_lights`; shades `target_lantern_id`.

### Web
- Thanh dầu trên đèn sáng; `fuel < 30` đèn + thanh nhấp nháy 1 Hz.
- HUD `đang mang / sức chứa`; hướng dẫn và màn kết thúc dùng luật bình minh.
- Cài đặt "Bảng màu dễ phân biệt" (lưu trong settings-store): Bóng Mực `#7A3CFF` -> `#00B3FF`; cảnh báo `#FF5A5F` -> `#FFFFFF` kèm ⚠; đèn tắt xẹp 20% + giấy rách (luôn, không phụ thuộc cài đặt).
- Âm thanh: map thêm `refuel`, `lantern_out` vào âm có sẵn nếu rẻ.

### Tài liệu (DoD)
- ADR: `docs/adr/0001-lantern-fuel-state-and-dawn-win.md`.
- Changelog: `CHANGELOG.md` mục Phase 3 - breaking changes + test cũ sửa/xóa kèm lý do.
- Evidence: `evidence/phase-3/` qua script mới `scripts/generate-evidence-phase-3.mjs` (scenario: cạn dầu tắt, châm dầu, thắp lại 5, drain + fuel_drain, thắng dawn_survived, thua dawn).
- README, skill `dao-den-long-contract`: cập nhật v1.2.

## Để lại cho người làm
- Chi tiết vẽ thanh dầu, vết rách, chọn âm.
- Cách sửa tối thiểu từng test cũ (6 file đụng `all_lit`/điểm/deposit/duration).
