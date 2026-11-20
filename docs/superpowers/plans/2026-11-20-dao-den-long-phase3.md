# Đảo Đèn Lồng Phase 3 "Đèn cạn dầu" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đèn có dầu và có thể tắt, Bóng Mực hút dầu (`drain`), thắng bằng sống tới bình minh với >= 60% đèn sáng; contract v1.2.

**Architecture:** Mở rộng tại chỗ: `Lantern` thêm `fuelUnits` (nguyên, 1/60 fuel), `everLit`, `relitCount`; `Player` thêm `successfulLights`; `Shade` thêm `drain`, `targetLanternId`, `drainTicks`. Logic mới chỉ một file mới `lantern-fuel.ts` (+ `player-capacity.ts`), còn lại sửa system có sẵn.

**Tech Stack:** TypeScript, Vite, Three.js (web), esbuild headless, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-dao-den-long-phase3-design.md` (yêu cầu gốc: `D:\VinAI\Day12\phase-3.html`).

## Global Constraints

- Quyết định chủ dự án: **không viết test mới**. Verify mỗi task = `npm run build` xanh (+ headless chạy được). Task 8 sửa/xóa test cũ để `npm test` xanh (Stop hook).
- **Không commit** (luật người dùng: chỉ commit khi được đồng ý).
- `src/core` thuần TS: không three/DOM/`Math.random`/`Date`; RNG chỉ `nextRandom(s)`; không thêm lần rút RNG mới.
- Số tuning chỉ đọc qua `TUNING` từ `game.contract.json`; hằng khác trong `src/core/constants.ts`.
- Dầu lưu nguyên: `FUEL_UNITS_PER_FUEL = 60`; max = `fuel_max * 60` = 6000; ngưỡng yếu = `low_fuel_threshold * 60` = 1800; hao 1 unit/tick; hút 5 unit/tick/con; mỗi đom đóm = 600 unit.
- Xuất `fuel` = `Math.round(units / 6) / 10` (1 chữ số, half up).
- File code < 200 dòng, tên kebab-case. Chỉ dấu gạch `-`, không en/em dash.
- Thực thể/tên trạng thái Bóng Mực: `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain`.

## Review Focus

- Châm dầu đèn còn 95.5 fuel: `used = ceil(4.5/10) = 1`, fuel thành 100 (không vượt), trừ 1 đom đóm, +5.
- Đèn đầy 100 trong tầm cùng đèn chưa sáng xa hơn: E phải chọn đèn chưa sáng (đèn đầy không "nhận được").
- Tick bình minh có Mây mất Ngọn Lửa cuối: `no_flames`, không cộng điểm bình minh.
- Đèn cạn dầu đúng tick cuối: không tính vào số đèn sáng khi xét thắng.
- Scenario không khai báo `fuel`/`ever_lit`/`target_lantern_id`: output Phase 2 scenario cũ vẫn chạy (lit -> fuel 100, ever_lit = lit).

---

### Task 1: Contract v1.2, types, khởi tạo, headless I/O

**Files:**
- Modify: `game.contract.json`, `src/core/types.ts`, `src/core/constants.ts`, `src/core/create-game.ts`, `src/core/systems/shade-spawner.ts` (createShade), `src/core/nights/night-1-dao-ben.ts:8`, `night-2-dao-cau.ts:19`, `night-3-dao-chuong.ts:8`, `src/headless/parse-scenario.ts`, `src/headless/serialize.ts`

**Interfaces:**
- Produces:
  - `Tuning` thêm `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max: number`; `ScoreTuning = { per_mote; per_lantern; per_relight; per_stun; per_stun_drain; dawn_per_lantern; per_flame_left }`.
  - `ShadeState` thêm `'drain'`. `Shade` thêm `targetLanternId: string | null; drainTicks: number`.
  - `Lantern` = `{ id; pos; lit; deposited; fuelUnits: number; everLit: boolean; relitCount: number }`.
  - `Player` thêm `successfulLights: number`.
  - `Scenario.lanterns[]` thêm `fuel?: number; ever_lit?: boolean`; `Scenario.player` thêm `successful_lights?: number`; `Scenario.shades[]` thêm `target_lantern_id?: string`.
  - `constants.ts`: `FUEL_UNITS_PER_FUEL = 60`, `DRAIN_RANGE_M = 2`, `DRAIN_CHASE_RADIUS = 6`, `FUEL_DRAIN_EVENT_TICKS = 60`.

- [ ] **Step 1: Contract.** `contract_version: "1.2"`; tuning thêm 8 key với giá trị spec; `night1/2/3_duration_s` = 240/270/300; `score` = `{per_mote:5, per_lantern:100, per_relight:40, per_stun:5, per_stun_drain:15, dawn_per_lantern:50, per_flame_left:50}`.
- [ ] **Step 2: Nights.** `durationS` mỗi Đêm đọc `TUNING.nightN_duration_s` (bỏ số cứng 300/330/360).
- [ ] **Step 3: Types + constants** như Interfaces.
- [ ] **Step 4: createGame.** Đèn mặc định `fuelUnits 0, everLit false, relitCount 0`. Scenario: `lit` -> `fuelUnits = round(clamp(fuel ?? 100, 0, fuel_max) * 60)`; đèn không sáng -> `fuelUnits 0`; `everLit = ever_lit ?? lit`. `player.successfulLights = successful_lights ?? 0`. Shade scenario: `targetLanternId = target_lantern_id ?? null` (id phải tồn tại, sai -> `ScenarioError`); `createShade` khởi `targetLanternId null, drainTicks 0`. `safeZoneLanternIds` khởi tạo = đèn `hasSafeZone` (định nghĩa Task 2; tạm inline `lit && fuelUnits >= 1800` nếu Task 2 chưa có, Task 2 thay).
- [ ] **Step 5: parseScenario.** Validate `lanterns[i].fuel` (number), `ever_lit` (boolean), `player.successful_lights` (number), `shades[i].target_lantern_id` (string); thêm `'drain'` vào `SHADE_STATES`.
- [ ] **Step 6: serialize.** Đèn: `{id, pos, lit, deposited, fuel, ever_lit, relit_count}` (`fuel` theo công thức Global, đèn tắt 0); player thêm `capacity` (dùng `playerCapacity` Task 3; tạm tính inline nếu chưa có).
- [ ] **Step 7: Verify.** `npm run build` -> exit 0.

### Task 2: Dầu cháy, bị hút, đèn tắt (bước 2)

**Files:**
- Create: `src/core/systems/lantern-fuel.ts`
- Modify: `src/core/step.ts` (gọi sau `tickTimers`), `src/core/create-game.ts` (dùng `hasSafeZone`)

**Interfaces:**
- Produces (từ `lantern-fuel.ts`):
  - `fuelMaxUnits(): number` (6000), `lowFuelUnits(): number` (1800)
  - `hasSafeZone(l: Lantern): boolean` = `l.lit && l.fuelUnits >= lowFuelUnits()`
  - `isLowFuel(l: Lantern): boolean` = `l.lit && l.fuelUnits < lowFuelUnits()`
  - `fuelValue(l: Lantern): number` = `Math.round(l.fuelUnits / 6) / 10`
  - `burnAndDrainFuel(s: GameState, events: GameEvent[]): void`

- [ ] **Step 1: `burnAndDrainFuel`.**
  1. Mỗi đèn `lit`: `fuelUnits -= fuel_decay_per_s * 60 / 60` (=1).
  2. Mỗi shade (thứ tự `compareShadeIds`) có `state === 'drain'` và đèn `targetLanternId` đang `lit`: `fuelUnits -= drain_per_s` (5); `drainTicks += 1`; nếu `drainTicks % FUEL_DRAIN_EVENT_TICKS === 0` push `fuel_drain {lantern_id, shade_id, fuel: fuelValue}` (fuel có thể âm trước khi kẹp: kẹp `max(0, …)` trước khi ghi).
  3. Sau đó mỗi đèn `lit && fuelUnits <= 0` (thứ tự mảng): `lit=false, fuelUnits=0, deposited=0, everLit=true`, push `lantern_out {lantern_id}`.
- [ ] **Step 2: step.ts.** Ngay sau `tickTimers(s); // 2` thêm `burnAndDrainFuel(s, events);`. Cập nhật comment v1.2.
- [ ] **Step 3: Verify.** `npm run build`; headless `--seed 1 --night 1 --ticks 600` chạy không lỗi.

### Task 3: Tương tác nạp / thắp lại / châm dầu + sức chứa

**Files:**
- Create: `src/core/systems/player-capacity.ts`
- Modify: `src/core/systems/lantern-deposit.ts`, `src/core/systems/mote-pickup.ts:16`

**Interfaces:**
- Consumes: `fuelMaxUnits` (Task 2).
- Produces: `playerCapacity(s: GameState): number` = `min(capacity_max, carry_capacity + 2 * successfulLights)`.

- [ ] **Step 1: `playerCapacity`**; `mote-pickup` dùng nó thay `TUNING.carry_capacity`.
- [ ] **Step 2: `depositToLantern`.** Hàm phụ `refuelAmount(l, carried) = min(carried, ceil((fuelMaxUnits() - l.fuelUnits) / (fuel_per_mote*60)))`. Ứng viên: trong `interact_radius`, dung sai Y, và (`!lit` hoặc `refuelAmount > 0`); gần nhất, hòa id nhỏ (giữ `<` theo thứ tự mảng id). `carried === 0` -> không chọn gì.
  - Chưa sáng: `need = (everLit ? relight_cost : lantern_cost) - deposited`; `amount = min(carried, need)`; trừ, cộng `deposited`, `+per_mote*amount`, event `deposit` như cũ. Đủ: `lit=true, fuelUnits=max, successfulLights++`; nếu `everLit` -> `relitCount++`, `+per_relight`, relight=true; else `+per_lantern`, relight=false; `everLit=true`; event `lantern_lit {lantern_id, relight}`.
  - Đang sáng: `used = refuelAmount`; `fuelUnits = min(max, fuelUnits + used*600)`; trừ `used`; `+per_mote*used`; event `refuel {lantern_id, amount: used, fuel: fuelValue}`.
- [ ] **Step 3: Verify.** `npm run build`.

### Task 4: Vùng an toàn theo dầu

**Files:**
- Modify: `src/core/systems/shade-zones.ts:14,50-62`, `src/core/systems/shade-spawner.ts:32`

- [ ] **Step 1:** `litLanterns` -> lọc `hasSafeZone`. `updateSafeZones`: `safeZoneLanternIds` = id đèn `hasSafeZone`; đèn mới vào tập (thắp, thắp lại, châm lên >= 30) gắn evict cho shade trong vùng (cơ chế Phase 2, kể cả shade `drain`: evict thì đặt state `wander`, `targetLanternId=null`).
- [ ] **Step 2:** shade-spawner tránh vùng: `hasSafeZone(l)` thay `l.lit`.
- [ ] **Step 3: Verify.** `npm run build`.

### Task 5: Bóng Mực drain + điểm Tỏa Sáng

**Files:**
- Modify: `src/core/systems/shade-ai.ts`, `src/core/systems/pulse.ts:22-30`

**Interfaces:** Consumes `isLowFuel` (Task 2), `DRAIN_RANGE_M`, `DRAIN_CHASE_RADIUS`.

- [ ] **Step 1: `endTimedShadeState`.** `stunned` hết -> luôn `wander`; `recoil` giữ luật cũ; `spawning` như cũ.
- [ ] **Step 2: `moveShades`** (shade không evict, không push):
  - `drain`: tìm đèn target; nếu `distXZ(May) <= DRAIN_CHASE_RADIUS` -> `chase`, `targetLanternId=null`, đi chase tick này. Else nếu đèn không `isLowFuel` (tắt hoặc >= 30) hoặc `distXZ > DRAIN_RANGE_M` -> `wander`, `targetLanternId=null`, đi wander tick này. Else đứng yên.
  - `wander` (sau khi `wanderOrChase` xét chuyển chase): nếu vẫn wander và có đèn `isLowFuel` -> chọn gần nhất XZ (hòa id nhỏ), `targetLanternId = id`; nếu `distXZ <= DRAIN_RANGE_M` -> `drain`, `drainTicks=0`, không di chuyển; else `walkShade` hướng về đèn ở tốc độ `shadeSpeed/60 * SHADE_WANDER_FACTOR`, **không rút RNG**. Không có đèn yếu -> `targetLanternId=null`, wander ngẫu nhiên như cũ. Tách `wanderOrChase` thành hàm nhỏ nếu file > 200 dòng.
- [ ] **Step 3: pulse.** Lưu `wasDrain = sh.state === 'drain'` trước khi đặt stunned; điểm `wasDrain ? per_stun_drain : per_stun`; đặt `targetLanternId=null`.
- [ ] **Step 4: Verify.** `npm run build`.

### Task 6: Thắng/thua bình minh

**Files:** Modify: `src/core/systems/win-lose.ts`

- [ ] **Step 1:** `resolveEndOfTick`: `flames <= 0` -> lost `no_flames`. Else `timeLeftS <= 0`: `need = ceil(win_ratio * lanterns.length)`; `lit >= need` -> won `dawn_survived`, điểm `sum(dawn_per_lantern + floor(fuelUnits/60))` mỗi đèn sáng + `per_flame_left * flames`; else lost `dawn`. Không còn `all_lit`.
- [ ] **Step 2: Verify.** `npm run build`; headless `--night 1 --ticks 14500` kết thúc `dawn` hoặc `dawn_survived`.

### Task 7: Web - dầu, HUD, mù màu, chữ luật

**Files:**
- Modify: `src/web/models/lantern-model.ts`, `src/web/scene-sync.ts:115-125`, `src/web/hud.ts`, `src/web/hud/lantern-pointer.ts`, `src/web/models/shade-model.ts`, `src/web/models/palette.ts`, `src/web/settings/settings-store.ts`, `src/web/settings/settings-panel.ts`, `src/web/flow/flow-screens.ts`, `src/web/flow/night-intro-text.ts`, `src/web/landing/landing-markup-guide-sections.ts`, `src/web/audio/event-to-sound.ts`, `src/web/pause-overlay.ts`

- [ ] **Step 1: Đèn.** `lantern-model` thêm thanh dầu (billboard nhỏ trên đèn, chiều rộng = fuel/100, chỉ hiện khi sáng); `setFuel(fraction: number, low: boolean, timeS: number)`; `low` -> đèn + thanh nhấp nháy 1 Hz (`sin(2π t) > 0`). Đèn tắt: scale Y 0.8 + chi tiết vết rách trên giấy (luôn bật). Ánh sáng môi trường theo số đèn sáng (scene-sync đã đếm `lit`).
- [ ] **Step 2: HUD.** Đom đóm hiển thị `carried / playerCapacity(s)` (bỏ lặp `TUNING.carry_capacity`); đếm đèn hiện `sáng / cần` với `cần = ceil(win_ratio * tổng)`; lantern-pointer chỉ đèn chưa sáng hoặc `isLowFuel`.
- [ ] **Step 3: Mù màu.** settings-store thêm `colorblind: boolean` (persist như các khóa khác), panel thêm toggle "Bảng màu dễ phân biệt". Bật: viền/mắt Bóng Mực `#00B3FF` (tắt: `#7A3CFF`); màu cảnh báo UI `#FFFFFF` + tiền tố `⚠` (tắt: `#FF5A5F`). Đổi được lúc đang chơi.
- [ ] **Step 4: Chữ + âm.** Màn kết thúc: `dawn_survived` = thắng bình minh, `dawn` = thua thiếu đèn; intro/hướng dẫn/landing/pause: mục tiêu "giữ >= 60% đèn sáng tới bình minh", dầu, châm dầu, thắp lại 5. `refuel`, `lantern_out` map vào âm có sẵn.
- [ ] **Step 5: Verify.** `npm run build`; mở `npm run preview` + Playwright/chụp màn hình một đèn sáng có thanh dầu và HUD `x / y` (subagent).

### Task 8: Test cũ, evidence, ADR, changelog, docs

**Files:**
- Modify: `tests/**` (các file đỏ), `README.md`, `.claude/skills/dao-den-long-contract/SKILL.md`, `docs/ai-log.md`
- Create: `docs/adr/0001-lantern-fuel-state-and-dawn-win.md`, `CHANGELOG.md`, `scripts/generate-evidence-phase-3.mjs`, `evidence/phase-3/scenarios/*.json`

- [ ] **Step 1: Test cũ.** `npm test`; mỗi test đỏ do luật Phase 3 (all_lit, điểm cũ, nạp đèn sáng, duration, stun -> chase, capacity cố định): sửa kỳ vọng sang luật mới nếu sửa một dòng là xong, else xóa test đó. Ghi từng test sửa/xóa + lý do vào CHANGELOG. Không `skip`. Lặp tới khi `npm test` xanh.
- [ ] **Step 2: Evidence.** Script theo mẫu `generate-evidence-phase-2.mjs`, cases (chuỗi bắt buộc): `fuel-out` (`"name":"lantern_out"`), `refuel` (`"name":"refuel"`), `relight` (`"relight":true`), `drain` (`"name":"fuel_drain"`, `"state":"drain"`), `win-dawn` (`"reason":"dawn_survived"`), `lose-dawn` (`"reason":"dawn"`). Dùng `time_left_s` nhỏ + `fuel` thấp để ngắn. `npm run build && node scripts/generate-evidence-phase-3.mjs` -> không có THIEU.
- [ ] **Step 3: ADR** (mô hình trạng thái đèn: unlit -> lit(fuel) -> out(ever_lit) -> relit; dầu nguyên 1/60; vùng an toàn = lit && fuel >= 30; luật thắng bình minh; phương án bỏ). **CHANGELOG** mục Phase 3: breaking changes (contract 1.2, `all_lit` bỏ, điểm mới, duration, snapshot/scenario/event mới, stun -> wander) + bảng test sửa/xóa.
- [ ] **Step 4: README/skill/ai-log** cập nhật v1.2, thứ tự tick (bước 2 thêm dầu), luật mới. Kiểm `grep -rnP "\x{2013}|\x{2014}" README.md CHANGELOG.md docs .claude/skills` rỗng.
- [ ] **Step 5: Verify cuối.** `npm run build && npm test` xanh.
