# Credits

## Tài sản trong game (làm trong repo)

- **Mô hình 3D:** toàn bộ dựng bằng mã từ khối hình học cơ bản của Three.js (Mây, Bóng Mực, Gió Lạc, đèn lồng, đom đóm, bùa, địa hình và đạo cụ đảo): `src/web/models/`, `src/web/decor/`. Không dùng file mô hình hay texture bên ngoài.
- **Âm thanh:** nhạc nền và hiệu ứng tổng hợp lúc chạy bằng WebAudio (`src/web/audio/`). Không có file âm thanh bên ngoài.
- **Hình ảnh, bảng màu, chữ:** màu theo bảng của đề; font hệ thống; ảnh trong `docs/screenshots/` và `evidence/` là ảnh chụp từ chính game.
- **Mã nguồn, scenario, tài liệu:** viết trong repo bởi Nguyễn Hoà Thanh Tùng cùng công cụ AI bên dưới.

## Thư viện

| Thư viện | Vai trò | Giấy phép |
|---|---|---|
| [three](https://threejs.org) r170 | dựng hình 3D WebGL | MIT |
| [gsap](https://gsap.com) | hoạt ảnh giao diện | GSAP Standard "no charge" License |
| [vite](https://vite.dev) | build và dev server cho bản web | MIT |
| [esbuild](https://esbuild.github.io) | bundle headless, soak, server | MIT |
| [typescript](https://www.typescriptlang.org) | kiểm kiểu | Apache-2.0 |
| [vitest](https://vitest.dev) | chạy test | MIT |
| [playwright](https://playwright.dev) | bench và chụp ảnh bằng trình duyệt thật | Apache-2.0 |
| @types/node, @types/three | khai báo kiểu | MIT |

## Công cụ AI tạo nội dung

- **Claude Code** (Anthropic) với bộ skill `superpowers`: brainstorming, viết spec và plan, subagent viết mã, test, tài liệu và script evidence. Chủ dự án quyết định phạm vi, luật chơi và mọi lần commit; quy trình ở `AGENTS.md` và `docs/ai-log.md`.
- Ảnh chụp màn hình do script Playwright sinh từ bản build thật, không dùng công cụ sinh ảnh AI.
