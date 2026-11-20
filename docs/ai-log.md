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

---

# Phase 2 (3 Đêm, contract v1.1)

## Quy trình
1. Brainstorming và spec Phase 2 (`docs/superpowers/specs/2026-11-20-dao-den-long-phase2-design.md`): tách rõ [CĐ] (số/luật của đề) và [TQ] (quyết định của người viết).
2. Plan `docs/superpowers/plans/2026-11-20-dao-den-long-phase2.md` (Task 0-11), chạy bằng subagent-driven development trên nhánh `feat/phase-2`; sổ SDD ở `.superpowers/sdd/2026-11-20-dao-den-long-phase2/progress.md` ghi rulings, mang theo (carry) giữa task và lỗi nhỏ hoãn lại.
3. Lõi (địa hình, rơi/hồi sinh, lướt, bục nhảy, gió, bùa, Bóng Mực, Gió Lạc, tạm dừng) làm tuần tự T1-T7; model 3D, vỏ web, âm thanh và HUD chạy song song với file sở hữu riêng.
4. Task 11a: script sinh bằng chứng headless, tài liệu, skill dự án `dao-den-long-contract`.

## Quyết định và giả định chính
- Mọi [TQ] liệt kê ở README mục Giả định. Các rulings nổi bật trong lúc làm: điểm xuất phát Đêm 3 là (0,0,-20) vì (0,0,0) nằm trong tầng 2 và tháp; `random_motes: false` tắt luôn lịch sinh 240 tick; Y của Bóng Mực trong scenario được gắn lại vào mặt đất + 1.0.
- Review sớm bắt được: điểm xuất phát Đêm 3 kẹt trong tháp (Task 1), ba assertion Phase 1 bị bỏ khi viết lại (Task 5, đã khôi phục).
- Lỗi nhỏ hoãn lại (theo sổ SDD): dash qua mép có thể lơ lửng tối đa 12 tick (đúng chữ của spec), dropped mote dưới tầng cao có thể vào cột vách, scenario có `motes` mà không `random_motes: false` vẫn giữ lịch 240 tick.

## Quyết định của chủ dự án về thời gian
- Hết thời gian: không chạy `npm test` và bỏ review từng task từ Task 6 trở đi; implementer chỉ chạy `npx tsc --noEmit` và `npm run build`. Hệ quả: hành vi chưa kiểm lại có thể hồi quy; bằng chứng hiện có là JSONL headless (`evidence/phase-2/`) và 135 test xanh ở cuối Task 5.
- Cũng vì vậy test cũ "night != 1 -> 1" được sửa thành `--night 4 -> 1` và `--night 2 -> 0` nhưng chưa chạy lại.

## Kết quả bằng chứng headless (chạy thật)
- 11 scenario tính năng đều chứa event/trạng thái mong đợi; determinism 3 Đêm (seed 42, 1200 tick, hai lần) byte-identical; thời gian chạy 21600 tick với `--snapshot-every 1` xem `evidence/phase-2/headless-timing.txt` (khoảng 1 giây mỗi Đêm, mục tiêu <= 30 s).
- FPS và ảnh chụp web: do Task 11b ghi sau.

## Retro Phase 2
- Tốt: spec tách [CĐ]/[TQ] và sổ rulings giúp tài liệu Giả định khớp code; scenario headless cho từng tính năng làm bằng chứng nhanh và không phụ thuộc trình duyệt.
- Chưa tốt: cắt test và review ở cuối làm mất lưới an toàn đúng lúc nhiều agent sửa song song; ước lượng thời gian cho web (model, âm thanh, HUD) thấp.
- Lần sau: giữ test xanh làm cổng bắt buộc ở mỗi task, không dồn kiểm chứng web vào cuối.

---

# Phase 3 (đèn cạn dầu, contract v1.2)

## Quy trình
1. Đọc `phase-3.html`, brainstorming và spec `docs/superpowers/specs/2026-11-20-dao-den-long-phase3-design.md`; plan 8 task, chạy bằng subagent-driven (mỗi task một implementer, controller stage checkpoint).
2. Task 1-7: contract, dầu, nạp/thắp lại/sức chứa, vùng an toàn theo dầu, Bóng Mực `drain`, luật thắng bình minh, web (thanh dầu, HUD, bảng màu dễ phân biệt). Task 8: test cũ, evidence, ADR, changelog, tài liệu.

## Quyết định và giả định chính
- Dầu là số nguyên đơn vị 1/60 để ngưỡng 30 và 0 không lệch tick (ADR 0001); điểm Phase 3 (5/100/40/5/15/50/50) là quyết định của người viết.
- Không viết test mới (quyết định của chủ dự án vì thời gian); test cũ sai vì luật mới được sửa kỳ vọng (10 test) và ghi từng cái trong `CHANGELOG.md`, không skip.
- Một test đã đỏ từ trước Phase 3 (rng ở Đêm 2 do Gió Lạc sinh lúc tick 1200) được sửa ở test, code giữ nguyên.

## Kết quả
- `npm run build` và `npm test` xanh (178 test, theo `evidence/phase-3/vitest.txt`; số 149 ghi trước đó là số cũ, đã sửa); evidence `evidence/phase-3/` sinh bằng script, đủ 6 ca cạn dầu, châm dầu, thắp lại, drain, thắng và thua bình minh; determinism 3 Đêm byte-identical.
- Chưa kiểm trình duyệt thật trong task này (web do Task 6-7 và người chủ dự án xem).

## Retro Phase 3
- Tốt: spec chốt rõ số nguyên và thứ tự tick trước khi code nên ít lệch; evidence bằng scenario nhỏ chạy nhanh.
- Chưa tốt: không có test mới nên hành vi mới chỉ được bảo chứng bằng JSONL evidence.
- Lần sau: giữ một test cho mỗi luật mới ngay trong task đó.

---

# Phase 4 (bình minh, v1.0.0, contract v1.3)

## Quy trình
1. Đọc `phase-4.html`, spec `docs/superpowers/specs/2026-11-20-dao-den-long-phase4-design.md` và plan `docs/superpowers/plans/2026-11-20-dao-den-long-phase4.md` (Task 1-6), nhánh `feat/phase-4`; mỗi task một subagent, file sở hữu riêng.
2. Nội dung: cờ `bench` trong lõi và cảnh bench; `scripts/bench.mjs`; soak CLI; server Node + bảng xếp hạng; tối ưu vẽ (instancing, Lambert, rào nhịp GPU); trợ năng (đổi phím, phụ đề, mũi tên, giảm chuyển động, chữ lớn); Task 6 đóng gói và tài liệu.

## Quyết định và giả định chính
- Cờ `GameState.bench` mặc định false, không có trong snapshot, không rút RNG: output headless v1.0-v1.2 không đổi.
- `peak_mem_mb` = tổng RSS cả cây tiến trình bench, lấy mẫu mỗi 3 giây (không phải heap JS, không gồm VRAM).
- Bảng xếp hạng lưu ở `data/leaderboard.json` (gitignore), không dùng cơ sở dữ liệu.
- Contract 1.3 chỉ đổi lệnh (`run_cmd`, `bench_cmd`, `soak_cmd`), tuning giữ nguyên v1.2.
- Evidence JSONL của Phase 1 và 2 không sinh lại: chúng thuộc contract cũ (tag `phase-1`, `phase-2`), ghi chú trong từng thư mục.

## Kết quả
- `npm run build`, `npx tsc --noEmit`, `npm test` xanh: 178 test (không thêm test mới ở Phase 4). Thay đổi test phá vỡ duy nhất: `tests/smoke.test.ts` kỳ vọng contract 1.3.
- `bench.json` (GT 730): avg_fps 100.7, p1_low_fps 33.1, frame_ms_p95 18, load_ms 3736, peak_mem_mb 515. `soak.json`: 10 Đêm, 0 crash, 51 -> 57 MB.
- Bản phát hành `release/dao-den-long-v1.0.0.zip` tạo bằng `npm run release`.

## Retro Phase 4
- Tốt: đo trước tối ưu sau; cờ bench không đụng contract.
- Chưa tốt: FPS ban đầu thấp trên GPU yếu, vsync tắt làm số đo ảo cho tới khi có rào nhịp GPU.
- Chi tiết 4 phase: `docs/retro.md`.
