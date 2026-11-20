# Đảo Đèn Lồng - Phase 1 (Đêm 1 - Đảo Bến)

Game 3D (Three.js + TypeScript) chơi được một đêm: nhặt đom đóm, nạp vào 5 Đèn Lồng Lớn để thắp sáng, tránh Bóng Mực, thắng khi đủ 5 đèn trước bình minh.
Lõi mô phỏng (`src/core`) là TypeScript thuần, chạy 60 tick/giây, dùng chung cho bản web và chế độ headless (Test Contract v1.0, tất định theo seed).

Sinh viên: Nguyễn Hoà Thanh Tùng - 2A202603519. Tag nộp bài: `phase-1`.
Các tài liệu đề lab (README, GUIDE, RUBRIC, RULES, CHECKPOINTS, SUBMISSION gốc) nằm trong thư mục [`lab/`](lab/).

## Cài đặt và chạy (3 lệnh)

Yêu cầu Node >= 20 (không cần biên dịch native; binary prebuilt cho linux/darwin/win32 đã có trong `package-lock.json`).

```
npm ci
npm run build
npm run preview
```

Mở địa chỉ Vite in ra (mặc định http://localhost:4173). Chế độ dev: `npm run dev`. Test: `npm test`.

## Headless

```
node dist-headless/headless.mjs --seed 42 --night 1 --ticks 1200 --out out/run.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

- Thiếu `--seed`, `--ticks`, `--out` hoặc `--night` khác 1: mã thoát 1. File scenario/inputs sai định dạng: mã thoát 2.
- Output JSONL: `snapshot` (tick 0 và mỗi `--snapshot-every` tick, có thêm mảng `motes`), `event`, dòng `end` luôn cuối. Cùng seed + cùng đầu vào cho output giống hệt từng byte.
- Ví dụ scenario/inputs: `evidence/phase-1/scenarios/`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất chưa sáng (trong 3m) |
| F | Tỏa sáng (pulse): choáng và đẩy Bóng Mực trong 6m, tốn 1 đom đóm |
| Kéo chuột / phím mũi tên trái-phải | Xoay camera (yaw đưa vào `cam_yaw_deg`) |
| P / Esc | Tạm dừng / tiếp tục (hiện hướng dẫn mục tiêu, phím và cách tính điểm) |
| R | Chơi lại (ở màn kết thúc) |

## Luật chơi tóm tắt

- Đảo tròn bán kính 40m, tường vô hình ở mép (không rơi khỏi đảo). 5 đèn L1-L5 cách đều trên vòng bán kính 25m, L1 ở (0,0,25).
- 40 đom đóm ngẫu nhiên theo seed (không sinh thêm). Mang tối đa 10. Mỗi đèn cần 5 đom đóm.
- Bóng Mực: 2 con lúc đầu, cứ 45 giây sinh thêm 1 (tối đa 6), luôn đuổi người chơi. Chạm: mất 1 máu, đánh rơi 50% đom đóm đang mang, bất tử 2 giây.
- Thắng: đủ 5 đèn. Thua: hết 3 máu, hoặc hết 300 giây (bình minh).

## Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | 10 |
| Thắp sáng 1 đèn | 100 |
| Choáng 1 Bóng Mực bằng pulse | 20 |
| Mỗi giây còn lại (chỉ khi thắng) | 2 |
| Mỗi máu còn lại (chỉ khi thắng) | 50 |

## Tuning (nguồn duy nhất: `game.contract.json`)

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

Lõi đọc các số này trực tiếp từ file contract nên số khai báo luôn khớp số đang dùng.

## Giả định (chỗ PRD-0 còn mơ hồ)

- **Sợ đèn:** chỉ đèn đã sáng mới có vùng cấm bán kính `safe_radius`; Bóng Mực bị đẩy ra mép vùng nếu lọt vào (cả khi bị pulse đẩy).
- **`fall_enabled = false`:** mép đảo là tường vô hình, không có sự kiện `fall`.
- **Thưởng thời gian/máu** (`per_second_left`, `per_flame_left`) chỉ cộng khi thắng, tính theo `floor(time_left_s)` của tick kết thúc.
- **Kết thúc giữa tick:** thắng/thua ở bước con nào thì các bước con còn lại của tick đó bị bỏ qua; `end.ticks` là số bước thực sự đã chạy.
- **Bộ đếm giảm trước** (invuln, cooldown, stun, timer sinh Bóng Mực) rồi mới xử lý input; stun 3s kéo dài đúng 180 tick.
- **Cạnh false→true:** `interact`/`pulse`/`jump` chỉ kích hoạt khi chuyển từ false sang true.
- **Pulse không đủ điều kiện** (đang cooldown hoặc `carried < pulse_cost`) bị bỏ qua, không ghi event.
- **Hit khi mang 0-1 đom đóm:** `dropped = 0`, vẫn ghi `player_hit`.
- **Y của Bóng Mực** giữ nguyên như scenario cho (shade tự sinh có Y = 1.0); mọi khoảng cách đo trên XZ.
- Nhảy chỉ đổi `player.pos[1]` (vận tốc 7, trọng lực -20), không ảnh hưởng va chạm.
- Chi tiết đầy đủ: `docs/superpowers/specs/2026-11-20-dao-den-long-phase1-design.md`.

## Sáng tạo của tôi

Phase 1 chưa có phần sáng tạo riêng ngoài hình ảnh cơ bản của lõi game: Mây đội nón lá treo đèn lồng, Bóng Mực khối tím, đảo sáng dần khi thắp đèn (low-poly dựng từ khối cơ bản). Chưa thêm cơ chế hay nội dung mới; ưu tiên đúng contract trước.

## Bằng chứng

- [`evidence/phase-1/README.md`](evidence/phase-1/README.md): giải thích từng file và lệnh sinh lại (`node scripts/generate-evidence.mjs`).
- Kết quả test: [`evidence/phase-1/vitest.txt`](evidence/phase-1/vitest.txt); tính tất định: [`evidence/phase-1/determinism.txt`](evidence/phase-1/determinism.txt).
- JSONL các tình huống: nhặt, nạp+thắp, pulse, bị hit, thắng, thua dawn trong `evidence/phase-1/*.jsonl`.
- Ảnh chụp game: `evidence/phase-1/screenshots/`.
- Nhật ký dùng AI và giả định: [`docs/ai-log.md`](docs/ai-log.md); quy trình AI: [`AGENTS.md`](AGENTS.md), [`docs/ai-process/phase-1/`](docs/ai-process/phase-1/).

## Chạy chỉ bằng CPU (khi GPU bị lỗi hiển thị)

```
npm run preview
npm run play:cpu
```

Cách thủ công: mở Chrome với `--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-rasterization`, rồi vào http://localhost:4173/?cpu=1. Chế độ `?cpu=1` hạ chất lượng (không khử răng cưa, độ phân giải thấp hơn, không PointLight) để chạy mượt bằng CPU. Đặt `CHROME_PATH` nếu script không tìm thấy trình duyệt.

## macOS / Linux

Toàn bộ là Node thuần (>= 20) và Vite; không cần biên dịch native vì lockfile chứa binary prebuilt cho linux/darwin, đường dẫn dùng `node:path`. Mới chỉ kiểm trên Windows qua Git Bash, từ bản sao sạch: `npm ci && npm run build && node dist-headless/headless.mjs ...` (xem `docs/ai-log.md`). Chưa chạy trên macOS/Linux thật.
