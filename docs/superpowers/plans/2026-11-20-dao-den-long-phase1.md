# Đảo Đèn Lồng Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game 3D Đêm 1 chơi được trên web + chế độ headless đúng Test Contract v1.0, nộp tag `phase-1`.

**Architecture:** Lõi mô phỏng TS thuần (`src/core`) tiến từng tick, tất định theo seed, đọc tuning từ `game.contract.json`. Headless CLI (`src/headless`) chạy lõi bằng Node, ghi JSONL. Bản web (`src/web`) dùng Three.js, gọi cùng `step()` ở 60Hz, model dựng từ khối cơ bản.

**Tech Stack:** Node >= 20, TypeScript 5, Vite 5, Three.js 0.160+, Vitest, esbuild (bundle headless).

**Spec:** `docs/superpowers/specs/2026-11-20-dao-den-long-phase1-design.md` (đọc mục 6-8 trước mọi task lõi).

## Global Constraints

- Repo root: `D:\VinAI\Day12\K5-L3A-DAY12-NguyenHoaThanhTung-2A202603519-AI-SDLC-Dao-Den-Long`. Mọi lệnh chạy ở đây.
- Commit chỉ ở local, **không push** khi chưa được chủ dự án đồng ý. Conventional commits, không nhắc AI.
- Lõi `src/core/**` không import `three`, DOM, `Math.random`, `Date`. Ngẫu nhiên chỉ qua `nextRandom(state)`.
- Tuning lấy từ `game.contract.json` (giá trị ở spec mục 6), không hard-code lại trong code.
- Hằng số không thuộc contract: `ISLAND_RADIUS=40`, `LANTERN_RING_RADIUS=25`, `MOTE_COUNT=40`, `INITIAL_SHADES=2`, `MAX_SHADES=6`, `SHADE_SPAWN_TICKS=2700`, `SHADE_Y=1.0`, `JUMP_VELOCITY=7`, `GRAVITY=-20`, `TICK_RATE=60` (đặt ở `src/core/constants.ts`).
- Thời gian dạng tick nguyên: `Math.round(seconds * 60)`.
- Output JSONL: tọa độ và `time_left_s` làm tròn 3 chữ số (`Math.round(x*1000)/1000`).
- File code < 200 dòng, tên kebab-case.
- Dùng dấu gạch ngang "-", không dùng en dash hay em dash.
- Lệnh contract: `build_cmd` = `npm ci && npm run build`, `run_cmd` = `npm run preview`, `headless_cmd` = `node dist-headless/headless.mjs`.

## Review Focus

1. Giữ nút `interact`/`pulse` = true nhiều tick liên tiếp chỉ kích hoạt 1 lần (chỉ cạnh false→true). Test ở Task A2 và A3.
2. Frame inputs có `tick` vượt `--ticks`, hoặc file inputs rỗng `{"frames":[]}`: không lỗi, đứng yên. Test ở Task A4.
3. Shade bị đẩy (pulse/đuổi) vào vùng đèn sáng hoặc ra ngoài đảo phải bị kẹp lại. Test ở Task A3.
4. Bị hit khi `carried` = 0 hoặc 1: `dropped` = 0, không sinh đom đóm, vẫn ghi `player_hit`. Test ở Task A3.
5. Scenario chỉ có một phần trường (ví dụ chỉ `player`): các phần khác dùng mặc định của game theo seed. Test ở Task A1.

---

## Thứ tự & song song

```
Task 0 (tuần tự)
  ├── Nhánh A: A1 → A2 → A3 → A4   (đường găng)
  ├── Nhánh B: B1                   (song song)
  └── Nhánh C: C1                   (song song)
Task D (tuần tự, sau khi A4, B1, C1 xong)
```

Quyền sở hữu file: A = `src/core/**` (trừ `types.ts`, `constants.ts`, `tuning.ts`), `src/headless/**`, `tests/core/**`, `tests/headless/**`. B = `src/web/models/**`, `tests/models/**`. C = `src/web/**` (trừ `models/`), `index.html`. Không nhánh nào sửa file của nhánh khác; cần đổi `types.ts` thì báo lead.

---

### Task 0: Scaffold, contract, kiểu dùng chung, model stub

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore` (node_modules, dist, dist-headless, out), `game.contract.json`, `src/core/types.ts`, `src/core/constants.ts`, `src/core/tuning.ts`, `src/web/models/index.ts` (stub), `tests/smoke.test.ts`

**Interfaces - Produces:**

```ts
// src/core/types.ts
export type Vec3 = [number, number, number];
export interface ScoreTuning { per_mote: number; per_lantern: number; per_stun: number; per_second_left: number; per_flame_left: number }
export interface Tuning { player_speed: number; carry_capacity: number; lantern_cost: number; lantern_count_night1: number;
  pickup_radius: number; interact_radius: number; pulse_cost: number; pulse_radius: number; night1_duration_s: number;
  flames: number; invuln_s: number; hit_drop_ratio: number; pulse_stun_s: number; pulse_push_m: number;
  pulse_cooldown_s: number; safe_radius: number; shade_speed: number; shade_hit_radius: number; fall_enabled: boolean; score: ScoreTuning }
export interface InputFrame { move: [number, number]; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean }
export interface Player { pos: Vec3; vy: number; flames: number; carried: number; invulnTicks: number; pulseCooldownTicks: number }
export interface Mote { id: string; pos: Vec3 }
export interface Shade { id: string; pos: Vec3; state: 'chase' | 'stunned'; stunTicks: number }
export interface Lantern { id: string; pos: Vec3; lit: boolean; deposited: number }
export type GameStatus = 'playing' | 'won' | 'lost';
export interface GameEvent { tick: number; name: string; data: Record<string, unknown> }
export interface GameState { tick: number; status: GameStatus; t0: number; timeLeftS: number; score: number;
  player: Player; motes: Mote[]; shades: Shade[]; lanterns: Lantern[];
  rngState: number; nextMoteId: number; nextShadeId: number; spawnTicks: number; spawnEnabled: boolean;
  prevButtons: { jump: boolean; interact: boolean; pulse: boolean } }
export interface Scenario { player?: { pos?: Vec3; carried?: number; flames?: number }; random_motes?: boolean; random_shades?: boolean;
  motes?: Vec3[]; shades?: { id?: string; pos: Vec3 }[]; lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean }[]; time_left_s?: number }
```

- `src/core/tuning.ts`: `export const TUNING: Tuning` = `contract.tuning` (import JSON, `resolveJsonModule`).
- `src/web/models/index.ts` stub (B sẽ thay thân hàm, giữ chữ ký): `createPlayerModel(): THREE.Group`, `createShadeModel(): THREE.Group`, `createLanternModel(): { group: THREE.Group; setLit(lit: boolean): void }`, `createMoteModel(): THREE.Object3D`, `createEnvironment(scene: THREE.Scene): { setBrightness(litCount: number): void }`. Stub trả hình hộp màu.
- `package.json` scripts: `dev` = `vite`, `build` = `tsc --noEmit && vite build && esbuild src/headless/cli.ts --bundle --platform=node --format=esm --outfile=dist-headless/headless.mjs`, `preview` = `vite preview`, `test` = `vitest run`. `engines.node` = `>=20`. Deps: `three`. DevDeps: `typescript`, `vite`, `vitest`, `esbuild`, `@types/three`, `@types/node`.
- `game.contract.json`: `contract_version` "1.0", `team` "2A202603519-nguyen-hoa-thanh-tung", ba lệnh ở Global Constraints, `tuning` đúng spec mục 6.
- Tạm thời `src/headless/cli.ts` chưa có: Task 0 tạo file một dòng `console.error('not implemented'); process.exit(1);` (A4 thay) để `npm run build` chạy được.

- [ ] **Step 1:** `git init`, tạo các file trên, `npm install`.
- [ ] **Step 2:** `tests/smoke.test.ts`: `expect(TUNING.lantern_count_night1).toBe(5); expect(TUNING.score.per_lantern).toBe(100)`.
- [ ] **Step 3:** Chạy `npm test` → PASS. Chạy `npm run build` → thoát 0, có `dist/index.html` và `dist-headless/headless.mjs`.
- [ ] **Step 4:** Commit `chore: scaffold project, contract and shared types`.

---

### Task A1: RNG, createGame, áp scenario

**Files:** Create `src/core/rng.ts`, `src/core/create-game.ts`, `tests/core/create-game.test.ts`

**Interfaces:**
- Consumes: types, constants, TUNING (Task 0).
- Produces: `nextRandom(s: GameState): number` (mulberry32 trên `s.rngState`, trả [0,1)); `createGame(seed: number, scenario?: Scenario): GameState`.

Mặc định: tick 0, `playing`, `t0 = timeLeftS = scenario.time_left_s ?? night1_duration_s`, player ở (0,0,0) với `flames` = 3, đèn L1-L5 theo spec mục 6, 40 mote và 2 shade (S1, S2) theo spec, `spawnTicks` = 2700, `spawnEnabled` = `random_shades !== false`. Scenario: `motes`/`shades` thay danh sách. `random_motes: false` mà không có `motes` → []. `random_shades: false` mà không có `shades` → []. Shade thiếu id → `S<nextShadeId>`. `nextShadeId`/`nextMoteId` = số lớn nhất đã dùng + 1. Đèn cập nhật theo id, id lạ → `throw new ScenarioError(...)` (export từ `create-game.ts`).

- [ ] **Step 1: Test**
  - `createGame(1)` gọi 2 lần cho `JSON.stringify` giống hệt; `createGame(2)` khác.
  - Mặc định: 40 mote, đều trong bán kính 3-38, cách mọi chân đèn > 3. 2 shade id `S1`,`S2` cách tâm 35. L1.pos = [0,0,25].
  - Scenario `{player:{pos:[1,0,2],carried:4}}` → player.carried 4, flames 3, vẫn 40 mote và 2 shade (Review Focus 5).
  - Scenario `{random_motes:false, random_shades:false}` → 0 mote, 0 shade, `spawnEnabled` false.
  - Scenario `{shades:[{pos:[10,0,0]}], lanterns:[{id:'L2',lit:true}], time_left_s:1}` → shade S1 pos [10,0,0], L2 lit, t0 1, score 0.
  - `lanterns:[{id:'L9'}]` → throw `ScenarioError`.
- [ ] **Step 2:** `npx vitest run tests/core/create-game.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit `feat(core): seeded game creation and scenario setup`.

---

### Task A2: step - di chuyển, nhặt, nạp đèn

**Files:** Create `src/core/step.ts`, `src/core/systems/player-movement.ts`, `src/core/systems/mote-pickup.ts`, `src/core/systems/lantern-deposit.ts`, `src/core/math-xz.ts` (`distXZ`, `clampToIsland`), `tests/core/step-player.test.ts`

**Interfaces:**
- Produces: `step(s: GameState, input: InputFrame): GameEvent[]`. Hàm mutate `s`, `s.tick` tăng 1, các event có `tick = s.tick` mới. Nếu `s.status !== 'playing'` thì trả [] và không đổi gì. `step` gọi các system theo đúng thứ tự spec mục 7 (A3 cắm thêm pulse/shade/hit/time). `endGame(s, result, reason, events)` export từ `step.ts`: cộng thưởng nếu thắng rồi đẩy `game_over`.
- Helper test (A2 tạo, A3/A4 dùng lại): `tests/core/helpers.ts`: `idle(): InputFrame`, `run(s, inputs: Partial<InputFrame>[] | ((k:number)=>Partial<InputFrame>), n): GameEvent[]`.

- [ ] **Step 1: Test**
  - `move [0,1]`, yaw 0, 60 tick → pos ≈ [0,0,6] (sai số 1e-9). Yaw 90 → ≈ [6,0,0]. `move [1,1]` → độ dài XZ ≈ 6.
  - Player ở [39.9,0,0] với `move [1,0]` 10 tick → distXZ = 40.
  - Jump cạnh → y > 0 ở tick 10, y = 0 ở tick 60. Giữ jump=true thì không nhảy lại khi chạm đất.
  - Mote ở [0,0,1.5] → `mote_picked` tick 1 `{carried:1}`, score 10. `carried` 10 thì mote kề bên không bị nhặt.
  - Player [0,0,23], carried 7, interact cạnh → `deposit {lantern_id:'L1',amount:5,deposited:5}`, `lantern_lit {lantern_id:'L1'}`, carried 2, score 100. Carried 3 → deposit 3, không lit.
  - Giữ interact=true 5 tick với carried 10 cạnh L1 (deposited 0) → chỉ 1 deposit (Review Focus 1).
  - L1-L4 `lit:true`, L5 deposited 4, player tại L5 carried 1, interact → `game_over {result:'won',reason:'all_lit'}` tick 1, score = 100 + 2*299 + 50*3 = 848, status `won`.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(core): player movement, pickup and lantern deposit`.

---

### Task A3: step - pulse, Bóng Mực, hit, thời gian

**Files:** Create `src/core/systems/timers.ts`, `src/core/systems/pulse.ts`, `src/core/systems/shade-ai.ts` (spawn + di chuyển + kẹp vùng đèn sáng), `src/core/systems/player-hit.ts`, `tests/core/step-shades.test.ts`. Modify `src/core/step.ts`.

Mọi test dùng `random_motes:false, random_shades:false` trừ test spawn.

- [ ] **Step 1: Test**
  - Shade [5,0,0], carried 1, pulse cạnh → `pulse {stunned_ids:['S1']}` tick 1, carried 0, score 20, shade x ≈ 9, state `stunned`. Snapshot state tick 180 vẫn `stunned`, tick 181 về `chase`.
  - Carried 0 + pulse → không có event.
  - Cooldown: pulse ở input tick 0, nhả tick 1, cạnh lại ở tick 119 → bỏ qua; cạnh ở tick 120 → `pulse` tick 121.
  - Shade không choáng đuổi: player [0,0,0], shade [10,0,0], 60 tick → shade x ≈ 6.
  - Vùng an toàn: L1 lit tại [0,0,25], player [0,0,25], shade [0,0,15] chạy 300 tick → mọi tick distXZ(shade, L1) >= 5 - 1e-9. Pulse đẩy shade vào vùng đèn sáng / ra ngoài đảo cũng bị kẹp (Review Focus 3).
  - Hit: shade [0.5,0,0], carried 5, flames 3 → `player_hit {by:'shade',flames:2,dropped:2}` tick 1, carried 3, thêm 2 mote cách player 2.5-4. Lần hit tiếp theo ở tick 121.
  - Carried 1 khi bị hit → dropped 0, không có mote mới, vẫn ghi event (Review Focus 4).
  - Flames 1 + hit → `player_hit` rồi `game_over {result:'lost',reason:'no_flames'}` tick 1.
  - `time_left_s:1` → `game_over {result:'lost',reason:'dawn'}` tick 60, timeLeftS 0.
  - Spawn: scenario `{random_motes:false, shades:[], player:{pos:[0,0,-20]}}` → `shade_spawned {id:'S1'}` ở tick 2700, shade cách tâm 38.
- [ ] **Step 2:** FAIL. **Step 3:** Implement theo thứ tự spec mục 7 (bước 0 giảm bộ đếm). **Step 4:** PASS toàn bộ `tests/core`.
- [ ] **Step 5:** Commit `feat(core): pulse, shade ai, player hit and night timer`.

---

### Task A4: Headless CLI

**Files:** Create `src/headless/parse-args.ts`, `src/headless/parse-inputs.ts`, `src/headless/parse-scenario.ts`, `src/headless/serialize.ts`, `src/headless/run-headless.ts`; replace `src/headless/cli.ts`. Test `tests/headless/run-headless.test.ts`.

**Interfaces:**
- `class InputFormatError extends Error` (dùng cho inputs/scenario hỏng → exit 2).
- `parseInputs(json: unknown): { tick: number; frame: Partial<InputFrame> }[]`: kiểm tra tick nguyên tăng nghiêm ngặt, `move` 2 số trong [-1,1], boolean đúng kiểu.
- `runHeadless(argv: string[]): { code: number; lines: string[]; stderr: string }`: thuần, không ghi file. `cli.ts` gọi hàm này, ghi `lines.join('\n')+'\n'` ra `--out`, in stderr, `process.exit(code)`.
- `serialize.ts`: `snapshotLine(s)`, `eventLine(e)`, `endLine(s)`. Thứ tự khóa snapshot: `type,tick,sim_tick,state,time_left_s,score,player{pos,flames,carried},lanterns[{id,pos,lit,deposited}],shades[{id,pos,state}],motes_active,motes[{id,pos}]`.

Vòng lặp: snapshot tick 0, rồi với k = 0..N-1 thì áp frame có `tick == k`, gọi `step`, ghi event, ghi snapshot nếu `s.tick % every == 0`. Dừng khi status khác `playing` (ghi snapshot cuối nếu chưa có). Sau đó ghi `end {ticks: s.tick, state, score}`.

- [ ] **Step 1: Test**
  - Thiếu `--seed` → code 1, stderr không rỗng.
  - Inputs JSON hỏng, tick `[5,5]`, `move [2,0]`, scenario đèn `L9` → code 2.
  - `{"frames":[]}` và frame tick 99999 với `--ticks 30` → code 0, player đứng yên (Review Focus 2).
  - `--seed 1 --night 1 --ticks 600` (không scenario) chạy 2 lần → `lines` giống hệt.
  - Dòng 1 là snapshot tick 0. Số snapshot với `--ticks 25 --snapshot-every 10` (không kết thúc sớm) = 3 (tick 0,10,20). Dòng cuối là `{"type":"end","ticks":25,...}`.
  - Scenario thắng ở Task A2 qua CLI → có event `game_over`, snapshot tick 1, `end.state` "won", `end.ticks` 1.
  - Tọa độ trong output có tối đa 3 chữ số thập phân.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** `npm run build && node dist-headless/headless.mjs --seed 7 --night 1 --ticks 300 --out out/smoke.jsonl` → thoát 0, dòng cuối là `end`.
- [ ] **Step 6:** Commit `feat(headless): contract v1.0 cli with jsonl output`.

---

### Task B1: Model 3D từ khối cơ bản (song song)

**Files:** Modify `src/web/models/index.ts` (giữ nguyên chữ ký Task 0). Create `src/web/models/player-may-model.ts`, `shade-model.ts`, `lantern-model.ts`, `mote-model.ts`, `island-environment.ts`, `tests/models/models.test.ts`.

Yêu cầu hình (spec mục 9): Mây là thân trụ, đầu cầu, **nón lá** (ConeGeometry dẹt màu rơm), có **đèn lồng nhỏ** treo dưới vành nón (emissive cam). Bóng Mực là khối cầu méo màu tím đen `#2a0f3d` với 2 mắt phát sáng nhạt, gốc tại tâm. Đèn Lồng Lớn là cột gỗ + lồng đèn, `setLit(true)` bật emissive vàng cam `#ffb347` và PointLight. Đom đóm là cầu nhỏ emissive vàng. Môi trường: đảo trụ dẹt bán kính 40 (mặt trên Y = 0), biển mây phía dưới, nền trời tím than, fog, ambient tối. `setBrightness(n)` tăng ambient/hemisphere tuyến tính theo n/5. Chân model đặt ở y = 0 (trừ Bóng Mực, gốc tại tâm). Tổng PointLight <= 8 để giữ FPS.

- [ ] **Step 1:** Test (Node, không renderer): mỗi factory trả object có `children.length > 0`. `createLanternModel().setLit(true)` làm xuất hiện một `PointLight` có `intensity > 0`. `createEnvironment(new Scene()).setBrightness(5)` không throw.
- [ ] **Step 2:** FAIL → implement → `npx vitest run tests/models` PASS, `npx tsc --noEmit` sạch.
- [ ] **Step 3:** Commit `feat(web): primitive 3d models for may, shades, lanterns, motes, island`.

---

### Task C1: Vỏ web - vòng lặp, input, camera, HUD, chơi lại (song song)

**Files:** Create `index.html`, `src/web/main.ts`, `src/web/fixed-step-loop.ts`, `src/web/keyboard-mouse-input.ts`, `src/web/camera-rig.ts`, `src/web/scene-sync.ts`, `src/web/hud.ts`, `src/web/hud.css`.

**Interfaces:**
- Consumes: `createGame`, `step` (A1/A2, chữ ký ở trên; trong lúc A chưa xong vẫn compile được nhờ đã có chữ ký); các factory ở `./models`.
- `keyboard-mouse-input.ts`: `readInput(camYawDeg: number): InputFrame`. `move` tính trong hệ camera rồi để lõi quay theo `cam_yaw_deg` (công thức contract). Ở yaw 0 camera nhìn về +Z, nên W → z = +1, S → z = -1, A → x = +1, D → x = -1 (bên phải màn hình là -X). Space = jump, E = interact, F = pulse. Kéo chuột hoặc phím mũi tên trái/phải để xoay yaw. R = chơi lại khi game kết thúc.
- `fixed-step-loop.ts`: tích lũy dt, mỗi 1/60 giây gọi `step` (tối đa 5 bước mỗi frame), render mỗi frame.
- `scene-sync.ts`: `syncScene(state: GameState)` thêm/xóa mesh mote/shade theo id. Đèn gọi `setLit`. Shade `stunned` thì nhạt/rung. Gọi `setBrightness(litCount)`.
- `camera-rig.ts`: camera ba phần tư sau lưng Mây, cách 10m, cao 7m, quay theo yaw.
- `hud.ts`: `updateHud(state)` hiển thị flames (biểu tượng đèn), carried/10, đèn sáng/5, thời gian mm:ss, điểm. Overlay kết thúc "Thắng!"/"Thua - <lý do tiếng Việt>" + điểm + nút "Chơi lại (R)" → `createGame(newSeed)`.
- Seed web: `Date.now()` được phép ở `src/web` (không phải lõi).

- [ ] **Step 1:** Implement. `npx tsc --noEmit` sạch.
- [ ] **Step 2:** Sau khi A2/A3 đã merge: `npm run build && npm run preview`, mở trình duyệt, chụp ảnh: di chuyển, nhặt đom đóm, HUD đổi, màn kết thúc, chơi lại. Không lỗi trong console.
- [ ] **Step 3:** Commit `feat(web): game loop, input, camera, hud and restart`.

---

### Task D: Ghép, bằng chứng, tài liệu, tag

**Files:** Create `scripts/generate-evidence.mjs`, `evidence/phase-1/scenarios/*.json` (+ inputs), `evidence/phase-1/README.md`, `README.md`, `docs/ai-log.md`, `AGENTS.md` (+ copy harness `.claude/` liên quan vào repo).

- [ ] **Step 1:** Xác nhận B1 đã thay stub và chạy được trong game (chụp ảnh lại).
- [ ] **Step 2:** `scripts/generate-evidence.mjs` chạy `dist-headless/headless.mjs` cho 6 tình huống: nhặt, nạp+thắp, pulse, hit, thắng, thua dawn. Chạy seed 42 mặc định 2 lần rồi so byte. Ghi `evidence/phase-1/*.jsonl` + `determinism.txt` + `vitest.txt` (output `npm test`). Chạy script này, không sửa tay output.
- [ ] **Step 3:** README: cài và chạy (`npm ci`, `npm run build`, `npm run preview`), lệnh headless, điều khiển, bảng điểm, giả định (sợ đèn chỉ áp cho đèn đã sáng, `fall_enabled=false`, thưởng chỉ khi thắng, kết thúc giữa tick), mục "Sáng tạo của tôi" (ghi "chưa có ở Phase 1" nếu chưa làm), link evidence.
- [ ] **Step 4:** `docs/ai-log.md`: các bước brainstorm → spec → plan → song song, các giả định.
- [ ] **Step 5:** Kiểm tra trên môi trường Linux-like (Git Bash hoặc Docker `node:20`): `npm ci && npm run build && node dist-headless/headless.mjs --seed 1 --night 1 --ticks 60 --out out/x.jsonl` thoát 0.
- [ ] **Step 6:** Commit `docs: phase 1 readme, evidence and ai log`. Tạo tag local `phase-1`. **Hỏi chủ dự án trước khi push** repo + tag.
