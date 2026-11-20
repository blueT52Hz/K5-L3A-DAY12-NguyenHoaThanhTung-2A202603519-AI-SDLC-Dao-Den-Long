# Đảo Đèn Lồng Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa số liệu theo TICKET-02, mở rộng thành chuỗi 3 Đêm với Lướt, Gió Lạc, Bùa Gió, tạm dừng trong lõi, vỏ web đầy đủ, và Test Contract v1.1.

**Architecture:** Lõi TS thuần `src/core` đọc `NightConfig` (dữ liệu từng Đêm) và module `terrain` (bề mặt giải tích) thay cho giả định một đảo phẳng. `step()` viết lại theo thứ tự 12 bước của đề, mỗi luật là một system nhỏ. Headless và web dùng chung lõi; web thêm flow 3 Đêm, âm thanh WebAudio, HUD, cài đặt.

**Tech Stack:** TypeScript, Vite 8, Three.js 0.170, Vitest, esbuild (headless), Node >= 20.

**Spec:** `docs/superpowers/specs/2026-11-20-dao-den-long-phase2-design.md` (đọc cùng `D:\VinAI\Day12\phase-2.html`). Mọi mục `[TQ]` trong spec là luật đã chốt, không tự đổi.

## Global Constraints

- Thư mục repo: `D:\VinAI\Day12\K5-L3A-DAY12-NguyenHoaThanhTung-2A202603519-AI-SDLC-Dao-Den-Long`. Lệnh chạy từ đây.
- Lõi `src/core/**` không import three/DOM, không `Math.random`, `Date`, thứ tự duyệt không ổn định. RNG chỉ qua `nextRandom(s)` (`src/core/rng.ts`).
- Tuning chỉ đọc từ `game.contract.json` qua `TUNING`. Hằng số chuẩn khác nằm trong `src/core/constants.ts` có comment trỏ về đề.
- 60 tick/s. Góc a, bán kính r → `(r·cos a, y, r·sin a)`. "Trong bán kính r" là `<= r`.
- Ngữ nghĩa bộ đếm giữ như `tickTimers` Phase 1: giảm ở bước 2 nếu > 0. Hồi chiêu đặt N ở tick k thì dùng lại được ở tick k+N. Trạng thái có thời hạn (stunned, recoil, spawning) đổi trạng thái ở bước 2 của tick mà bộ đếm về 0.
- File code ≤ 200 dòng, tên kebab-case. Chỉ dùng dấu "-" (không dùng en/em dash) trong code, comment, tài liệu.
- Kết thúc mỗi task: `npx tsc --noEmit` sạch và `npm test` xanh (Stop hook chặn khi đỏ). Không xóa hay nới test để cho qua.
- Commit local theo conventional commits, không nhắc AI, mỗi agent chỉ `git add` file của task mình. **Không push.**

## Review Focus

1. Mây đi lệch khỏi cầu tre Đêm 2 (|z| > 2 với x ∈ [26,44]) thì phải rơi, mất 1 Ngọn Lửa và hồi sinh, không có tường vô hình. Test ở Task 3.
2. Đi lên dốc 30° Đêm 3 từ r = 30 tới r = 24 thì chuyển liền sang tầng 1, không kẹt ở chỗ nối. Đứng ở tầng 0 sát vách tầng 1 thì bị chặn. Test ở Task 3.
3. Nút `dash`/`pulse`/`interact` nhấn trong lúc tạm dừng không được kích hoạt khi tiếp tục chơi. Test ở Task 2.
4. Rơi và Bóng Mực chạm trong cùng một tick, hoặc trong lúc chờ hồi sinh, chỉ mất tối đa 1 Ngọn Lửa. Test ở Task 5.
5. Scenario dùng id đèn không thuộc Đêm (L6 ở `--night 1`) trả mã thoát 2; L6 ở `--night 2` hợp lệ. Test ở Task 7.

---

### Task 0: Chốt phần dở dang của Phase 1

**Files:** đã có sẵn, chưa commit: `README.md`, `index.html`, `package.json`, `package-lock.json`, `src/web/main.ts`, `src/web/game-boot.ts`, `src/web/landing/**`.

- [ ] **Step 1:** `npm test` và `npx tsc --noEmit`. Expected: 49 test pass, tsc không lỗi. Nếu đỏ thì sửa tối thiểu trước khi commit.
- [ ] **Step 2:** Commit.

```bash
git add README.md index.html package.json package-lock.json src/web/main.ts src/web/game-boot.ts src/web/landing
git commit -m "feat(web): add landing page before game boot"
```

---

### Task 1: Kiểu dữ liệu v1.1, contract, cấu hình 3 Đêm, địa hình

**Files:**
- Modify: `game.contract.json`, `src/core/types.ts`, `src/core/constants.ts`, `src/core/create-game.ts` (chỉ chữ ký + đọc đèn từ NightConfig), mọi lời gọi `createGame` (giữ compile)
- Create: `src/core/nights/night-config-types.ts`, `src/core/nights/night-1-dao-ben.ts`, `src/core/nights/night-2-dao-cau.ts`, `src/core/nights/night-3-dao-chuong.ts`, `src/core/nights/index.ts`, `src/core/terrain/terrain-queries.ts`
- Delete: `src/core/math-xz.ts` `clampToIsland` (giữ `distXZ`)
- Test: `tests/core/night-configs.test.ts`, `tests/core/terrain.test.ts`, `tests/smoke.test.ts`

**Interfaces - Produces:**

```ts
// types.ts (bổ sung/đổi)
export type NightId = 1 | 2 | 3;
export type ShadeState = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned';
export type DrifterState = 'idle' | 'chase' | 'flee' | 'removed';
export type XZ = [number, number];
export interface InputFrame { move: XZ; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean; dash: boolean; pause: boolean }
export interface Player { pos: Vec3; vel: Vec3; vy: number; grounded: boolean; facing: XZ; flames: number; carried: number;
  invulnTicks: number; pulseCooldownTicks: number; dashTicks: number; dashCooldownTicks: number; dashDir: XZ;
  charmTicks: number; launchVel: XZ | null; respawnTicks: number }
export interface Mote { id: string; pos: Vec3; kind: 'random' | 'dropped'; ttlTicks: number | null }
export interface Shade { id: string; pos: Vec3; state: ShadeState; stateTicks: number; pushTicks: number; pushDir: XZ;
  heading: XZ; headingTicks: number; evictTicks: number; evictFrom: XZ | null }
export interface Drifter { id: string; pos: Vec3; state: DrifterState; stolen: number; stateTicks: number; heading: XZ; headingTicks: number }
export interface Charm { id: string; pos: Vec3; available: boolean; respawnTicks: number }
export interface WindState { warning: boolean; active: boolean; dirDeg: number }
// GameState thêm: night: NightId; simTick: number; paused: boolean; drifters: Drifter[]; charms: Charm[]; wind: WindState;
//   nextDrifterId: number; windEnabled: boolean; drifterSpawnEnabled: boolean; moteSpawnEnabled: boolean;
//   prevButtons: { jump; interact; pulse; dash; pause: boolean }. Bỏ spawnTicks (lịch tính từ simTick).
// Scenario thêm: player.{invuln_ticks, dash_cd_ticks, pulse_cd_ticks, charm_ticks}; shades[].{state?: ShadeState, state_ticks_left?: number};
//   drifters?: { id?: string; pos: Vec3; state?: DrifterState; stolen?: number }[];
//   charms?: { id: string; pos?: Vec3; available?: boolean; respawn_ticks?: number }[]; random_drifters?: boolean; wind_enabled?: boolean
```

```ts
// nights/night-config-types.ts
export type Surface =
  | { kind: 'disc'; cx: number; cz: number; r: number; y: number }
  | { kind: 'annulus'; cx: number; cz: number; rIn: number; rOut: number; y: number; zMinExclusive?: number }
  | { kind: 'rect'; xMin: number; xMax: number; zMin: number; zMax: number; y: number }
  | { kind: 'ramp'; angleDeg: number; width: number; rFrom: number; rTo: number; yFrom: number; yTo: number };
export interface CylinderObstacle { cx: number; cz: number; r: number; yTop: number }
export interface JumpPad { pos: Vec3; r: number; vy: number; horiz: XZ } // horiz: vận tốc ngang m/s đã tính sẵn
export interface NightConfig { id: NightId; name: string; durationS: number; surfaces: Surface[]; obstacles: CylinderObstacle[];
  start: Vec3; startFacing: XZ; lanterns: { id: string; pos: Vec3 }[]; moteSpawnPoints: Vec3[]; shadeSpawnPoints: Vec3[];
  jumpPads: JumpPad[]; charms: { id: string; pos: Vec3 }[]; shadeIntervalTicks: number; maxShades: number; shadeSpeed: number;
  drifters: boolean; wind: boolean }
// nights/index.ts
export function getNight(id: NightId): NightConfig;
// terrain/terrain-queries.ts
export function groundBelow(cfg: NightConfig, x: number, z: number, footY: number): number | null; // bề mặt cao nhất có h <= footY + STEP_UP
export function isWall(cfg: NightConfig, x: number, z: number, footY: number): boolean;            // có bề mặt h > footY + STEP_UP phủ (x,z), hoặc trong trụ khi footY < yTop
export function canWalkTo(cfg: NightConfig, footY: number, x: number, z: number, allowDrop: boolean): boolean;
//   = !isWall && (allowDrop || (g = groundBelow) !== null && g >= footY - STEP_UP)
```

Data (Night 1/2/3) đúng §Phần 2 của đề và spec §6; tóm tắt cho implementer:
- N1: disc(0,0,40,y0); start (0,0,0), facing [0,1]; đèn L1-L5 tọa độ đề; mote 8 điểm r12 mỗi 45° từ 0° + 16 điểm r33 mỗi 22.5° từ 0°; shade 12 điểm r37 tại 15°+30°k; interval 480, max 6, speed 4; drifters false, wind false; charms [].
- N2: disc A(0,0,28), disc B(70,0,28), rect x[26,44] z[-2,2] y0; pads (20,0,18) và (50,0,-18), r1, vy14, horiz = 24 × đơn vị hướng tới tâm đảo kia; đèn L1-L6 theo đề; mote mỗi đảo 4 điểm r10 (0/90/180/270) + 8 điểm r22 mỗi 45°; shade 8 điểm r26 mỗi đảo tại 22.5°+45°k; charm C1 (35,0,0); interval 420, max 8, speed 4; drifters true, wind false.
- N3: disc(0,0,45,y0), annulus(0,0,12,24,y3,zMinExclusive 0), disc(0,0,8,y6), ramp 30° và 150° (width 3, r 30→24, y 0→3); tháp {0,0,r2,yTop 14}; pad (0,3,13) r1 vy12 horiz [0,-8]; đèn L1-L7 theo đề; mote 18 điểm r34 mỗi 20° từ 0° (y0) + 8 điểm r18 tại 20°..160° (y3) + 4 điểm r5 tại 45/135/225/315 (y6); shade 16 điểm r43 mỗi 22.5° từ 0°; charms C1 (30,0,25), C2 (-30,0,25); interval 360, max 10, speed 4.5; drifters true, wind true.
- Constants mới (constants.ts): `STEP_UP 0.3, FALL_Y -10, RESPAWN_WAIT_TICKS 60, RESPAWN_INVULN_TICKS 90, MOTE_INITIAL 20, MOTE_CAP 30, MOTE_SPAWN_EVERY 240, DROPPED_TTL_TICKS 480, DROP_RING_MIN 1.5, DROP_RING_MAX 2.5, HEIGHT_TOLERANCE 1.5, PULSE_CENTER_DY 0.8, PULSE_PUSH_TICKS 15, SHADE_Y 1.0, SHADE_DETECT 12, SHADE_GIVE_UP 18, SHADE_FIRST_SPAWN_TICK 300, SHADE_FIRST_SPAWN_COUNT 2, SHADE_SPAWN_MIN_DIST 15, SHADE_SPAWNING_TICKS 60, SHADE_WANDER_FACTOR 0.5, HEADING_CHANGE_TICKS 120, RECOIL_TICKS 60, RECOIL_DIST 2, EVICT_MAX_TICKS 30, CHARM_TICKS 600, CHARM_RESPAWN_TICKS 2700, CHARM_RUN_SPEED 7.2, DRIFTER_SPEED 7, DRIFTER_IDLE_SPEED 2, DRIFTER_MAX 2, DRIFTER_SPAWN_EVERY 1200, DRIFTER_CHASE_MIN_CARRIED 5, DRIFTER_DETECT 15, DRIFTER_TOUCH 1.2, DRIFTER_STEAL_MAX 3, DRIFTER_FLEE_TICKS 240, DRIFTER_DROP_VANISH_TICKS 120, DRIFTER_Y 1.5, WIND_PERIOD_TICKS 1800, WIND_DURATION_TICKS 300, WIND_WARN_TICKS 120, WIND_SPEED 2`. Bỏ `ISLAND_RADIUS, LANTERN_RING_RADIUS, MOTE_COUNT, INITIAL_SHADES, MAX_SHADES, SHADE_SPAWN_TICKS`.

- [ ] **Step 1: Viết test hỏng**
  - `tests/smoke.test.ts` "contract v1.1 tuning": `contract_version === '1.1'`; `lantern_cost 10, pickup_radius 1, interact_radius 2, pulse_cost 3, pulse_radius 5, pulse_cooldown_s 3, pulse_stun_s 2, safe_radius 6, invuln_s 1.5, fall_enabled true, dash_speed 14, dash_duration_s 0.2, dash_cooldown_s 1.5, night2_duration_s 330, night3_duration_s 360, score.per_stun 5`.
  - `tests/core/night-configs.test.ts`: N1 L2 ≈ (23.8,0,7.7) ±0.05; số điểm mote N1/N2/N3 = 24/24/30; shade N1/N2/N3 = 12/16/16; N1 shade[0] ≈ (37cos15°, 0, 37sin15°); N2 pad[0].horiz có độ dài 24 và hướng tới (70,0,0); N3 có 7 đèn, mote tầng 2 có y 6.
  - `tests/core/terrain.test.ts`: N1 `groundBelow(0,0,0)=0`, `(41,0,0)=null`; N2 cầu `(35,0,1.9)=0`, `(35,0,2.1)=null`; N3 `(18,·,10)` từ footY 3 → 3, từ footY 0 → `isWall` true; dốc 30° tại r27 từ footY 1.4 → ≈1.5; `isWall` tại (1,0) footY 6 (tháp) true; tầng 1 tại z = -5 (nửa âm) chỉ có y 0.
- [ ] **Step 2:** `npx vitest run tests/smoke.test.ts tests/core/night-configs.test.ts tests/core/terrain.test.ts` → FAIL (module chưa có).
- [ ] **Step 3:** Cập nhật `game.contract.json` theo spec §6.1, `types.ts`, `constants.ts`, tạo `nights/*`, `terrain/terrain-queries.ts`. `createGame(seed, scenario = {}, night: NightId = 1)` lấy đèn từ `getNight(night).lanterns`, khởi tạo mọi trường mới (facing = startFacing, wind tắt, mảng rỗng). Các system cũ tạm thời chỉ sửa để compile; test cũ hỏng vì đổi số thì cập nhật kỳ vọng sang số chuẩn ngay trong task này (vd cooldown 180, invuln 90).
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): add contract v1.1 types, night configs and terrain queries`.

---

### Task 2: Thứ tự tick mới, tạm dừng, đom đóm, nạp đèn, thắng/thua cuối tick

**Files:**
- Modify: `src/core/step.ts`, `src/core/systems/timers.ts`, `mote-pickup.ts`, `lantern-deposit.ts`, `src/core/create-game.ts`
- Create: `src/core/systems/pause-control.ts`, `src/core/systems/mote-spawner.ts`, `src/core/systems/win-lose.ts`
- Test: `tests/core/step-tick-order.test.ts`, `tests/core/step-pause.test.ts`, `tests/core/step-motes.test.ts`, cập nhật `tests/core/step-player.test.ts`, `tests/core/create-game.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `getNight`, `groundBelow`.
- Produces: `step(s, input): GameEvent[]` khung 12 bước (dưới); `handlePause(s, input, events): boolean` (true = bỏ bước 2-11); `computeEdges(s, input): { jump; interact; pulse; dash: boolean }`; `spawnScheduledMote(s): void`; `resolveEndOfTick(s, events): void`; `addDroppedMote(s, pos: Vec3): void` (dùng cho Task 5, 6).

```ts
// step.ts khung (các system của Task 3-6 cắm vào đúng chỗ)
s.tick += 1;
const edges = computeEdges(s, input);          // luôn cập nhật prevButtons
if (handlePause(s, input, events)) return events; // 1
s.simTick += 1; s.timeLeftS = max(0, s.t0 - s.simTick / 60);
tickTimers(s);                                  // 2
movePlayer(s, input, edges); checkFall(s, events);       // 3 (Task 3/4)
pickupMotes(s, events); pickupCharms(s, events);         // 4
if (edges.interact) depositToLantern(s, events);         // 5
updateSafeZones(s);                                      // 6 (Task 5)
if (edges.pulse) usePulse(s, events);                    // 7
moveShades(s); moveDrifters(s);                          // 8
drifterSteal(s, events); checkHit(s, events);            // 9
spawnScheduledMote(s); spawnShades(s, events); spawnDrifters(s, events); // 10
resolveEndOfTick(s, events);                             // 11
```

- [ ] **Step 1: Viết test hỏng**
  - pause: tick 5 `pause:true` → event `paused` tick 5, `s.paused`; 10 tick sau `tick` +10, `simTick` đứng, `timeLeftS` đứng, vị trí đứng dù `move [0,1]`; nhả rồi nhấn lại → `resumed` và tick đó Mây dịch 0.1 m. Review Focus #3: nhấn `pulse` (carried 3, shade trong 3 m) khi đang dừng, giữ nguyên tới lúc tiếp tục → không có event `pulse`.
  - motes: N1 seed 1 → 20 mote `random` ở 20 điểm spawn khác nhau; sau 240 simTick có 21 mote, tại 480 có 22; scenario 30 mote → tick 240 không sinh; mote ở `[0,1.6,0]` và Mây ở (0,0,0) không nhặt (chênh cao 1.6 > 1.5), mote (0.9,0,0) nhặt được; `per_mote` không cộng khi nhặt.
  - deposit: carried 10 cạnh L1 (đứng tại (0,0,23.5)) → `deposit {amount:10, deposited:10}`, `lantern_lit`, điểm +200 (10×10 + 100); đứng (0,0,22.9) (cách 2.1) → không có gì.
  - end-of-tick: scenario 4 đèn sáng, L5 deposited 0, carried 10 cạnh L5, `time_left_s: 1/60` → nhấn interact ở tick 0 → `won/all_lit` (thắng đúng tick hết giờ), bonus = 0×2 + 50×flames.
  - `night_start` không phát ở lõi (do headless, Task 7).
- [ ] **Step 2:** `npx vitest run tests/core` → FAIL ở các test mới.
- [ ] **Step 3:** Hiện thực. `handlePause`: cạnh `pause` đảo `s.paused`, phát `paused`/`resumed`; trả true nếu `s.paused` sau khi xử lý. `tickTimers` giảm thêm `dashTicks, dashCooldownTicks, charmTicks, respawnTicks`, `ttlTicks` của mote dropped (về 0 thì xóa), `respawnTicks` của charm (về 0 thì `available`), bộ đếm shade/drifter. `spawnScheduledMote`: khi `simTick % 240 === 0` và tổng mote < 30, chọn ngẫu nhiên một điểm trống (không có mote trong XZ ≤ 1.0). Đầu Đêm chọn 20 điểm khác nhau bằng Fisher-Yates từng phần trên chỉ số điểm; luôn rút RNG theo thứ tự cố định (mote ban đầu trước) kể cả khi scenario thay thế. Nhặt và nạp dùng thêm điều kiện `|footY - y| ≤ HEIGHT_TOLERANCE`. Điểm `per_mote` cộng theo `amount` khi nạp. `resolveEndOfTick` theo spec §6.7, không còn kết thúc giữa tick.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): v1.1 tick order, core pause, mote schedule, end-of-tick result`.

---

### Task 3: Di chuyển trên địa hình, rơi và hồi sinh, bục nhảy

**Files:**
- Modify: `src/core/systems/player-movement.ts`
- Create: `src/core/systems/player-fall-respawn.ts`, `src/core/systems/jump-pads.ts`
- Test: `tests/core/step-terrain-movement.test.ts`

**Interfaces:**
- Consumes: `canWalkTo`, `groundBelow`, `getNight(s.night)`.
- Produces: `movePlayer(s, input, edges)`; `worldMoveDir(input): XZ` (đã xoay theo yaw, chuẩn hóa nếu > 1); `checkFall(s, events)`; `tryLaunchFromPad(s): void`. Task 4 cắm dash và gió vào `horizontalVelocity(s, input): XZ` trong `player-movement.ts`.

Thuật toán (đề không quyết định thứ tự, nên chốt ở đây):

```
if respawnTicks > 0: vel = 0; return
h = horizontalVelocity(s, input)            // Task 3: launchVel ?? worldMoveDir × speed (7.2 nếu charmTicks > 0)
cập nhật facing nếu worldMoveDir ≠ 0
thử trục X rồi trục Z: nhận bước nếu canWalkTo(cfg, footY, nx, nz, allowDrop = true)
dọc: if jumpEdge && grounded → vy = 7, grounded = false
     if !grounded → vy += -20/60; y += vy/60
     g = groundBelow(x, z, yTrướcKhiDịch)
     đang rơi và g ≠ null và y <= g → y = g, vy = 0, grounded = true, launchVel = null
     grounded: g ≠ null và g >= y - STEP_UP → y = g (bám dốc); ngược lại grounded = false
tryLaunchFromPad(s)                          // grounded, XZ ≤ pad.r, |y - pad.y| ≤ 0.01 → vy = pad.vy, launchVel = pad.horiz, grounded = false
vel = [dịch thực X × 60, vy, dịch thực Z × 60]
```

`checkFall`: `y < FALL_Y` và `respawnTicks === 0` → flames -1, `lost = carried`, carried 0, event `player_hit {by:'fall', flames, dropped:0, lost}`; nếu flames > 0 thì `respawnTicks = 60`. Khi `respawnTicks` vừa về 0 ở bước 2 (đánh dấu cờ trong timers): pos = start, vel 0, grounded, facing = startFacing, `invulnTicks = 90`.

- [ ] **Step 1: Viết test hỏng**
  - N1 đi +X 7 s từ (0,0,0) → có `player_hit by fall`, flames 2, `lost` = carried ban đầu (scenario carried 4 → lost 4, carried 0); 60 tick sau pos = (0,0,0), invuln 90.
  - Review Focus #1: N2 scenario pos (35,0,0), `move [0,1]` (+Z) 40 tick → rơi (ra khỏi cầu tại z > 2).
  - N2 đứng ở pad (20,0,18) → tick kế vy = 14; sau 100 tick đã chạm đất và `groundBelow` ≠ null, khoảng cách tới (70,0,0) < 28.
  - N3 đứng ở pad (0,3,13) → đáp đất với y = 6, khoảng cách tới tâm < 8.
  - Review Focus #2: N3 bắt đầu ở (30cos30°, 0, 30sin30°), `move` hướng về tâm (dùng cam_yaw để quay) 70 tick → y = 3 và grounded; bắt đầu ở (0,0,26) đi về -Z → bị chặn ở r ≈ 24, y vẫn 0.
  - Không còn tường vô hình: test cũ "clamps to island" đổi thành test rơi.
  - Đơn vị: `vel` khi chạy +Z là `[0,0,6]`; khi có charm (scenario `charm_ticks 600`) là `[0,0,7.2]`.
- [ ] **Step 2:** `npx vitest run tests/core/step-terrain-movement.test.ts` → FAIL.
- [ ] **Step 3:** Hiện thực theo thuật toán trên.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): terrain movement, fall and respawn, jump pads`.

---

### Task 4: Lướt, gió mạnh, Bùa Gió

**Files:**
- Create: `src/core/systems/player-dash.ts`, `src/core/systems/wind-gusts.ts`, `src/core/systems/charms.ts`
- Modify: `src/core/systems/player-movement.ts` (`horizontalVelocity`), `timers.ts`, `create-game.ts` (charms theo Đêm + scenario `charms`, `charm_ticks`, `dash_cd_ticks`, `wind_enabled`)
- Test: `tests/core/step-dash-wind-charm.test.ts`

**Interfaces:**
- Produces: `startDashIfRequested(s, input, edges, events)` (gọi đầu bước 3); `updateWind(s): void` (gọi đầu bước 3, đọc `simTick`); `pickupCharms(s, events)`.
- Luật: spec §6.2 (Lướt, Gió) và §7.2. Dash: `dashTicks = 12`, `dashDir = worldMoveDir || facing`, đặt `dashCooldownTicks = 90` trừ khi `charmTicks > 0`; khi dash: h = dashDir × 14, vy = 0, bỏ trọng lực; hết dash thì `launchVel` (nếu có) dùng tiếp. Gió: `warning` khi `simTick ∈ [1800k-120, 1800k)`, `active` khi `simTick ∈ [1800k, 1800k+300)`, k ≥ 1; `dirDeg = floor(nextRandom × 360)` rút ở tick đầu của warning; h += (cos, sin)(dirDeg) × 2 khi active. Chỉ khi `cfg.wind && s.windEnabled`.

- [ ] **Step 1: Viết test hỏng**
  - Dash trên đất, `move [0,1]`: 12 tick dịch 14/60 m mỗi tick, event `dash {}` một lần; nhấn lại ở tick 6 bị bỏ qua; nhấn lại ở tick 89 không lướt, ở tick 90 lướt.
  - Dash đứng yên đầu Đêm → hướng +Z (facing). Dash trên không giữ nguyên y trong 12 tick.
  - Charm: N2 scenario Mây tại (35,0,0) → `charm_picked {charm_id:'C1', charm_ticks:600}`, `available` false, sau 2700 tick `available` true; có bùa thì 2 lần dash cách nhau 13 tick đều chạy.
  - Gió: N3 seed 7, `simTick` 1680 → `wind.warning`; 1800 → `active`; Mây đứng yên dịch 2/60 m/tick theo `dirDeg`; 2100 → hết. `wind_enabled:false` → không bao giờ active. N1 không có gió.
- [ ] **Step 2:** chạy file test → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): dash, wind gusts and wind charms`.

---

### Task 5: Bóng Mực 5 trạng thái, lịch sinh, vùng an toàn, Tỏa Sáng, bị đánh

**Files:**
- Modify: `src/core/systems/shade-ai.ts`, `shade-zones.ts`, `pulse.ts`, `player-hit.ts`, `timers.ts`, `create-game.ts` (scenario `state`, `state_ticks_left`)
- Create: `src/core/systems/shade-spawner.ts`, `src/core/systems/shade-movement-terrain.ts` (nếu `shade-ai.ts` > 200 dòng)
- Test: thay `tests/core/step-shades.test.ts`

**Interfaces:**
- Produces: `spawnShades(s, events)`, `moveShades(s)`, `updateSafeZones(s)`, `usePulse(s, events)` (cũng gọi `pulseDrifters(s, center)` của Task 6 qua một hook rỗng ở task này), `checkHit(s, events)`, `shadeFootY(sh): number = sh.pos[1] - SHADE_Y`.
- Luật: spec §6.4 (vùng an toàn, evicting), §6.5 (pulse 3D, đẩy 15 tick, dừng khi vật cản), §6.6 (trạng thái, chạm, lịch sinh). Di chuyển bóng: thử X rồi Z với `canWalkTo(..., allowDrop = false)`, sau đó đẩy ra khỏi vùng đèn sáng (bỏ `boundaryIntersection` dựa trên `ISLAND_RADIUS`; nếu vị trí sau khi đẩy không đứng được thì giữ vị trí cũ). Y = mặt đất + 1.0.

- [ ] **Step 1: Viết test hỏng** (N1, `random_shades:false` trừ test lịch sinh)
  - Lịch: seed 3, không scenario → tick 299 không có bóng; tick 300 có S1, S2 `spawning`, cách Mây ≥ 15; tick 360 chuyển `wander`; tick 780 có S3; tối đa 6. N2 interval 420, N3 360.
  - `wander` → `chase` khi XZ ≤ 12; `chase` ở 18.5 → `wander`. Chase dịch 4/60 m/tick (N3: 4.5/60).
  - Pulse: carried 3, bóng cách tâm 3D 4.9 (tâm Mây + 0.8) → `stunned_ids:['S1']`, carried 0, +5, sau 15 tick bóng xa thêm đúng 4.0 m theo phương ngang; bóng cách 5.1 → không trúng; trùng XZ → đẩy +X; pulse lại khi đang choáng → `stateTicks` về 120 và `pushTicks` về 15; pulse ở tick k → còn `stunned` tới tick k+119, đổi trạng thái ở tick k+120 (Global Constraints).
  - Chạm: bóng `chase` tại 0.9 m → `player_hit {by:'shade', flames:2, dropped: floor(c/2)}`, đom đóm rơi `kind:'dropped'`, `ttl_s` 8, cách Mây 1.5-2.5; bóng → `recoil`, sau 60 tick cách xa thêm ≈ 2 m (±0.05); hai bóng cùng chạm → chỉ 1 hit (id nhỏ); bất tử 90 tick: chạm lúc bất tử không đổi trạng thái bóng.
  - Vùng an toàn: bóng ở 3 m quanh L1, thắp L1 → trong ≤ 30 tick bóng ở ≥ 6 m, không gây hit trong lúc đó dù Mây đứng cạnh; bóng ngoài vùng không vào được.
  - Review Focus #4: Mây rơi (y < -10) cùng tick có bóng trong 1 m → flames chỉ giảm 1; trong 60 tick chờ hồi sinh không có `player_hit`.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): five-state shades, spawn schedule, safe-zone eviction, timed pulse push`.

---

### Task 6: Gió Lạc

**Files:**
- Create: `src/core/systems/drifter-ai.ts`
- Modify: `pulse.ts` (nối hook), `create-game.ts` (scenario `drifters`, `random_drifters`)
- Test: `tests/core/step-drifters.test.ts`

**Interfaces:**
- Produces: `spawnDrifters(s, events)`, `moveDrifters(s)`, `drifterSteal(s, events)`, `pulseDrifters(s, center: Vec3)`.
- Luật: spec §7.1. Điểm sinh = `cfg.shadeSpawnPoints`, Y = DRIFTER_Y. `removed` giữ trong mảng.

- [ ] **Step 1: Viết test hỏng** (N2)
  - Lịch: seed 5 → `simTick` 1200 có D1 `idle`, 2400 có D2, 3600 không có D3 khi D1, D2 chưa removed. N1 không bao giờ có.
  - idle → chase: carried 5 trong 15 m → `chase`; carried 4 → `idle`.
  - Cướp: D1 `chase` cách 1.1, carried 7 → `drifter_steal {drifter_id:'D1', amount:3, carried:4}`, `flee`, `stolen` 3; carried 2 → amount 2; Mây đang bất tử vẫn bị cướp; sau 240 tick `removed`; không cướp lần 2.
  - Pulse: D1 `chase` trong 5 m → `flee`, stolen 0, không cướp. D1 `flee` stolen 3 trong 5 m → `drifter_drop {drifter_id:'D1', amount:3}`, có 3 mote `dropped` tại XZ của nó, sau 120 tick `removed`. Vùng an toàn không chặn Gió Lạc.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(core): drifters steal, flee and drop`.

---

### Task 7: Headless I/O v1.1 và hiệu năng

**Files:**
- Modify: `src/headless/parse-args.ts` (`--night` 1|2|3), `parse-inputs.ts` (`dash`, `pause`), `parse-scenario.ts` (trường mới, kiểm tra kiểu), `serialize.ts`, `run-headless.ts`, `src/core/create-game.ts` (id đèn theo Đêm)
- Test: `tests/headless/run-headless.test.ts` (sửa "night != 1"), `tests/headless/contract-v1-1.test.ts`, `tests/headless/performance.test.ts`

**Interfaces:**
- Produces: dòng JSONL đúng spec §8. Snapshot: thêm `night`, `wind {active, dir_deg}`, `player.{vel, grounded, invuln (boolean), dash_cd_s, pulse_cd_s, charm_s}`, `motes[{id,pos,kind,ttl_s}]` (`ttl_s` null với random), `drifters[{id,pos,state,stolen}]`, `charms[{id,available,respawn_s}]`; `sim_tick = s.simTick`; `state = 'paused'` khi `s.paused && status === 'playing'`. `night_start {night}` với `tick: 0` ngay sau snapshot tick 0.

- [ ] **Step 1: Viết test hỏng**
  - `--night 2`/`3` → code 0, snapshot đầu `night` đúng; `--night 4` → 1.
  - Dòng 1 là snapshot tick 0, dòng 2 là event `night_start`.
  - Inputs `{tick:5, pause:true}` (frame tick k áp ở bước tạo tick k+1) → event `paused` với `tick: 6`, snapshot tick 10 có `state:"paused"`, `sim_tick: 5`.
  - Scenario sai kiểu `drifters:[{pos:[1,2]}]` → 2; Review Focus #5: `lanterns:[{id:'L6'}]` ở night 1 → 2, ở night 2 → 0.
  - `player_hit` do rơi có `lost`.
  - Mọi khóa snapshot bắt buộc có mặt (kiểm tra bằng danh sách khóa).
  - performance: `runHeadless` N3, seed 1, `--ticks 21600`, `--snapshot-every 1`, inputs đi vòng → xong < 30000 ms (mục tiêu < 5000; test timeout 60000).
  - Determinism: chạy 2 lần mỗi Đêm cùng seed → lines giống hệt.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run build` → xanh; `node dist-headless/headless.mjs --seed 1 --night 3 --ticks 600 --out tmp.jsonl` code 0.
- [ ] **Step 5:** Commit `feat(headless): contract v1.1 io for three nights`.

---

### Task 8: Model 3D và bảng màu (chạy song song với Task 2-7 sau Task 1)

**Files:** Sở hữu `src/web/models/**`, `tests/models/**`.
- Create: `src/web/models/palette.ts` (hằng hex đúng bảng của đề), `night-terrain-meshes.ts` (dựng mesh từ `NightConfig.surfaces/obstacles`: đĩa, vành khăn nửa z > 0, cầu tre, dốc, vách, tháp chuông, biển mây), `jump-pad.ts`, `wind-charm.ts`, `drifter.ts` (dải lụa), `wind-leaves.ts` (hạt lá bay, bật theo `warning/active`)
- Modify: `island-environment.ts` (nhận `NightConfig`, `setBrightness(lit, total)` dùng `0.15 + 0.55 × lit/total`), `lantern.ts`, `mote.ts` (InstancedMesh), `player-may.ts`, `shade.ts` (thân, viền, màu choáng `#3A3450`), `index.ts`

- [ ] **Step 1: Test hỏng** `tests/models/models.test.ts`: palette khớp hex đề; `createEnvironment(scene, cfgN3)` có mesh tháp; `setBrightness(0,7)` ra 0.15, `(7,7)` ra 0.70; tổng PointLight ≤ 8.
- [ ] **Step 2:** `npx vitest run tests/models` → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → xanh.
- [ ] **Step 5:** Commit `feat(models): night terrain meshes, new entities, standard palette`.

---

### Task 9: Flow 3 Đêm, tạm dừng, cài đặt (sau Task 7 và 8)

**Files:** Sở hữu `src/web/**` trừ `models/`, `index.html`.
- Create: `src/web/flow/game-flow-state-machine.ts` (`menu → intro(n) → playing → result → intro(n+1) | dawn`, thua → retry/menu, tổng điểm = tổng Đêm thắng), `src/web/flow/flow-screens.ts` (DOM: menu, intro với tên đảo + lời Ông Đăng, kết quả, Bình Minh), `src/web/settings/settings-store.ts` (`loadSettings(): {volume:number; mouseSensitivity:number}`, `saveSettings(s)`, key `dao-den-long.settings.v1`, try/catch, mặc định volume 70, sensitivity 1.0, kẹp 0-100 và 0.2-3.0), `src/web/settings/settings-panel.ts`
- Modify: `game-boot.ts` (`createGame(seed, {}, night)`, đọc `state.paused`; vòng lặp luôn gọi `step` khi đang chơi), `keyboard-mouse-input.ts` (`dash` = Shift, `pause` = Esc/P, nhân độ nhạy chuột), `pause-overlay.ts` (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; ẩn tab → gửi pause), `scene-sync.ts` (đồng bộ drifter, charm, pad, wind, reset theo Đêm), landing: nút Chơi → menu.
- Test: `tests/web/game-flow-state-machine.test.ts`, `tests/web/settings-store.test.ts` (localStorage giả bằng object; storage ném lỗi → trả mặc định)

- [ ] **Step 1:** Test hỏng: thắng N1 → intro(2); thắng N3 → dawn với tổng = điểm N1+N2+N3; thua N2 → retry giữ tổng của N1; settings lưu/đọc lại, giá trị ngoài khoảng bị kẹp, JSON hỏng → mặc định.
- [ ] **Step 2:** `npx vitest run tests/web` → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run build` → xanh.
- [ ] **Step 5:** Commit `feat(web): three-night flow, core-driven pause menu, persisted settings`.

---

### Task 10: Âm thanh và HUD đầy đủ

**Files:**
- Create: `src/web/audio/audio-engine.ts` (AudioContext mở ở click đầu, master gain theo settings), `src/web/audio/procedural-sounds.ts` (nhạc nền đêm, SFX: nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược mỗi giây 10 s cuối, gió), `src/web/audio/event-to-sound.ts` (`soundForEvent(e: GameEvent): SoundId | null`), `src/web/hud/hud-layout.ts`, `src/web/hud/lantern-pointer.ts`
- Modify: `hud.ts` (thay bằng bố cục spec §7.7), `game-boot.ts` (chuyển event `step` sang âm thanh; jump suy từ cạnh nhảy + grounded)
- Test: `tests/web/event-to-sound.test.ts`, `tests/web/hud-format.test.ts`

- [ ] **Step 1:** Test hỏng: `mote_picked → 'pickup'`, `lantern_lit → 'light'`, `pulse → 'pulse'`, `player_hit → 'hit'`, `dash → 'dash'`, `shade_spawned → 'shade'`, `game_over won/lost → 'win'/'lose'`; `formatClock(65.4) === '01:05'`; `isClockDanger(30) === true`, `(30.01) === false`; `interactPrompt(4) === 'E - Nạp ánh sáng (4/10)'`; `nearestUnlitLantern` trả id gần nhất chưa sáng.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Hiện thực.
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run build` → xanh.
- [ ] **Step 5:** Commit `feat(web): procedural audio and full hud`.

---

### Task 11: Bằng chứng, tài liệu, harness, tag

**Files:**
- Create: `scripts/generate-evidence-phase-2.mjs`, `evidence/phase-2/**` (sinh bằng script), `.claude/skills/dao-den-long-contract/SKILL.md`
- Modify: `README.md` (điều khiển mới: Shift lướt, Esc/P; 3 Đêm; điểm; mục Giả định liệt kê các `[TQ]`; acceptance criteria cho 8 mục Phần 3; Sáng tạo của tôi), `AGENTS.md` (quy trình Phase 2, con trỏ spec/plan/skill), `CLAUDE.md`, `docs/ai-log.md`, `scripts/generate-evidence.mjs` nếu cần dùng chung

- [ ] **Step 1:** Script sinh: vitest.txt, JSONL cho mỗi tính năng mới (dash, pad N2, pad N3, fall-respawn, wind, drifter steal/pulse/drop, charm, pause, shade states, safe-zone eviction, win-at-dawn-tick) bằng scenario trong `evidence/phase-2/scenarios/`, determinism cả 3 Đêm, `headless-timing.txt` (21.600 tick mỗi Đêm).
- [ ] **Step 2:** Chạy `npm run build && node scripts/generate-evidence-phase-2.mjs` → mọi file có mặt, timing < 30 s mỗi Đêm.
- [ ] **Step 3:** FPS: chạy `npm run preview`, dùng Playwright (đã có ở `D:\VinAI\Day12\node_modules`) mở 1280×720, đo FPS trung bình 20 s mỗi Đêm, ghi `evidence/phase-2/fps.txt` (≥ 30) và ảnh menu, 3 Đêm, HUD, tạm dừng.
- [ ] **Step 4:** Viết skill dự án (luật contract v1.1, thứ tự tick, cách thêm scenario/evidence, lệnh kiểm tra), cập nhật README/AGENTS/CLAUDE/ai-log. Kiểm tra không có en/em dash: `grep -rnP "\x{2013}|\x{2014}" README.md AGENTS.md docs .claude/skills` → rỗng.
- [ ] **Step 5:** `npm test` xanh. Commit theo 2 commit riêng để lịch sử thể hiện:

```bash
git add scripts/generate-evidence-phase-2.mjs evidence/phase-2
git commit -m "chore(evidence): phase 2 evidence generation"
git add README.md AGENTS.md CLAUDE.md docs/ai-log.md .claude/skills/dao-den-long-contract
git commit -m "docs: update agent guide, project skill and readme for phase 2"
git tag phase-2
```
