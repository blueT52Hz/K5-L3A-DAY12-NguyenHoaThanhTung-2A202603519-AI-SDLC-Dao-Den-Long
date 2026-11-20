# Retro 4 phase - Đảo Đèn Lồng v1.0.0

Tác giả: Nguyễn Hoà Thanh Tùng (2A202603519). Nguồn: `docs/ai-log.md`, `CHANGELOG.md`, lịch sử git (4 tag `phase-1` đến `phase-4`).

## Tổng hợp Evaluation theo phase

| Phase | Kết quả | Điểm yếu lộ ra |
|---|---|---|
| 1 (contract 1.0) | Lõi thuần tất định, headless JSONL, web chạy được; 46 test | Cảnh quá tối chỉ lộ khi chụp ảnh build thật; tài liệu từng nói quá (macOS/Linux) |
| 2 (contract 1.1) | 3 Đêm, lướt, bục nhảy, Gió Lạc, âm thanh, HUD; 11 scenario evidence | Hết giờ nên bỏ `npm test` và review từ Task 6; ước lượng phần web quá thấp |
| 3 (contract 1.2) | Luật dầu đèn và thắng ở bình minh, ADR 0001; 178 test | Ít test mới: chỉ `tests/core/phase3-audit-fixes.test.ts` thêm lúc audit, luật mới chủ yếu bảo chứng bằng evidence JSONL (178 test cuối phase); một test đã đỏ từ trước phase mới bị phát hiện muộn |
| 4 (contract 1.3) | Bench, soak, server + top 10, trợ năng, đóng gói; 178 test (không thêm) | FPS trên GT 730 ban đầu thấp, phải đo rồi tối ưu vẽ |

Số test không đổi 178 từ Phase 3 sang Phase 4 (Phase 4 không thêm test, chỉ sửa một kỳ vọng).

Số đo cuối: bench 100.7 FPS trung bình, 33.1 p1 low (GT 730, vsync tắt); soak 10 Đêm 0 crash, bộ nhớ 51 đến 57 MB.

## Điều gì hiệu quả khi làm với AI

- **Spec và contract trước khi code.** Tách [CĐ] (luật của đề) và [TQ] (quyết định của người viết), chốt thứ tự tick và số nguyên (dầu đơn vị 1/60). Nhờ vậy nhiều subagent làm song song với file sở hữu riêng mà ít xung đột, và README mục Giả định khớp code.
- **Lõi thuần + headless + JSONL.** Mọi luật chứng minh được bằng scenario nhỏ chạy trong giây, không cần trình duyệt; seed cố định cho output giống từng byte, nên hồi quy lộ ra ngay khi so sánh.
- **Đo thật rồi mới tối ưu.** Phase 4 đo bench trước, thấy shade và đom đóm tạo khoảng 800 draw call, rồi mới đổi sang instancing (còn khoảng 100) và thêm rào nhịp GPU.
- **Cờ tính năng không đụng contract.** Cờ `bench` mặc định false, không vào snapshot, không rút RNG: thêm chế độ đo mà không làm đổi output của phase cũ.

## Điều không hiệu quả và những lần AI sai

- **Bỏ test và review khi sát hạn (Phase 2, 3).** Hồi quy không bị chặn đúng lúc nhiều agent sửa song song. Bài học: test xanh là cổng của từng task, không phải việc dồn cuối.
- **AI sửa test cho khớp code.** Có test bị sửa kỳ vọng thay vì sửa lỗi; phát hiện bằng cách đọc diff test và yêu cầu ghi từng test đổi vào `CHANGELOG.md` (10 test ở Phase 3, 1 test ở Phase 4).
- **Điểm xuất phát Đêm 3 kẹt trong tháp** (Phase 2): review sớm bắt được; nếu chỉ dựa test thì không thấy.
- **Màu mù màu không tác dụng** do vật liệu nhân bản (Phase 3): chỉ thấy khi nhìn ảnh chụp thật, test không bắt.
- **Tài liệu nói quá** (Phase 1: "chạy macOS/Linux"): review tài liệu về mức độ kiểm chứng; nay README ghi rõ chỉ đã kiểm trên Windows.
- **Đo FPS sai nếu tin số của CPU:** khi tắt vsync, CPU đẩy lệnh nhanh hơn GPU vẽ nên avg_fps ảo; phải thêm rào nhịp GPU rồi mới tin số.

## Harness giúp nhiều nhất

1. **Hook Stop chạy `npm test`** (`.claude/hooks/run-tests-before-stop.sh`): chặn kết thúc phiên khi đỏ, lưới an toàn rẻ nhất.
2. **Skill `dao-den-long-contract`:** gói luật bất biến (không `Math.random`, thứ tự rút RNG, thứ tự 12 bước của tick) để agent mới không phá tính tất định.
3. **AGENTS.md và sổ SDD:** quy tắc "mỗi agent chỉ `git add` file của mình", rulings được ghi lại nên task sau không hỏi lại.
4. **Script sinh evidence:** không sửa tay file bằng chứng; thiếu chuỗi bắt buộc thì script báo lỗi.

## Token và chi phí

Không có số liệu usage chính xác từ công cụ. Ước tính thô theo số lần chạy subagent: Phase 1 khoảng 1.2M-2M token (16-18 lần chạy, mỗi lần 70k-120k). Phase 2 đến 4 chưa ước riêng; mức độ tương tự hoặc lớn hơn vì có nhiều task song song. Chi phí tiền chưa quy đổi.

Cách tiết kiệm: giao việc bằng spec/plan ngắn có file sở hữu rõ để subagent không đọc lan man; dùng scenario headless nhỏ thay vì chạy trình duyệt; chỉ chụp ảnh khi cần bằng chứng; đọc phần liên quan của file thay vì cả file; tái dùng skill dự án thay vì giải thích lại luật mỗi lần.

## Nếu làm lại

- Giữ ít nhất một test cho mỗi luật mới ngay trong task, không có ngoại lệ vì thời gian.
- Chụp và xem ảnh build thật ngay sau khi ghép web ở mỗi phase.
- Dựng bench và đo FPS từ Phase 2, để tối ưu vẽ không dồn vào phase cuối.
- Thêm kiểm tra tự động cho en dash/em dash và đếm test trong hook, để số liệu tài liệu (số test, version contract) không lệch.
- Ước lượng phần web (model, âm thanh, HUD) gấp đôi so với lõi.
