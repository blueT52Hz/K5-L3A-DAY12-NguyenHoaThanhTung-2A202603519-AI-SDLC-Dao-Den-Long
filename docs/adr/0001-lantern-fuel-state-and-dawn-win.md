# ADR 0001: Trạng thái đèn có dầu và luật thắng ở bình minh

- Trạng thái: chấp nhận (Phase 3, contract v1.2)
- Nguồn yêu cầu: `phase-3.html` (TICKET-03). Thiết kế chi tiết: `docs/superpowers/specs/2026-11-20-dao-den-long-phase3-design.md`.

## Bối cảnh

Playtest cho thấy người chơi giỏi thắp đủ đèn trong khoảng 2 phút, phần còn lại của Đêm hết căng thẳng. Cần làm đèn thắp rồi vẫn có thể tắt, và đổi mục tiêu từ "thắp đủ" thành "giữ đảo sáng tới bình minh", mà không phá tính tất định (cùng seed + input = output giống từng byte) và không đổi thứ tự rút RNG khi chưa có đèn yếu.

## Quyết định

1. **Mô hình trạng thái đèn:** `unlit -> lit(fuel) -> out(ever_lit) -> relit`.
   - `unlit`: chưa từng sáng, thắp cần 10 đom đóm (`lantern_cost`, nạp dần được).
   - `lit(fuel)`: có dầu 0..100, giảm 1/giây (`fuel_decay_per_s`), cộng dồn 5/giây (`drain_per_s`) cho mỗi Bóng Mực đang hút đèn đó.
   - `out(ever_lit)`: dầu về 0 thì tắt (`lit=false`, `deposited=0`, `ever_lit=true`, event `lantern_out`).
   - `relit`: đèn từng sáng chỉ cần 5 đom đóm (`relight_cost`) để sáng lại với dầu 100, event `lantern_lit` có `relight: true`, +40 điểm, tăng `relit_count`.
   - Đèn đang sáng nhận đom đóm để châm dầu: mỗi đom đóm +10 dầu (`fuel_per_mote`), tối đa 100, event `refuel`; chỉ nhận khi còn thiếu dầu và có mang đom đóm.
2. **Dầu là số nguyên đơn vị 1/60:** `fuelUnits` (max 6000), mỗi tick trừ 1 đơn vị cho decay và 5 đơn vị cho mỗi Bóng Mực hút. Snapshot hiển thị `fuel` làm tròn 1 chữ số thập phân (đèn tắt = 0).
3. **Vùng an toàn = lit && fuel >= 30** (`low_fuel_threshold`). Đèn dầu < 30 vẫn sáng (tính vào thắng) nhưng không có vùng cấm; đèn vừa vào lại tập có vùng (thắp, thắp lại, châm lên >= 30) thì Bóng Mực trong 6 m bị evict như Phase 2.
4. **Bóng Mực `drain`:** `wander` mà có đèn sáng dầu < 30 thì đi tới đèn gần nhất (hòa: id nhỏ), không rút RNG; cách <= 2 m vào `drain`, đứng yên hút dầu, event `fuel_drain` mỗi 60 tick. Ra khỏi `drain`: May <= 6 m thì `chase`; đèn tắt, dầu >= 30 hoặc xa > 2 m thì `wander`. Hết choáng luôn về `wander`.
5. **Sức chứa đom đóm tăng theo đèn:** `min(capacity_max 20, carry_capacity 10 + 2 x lần thắp thành công)`, đặt lại mỗi Đêm.
6. **Luật thắng bình minh** (bước 11): hết Ngọn Lửa luôn thua (`no_flames`). Khi `time_left_s <= 0`: số đèn sáng >= ceil(0.6 x tổng) thì thắng `dawn_survived`, cộng mỗi đèn sáng (50 + phần nguyên dầu) và 50 x Ngọn Lửa; ngược lại thua `dawn`. Thắp đủ đèn không còn kết thúc ván; bỏ `all_lit` và thưởng giây còn lại.
7. **Điểm mới (quyết định của người viết, đề không nêu):** 5/đom đóm, 100/đèn lần đầu, 40/thắp lại, 5/choáng, 15/choáng Bóng Mực đang `drain`.
8. **Tất định:** dầu số nguyên; hút dầu không rút RNG; thứ tự rút RNG của Phase 2 giữ nguyên khi không có đèn yếu.

## Phương án đã bỏ

- Dầu số thực: sai số cộng dồn (vd 5/60 mỗi tick) làm ngưỡng 30 và 0 lệch tick giữa các lần chạy.
- Module dầu riêng giữ state: dầu là thuộc tính của đèn nên tách ra thêm gián tiếp và khó serialize vào snapshot/scenario.
- Giữ "thắp đủ đèn là thắng" cùng "thắng ở bình minh": hai luật cạnh tranh, mục tiêu gốc của ticket (hết căng thẳng cuối Đêm) không được giải quyết.

## Hệ quả

- Breaking change: contract 1.2, mất `all_lit`, điểm và duration đổi, snapshot/scenario/event mới (xem `CHANGELOG.md`).
- Bước 2 của tick thêm "dầu cháy/hút/tắt" ngay sau giảm bộ đếm; bước 8 thêm trạng thái `drain` (`shade-drain-behavior.ts`).
- Web: thanh dầu trên đèn, đèn dầu < 30 nhấp nháy 1 Hz, HUD `mang/sức chứa`, cài đặt bảng màu dễ phân biệt.
