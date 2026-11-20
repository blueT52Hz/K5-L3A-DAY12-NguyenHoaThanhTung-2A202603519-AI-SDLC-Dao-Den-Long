# Đảo Đèn Lồng - Phase 4 "Bình minh: v1.0.0" - thiết kế

Nguồn: `D:\VinAI\Day12\phase-4.html` (TICKET-04, contract v1.3, tag `phase-4`, Release `v1.0.0`). Chạy sau Phase 3 (contract 1.2).

## Mục đích
Biến game thành sản phẩm phát hành được: đo hiệu năng, chạy lâu ổn định, bảng xếp hạng, dễ tiếp cận, cài 3 lệnh.

## Mục tiêu / không làm / phản mục tiêu
- Mục tiêu: bench, soak, leaderboard, accessibility, đóng gói + tài liệu, contract 1.3 đúng ticket.
- Không làm lúc này (chủ dự án): video demo (để sau), test mới.
- Chờ đồng ý: push, tag `phase-4`, GitHub Release `v1.0.0` (đưa code ra ngoài).
- Phản mục tiêu: đổi output headless / luật v1.0-1.2; benchmark đo cảnh khác cảnh chuẩn; quá 3 lệnh cài.

## Hướng làm (Approaches)
- Leaderboard: chọn **server Node nhỏ** (`server.mjs`, `node:http`) phục vụ `dist/` + API ghi `data/leaderboard.json`; `--export-leaderboard` đọc thẳng file. Bỏ: localStorage + Playwright đọc profile (dữ liệu trong profile trình duyệt, lệnh xuất dễ gãy).
- Bench: chọn **Playwright mở Chrome 1280x720** vào trang `?bench=<seed>&duration=<s>`; trang tự đo và trả kết quả. Bỏ: Electron/đóng gói native (nặng, ngoài stack).
- Soak: chạy **lõi headless trong cùng tiến trình Node** (không cần trình duyệt).

## Thiết kế

### Contract 1.3
`contract_version "1.3"`, `run_cmd "npm start"`, thêm `bench_cmd "node scripts/bench.mjs"`, `soak_cmd "node dist-headless/soak.mjs"`. Tuning giữ nguyên v1.2.

### Server + leaderboard
- `server.mjs`: static `dist/` (MIME cơ bản, chặn path traversal), `GET /api/leaderboard` -> `{entries}`, `POST /api/leaderboard` body `{name, score, nights_won, seed}` -> server gắn `achieved_at` (ISO 8601 có offset múi giờ), validate, chèn, giữ top 10, ghi file atomically. `--export-leaderboard <path>` ghi `{"entries":[...]}` rồi thoát 0. Cổng mặc định 4173, `PORT` override.
- Module thuần dùng chung (`src/shared/leaderboard-rules.ts` -> bundle cho server): `validName` (3-12 ký tự `[A-Za-z0-9_]` hoặc chữ cái tiếng Việt có dấu - điểm cộng), `insertEntry` (sort score giảm, hòa thì `achieved_at` sớm hơn trước, ổn định), cắt 10.
- Web: sau màn Bình Minh (thắng Đêm 3) hoặc sau thua bất kỳ Đêm: form nhập tên (có thể bỏ qua). `score` = tổng điểm Đêm đã thắng, `nights_won` 0-3, `seed` = seed ván. Menu chính có "Bảng xếp hạng". Server không chạy (vd `vite dev`) -> báo lỗi nhẹ, không crash.

### Soak
- `src/headless/soak-cli.ts` -> `dist-headless/soak.mjs`. Args `--seed 7 --nights 10 --out soak.json`.
- Đêm i (0-based) dùng seed `7 + i`, night = `(i % 3) + 1`, chạy tới hết game hoặc `duration*60` sim tick. Input ngẫu nhiên từ RNG riêng (mulberry32 seed theo Đêm, không đụng RNG game): mỗi 30 tick chọn hướng mới; mỗi tick 5% jump, 3% dash, 2% pulse, 10% interact.
- `mem_start_mb` = RSS sau khi tạo Đêm đầu; `mem_end_mb` = RSS sau khi tạo state mới (reset) sau Đêm cuối (gợi ý `global.gc` nếu có `--expose-gc`). `crashes` = số Đêm ném exception (bắt, tiếp tục). `results` theo thứ tự; `duration_s` wall clock.

### Bench
- Core: cờ `GameState.bench` (mặc định false, không ra snapshot): khi true tắt spawn (mote/shade/drifter), hit, nhặt đom đóm, hao dầu/hút dầu, `resolveEndOfTick`; gió + drifter tắt. Bóng Mực wander bình thường (đèn đầy dầu nên không drain).
- Cảnh: Đêm 1, 200 shade `wander` rải đều trên đảo bằng RNG seed 42 (điểm đứng được), 100 đom đóm rải tương tự, L1-L3 lit fuel 100, Mây tại (0,0,0) đứng yên, không input. Camera: tâm (0,0,0), r 30, Y 15, nhìn (0,0,0), bắt đầu (30,15,0), ngược chiều kim đồng hồ nhìn từ trên (góc tăng từ +X sang -Z... chọn theo hệ trục three: x = 30cos t, z = -30sin t), 15 s/vòng. Đầy đủ hiệu ứng như chơi thật (không ép CPU mode).
- Đo: 3 s khởi động bỏ; đo `duration` s; `dt` từng frame từ rAF. `frames`, `avg_fps = 1000N/Σdt`, `p1_low_fps` (k = max(1, ceil(0.01N)) dt lớn nhất), `frame_ms_p95` (nearest-rank), `load_ms` = từ khi script bắt đầu tới frame đầu của cảnh bench. Trang trả `window.__benchResult`.
- `scripts/bench.mjs`: Playwright chromium (channel chrome nếu có), headed, viewport/cửa sổ 1280x720, args `--disable-gpu-vsync --disable-frame-rate-limit`; tự khởi `server.mjs` nếu cổng trống; ghi bench.json (`contract_version, avg_fps, p1_low_fps, frame_ms_p95, frames, load_ms, peak_mem_mb, vsync_off: true, renderer` (WebGL UNMASKED_RENDERER + three version), `os`). `peak_mem_mb`: tổng RSS tiến trình Chrome lấy mẫu mỗi giây nếu đo được, else `null` + giải thích trong README. Thoát 0.
- Playwright vào devDependencies.

### Accessibility (settings-store, lưu)
- Đổi phím: di chuyển 4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng; màn chỉnh bấm-để-gán; trùng phím -> cảnh báo và không lưu tới khi hết trùng; nút "Khôi phục mặc định". Input đọc từ bảng phím.
- Phụ đề/chỉ báo: Bóng Mực xuất hiện (phụ đề + mũi tên mép màn hình chỉ hướng), gió sắp thổi, 10 s cuối, đèn `fuel < 30`.
- Giảm chuyển động: tắt rung camera và chớp màn hình.
- Chữ UI >= 18 px ở 1280x720; tùy chọn chữ lớn x1.25 (CSS var).

### Đóng gói & tài liệu
- 3 lệnh: `npm ci`, `npm run build`, `npm start`.
- README: mô tả, ảnh chụp, yêu cầu hệ thống, cài đặt, điều khiển, test, headless, bench, soak, leaderboard export.
- CHANGELOG mục Phase 1-4; CREDITS (asset procedural, âm thanh procedural, thư viện, công cụ AI); LICENSE MIT; retro `docs/retro.md` (từ `docs/ai-log.md`, token ước tính).
- `bench.json`, `soak.json` tự chạy, đặt ở gốc repo (commit khi chủ dự án đồng ý).
- Release: `scripts/package-release.mjs` tạo `release/dao-den-long-v1.0.0.zip` (dist, dist-headless, server.mjs, package.json, README-run). Upload/tag chờ đồng ý.

## Để lại cho người làm
Bố cục màn leaderboard/đổi phím, chữ phụ đề, cách lấy RSS Chrome trên Windows.
