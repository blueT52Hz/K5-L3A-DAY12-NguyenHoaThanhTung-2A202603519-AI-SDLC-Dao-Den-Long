# Đảo Đèn Lồng - Phase 2 (3 Đêm: Đảo Bến, Đảo Cầu, Đảo Chuông)

Game 3D (Three.js + TypeScript): nhặt đom đóm, nạp vào Đèn Lồng Lớn, tránh Bóng Mực và Gió Lạc, thắp đủ đèn trước bình minh, qua 3 Đêm.
Lõi mô phỏng (`src/core`) là TypeScript thuần, chạy 60 tick/giây, dùng chung cho bản web và chế độ headless (Test Contract v1.1, tất định theo seed).

Sinh viên: Nguyễn Hoà Thanh Tùng - 2A202603519. Tag nộp bài: `phase-1` (Phase 1), `phase-2` (Phase 2, gắn sau khi đo FPS và chụp ảnh web).
Các tài liệu đề lab nằm trong [`lab/`](lab/).

## Cài đặt và chạy (3 lệnh)

Yêu cầu Node >= 20 (không cần biên dịch native; binary prebuilt cho linux/darwin/win32 đã có trong `package-lock.json`).

```
npm ci
npm run build
npm run preview
```

Mở địa chỉ Vite in ra (mặc định http://localhost:4173). Chế độ dev: `npm run dev`. Test: `npm test`.

Trang đầu là landing page có hướng dẫn chơi. Game 3D chỉ được tải sau khi bấm **Bắt đầu chơi**, rồi vào menu chọn Đêm. Thêm `?play=1` vào URL để bỏ qua landing.

## Headless

```
node dist-headless/headless.mjs --seed 42 --night 1 --ticks 1200 --out out/run.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

- `--night` nhận 1, 2 hoặc 3 (mặc định 1); giá trị khác, hoặc thiếu `--seed`/`--ticks`/`--out`: mã thoát 1. File scenario/inputs sai định dạng: mã thoát 2.
- Output JSONL: snapshot tick 0, ngay sau đó event `night_start`, rồi `event` và `snapshot` (mỗi `--snapshot-every` tick; khi tạm dừng snapshot ghi `state: "paused"`), dòng `end` luôn cuối. Cùng seed + cùng đầu vào cho output giống hệt từng byte.
- Input thêm `dash`, `pause`. Scenario thêm `player.{invuln_ticks, dash_cd_ticks, pulse_cd_ticks, charm_ticks}`, `shades[].{state, state_ticks_left}`, `drifters`, `charms`, `random_drifters`, `wind_enabled`.
- Ví dụ scenario/inputs: `evidence/phase-2/scenarios/` và `evidence/phase-1/scenarios/`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Space | Nhảy |
| Shift | Lướt (dash): 12 tick ở 14 m/s, hồi chiêu 1.5 s |
| E | Nạp đom đóm vào đèn gần nhất chưa sáng (trong 2m) |
| F | Tỏa sáng (pulse): choáng và đẩy Bóng Mực trong 5m, tốn 3 đom đóm |
| Kéo chuột / phím mũi tên trái-phải | Xoay camera (yaw đưa vào `cam_yaw_deg`) |
| Esc / P | Tạm dừng / tiếp tục (lõi dừng hoàn toàn); menu có Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu |
| R | Chơi lại (ở màn kết thúc) |

Cài đặt (âm lượng tổng 0-100, độ nhạy chuột 0.2-3.0) lưu ở `localStorage` key `dao-den-long.settings.v1`.

## Ba Đêm

| Đêm | Đảo | Thời gian | Đèn | Bóng Mực (cách nhau / tối đa) | Khác |
|---|---|---|---|---|---|
| 1 | Đảo Bến: đĩa bán kính 40 | 300 s | 5 | 480 tick / 6 | không Gió Lạc, không bùa |
| 2 | Đảo Cầu: hai đĩa bán kính 28 (tâm x=0 và x=70) nối bằng cầu tre | 330 s | 6 | 420 tick / 8 | 2 bục nhảy, Bùa Gió C1 (35,0,0), Gió Lạc |
| 3 | Đảo Chuông: 3 tầng (0 / 3 / 6 m), 2 dốc, tháp chuông | 360 s | 7 | 360 tick / 10, tốc độ 4.5 | bục nhảy tầng 1, 2 Bùa Gió, Gió Lạc, gió mạnh |

Mọi Đêm: không còn tường ở mép đảo, rơi xuống dưới y = -10 là mất 1 Ngọn Lửa và toàn bộ đom đóm đang mang, chờ 60 tick rồi hồi sinh ở điểm xuất phát với 90 tick bất tử.

## Số chuẩn

Nguồn duy nhất cho tuning: `game.contract.json` (v1.1). Các số chuẩn khác của đề nằm trong `src/core/constants.ts` và `src/core/nights/`.

| Khóa | Giá trị | Khóa | Giá trị |
|---|---|---|---|
| player_speed | 6 (7.2 khi có bùa) | flames | 3 |
| carry_capacity | 10 | invuln_s | 1.5 |
| lantern_cost | 10 | hit_drop_ratio | 0.5 |
| pickup_radius | 1 | pulse_stun_s / pulse_push_m | 2 / 4 |
| interact_radius | 2 | pulse_cooldown_s | 3 |
| pulse_cost / pulse_radius | 3 / 5 | safe_radius | 6 |
| shade_speed | 4 (Đêm 3: 4.5) | shade_hit_radius | 1 |
| night1/2/3_duration_s | 300 / 330 / 360 | fall_enabled | true |
| dash_speed / dash_duration_s / dash_cooldown_s | 14 / 0.2 / 1.5 | | |

## Luật chơi tóm tắt

- Đom đóm: 20 con lúc đầu, cứ 240 tick sinh thêm 1 nếu tổng < 30; đom đóm rơi sống 480 tick. Mang tối đa 10; mỗi đèn cần 10 và nhớ tiến độ.
- Bóng Mực: 2 con tại tick 300, sau đó theo chu kỳ của Đêm. Trạng thái `spawning` (60 tick) -> `wander` -> `chase` (trong 12 m, bỏ đuổi ngoài 18 m); chạm: mất 1 Ngọn Lửa, đánh rơi một nửa đom đóm, bất tử 1.5 s. Đèn đã sáng có vùng an toàn bán kính 6.
- Gió Lạc (Đêm 2, 3): từ tick 1200, tối đa 2 con; cướp tối đa 3 đom đóm khi bạn mang >= 5. Tỏa sáng khi nó đang đuổi thì nó bỏ chạy tay không; khi đang chạy với đồ cướp thì thả lại toàn bộ.
- Bùa Gió: 600 tick chạy 7.2 m/s và lướt không hồi chiêu; xuất hiện lại sau 2700 tick.
- Gió mạnh (Đêm 3): mỗi 1800 tick, báo trước 120 tick, thổi 300 tick, đẩy 2 m/s theo hướng ngẫu nhiên.
- Thắng: thắp đủ đèn (kể cả đúng tick bình minh). Thua: hết Ngọn Lửa, hoặc hết giờ.

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Nạp 1 đom đóm vào đèn | 10 |
| Thắp sáng 1 đèn | 100 |
| Choáng 1 Bóng Mực bằng pulse | 5 |
| Mỗi giây còn lại (chỉ khi thắng) | 2 |
| Mỗi Ngọn Lửa còn lại (chỉ khi thắng) | 50 |

Tổng điểm game trên web là tổng điểm các Đêm đã thắng.

## Giả định (chỗ đề còn mở, ghi là [TQ] trong spec)

Chi tiết đầy đủ: `docs/superpowers/specs/2026-11-20-dao-den-long-phase2-design.md`.

- **Di chuyển:** tăng tốc/dừng tức thì (thỏa "<= 0.1 s", giữ đúng 0.1 m/tick của Phase 1); `facing` là hướng của lần di chuyển khác 0 gần nhất, đầu Đêm là +Z.
- **Địa hình:** leo/xuống chênh <= 0.3 m mỗi tick; chênh lớn hơn là vách, chặn theo từng trục (trượt dọc vách). Nhảy khi đang lướt bị bỏ qua.
- **Lướt:** trên không giữ nguyên độ cao (vy = 0) trong lúc lướt; hồi chiêu tính từ tick bắt đầu; không bất tử.
- **Bục nhảy:** đứng trong 1 m quanh tâm bục là bị bắn; sau lướt `launchVel` tiếp tục, vy bắt đầu lại từ 0. Đêm 2: vy 14, 24 m/s về tâm đảo kia; Đêm 3: vy 12, 8 m/s theo -Z. Đêm 3 bục ở (0,3,13) (tầng 1), bắn Mây lên tầng 2.
- **Gió mạnh:** báo trước từ `simTick = 1800k - 120`, thổi trong `[1800k, 1800k + 300)` với k >= 1; hướng rút từ RNG lúc bắt đầu báo trước (số nguyên 0-359).
- **Điểm xuất phát Đêm 3 = (0,0,-20)** (đề không nêu): (0,0,0) nằm trong đĩa tầng 2 và tháp. Quyết định ở sổ SDD.
- **Đom đóm:** điểm trống = không có đom đóm nào trong 1.0 m (XZ); hết điểm trống thì bỏ lượt sinh. Nhặt cần chênh cao <= 1.5 m. Scenario `random_motes: false` tắt luôn lịch sinh mỗi 240 tick (giống `random_shades: false`) nên scenario có `motes` tường minh giữ đúng tập đó.
- **Đèn:** nạp cần chênh cao <= 1.5 m. Bóng Mực lọt vào vùng an toàn lúc đèn vừa sáng bị gắn cờ `evicting`: đi ra mép trong <= 30 tick, không gây sát thương, trạng thái hiển thị giữ nguyên.
- **Pulse:** tâm = chân + 0.8 m; tâm Bóng Mực = mặt đất + 1.0; đo 3D. Y của Bóng Mực trong scenario được gắn lại vào mặt đất + 1.0.
- **Bóng Mực:** `spawning` đứng yên, không gây hit, không bị đẩy; `wander` đi 0.5 x tốc độ, đổi hướng mỗi 120 tick; hết `recoil`/`stunned` thì về `chase` nếu <= 18 m, ngược lại `wander`. Đi theo cùng luật bước với Mây, không đi ra mép tầng cao (coi như vách), nên không lên tầng 2. Scenario thiếu `state` thì Bóng Mực ở `chase`. Điểm sinh hợp lệ: cách Mây >= 15 m và ngoài vùng an toàn đèn đã sáng.
- **Hit:** điểm rơi đom đóm ở vành 1.5-2.5 m quanh Mây; không có đất ở điểm rơi thì đặt tại XZ của Mây.
- **Gió Lạc:** điểm sương = `shadeSpawnPoints` của Đêm; bay ở Y = 1.5, không bị địa hình hay vùng an toàn chặn; tỏa sáng trúng Gió Lạc đang `idle` thì không đổi; `removed` vẫn nằm trong mảng với `state: "removed"`. Điểm thả: dưới Gió Lạc, không có đất thì XZ của Mây.
- **Tạm dừng:** cạnh nút khác phát sinh lúc tạm dừng bị bỏ; snapshot vẫn ghi theo `tick`.
- **Snapshot:** `invuln` là boolean; `night_start` ghi một lần ở tick 0, ngay sau snapshot đầu (dòng đầu file vẫn là snapshot).
- **Thưởng thời gian/máu** chỉ khi thắng, theo `floor(time_left_s)`; thắng ưu tiên hơn hết giờ trong cùng tick; hết Ngọn Lửa luôn thua. Đã bỏ "kết thúc giữa tick" của Phase 1: mọi kết thúc xét ở bước 11.
- **Seed web** = `Date.now()` ở tầng web; lõi vẫn tất định.
- **Kiểm thử:** theo quyết định của chủ dự án (hết thời gian), bộ `npm test` không chạy lại sau các task cuối của Phase 2; bằng chứng là JSONL headless trong `evidence/phase-2/`.

## Acceptance criteria cho 8 mục của Phần 3

1. **Gió Lạc:** tối đa 2 con, sinh ở tick 1200/2400/... (Đêm 2, 3), id D1, D2; `idle` -> `chase` khi mang >= 5 và <= 15 m; chạm <= 1.2 m cướp min(3, đang mang) và phát `drifter_steal`, rồi `flee` 240 tick; tỏa sáng khi `chase` thì `flee` không cướp, khi `flee` có đồ thì `drifter_drop` và biến mất sau 120 tick; không mất Ngọn Lửa; vùng an toàn không chặn; bất tử không ngăn bị cướp. Bằng chứng: `evidence/phase-2/drifter-steal-pulse-n2.jsonl`.
2. **Bùa Gió:** C1 (35,0,0) ở Đêm 2, C1/C2 ở Đêm 3; nhặt theo luật đom đóm phát `charm_picked {charm_ticks: 600}`; chạy 7.2 m/s, lướt không hồi chiêu; xuất hiện lại sau 2700 tick. Bằng chứng: `charm-n2.jsonl`.
3. **Chuỗi 3 Đêm:** menu -> giới thiệu Đêm -> chơi -> kết quả -> Đêm kế; thua thì chơi lại Đêm đó; thắng Đêm 3 hiện màn Bình Minh với tổng điểm. Bằng chứng: headless `--night 1|2|3` (`default-night*-seed42-run*.jsonl`) và ảnh web (do task web ghi bổ sung).
4. **Tạm dừng (Esc/P):** lõi dừng hoàn toàn (không giảm bộ đếm, không nhặt), snapshot `state: "paused"`, event `paused`/`resumed`; menu có Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. Bằng chứng: `pause.jsonl`.
5. **Cài đặt:** âm lượng và độ nhạy chuột lưu qua các lần mở game (`localStorage`, try/catch, lỗi thì dùng mặc định). Kiểm trên web.
6. **Âm thanh:** nhạc nền và SFX tổng hợp bằng WebAudio cho nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối, cảnh báo gió; lấy từ event của lõi. Kiểm trên web.
7. **HUD đầy đủ:** Ngọn Lửa, `mm:ss` (đỏ và nhấp nháy khi <= 30 s), đèn k/n và điểm, thanh đom đóm 10 ô, hồi chiêu Lướt và Tỏa Sáng, nhắc "E - Nạp ánh sáng (x/10)", mũi tên tới đèn chưa sáng, chỉ báo bùa và cảnh báo gió. Kiểm trên web.
8. **Bảng màu chuẩn:** hex của đề cho trời, sương, cỏ, cát, gỗ, biển mây, đèn, đom đóm, Bóng Mực, áo/khăn Mây, bùa, viền vàng, Gió Lạc, UI (sai lệch <= 10% mỗi kênh); ánh sáng môi trường `0.15 + 0.55 x (đèn sáng / tổng đèn)`. Kiểm trên web.

Mục 5-8 và FPS (>= 30 ở 1280x720) thuộc bản web, được kiểm riêng; kết quả ghi ở `evidence/phase-2/` khi có.

## Sáng tạo của tôi

- Landing page có hướng dẫn chơi (cách chơi, điều khiển, tính điểm, luật), game chỉ tải sau khi bấm Bắt đầu (từ Phase 1).
- Phase 1: Mây đội nón lá treo đèn lồng, Bóng Mực khối tím, đảo sáng dần khi thắp đèn (low-poly dựng từ khối cơ bản).
- Phase 2: bộ scenario headless riêng cho từng tính năng và script sinh bằng chứng (`scripts/generate-evidence-phase-2.mjs`), skill dự án `dao-den-long-contract` để agent giữ đúng luật contract khi mở rộng.
- Đồ họa đảo mới trong game (`src/web/decor/`): mỗi Đêm có địa hình stylized khớp đúng mặt đi của gameplay (cỏ, bãi cát, vách đá treo, bậc tầng, cầu tre), bầu trời trăng sao, biển mây, sương, đom đóm và đạo cụ riêng (làng chài Đêm 1, đảo cau Đêm 2, gác chuông Đêm 3). Ánh sáng vẫn theo công thức 0.15 + 0.55 x đèn sáng/tổng. Mây là nhân vật có khớp: tay chân vung theo tốc độ thật của người chơi (lướt nhanh hơn, đứng yên thì thở nhẹ), đèn trên nón và khăn lắc theo quán tính. Không bloom trong game để giữ FPS (khoảng 35-38 FPS ở 1280x720 trên máy dev). Ảnh: `evidence/decor-demo/game-night1.png`, `game-night2.png`, `game-night3.png`.
- Chỉ đổi phần hiển thị: output headless giữ nguyên, `diff` JSONL `--seed 1 --ticks 3600` trước/sau tích hợp trùng khớp cả 3 Đêm (`.superpowers/sdd/2026-11-20-island-decor-demo/integration-baseline/` và `integration-after/`).

## Bằng chứng

- Phase 2: [`evidence/phase-2/`](evidence/phase-2/): JSONL cho dash, bục nhảy Đêm 2 và 3, rơi và hồi sinh, gió, Gió Lạc cướp/thả, bùa, tạm dừng, trạng thái Bóng Mực, vùng an toàn, thắng đúng tick bình minh; `determinism.txt` (cả 3 Đêm); `headless-timing.txt` (21600 tick mỗi Đêm). Sinh lại: `npm run build && node scripts/generate-evidence-phase-2.mjs`. `vitest.txt` chỉ ghi lý do không chạy lại test.
- Phase 1: [`evidence/phase-1/README.md`](evidence/phase-1/README.md) và `node scripts/generate-evidence.mjs`.
- Nhật ký dùng AI và giả định: [`docs/ai-log.md`](docs/ai-log.md); quy trình AI: [`AGENTS.md`](AGENTS.md), [`docs/ai-process/phase-1/`](docs/ai-process/phase-1/).

## Chạy chỉ bằng CPU (khi GPU bị lỗi hiển thị)

```
npm run preview
npm run play:cpu
```

Cách thủ công: mở Chrome với `--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-rasterization`, rồi vào http://localhost:4173/?cpu=1. Chế độ `?cpu=1` hạ chất lượng (không khử răng cưa, độ phân giải thấp hơn, không PointLight) để chạy mượt bằng CPU. Đặt `CHROME_PATH` nếu script không tìm thấy trình duyệt.

## macOS / Linux

Toàn bộ là Node thuần (>= 20) và Vite; không cần biên dịch native vì lockfile chứa binary prebuilt cho linux/darwin, đường dẫn dùng `node:path`. Mới chỉ kiểm trên Windows qua Git Bash, từ bản sao sạch: `npm ci && npm run build && node dist-headless/headless.mjs ...` (xem `docs/ai-log.md`). Chưa chạy trên macOS/Linux thật.

Dev: `?play=1&night=2` (hoặc `night=3`) vào thẳng màn giới thiệu của Đêm đó; `scripts/measure-fps-and-screenshots.mjs` đo FPS và chụp ảnh bằng Playwright (`evidence/phase-2/`).
