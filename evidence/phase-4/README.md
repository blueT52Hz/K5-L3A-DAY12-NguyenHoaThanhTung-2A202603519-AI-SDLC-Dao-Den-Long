# Evidence Phase 4 (v1.0.0, contract 1.3)

| Bằng chứng | Vị trí | Cách tạo lại |
|---|---|---|
| Bench (FPS, p1 low, p95, load, bộ nhớ) | `../../bench.json` | `npm run build && node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` |
| Soak 10 Đêm | `../../soak.json` | `node dist-headless/soak.mjs --seed 7 --nights 10 --out soak.json` |
| Ảnh trợ năng: đổi phím có cảnh báo trùng, chữ lớn, phụ đề và mũi tên Bóng Mực | `screenshots/a11y-*.png` | chụp từ bản build thật (Chrome 1280x720) |
| Ảnh bảng xếp hạng: rỗng, nhập tên, tên không hợp lệ, màn kết quả, top 10 | `screenshots/leaderboard-*.png` | như trên, `npm start` rồi chơi hoặc thua một ván |
| Test | `npm test` (178 xanh), `npx tsc --noEmit` | chạy trực tiếp |
| Bản phát hành | `release/dao-den-long-v1.0.0.zip` (gitignore) | `npm run build && npm run release` |

Số đo (máy dev: Windows 10, GT 730, Chrome): avg_fps 100.7, p1_low_fps 33.1, frame_ms_p95 18, load_ms 3736, peak_mem_mb 515; soak 0 crash, 51 -> 57 MB. `peak_mem_mb` là tổng RSS của cả cây tiến trình bench lấy mẫu mỗi 3 s. Xem README gốc mục Bench để biết ghi chú vsync.
