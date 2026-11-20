# Đảo Đèn Lồng - Phase 2 Design ("Ba hòn đảo")

Ngày: 2026-11-20 · Nguồn yêu cầu: `phase-2.html` (TICKET-02, Test Contract v1.1) · Kế thừa: `2026-11-20-dao-den-long-phase1-design.md`

Ký hiệu: **[CĐ]** = số/luật chuẩn của đề, không được đổi. **[TQ]** = quyết định của người viết khi đề để mở (ghi vào README mục Giả định).

## 1. Mục đích & lý do

Nộp tag `phase-2`. Hai việc: (1) thay toàn bộ số tự chọn của Phase 1 bằng số chuẩn để mọi bản có cảm giác điều khiển giống nhau; (2) mở rộng thành chuỗi 3 Đêm với tính năng mới. Bài chấm tự động bằng test headless ẩn (gồm regression Phase 1 chạy với số chuẩn), nên **đúng Contract v1.1 vẫn là ưu tiên số 1**. Chủ dự án yêu cầu làm **đúng và đủ** mọi mục của ticket, góp ý sau.

## 2. Mục tiêu / Không làm / Thất bại

- **Mục tiêu:** đủ Phần 1-4 và DoD của ticket: số chuẩn, 3 bản đồ chuẩn, Lướt, Gió Lạc, Bùa Gió, chuỗi 3 Đêm, tạm dừng trong lõi, cài đặt lưu được, âm thanh, HUD đầy đủ, bảng màu chuẩn, Contract v1.1, evidence, AGENTS.md + skill dự án.
- **Không làm:** nhân vật/kẻ địch mới ngoài đề (đề cho phép nhưng không bắt buộc, để sau), mobile, lưu tiến độ chuỗi Đêm giữa các lần mở game (chỉ lưu cài đặt).
- **Thất bại dù vẫn chạy:** sai thứ tự tick, `tuning` lệch số chuẩn, tên trạng thái sai, không tất định, regression Phase 1 đỏ, headless một Đêm > 30 s, phần sáng tạo làm đổi đầu ra headless.

## 3. Ràng buộc

- Giữ kiến trúc Phase 1: lõi `src/core` TS thuần (không three/DOM/`Math.random`/`Date`), RNG mulberry32 trong state, tuning chỉ đọc từ `game.contract.json`.
- 60 tick/s, mét/giây, Y hướng lên, "trong bán kính r" là `<= r`. Góc đo từ +X, ngược chiều kim đồng hồ nhìn từ trên xuống, trên XZ: điểm ở góc a bán kính r là `(r·cos a, y, r·sin a)` **[CĐ]**. (Lưu ý: Phase 1 dùng `sin/cos` đảo, phải đổi; tọa độ đèn Đêm 1 vẫn khớp vì đề cho tọa độ tường minh.)
- Chạy được trên macOS/Linux, Node >= 20. Không thêm dependency runtime cho lõi.

## 4. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết quả |
|---|---|---|
| **Cấu hình Đêm dạng dữ liệu + địa hình giải tích** (đĩa, vành khăn, chữ nhật, dốc, trụ) qua `groundAt(x,z)`; sửa system tại chỗ, tính năng mới = system mới | Tọa độ khớp tuyệt đối với đề, tất định, rất nhẹ; phải tự viết va chạm vách | **Chọn** |
| Địa hình heightmap lưới | Tổng quát nhưng sai số ở vách/dốc, lệch test biên | Loại |
| Thư viện vật lý (Rapier/Cannon) | Rủi ro tất định và hiệu năng headless, bundle nặng, thừa | Loại |
| Âm thanh: **WebAudio tổng hợp** vs file asset | Tổng hợp: không lo bản quyền/tải file, chất lượng vừa đủ | **Chọn tổng hợp** |

## 5. Kiến trúc

- `src/core/nights/` **[TQ]**: `night-1-dao-ben.ts`, `night-2-dao-cau.ts`, `night-3-dao-chuong.ts`, mỗi file xuất `NightConfig`: `surfaces`, `obstacles`, `start`, `startFacing`, `lanterns`, `moteSpawnPoints` (kèm Y mặt đất), `shadeSpawnPoints`, `drifterSpawnPoints`, `jumpPads`, `charms`, `shadeIntervalTicks`, `maxShades`, `shadeSpeed`, `durationS`, `drifters` (bật/tắt), `wind` (bật/tắt).
- `src/core/terrain/`: `groundAt(night, x, z, footY)` trả về độ cao mặt đất đứng được (hoặc `null` = khoảng không), `isBlocked(...)` cho vách và tháp. Dùng chung cho Mây, Bóng Mực, đom đóm rơi, đẩy lùi.
- `createGame(seed, scenario = {}, night = 1)` (giữ thứ tự tham số Phase 1 để ít sửa lời gọi); `step(state, input)`. `GameState` thêm `night`, `simTick`, `paused`, `player.{vel, grounded, facing, invulnTicks, dashTicks, dashCdTicks, pulseCdTicks, charmTicks, launchVel, respawnTicks}`, `drifters`, `charms`, `wind`.
- System mới: `pause`, `dash`, `jump-pads`, `wind`, `fall-respawn`, `charms`, `drifter-ai`, `mote-spawner`, `shade-spawner`, `win-lose`. File > 200 dòng thì tách.
- Web giữ cấu trúc Phase 1, thêm `src/web/flow/` (menu, intro Đêm, kết quả, Bình Minh), `src/web/audio/`, `src/web/settings/`, `src/web/hud/`.

## 6. Số chuẩn **[CĐ]** và cách hiện thực

### 6.1 `game.contract.json`

`contract_version: "1.1"`. `tuning` (cập nhật toàn bộ):

| Khóa | Giá trị | Khóa | Giá trị |
|---|---|---|---|
| player_speed | 6 | shade_speed | 4 (Đêm 3 dùng 4.5 trong NightConfig) |
| carry_capacity | 10 | shade_hit_radius | 1 |
| lantern_cost | 10 | invuln_s | 1.5 |
| pickup_radius | 1 | hit_drop_ratio | 0.5 |
| interact_radius | 2 | flames | 3 |
| pulse_cost | 3 | night1_duration_s | 300 |
| pulse_radius | 5 | night2_duration_s | 330 |
| pulse_cooldown_s | 3 | night3_duration_s | 360 |
| pulse_stun_s | 2 | fall_enabled | true |
| pulse_push_m | 4 | dash_speed | 14 |
| safe_radius | 6 | dash_duration_s | 0.2 |
| lantern_count_night1 | 5 | dash_cooldown_s | 1.5 |

Score: `per_mote` 10 (khi **nạp**), `per_lantern` 100, `per_stun` 5, `per_second_left` 2, `per_flame_left` 50. Các số chuẩn còn lại (nhảy 7/-20, detect 12, give up 18, charm 600/7.2/2700, drifter, spawn...) đặt trong `src/core/constants.ts` hoặc NightConfig, có comment trỏ về đề.

### 6.2 Di chuyển

- **Tốc độ chạy** 6 m/s (7.2 khi có bùa). **Tăng tốc/dừng tức thì** **[TQ]**: thỏa "≤ 0.1 s", giữ regression Phase 1 (dịch đúng 0.1 m/tick). Điều khiển trên không đầy đủ. Hướng = công thức `move` + `cam_yaw_deg` của contract, chuẩn hóa nếu > 1.
- `facing` **[TQ]**: hướng XZ của lần di chuyển khác 0 gần nhất; đầu Đêm là `startFacing` (+Z cả 3 Đêm). Phục vụ hướng Lướt khi đứng yên.
- **Nhảy:** cạnh `jump`, chỉ khi `grounded`, vy = 7, trọng lực -20 (giữ cách tích phân của Phase 1).
- **Mặt đất:** sau khi dịch XZ, `groundAt` cho độ cao mặt dưới chân. Leo được chênh lệch ≤ 0.3 m mỗi tick **[TQ]** (dốc Đêm 3 tăng 0.5 m/m, mỗi tick ≤ 0.06 m). Chênh lệch lớn hơn = vách: chặn chuyển động XZ theo từng trục (trượt dọc vách) **[TQ]**. Bước ra khỏi mép tầng cao thì rơi tự do xuống tầng dưới. Không còn tường vô hình ở mép đảo.
- **Lướt:** cạnh `dash`, cần `dashCd = 0` (hoặc đang có bùa) và không đang lướt, nhấn khi đang lướt bị bỏ qua. 12 tick ở 14 m/s theo hướng `move` hiện tại (khác 0) hoặc `facing`. Trên không giữ nguyên độ cao: vy = 0, bỏ trọng lực trong lúc lướt. Hồi chiêu 90 tick tính từ tick bắt đầu (khi có bùa thì không đặt hồi chiêu). Không bất tử. Phát `dash {}`. Lướt bị vách chặn như đi bộ. Nhảy khi đang lướt bị bỏ qua **[TQ]**.
- **Bục nhảy:** khi Mây đang đứng trên bục (XZ ≤ 1 m tới tâm bục, chân ở mặt bục), đặt vy và `launchVel` ngang theo NightConfig. Đêm 2: vy 14, ngang 24 m/s hướng về tâm đảo kia. Đêm 3: vy 12, ngang 8 m/s hướng -Z. `launchVel` thay cho input di chuyển tới khi chạm đất. Được lướt; hết lướt thì `launchVel` tiếp tục, vy bắt đầu lại từ 0 **[TQ]**. Đáp đất khi chân đi xuống cắt qua mặt đất tại XZ hiện tại (kể cả tầng cao hơn điểm phóng).
- **Gió mạnh (Đêm 3):** báo trước từ `simTick = 1800k - 120`, thổi trong `[1800k, 1800k + 300)` với k ≥ 1 **[TQ]**. Hướng rút từ RNG lúc bắt đầu báo trước, `dir_deg` là số nguyên 0-359. Lúc thổi, cộng 2 m/s theo hướng gió vào dịch chuyển XZ của Mây mỗi tick (cả trên không và lúc lướt), vẫn bị vách chặn. Snapshot `wind {active, dir_deg}` (khi không thổi: `active: false`, `dir_deg` = hướng gần nhất hoặc 0). Scenario `wind_enabled: false` tắt hẳn. Đêm 1-2 không có gió.
- **Rơi khỏi đảo:** khi `pos.y < -10` (kiểm tra ngay sau bước di chuyển), xảy ra đúng 1 lần, bỏ qua bất tử: flames -1, mất toàn bộ `carried` (biến mất, không rơi ra), phát `player_hit {by:"fall", flames, dropped:0, lost:n}`. Hết flames thì thua ở bước xét thắng/thua, không hồi sinh. Ngược lại chờ 60 tick (đứng yên tại chỗ, bỏ qua input, không nhặt, không bị chạm, không bị cướp) rồi về `start`, vel 0, `grounded`, `facing = startFacing`, bất tử 90 tick.

### 6.3 Đom đóm

- Sức chứa 10. Nhặt tự động khi XZ ≤ 1.0 **và** `|chân Mây - Y mặt đất của đom đóm| ≤ 1.5`, duyệt theo id, dừng khi đầy. Không nhặt khi đang chờ hồi sinh.
- Đầu Đêm: 20 đom đóm `random` ở 20 điểm khác nhau rút từ `moteSpawnPoints` bằng RNG. Tại `simTick` = 240, 480, … : nếu tổng số đom đóm đang có (random + dropped) < 30 thì sinh 1 con ở một điểm trống rút ngẫu nhiên. **Điểm trống [TQ]** = không có đom đóm nào trong XZ ≤ 1.0 quanh điểm. Hết điểm trống thì bỏ lượt.
- Đom đóm `dropped` có `ttl` 480 tick, nhặt được từ tick sau, hết ttl thì biến mất. Đom đóm `random` có `ttl_s: null`.
- Id `M1, M2, …` theo một bộ đếm chung.

### 6.4 Đèn lồng & vùng an toàn

- Chi phí 10, nạp nhiều lần, đèn nhớ tiến độ. Cạnh `interact`: trong các đèn **chưa sáng** có XZ ≤ 2.0 và `|chân Mây - Y đèn| ≤ 1.5` **[TQ, phần chênh cao]**, chọn đèn gần nhất (hòa thì id nhỏ). `amount = min(carried, 10 - deposited)`, amount > 0 thì `deposit`, +10 điểm mỗi đom đóm. Đủ thì `lantern_lit`, +100.
- Đèn sáng tạo vùng an toàn bán kính 6 (đo XZ): Bóng Mực ở ngoài không vào được (kẹp ở mép, giữ hàm giao hai đường tròn của Phase 1 cho trường hợp sát mép đảo). Bóng Mực đang ở trong lúc đèn vừa thắp được gắn cờ `evicting`: mỗi tick di chuyển ra theo hướng tâm đèn → bóng với tốc độ `max(shade_speed, khoảng còn lại / tick còn lại)`, ra tới mép trong tối đa 30 tick, không gây sát thương cho tới khi ra hẳn. Trạng thái hiển thị giữ nguyên **[TQ]**.
- Ánh sáng môi trường (web): `0.15 + 0.55 × (đèn sáng / tổng đèn)`.

### 6.5 Tỏa Sáng

- Cạnh `pulse`, cần `pulseCd = 0` và `carried ≥ 3`; không đủ thì bỏ qua, không ghi event. Trừ 3, hồi chiêu 180 tick.
- Tâm = chân Mây + (0, 0.8, 0). Mục tiêu chốt ngay tick kích hoạt: mọi Bóng Mực có khoảng cách 3D tới tâm bóng ≤ 5 (kể cả đang choáng). Tâm Bóng Mực = mặt đất dưới nó + 1.0 **[TQ]**.
- Mỗi Bóng Mực trúng: `stunned` 120 tick (làm mới nếu đang choáng). Trong 15 tick đầu bị đẩy tổng 4 m theo phương ngang hướng tâm pulse → bóng (trùng XZ thì +X), mỗi tick 4/15 m, dừng hẳn nếu gặp vật cản (vách, tháp, khoảng không, mép vùng an toàn). Pulse lại làm mới cả choáng lẫn đẩy. +5 điểm mỗi con. Không chết. Event `pulse {stunned_ids}` (chỉ id Bóng Mực).
- Gió Lạc trong 3D ≤ 5 (tâm Gió Lạc = Y của nó) cũng bị ảnh hưởng theo §7.1.

### 6.6 Bóng Mực

- Tốc độ 4.0 (Đêm 3: 4.5). Trạng thái đúng tên: `spawning`, `wander`, `chase`, `recoil`, `stunned`.
  - `spawning` **[TQ]**: 60 tick sau khi sinh, đứng yên, không gây hit, không bị pulse đẩy (vẫn bị chốt làm mục tiêu và chuyển `stunned`), hết thời gian thì sang `wander`.
  - `wander` **[TQ]**: đi 0.5 × tốc độ, hướng rút từ RNG mỗi 120 tick, không ra khỏi đất liền. Sang `chase` khi khoảng cách XZ tới Mây ≤ 12.
  - `chase`: tiến thẳng về Mây trên XZ. Về `wander` khi XZ > 18. Đuổi theo Mây qua cầu nhưng không leo vách (bị chặn, trượt dọc).
  - `recoil`: sau khi gây hit, lùi 2 m trong 60 tick (2/60 m/tick, hướng Mây → bóng), không gây hit.
  - `stunned`: 120 tick, không di chuyển (trừ phần đẩy lùi), không gây hit.
  - Hết `recoil`/`stunned` **[TQ]**: XZ ≤ 18 → `chase`, ngược lại `wander`.
- Bóng Mực đi trên mặt đất (Y = mặt đất + 1.0) theo **cùng luật bước với Mây** **[TQ]**: leo/xuống chênh ≤ 0.3 mỗi tick (nên lên được dốc Đêm 3 và tới tầng 1; tầng 2 chỉ tới được bằng bục nhảy nên Bóng Mực không lên tầng 2), vách cao hơn thì bị chặn và trượt dọc. Bước ra mép tầng cao **[TQ]**: không đi ra (coi như vách), để bóng không rơi. Không đi vào khoảng không. Mây chạm bóng lúc đang chờ hồi sinh thì không tính.
- **Chạm:** XZ ≤ 1.0 và `|chân Mây - mặt đất dưới bóng| ≤ 1.5`, chỉ xét bóng ở `wander`/`chase` và không `evicting`, theo id tăng dần, tối đa 1 hit mỗi tick. Mây đang bất tử thì không có gì xảy ra (bóng không vào `recoil`). Hit: flames -1, `dropped = floor(carried/2)` tạo đom đóm `dropped` ở vành 1.5-2.5 m quanh Mây (góc và bán kính rút từ RNG). Điểm rơi không có đất thì đặt tại XZ của Mây **[TQ]**. Y = mặt đất tại điểm rơi. Bất tử 90 tick. Event `player_hit {by:"shade", flames, dropped}`.
- **Lịch sinh:** 2 con tại `simTick = 300`, sau đó 1 con tại `300 + interval·k` (Đêm 1/2/3: 480/420/360), tối đa 6/8/10 con đang tồn tại. Điểm hợp lệ = điểm trong `shadeSpawnPoints` cách Mây ≥ 15 m (XZ) và không nằm trong vùng an toàn của đèn đã sáng **[TQ]**, rút ngẫu nhiên. Hết điểm hợp lệ thì bỏ lượt. Id `S1, S2, …`. Event `shade_spawned {id}`.

### 6.7 Máu, thời gian, thắng/thua, điểm

- 3 Ngọn Lửa, hồi đầy đầu mỗi Đêm. `time_left_s = T0 - simTick/60`, T0 = `nightN_duration_s` hoặc `time_left_s` của scenario.
- Xét ở cuối tick: flames = 0 → `lost/no_flames` (luôn thua); còn lại mà tất cả đèn sáng → `won/all_lit` (kể cả đúng tick hết giờ); còn lại mà `time_left_s ≤ 0` → `lost/dawn`. Thắng: + `floor(time_left_s) × 2` + 50 × flames. Không còn kết thúc giữa tick như Phase 1.
- Tổng điểm game (web) = tổng điểm các Đêm đã thắng.

## 7. Tính năng mới

### 7.1 Gió Lạc (Đêm 2, 3)

- Tối đa 2 con chưa `removed`. Sinh tại `simTick` 1200, 2400, … ở một điểm sương rút ngẫu nhiên. **Điểm sương [TQ]** = danh sách `shadeSpawnPoints` của Đêm đó. Id `D1, D2, …`. Bay, không bị địa hình hay vùng an toàn chặn, Y = 1.5 **[TQ]**.
- `idle`: lượn 2 m/s, hướng rút từ RNG mỗi 120 tick **[TQ]**. Sang `chase` khi Mây mang ≥ 5 và XZ ≤ 15 (kiểm tra mỗi tick), điều kiện mất thì về `idle`.
- `chase`: bay về Mây 7 m/s. Chạm XZ ≤ 1.2 (bất tử không ngăn, chờ hồi sinh thì ngăn): cướp `min(3, carried)`, `stolen` = số đó, chuyển `flee`. Event `drifter_steal {drifter_id, amount, carried}` (carried sau khi bị cướp).
- `flee`: bay ra xa Mây 7 m/s trong 240 tick rồi `removed` (mất số đã cướp). Mỗi con chỉ cướp 1 lần.
- Tỏa Sáng trúng: đang `chase` → `flee` với `stolen = 0`. Đang `idle` → không đổi **[TQ]**. Đang `flee` và `stolen > 0` → thả toàn bộ thành đom đóm `dropped` tại XZ của nó (Y = mặt đất, không có đất thì ở XZ của Mây), `stolen = 0`, event `drifter_drop {drifter_id, amount}`, đặt hẹn giờ 120 tick rồi `removed`.
- `removed`: giữ trong mảng với `state: "removed"` **[TQ]**, không tương tác, không tính vào giới hạn 2.
- Bước 9 xét Gió Lạc cướp trước, sau đó Bóng Mực gây hit.

### 7.2 Bùa Gió

- Id `C1, C2`. Vị trí: Đêm 2 (35,0,0); Đêm 3 (30,0,25), (-30,0,25). Đêm 1 không có. Nhặt theo luật của đom đóm (không cần còn chỗ chứa) → `available: false`, `respawn` 2700 tick, `charmTicks = 600` (nhặt lại thì làm mới). Event `charm_picked {charm_id, charm_ticks: 600}`.
- Hiệu lực: chạy 7.2 m/s, Lướt không hồi chiêu (vẫn phải nhấn lại; lướt vẫn 14 m/s trong 12 tick).

### 7.3 Chuỗi 3 Đêm (web)

Menu chính (landing page Phase 1 giữ làm phần sáng tạo, nút Chơi dẫn tới menu) → intro Đêm (tên đảo + lời Ông Đăng) → chơi → kết quả (điểm Đêm, tổng) → Đêm kế. Thua: Chơi lại Đêm đó hoặc Về menu. Thắng Đêm 3 → màn Bình Minh với tổng điểm. Seed web = `Date.now()` ở tầng web (lõi vẫn tất định).

### 7.4 Tạm dừng (trong lõi)

Input `pause` (cạnh) bật/tắt. Mỗi bước `tick++`. Nếu `pause` vừa bật → `paused {}`, bỏ bước 2-11. Nếu đang tạm dừng → bỏ bước 2-11 (không nhặt, không giảm bộ đếm). **Bước 12 (snapshot) luôn chạy** theo `tick`, ghi `state: "paused"`. Nếu vừa tắt → `resumed {}`, chạy tiếp bước bình thường, `simTick++`. Cạnh của các nút khác phát sinh trong lúc tạm dừng bị bỏ **[TQ]** (trạng thái giữ nút vẫn cập nhật). Snapshot `state: "paused"`. Web: Esc/P gửi `pause` vào lõi. Menu tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. Tự tạm dừng khi ẩn tab (giữ từ Phase 1).

### 7.5 Cài đặt

Âm lượng tổng (0-100), độ nhạy chuột (0.2-3.0), lưu `localStorage` key `dao-den-long.settings.v1`, đọc/ghi trong try/catch, lỗi thì dùng mặc định.

### 7.6 Âm thanh

WebAudio tổng hợp: nhạc nền đêm (pad + chuông thưa), SFX cho nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối (mỗi giây), cảnh báo gió. Kích hoạt AudioContext ở cú click đầu. Âm lượng theo cài đặt. SFX lấy từ event của lõi, không thêm logic.

### 7.7 HUD

Ngọn Lửa (trên trái); `mm:ss` (trên giữa, ≤ 30 s chuyển `#FF5A5F` và nhấp nháy); đèn `k/n` + điểm (trên phải); thanh 10 ô đom đóm (dưới giữa); icon hồi chiêu Lướt và Tỏa Sáng có vòng tiến độ (dưới phải); "E - Nạp ánh sáng (x/10)" khi có đèn hợp lệ trong tầm; mũi tên ở mép màn hình chỉ tới đèn chưa sáng gần nhất khi nó nằm ngoài khung nhìn; chỉ báo bùa và cảnh báo gió (lá bay).

### 7.8 Bảng màu & hình ảnh

Áp đúng bảng hex của đề (sai lệch ≤ 10%/kênh) cho trời, sương, cỏ, cát, gỗ (cầu tre, cột), biển mây, đèn sáng/lõi/tắt, đom đóm, Bóng Mực (thân/viền/choáng), áo/khăn Mây, Bùa Gió, viền vàng, Gió Lạc, UI. Mô hình mới: cầu tre, bục nhảy, tầng/dốc/vách, tháp chuông, Bùa Gió, Gió Lạc (dải lụa), lá bay khi có gió. Bản thường đạt ≥ 30 FPS trung bình ở 1280×720 (giới hạn PointLight, dùng emissive + instancing cho đom đóm).

## 8. Headless I/O v1.1

- `--night` ∈ {1,2,3}, giá trị khác → mã thoát 1. Các tham số khác giữ như v1.0.
- **Input** thêm `dash`, `pause` (cạnh false→true).
- **Scenario** (áp sau `createGame`, không phát event, không cộng điểm): giữ trường v1.0, thêm `player.{invuln_ticks, dash_cd_ticks, pulse_cd_ticks, charm_ticks}`, `shades[].{state, state_ticks_left}` (thiếu thì `chase` **[TQ]** và 0), `drifters[] {id?, pos, state?, stolen?}` và `charms[] {id, pos?, available?, respawn_ticks?}` (đều **thay thế** danh sách mặc định), cờ `random_drifters` (false → không sinh theo lịch), `wind_enabled`. Id đèn hợp lệ theo Đêm (L1-L5/L6/L7). Sai định dạng → mã thoát 2.
- **Snapshot**: `{type, tick, sim_tick, night, state, time_left_s, score, wind{active, dir_deg}, player{pos, vel, grounded, flames, carried, invuln, dash_cd_s, pulse_cd_s, charm_s}, lanterns[], shades[{id,pos,state}], motes[{id,pos,kind,ttl_s}], drifters[{id,pos,state,stolen}], charms[{id,available,respawn_s}], motes_active}`. `invuln` là **boolean** (đang bất tử hay không) **[TQ]**: đề đặt nó cạnh các trường `_s` mà không có hậu tố, nên hiểu là cờ. `vel` gồm thành phần ngang thực tế tick đó và vy. Số làm tròn 3 chữ số.
- **Event** thêm `dash {}`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start {night}` (ghi một lần với `tick: 0`, **ngay sau** snapshot tick 0, để dòng đầu file vẫn là snapshot như v1.0 **[TQ]**), `paused {}`, `resumed {}`; `player_hit` do rơi có thêm `lost`.
- Hiệu năng: 21.600 tick ≤ 30 s (mục tiêu < 5 s), kể cả `--snapshot-every 1`.

## 9. Thứ tự một tick **[CĐ]**

1. Đọc input: xử lý `pause` trước (§7.4).
2. Giảm bộ đếm: thời gian, hồi chiêu, bất tử, choáng/recoil/spawning, bùa, ttl đom đóm rơi, hồi bùa, chờ hồi sinh, hẹn giờ Gió Lạc, gió. Đặt N ở bước k thì còn hiệu lực đúng N bước kế tiếp (như Phase 1).
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió), rồi kiểm tra rơi khỏi đảo.
4. Nhặt đom đóm và bùa.
5. Tương tác với đèn.
6. Cập nhật vùng an toàn (gắn `evicting` cho đèn vừa sáng).
7. Tỏa Sáng.
8. Di chuyển Bóng Mực (kẹp vùng an toàn) và Gió Lạc.
9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (id tăng dần).
10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch (thực thể mới chỉ tương tác từ tick sau).
11. Xét thắng/thua.
12. Ghi snapshot nếu tới lượt.

## 10. Test, bằng chứng, harness

- Cập nhật test Phase 1 sang số chuẩn (không xóa để cho qua). Thêm ít nhất 1 scenario headless cho mỗi mục Phần 3 và mỗi luật mới: dash (đất/không trung/hướng facing), bục nhảy Đêm 2 đáp đúng đảo, bục Đêm 3 lên tầng 2, rơi + hồi sinh, gió, Gió Lạc cướp/bị pulse/thả, bùa (tốc độ, không hồi chiêu, respawn), pause (tick tăng, sim_tick đứng), lịch sinh đom đóm và Bóng Mực, 5 trạng thái Bóng Mực, vùng an toàn đẩy ra trong 30 tick, thắng đúng tick hết giờ, mỗi `--night`, hiệu năng 21.600 tick.
- Acceptance criteria cho từng mục Phần 3: viết trong plan và README.
- `evidence/phase-2/`: vitest, JSONL từng scenario, determinism 3 Đêm, thời gian chạy headless, FPS 1280×720, ảnh 3 Đêm + menu + HUD. Sinh bằng script.
- Cập nhật `AGENTS.md`, `CLAUDE.md`, thêm skill dự án `.claude/skills/dao-den-long-contract/SKILL.md` (luật contract v1.1, thứ tự tick, cách thêm scenario). Mỗi phần commit local riêng để lịch sử git thể hiện, không push khi chưa được đồng ý.

## 11. Chia việc

- **Bước 0 (tuần tự):** commit landing page đang dở; cập nhật `game.contract.json`, `types.ts`, API `NightConfig` + `terrain`.
- **Nhánh A, lõi + headless + test (đường găng):** A1 số chuẩn + thứ tự tick + pause + thắng/thua cuối tick + điểm (Đêm 1, regression xanh); A2 địa hình + 3 Đêm + rơi + bục nhảy + gió; A3 Bóng Mực 5 trạng thái + lịch sinh + vùng an toàn; A4 dash + bùa + Gió Lạc; A5 contract v1.1 I/O.
- **Nhánh B, model + màu:** `src/web/models/**`.
- **Nhánh C, vỏ web:** flow 3 Đêm, menu, tạm dừng, cài đặt, âm thanh, HUD.
- **Bước cuối:** ghép, evidence, README, ai-log, AGENTS/skill, tag `phase-2` (local).

## 12. Để builder quyết

Cấu trúc file chi tiết, hình dạng mesh, nhạc/SFX cụ thể, lời thoại Ông Đăng, cách vẽ mũi tên chỉ đèn, cách đo FPS.
