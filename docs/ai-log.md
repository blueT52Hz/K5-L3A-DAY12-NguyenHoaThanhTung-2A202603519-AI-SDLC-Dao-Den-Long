# Nhật ký dùng AI - Đảo Đèn Lồng Phase 1

## Cách dùng AI
1. Brainstorm với chủ dự án (skill brainstorming): đọc `phase1.html`, chọn Three.js + TS với lõi sim thuần (loại Godot vì headless cần binary, loại Python vì 3D kém). Tiêu chí: hoàn thành trước, hoàn hảo sau; đúng Test Contract là ưu tiên số 1.
2. Viết design spec, rồi plan chi tiết có task, interface và "Review Focus".
3. Chạy subagent song song (A lõi+headless, B model, C vỏ web) theo file sở hữu riêng, mỗi task có báo cáo trong `docs/ai-process/phase-1/`.
4. Task D: ghép, sinh evidence bằng script, kiểm tra trình duyệt thật, viết README/log, kiểm tra Linux-like.

## Quyết định và giả định chính
- Sợ đèn chỉ áp cho đèn đã sáng (đèn tắt không có vùng cấm).
- `fall_enabled = false`: kẹp vị trí ở mép đảo, không có sự kiện `fall`.
- Thưởng giây/máu còn lại chỉ khi thắng.
- Kết thúc giữa tick: bỏ các bước con còn lại; `time_left_s` vẫn tính theo tick k+1.
- Bộ đếm (invuln, cooldown, stun, spawn) giảm trước khi xử lý input.
- Y của Bóng Mực giữ như scenario cho; shade tự sinh có Y = 1.0.
- Tuning đọc từ `game.contract.json` để số khai báo luôn khớp code.

## Vấn đề review phát hiện
- Review A1/A2: Approved, 4 lỗi nhỏ. Đã sửa: `timeLeftS` phải kẹp >= 0 khi thắng (commit 57a25ee). Ghi nhận: thắng được kiểm bằng event `lantern_lit` trong tick (nếu scenario bắt đầu với 5 đèn sáng thì không thắng, chấp nhận theo spec "đủ 5 đèn khi thắp"); Y của shade là theo spec.
- Review A3/A4: xem `docs/ai-process/phase-1/` (progress.md ghi 44/44 test, sau các sửa nhỏ 46/46).
- C1: chưa kiểm trình duyệt lúc đó vì lõi chưa có; Task D kiểm sau khi ghép.

## Kiểm tra ở Task D
- Trình duyệt (Chrome, bản build + `vite preview`): game tải được, HUD hiển thị, di chuyển và nhặt đom đóm hoạt động (điểm 10, đom đóm 1/10), Bóng Mực xuất hiện và đuổi. Console chỉ có một lỗi 404 `favicon.ico` (không ảnh hưởng). Môi trường chụp ảnh chạy chậm nên chưa chụp được màn thắng/thua trên web; các kết cục đó được chứng minh bằng JSONL headless và test.
- Linux-like: Docker Desktop có cài nhưng daemon không chạy, nên chạy trong Git Bash trên bản sao sạch (không có node_modules/dist): `npm ci && npm run build && node dist-headless/headless.mjs --seed 1 --night 1 --ticks 60 --out out/x.jsonl` thoát 0 (Node v24). Chưa kiểm trên macOS/Linux thật.
- Test: 46/46 pass; seed 42 chạy 2 lần cho output giống từng byte.

## Ước tính token và chi phí (xấp xỉ, không phải số đo)
- Cách ước: đếm số lần chạy subagent rồi nhân với mức token điển hình mỗi lần. Không có số liệu usage chính xác từ công cụ.
- Khoảng 16-18 lần chạy: Task 0, A1A2, A3A4 (+2 vòng sửa), B1, C1, D, 2 review task, 1 review cuối, 1 polish, 1 sửa tài liệu. Mỗi lần khoảng 70k-120k token (vào + ra), tổng thô khoảng 1.2M-2M token cộng phần phiên chính. Chi phí tiền chưa quy đổi.

## Retro Phase 1
- Tốt: viết spec và contract trước giúp ba nhánh chạy song song với file sở hữu riêng, ít xung đột; lõi thuần có test và headless nên chứng minh kết cục bằng JSONL.
- Chưa tốt: cảnh quá tối chỉ lộ ra khi chụp ảnh bản build thật, test không bắt được; tài liệu từng nói quá (macOS/Linux, "không dependency native") và chỉ review cuối mới phát hiện.
- Lần sau: chụp và xem ảnh sớm ngay sau khi ghép vỏ web; review tài liệu về mức độ kiểm chứng trước khi chốt; thêm hook chặn kết thúc khi test đỏ từ đầu (nay đã có); dành thời gian cho phần sáng tạo.
