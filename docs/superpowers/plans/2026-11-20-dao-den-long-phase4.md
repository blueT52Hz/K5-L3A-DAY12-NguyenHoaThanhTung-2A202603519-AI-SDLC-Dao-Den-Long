# Đảo Đèn Lồng Phase 4 "v1.0.0" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bench, soak, bảng xếp hạng lưu đĩa, accessibility, đóng gói 3 lệnh, contract v1.3.

**Architecture:** `server.mjs` (node:http) phục vụ `dist/` + API leaderboard ghi `data/leaderboard.json`; soak chạy lõi headless trong một tiến trình; bench = Playwright mở Chrome 1280x720 vào trang `?bench=` với cờ core `GameState.bench`.

**Tech Stack:** TypeScript, Vite, Three.js, esbuild, Node >= 20, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-dao-den-long-phase4-design.md` (ticket `D:\VinAI\Day12\phase-4.html`). Chạy sau khi Phase 3 xong.

## Global Constraints

- Không viết test mới; không commit/push/tag (chờ chủ dự án). Verify = `npm run build` + chạy lệnh của task.
- Đầu ra headless (`dist-headless/headless.mjs`) và luật v1.0-1.2 không đổi: cờ `bench` mặc định false, không xuất ra snapshot, không rút RNG game.
- Cài đặt đúng 3 lệnh: `npm ci`, `npm run build`, `npm start`.
- Không thêm dependency runtime cho server (chỉ `node:*`); Playwright là devDependency.
- File code < 200 dòng, kebab-case; chỉ dấu `-`.

## Review Focus

- `leaderboard.json` hỏng/thiếu: server coi như rỗng, không crash; ghi file atomically (tmp + rename).
- Request path `/../` hoặc URL encode: không đọc ngoài `dist/`.
- Hai mục cùng điểm: mục `achieved_at` sớm hơn đứng trên; mục thứ 11 bị cắt.
- Soak: một Đêm ném exception -> `crashes++`, vẫn chạy tiếp, vẫn ghi soak.json.
- Bench chạy khi server chưa bật: script tự bật rồi tắt; cổng bận bởi server khác -> dùng luôn.

---

### Task 1: Contract 1.3 + leaderboard rules + server

**Files:** Create `src/shared/leaderboard-rules.ts`, `server-src/server.ts` (bundle -> `server.mjs` ở gốc), Modify `game.contract.json`, `package.json`, `.gitignore`.

**Interfaces - Produces:**
- `interface LeaderboardEntry { name: string; score: number; nights_won: number; achieved_at: string; seed: number }`
- `validName(name: string): boolean` - 3-12 ký tự, mỗi ký tự `[A-Za-z0-9_]` hoặc chữ cái Latin có dấu tiếng Việt (`/^[\p{L}\p{M}0-9_]{3,12}$/u` sau `normalize('NFC')`, chỉ chữ Latin).
- `insertEntry(entries: LeaderboardEntry[], e: LeaderboardEntry): LeaderboardEntry[]` - sort score giảm, hòa `achieved_at` tăng, cắt 10.
- `isoWithOffset(d: Date): string` - `YYYY-MM-DDTHH:mm:ss+07:00` theo múi giờ máy.
- HTTP: `GET /api/leaderboard` -> `{entries}`; `POST /api/leaderboard` body `{name, score, nights_won, seed}` -> 200 `{entries, rank}` | 400 `{error}`.

- [ ] Step 1: contract `contract_version "1.3"`, `run_cmd "npm start"`, `bench_cmd "node scripts/bench.mjs"`, `soak_cmd "node dist-headless/soak.mjs"`.
- [ ] Step 2: rules module + server (static dist với MIME html/js/css/json/png/svg/wasm/mp3/ogg, fallback index.html; chặn traversal bằng `path.resolve` startsWith; body <= 4 KB; `--export-leaderboard <path>` ghi `{"entries":[...]}` exit 0; `PORT` mặc định 4173; data dir `data/`).
- [ ] Step 3: package.json scripts: `start: node server.mjs`; build thêm esbuild `server-src/server.ts -> server.mjs` (platform node, esm). `.gitignore` thêm `data/`, `release/`.
- [ ] Step 4: Verify `npm run build && npm start` (nền) -> `curl -X POST` 2 mục cùng điểm + 1 tên sai (400); `node server.mjs --export-leaderboard out/lb.json` đúng thứ tự.

### Task 2: Leaderboard UI

**Files:** Create `src/web/leaderboard/leaderboard-api.ts`, `src/web/leaderboard/leaderboard-screens.ts`; Modify `src/web/flow/flow-screens.ts`, `src/web/game-boot.ts` (hoặc nơi điều phối flow), menu chính.

**Interfaces - Consumes:** `validName`, `LeaderboardEntry` (Task 1). **Produces:** `fetchLeaderboard(): Promise<LeaderboardEntry[]>`, `submitScore(p: {name; score; nights_won; seed}): Promise<{entries; rank}>`.

- [ ] Step 1: Form nhập tên sau màn `dawn` và sau mỗi `result` thua (score = `flow.total`, nights_won = số Đêm đã thắng, seed = seed ván); validate trực tiếp, nút Bỏ qua; lỗi mạng -> thông báo, không chặn chơi tiếp.
- [ ] Step 2: Menu chính thêm "Bảng xếp hạng" (bảng top 10: hạng, tên, điểm, số Đêm, thời gian).
- [ ] Step 3: Verify build + mở `npm start`, nhập 1 tên qua UI (subagent dùng Playwright, chụp màn hình).

### Task 3: Soak

**Files:** Create `src/headless/soak-cli.ts`, `src/headless/soak-random-input.ts`; Modify `package.json` build (esbuild -> `dist-headless/soak.mjs`).

**Interfaces - Produces:** `makeSoakInput(seed: number): (tick: number) => InputFrame` (mulberry32 riêng; mỗi 30 tick hướng mới; jump 5%, dash 3%, pulse 2%, interact 10%; button là xác suất độc lập mỗi tick).

- [ ] Step 1: CLI `--seed --nights --out`; Đêm i: seed `seed + i`, night `(i % 3) + 1`, `createGame` + `step` tới `status !== 'playing'` hoặc hết `durationS*60` sim tick; try/catch -> crashes. `mem_start_mb` RSS sau tạo Đêm đầu; `mem_end_mb` RSS sau tạo state reset sau Đêm cuối (`global.gc?.()` trước khi đo). Output `{nights, crashes, results, mem_start_mb, mem_end_mb, duration_s}` (MB 1 chữ số).
- [ ] Step 2: Verify `node dist-headless/soak.mjs --seed 7 --nights 10 --out soak.json` -> crashes 0, mem_end <= 1.2 x mem_start.

### Task 4: Bench

**Files:** Modify `src/core/types.ts`, `src/core/create-game.ts` (option bench), `step.ts`/systems liên quan (gate bằng `s.bench`); Create `src/core/bench-scene.ts`, `src/web/bench/bench-mode.ts`, `src/web/bench/bench-camera-orbit.ts`, `scripts/bench.mjs`; Modify `src/web/main.ts`/`game-boot.ts` (đọc `?bench=`), `package.json` (devDep playwright).

**Interfaces - Produces:** `createBenchGame(seed: number): GameState` (Đêm 1, 200 shade wander rải đều điểm đứng được bằng RNG seed, 100 mote, L1-L3 lit fuel 100, May (0,0,0), `bench=true`, wind/drifter tắt); `computeBenchStats(dts: number[]): {frames, avg_fps, p1_low_fps, frame_ms_p95}`.

- [ ] Step 1: Core gate `s.bench`: bỏ spawn mote/shade/drifter, checkHit, pickupMotes, burnAndDrainFuel, resolveEndOfTick. Headless thường không đổi (so sánh 1 run seed 42 night 1 trước/sau: byte-identical).
- [ ] Step 2: Web `?bench=42&duration=30`: dựng cảnh đầy đủ hiệu ứng (không ép CPU mode), không input, camera orbit (x = 30cos(2πt/15), y 15, z = -30sin(2πt/15), lookAt 0), 3 s warmup, đo rAF dt `duration` s, `window.__benchResult` = stats + renderer (UNMASKED_RENDERER_WEBGL + `THREE.REVISION`) + `first_frame_ms` (performance.now của frame đầu).
- [ ] Step 3: `scripts/bench.mjs --seed --duration --out`: ghi `t0`; bật server nếu cần; Playwright chromium headed, cửa sổ 1280x720 (`--window-size=1280,720`, viewport 1280x720), args `--disable-gpu-vsync --disable-frame-rate-limit`; chờ `__benchResult`; `load_ms` = (thời điểm frame đầu theo wall clock) - t0; `peak_mem_mb` lấy mẫu RSS tiến trình Chrome mỗi 1 s (Windows: `wmic`/`Get-Process` theo pid tree; lỗi -> null); ghi JSON đúng 10 trường ticket, `vsync_off: true`, `os` = `os.type() os.release()`; exit 0.
- [ ] Step 4: Verify `npm run build && node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` -> file hợp lệ.

### Task 5: Accessibility

**Files:** Modify `src/web/settings/settings-store.ts`, `settings-panel.ts`, `src/web/keyboard-mouse-input.ts`, `src/web/hud.ts`, `src/web/hud.css`, `src/web/scene-sync.ts`/`camera-rig.ts` (rung, chớp); Create `src/web/settings/key-bindings.ts`, `src/web/hud/captions-and-edge-arrows.ts`.

**Interfaces - Produces:** `type Action = 'up'|'down'|'left'|'right'|'jump'|'dash'|'interact'|'pulse'|'pause'`; `DEFAULT_BINDINGS: Record<Action, string>` (KeyW, KeyS, KeyA, KeyD, Space, ShiftLeft, KeyE, KeyF, KeyP); `findConflicts(b): Action[][]`; Settings thêm `bindings`, `reducedMotion: boolean`, `largeText: boolean` (+ `colorblind` từ Phase 3).

- [ ] Step 1: Đổi phím: panel liệt kê 9 hành động, bấm để gán, trùng -> cảnh báo đỏ/⚠ và chặn lưu; "Khôi phục mặc định"; input đọc bindings (Esc luôn tạm dừng).
- [ ] Step 2: Phụ đề + chỉ báo: "Bóng Mực xuất hiện" + mũi tên mép màn hình chỉ hướng (event `shade_spawn`), "Gió sắp thổi" (wind.warning), "10 giây cuối" (timeLeftS <= 10), "Đèn Lx sắp cạn dầu" (isLowFuel).
- [ ] Step 3: Giảm chuyển động: tắt rung camera và chớp màn hình. Chữ: mọi chữ UI >= 18 px; `largeText` nhân 1.25 qua CSS var `--ui-scale`.
- [ ] Step 4: Verify build + chụp màn hình panel đổi phím và HUD có phụ đề.

### Task 6: Đóng gói, tài liệu, chạy số liệu

**Files:** Create `CREDITS.md`, `LICENSE`, `docs/retro.md`, `scripts/package-release.mjs`, `docs/screenshots/*.png`; Modify `README.md`, `CHANGELOG.md`, `.claude/skills/dao-den-long-contract/SKILL.md`.

- [ ] Step 1: README đủ mục ticket mục 5 (3 lệnh, ảnh chụp, yêu cầu hệ thống, điều khiển, test, headless, bench, soak, export leaderboard, ghi chú vsync/peak_mem).
- [ ] Step 2: CHANGELOG mục Phase 1-4; CREDITS (procedural models/âm thanh, three, gsap, vite, playwright, công cụ AI Claude); LICENSE MIT; retro 1-2 trang từ `docs/ai-log.md`.
- [ ] Step 3: Chạy `bench` và `soak` ra `bench.json`, `soak.json` ở gốc repo; `package-release.mjs` tạo `release/dao-den-long-v1.0.0.zip`.
- [ ] Step 4: Verify `npm run build && npm test` xanh; grep en/em dash rỗng. Báo lại các bước chờ đồng ý: commit, tag `phase-4`, push, GitHub Release.
