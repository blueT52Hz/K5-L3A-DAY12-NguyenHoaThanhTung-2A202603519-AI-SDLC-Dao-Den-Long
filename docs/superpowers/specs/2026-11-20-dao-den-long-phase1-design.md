# Đảo Đèn Lồng - Phase 1 Design

Ngày: 2026-11-20 · Nguồn yêu cầu: `phase1.html` (PRD-0 + Test Contract v1.0)

## 1. Mục đích & lý do

Game 3D "Đảo Đèn Lồng", màn Đêm 1 - Đảo Bến, nộp bằng tag `phase-1` trong khoảng 60 phút. Đây là bài lab chấm tự động: test headless ẩn chiếm điểm lớn nhất, nên **đúng Test Contract là ưu tiên số 1**. Tiêu chí của chủ dự án: **hoàn thành trước, hoàn hảo sau**.

## 2. Mục tiêu / Không làm / Thất bại

- **Mục tiêu:** chơi được Đêm 1 từ đầu tới thắng/thua, có chơi lại; headless đúng contract v1.0, tất định; README tối đa 3 lệnh; có bằng chứng và log AI.
- **Không làm ở Phase 1:** âm thanh, nhân vật phụ, nhiều loại Bóng Mực, mobile, menu cài đặt. Các phần sáng tạo thêm chỉ làm sau khi lõi xong (và phải tắt khi chạy headless).
- **Thất bại dù vẫn chạy:** output headless lệch contract (sai thứ tự tick, sai event, số `tuning` không khớp code), không tất định, không chạy được trên macOS/Linux.

## 3. Ràng buộc

- Chạy được trên macOS/Linux sau `build_cmd` (người dùng code trên Windows).
- Logic chạy 60 tick/giây cố định, không cần cửa sổ/GPU khi headless.
- Trục Y hướng lên, mặt đất Y = 0, người chơi xuất phát (0,0,0). Mọi khoảng cách đo trên XZ, "trong bán kính r" là `<= r`.

## 4. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết quả |
|---|---|---|
| **Three.js + TypeScript, lõi sim TS thuần, headless chạy bằng Node** | Tự viết va chạm (chỉ cần khoảng cách XZ, rất nhẹ); chạy mọi OS, 3 lệnh | **Đã chọn** |
| Godot | Có editor và vật lý, nhưng headless cần binary Godot trên máy chấm, vật lý khó tất định | Loại |
| Python lõi + viewer 3D | Headless dễ, nhưng 3D xấu và kém mượt | Loại |

## 5. Kiến trúc (đã quyết)

- **Lõi `src/core/`**: TS thuần, không import Three.js hay DOM. Hàm `step(state, input)` tiến 1 tick. Dùng chung cho headless và bản web.
- **`game.contract.json` là nguồn duy nhất của tuning**: lõi đọc `tuning` từ file này, nên số khai báo luôn khớp số đang dùng.
- **RNG có seed** (ví dụ mulberry32) nằm trong state. Không dùng `Math.random`, `Date.now`, hoặc thứ tự duyệt không ổn định. Id tự sinh theo bộ đếm: `M1..`, `S1..`.
- **Headless `src/headless/`**: CLI parse tham số, đọc scenario/inputs, chạy sim, ghi JSONL.
- **Web `src/web/`**: Vite + Three.js. Vòng lặp fixed-timestep 60Hz gọi `step`, render nội suy hoặc theo state mới nhất. Bàn phím và chuột tạo ra cùng cấu trúc input như file inputs.
- **Test**: Vitest cho lõi và headless.
- Lệnh (đề xuất, builder chốt cụ thể): `build_cmd` = `npm ci && npm run build`, `run_cmd` = `npm run preview`, `headless_cmd` = `node dist/headless.js`. Yêu cầu Node >= 20.

## 6. Luật chơi & tuning (đã chốt với chủ dự án)

| Khóa | Giá trị | Khóa | Giá trị |
|---|---|---|---|
| player_speed | 6 | flames | 3 |
| carry_capacity | 10 | invuln_s | 2 |
| lantern_cost | 5 | hit_drop_ratio | 0.5 |
| lantern_count_night1 | 5 | pulse_stun_s | 3 |
| pickup_radius | 1.5 | pulse_push_m | 4 |
| interact_radius | 3 | pulse_cooldown_s | 2 |
| pulse_cost | 1 | safe_radius | 5 |
| pulse_radius | 6 | shade_speed | 4 |
| night1_duration_s | 300 | shade_hit_radius | 1 |
| fall_enabled | false | | |

Score: `per_mote` 10, `per_lantern` 100, `per_stun` 20, `per_second_left` 2, `per_flame_left` 50.

- **Đảo:** tròn, bán kính 40m. Mép có tường vô hình (kẹp vị trí XZ về bán kính 40), không có sự kiện `fall`.
- **Đèn:** L1-L5 đều nhau trên vòng tròn bán kính 25m. L1 ở (0,0,25), các đèn sau lần lượt +72°.
- **Đom đóm:** mặc định 40 con, vị trí ngẫu nhiên theo seed trong bán kính 3-38m, không đặt trong 3m quanh chân đèn. Không tự sinh thêm.
- **Bóng Mực:** đầu màn có 2 con (S1, S2) ở góc ngẫu nhiên, bán kính 35m. Cứ 45 giây (2700 tick) sinh thêm 1 con ở bán kính 38m, tối đa 6 con, phát `shade_spawned`. Luôn đuổi người chơi. Tâm Y = 1.0. Trạng thái `chase` | `stunned`.
- **Sợ đèn (giả định, ghi vào README):** chỉ **đèn đã sáng** mới có vùng cấm bán kính `safe_radius`. Bóng Mực bị đẩy ra mép vùng nếu lọt vào.
- **Thắng/thua:** đủ 5 đèn → `won/all_lit`. `flames` = 0 → `lost/no_flames`. `time_left_s <= 0` → `lost/dawn`.
- **Nhảy:** vận tốc lên 7 m/s, trọng lực -20 m/s². Chỉ ảnh hưởng `player.pos[1]`, không ảnh hưởng va chạm (khoảng cách đo theo XZ).

## 7. Thứ tự xử lý trong một bước k (tạo trạng thái k+1, event ghi `tick = k+1`)

0. **Giảm bộ đếm trước** (invuln, cooldown, stun, timer sinh Bóng Mực). Bóng Mực hết choáng thì về `chase`. Nhờ vậy một bộ đếm đặt ở bước k có hiệu lực đúng `giây * 60` bước kế tiếp (ví dụ stun 3s nghĩa là còn `stunned` ở tick k+180, về `chase` ở tick k+181).
1. Áp frame input của tick k (giữ giá trị cũ cho trường vắng mặt). Tính cạnh false→true cho `jump`/`interact`/`pulse`.
2. **Di chuyển:** quay `move` theo `cam_yaw_deg` đúng công thức contract, chuẩn hóa nếu độ dài > 1. `pos += dir * player_speed / 60`, kẹp trong đảo. Xử lý nhảy và trọng lực, Y >= 0.
3. **Nhặt:** duyệt đom đóm theo thứ tự id. Con nào trong `pickup_radius` và `carried < carry_capacity` thì nhặt → `mote_picked`, +per_mote.
4. **Interact (cạnh):** chọn đèn chưa sáng gần nhất trong `interact_radius` (hòa thì lấy id nhỏ). `amount = min(carried, lantern_cost - deposited)`. Nếu amount > 0 → `deposit`. Nếu đủ → `lit`, `lantern_lit`, +per_lantern. Đủ 5 đèn → thắng.
5. **Pulse (cạnh):** cần cooldown = 0 và `carried >= pulse_cost`, không đủ thì bỏ qua và không ghi event. Trừ `carried`. Mọi Bóng Mực trong `pulse_radius` (kể cả con đang choáng) bị choáng lại `pulse_stun_s` và đẩy ra xa thêm `pulse_push_m` theo hướng người chơi → Bóng Mực, sau đó kẹp theo vùng đèn sáng và mép đảo. Ghi `pulse` với `stunned_ids` (có thể rỗng), +per_stun cho mỗi id. Đặt cooldown.
6. (Bỏ, bộ đếm đã giảm ở bước 0.)
7. **Sinh Bóng Mực** nếu tới hạn (chỉ khi không có `random_shades: false`).
8. **Bóng Mực di chuyển:** con không choáng tiến về người chơi `shade_speed / 60` trên XZ, sau đó kẹp theo vùng đèn sáng và mép đảo.
9. **Va chạm:** nếu invuln = 0, Bóng Mực không choáng đầu tiên (theo id) trong `shade_hit_radius` gây hit: flames -1, `dropped = floor(carried * hit_drop_ratio)`, carried -= dropped. Các đom đóm rơi được tạo thành đom đóm mới (id tiếp nối) ở khoảng cách 2.5-4m quanh người chơi, góc theo seed, kẹp trong đảo. Đặt invuln. Ghi `player_hit` (`by: "shade"`). Hết máu thì thua.
10. **Thời gian:** `time_left_s = T0 - (k+1)/60`, với `T0` = `time_left_s` của scenario nếu có, không thì bằng `night1_duration_s`. Nếu <= 0 mà vẫn đang `playing` → thua `dawn` (ví dụ T0 = 1 thì thua ở tick 60).

**Kết thúc giữa bước (quyết định của người viết):** khi thắng hoặc thua ở bất kỳ bước con nào, các bước con còn lại của tick đó bị bỏ qua. `time_left_s` của trạng thái kết thúc vẫn tính là `T0 - (k+1)/60`. Nếu thắng thì cộng `per_second_left * floor(time_left_s)` (dùng giá trị k+1 này) và `per_flame_left * flames` trước, rồi ghi `game_over`, sau đó dừng sim. Ghi thêm một snapshot ở tick kết thúc nếu tick đó chưa có snapshot. `end.ticks` = số bước đã chạy thực tế.

## 8. Headless I/O

- Tham số đúng contract B. Thiếu `--seed`, `--ticks` hoặc `--out` → stderr, mã thoát 1. `--night` khác 1 → mã thoát 1.
- **Mã thoát 2** khi file inputs/scenario sai định dạng: JSON hỏng, sai kiểu, tick không tăng nghiêm ngặt, `move` ngoài [-1,1], id đèn không thuộc L1-L5.
- **Scenario:** áp đúng contract D. `motes`/`shades` thay thế danh sách (shade không có `id` thì tự cấp S1.. theo thứ tự; bộ đếm id tiếp tục từ số lớn nhất). Shade giữ nguyên `pos` (kể cả Y) như scenario cho; shade do game sinh ra có Y = 1.0. Y không ảnh hưởng logic vì khoảng cách đo theo XZ. `random_motes: false` → không sinh mặc định. `random_shades: false` → không có shade mặc định và không sinh theo giờ. Đèn cập nhật theo id (`pos`, `deposited`, `lit`). Không phát event, không cộng điểm.
- **Output:** event của bước k ghi trước snapshot tick k+1. Snapshot ở tick 0 và mỗi tick chia hết cho `--snapshot-every`. Dòng `end` luôn là dòng cuối. Tọa độ và `time_left_s` làm tròn 3 chữ số. Snapshot có thêm mảng `motes` (khuyến nghị). `sim_tick = tick`.

## 9. Hình ảnh & HUD

Low-poly từ khối cơ bản. Trời đêm tím than. Đèn và đom đóm vàng cam (dùng PointLight hoặc emissive). Bóng Mực là khối tím đen. Đảo sáng dần khi thắp đèn (tăng ánh sáng môi trường cùng cường độ đèn). Mây đội nón lá có treo đèn lồng nhỏ. Camera góc ba phần tư bám sau, xoay bằng kéo chuột hoặc phím mũi tên trái/phải, yaw của camera đưa vào `cam_yaw_deg`. Điều khiển: WASD di chuyển, Space nhảy, E nạp đèn, F tỏa sáng. HUD hiển thị máu, số đom đóm mang/tối đa, số đèn sáng/5, giờ còn lại, điểm. Màn kết thúc hiện kết quả và nút "Chơi lại" (R).

## 10. Bàn giao & bằng chứng

- README: cài đặt/chạy (<= 3 lệnh), điều khiển, cách tính điểm, giả định (gồm "sợ đèn" chỉ áp cho đèn đã sáng, `fall_enabled=false`), mục "Sáng tạo của tôi".
- Bằng chứng tại `evidence/phase-1/`: kết quả Vitest, file JSONL mẫu cho các tình huống (nhặt, nạp/thắp, pulse, bị hit, thắng, thua dawn), log chạy 2 lần cùng seed rồi diff, ảnh chụp game. Tất cả sinh bằng script, không sửa tay.
- `docs/ai-log.md`: nhật ký dùng AI + giả định.
- Harness (AGENTS.md/CLAUDE.md, skills, hooks dùng cho repo) đặt trong repo.

## 11. Chạy song song (yêu cầu của chủ dự án)

Mục tiêu là tiết kiệm thời gian. Mỗi nhánh sở hữu file riêng, không sửa chồng lên nhau.

- **Bước 0 (tuần tự, ngắn):** scaffold Vite + TS + Vitest, `game.contract.json`, và `src/core/types.ts` (kiểu `GameState`, `Input`, `Shade`, `Lantern`, `Mote`). Đây là hợp đồng chung cho mọi nhánh.
- **Nhánh A, lõi + headless (đường găng):** `src/core/**` (trừ types), `src/headless/**`, `tests/**`.
- **Nhánh B, model 3D:** `src/web/models/**`. Các hàm thuần tạo `THREE.Object3D` từ khối cơ bản: Mây đội nón lá có treo đèn lồng, Bóng Mực, cột Đèn Lồng Lớn (trạng thái sáng/tắt), đom đóm, đảo + trời đêm. Không phụ thuộc lõi.
- **Nhánh C, vỏ web:** `src/web/**` (trừ models), `index.html`. Gồm vòng lặp 60Hz, input → `Input`, camera, HUD, màn kết thúc/chơi lại, đồng bộ state → scene. Chỉ phụ thuộc `types.ts` và chữ ký `step`/`createGame`. Dùng placeholder hình hộp cho tới khi nhánh B xong.
- **Bước cuối (tuần tự):** ghép nhánh B vào C, chạy test + headless, sinh evidence, viết README/ai-log, copy harness, tag `phase-1`.

## 12. Để builder quyết

Cấu trúc file chi tiết, tên script npm, bundler cho headless (esbuild/tsc), chi tiết mesh và màu sắc, cách nội suy render, nội dung test cụ thể.
