# Island Decor Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng module trang trí đảo cho 3 Đêm + trang `decor-demo.html` xem ở tab riêng, không sửa file nào đang có.

**Architecture:** Phần thuần (PRNG, vùng cấm, rải vị trí, công thức ánh sáng) tách khỏi phần Three.js và có test Vitest. `src/web/decor/index.ts` gom mọi lớp thành `buildIslandDecor()`. Trang demo nạp module đó, có panel điều khiển. Dùng lại `palette.ts`/`night-terrain-meshes.ts` của Phase 2 Task 8.

**Tech Stack:** TypeScript, Three.js 0.170 (OrbitControls từ `three/examples/jsm`), Vite 8 dev server, Vitest (môi trường node).

**Spec:** `docs/superpowers/specs/2026-11-20-island-decor-demo-design.md`

**Cách thực hiện đã chọn:** subagent-driven (superpowers:subagent-driven-development).

## Phạm vi tạm thời: chỉ Đêm 1 (user chọn 2026-11-20, không đợi Phase 2)
- Làm trong git worktree riêng, branch `feat/island-decor-demo` tách từ HEAD của `feat/phase-2`; commit local, không push, không merge.
- Task 1: bỏ kiểm tra tag `phase-2`; `DECOR_PALETTE` tự khai báo đủ hằng (không import `palette.ts`).
- Task 2, 3: giữ nguyên (thuần, test cả 3 Đêm vì `src/core/nights` đã có đủ dữ liệu).
- Task 4: `buildTerrainLayer` tự vẽ Đêm 1 (đĩa r = 40 + đá chóp ngược + biển mây), không dùng `night-terrain-meshes.ts`; Đêm 2/3 trả `Group` rỗng. Test "terrain Đêm 3 có tháp" đổi thành "terrain Đêm 1 có children".
- Task 5: trang trí riêng chỉ cho Đêm 1 (props Đêm 2/3 trả `Group` rỗng); test dispose chạy cho Đêm 1.
- Task 6: panel ẩn nút chọn Đêm (luôn Đêm 1); `parseDecorDemoQuery` giữ nguyên.
- Task 7: ảnh chụp chỉ Đêm 1 (`lit=0`, `lit=5`); headless so cả 3 Đêm.
- Khi Phase 2 xong: thay terrain/palette tự vẽ bằng bản Task 8 và bổ sung Đêm 2/3 theo plan gốc.

## Global Constraints
- Chỉ **tạo file mới**. Không sửa: `index.html`, `src/web/main.ts`, `game-boot.ts`, `scene-sync.ts`, `island-environment.ts`, mọi model hiện có, `vite.config.ts`, `package.json`, `src/core/**`, `src/headless/**`.
- `src/web/decor/` chỉ import: `three`, `src/core/nights`, `src/core/terrain/terrain-queries.ts`, `src/web/models/palette.ts`, `src/web/models/night-terrain-meshes.ts` (đọc).
- Không thư viện mới, không `Math.random` trong decor (dùng `mulberry32`), không shadow, vật lặp lại dùng `InstancedMesh`.
- File < 200 dòng, tên kebab-case. Dùng dấu "-", không dùng en/em dash.
- Màu theo bảng §3 spec (lệch ≤ 10% mỗi kênh). Nền/fog demo `#0E1430`.
- Ánh sáng môi trường `0.15 + 0.55 × lit/total`.
- FPS trung bình ≥ 30 ở 1280×720, mọi lớp bật.
- Commit **chỉ ở local, không push**.

## Review Focus
1. Đổi Đêm liên tục trong demo → rò bộ nhớ: `dispose()` phải gỡ hết object khỏi scene và giải phóng geometry/material (test ở Task 5).
2. Query sai (`?night=9`, `?lit=-1`, `?lit=99`, chữ) → về Đêm 1, `lit` kẹp trong `[0, total]`, không lỗi (test ở Task 6).
3. `setLitLanterns` nhận id không tồn tại hoặc trùng → bỏ qua, không lỗi; `total = 0` không chia cho 0 (test ở Task 4).
4. Tắt một lớp rồi đổi Đêm → Đêm mới vẫn giữ trạng thái bật/tắt của panel (Task 6, bước áp lại trạng thái).
5. Trình duyệt không tạo được WebGL → hiện thông báo chữ thay vì trang trắng; resize cửa sổ → cập nhật aspect và kích thước renderer (Task 6).

---

### Task 1: Điều kiện tiên quyết, PRNG và bảng màu

**Files:**
- Create: `src/web/decor/seeded-random.ts`, `src/web/decor/decor-palette.ts`
- Test: `tests/decor/seeded-random-and-palette.test.ts`

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number` (trả số trong `[0, 1)`); `DECOR_PALETTE` (object hằng `number` hex) có tối thiểu các khóa: `sky, mist, grass, sand, wood, cloudSea, lanternLit, lanternCore, lanternOff, moteCore, moteGlow, gold`, cộng màu prop riêng: `stone, roofTile, bronze, arecaLeaf, arecaTrunk, paperLantern`.

- [ ] **Step 1: Xác minh tiền đề** - có tag `phase-2` (`git tag -l phase-2`), và xem `src/web/models/palette.ts`, `night-terrain-meshes.ts` thật: ghi lại tên export và chữ ký vào đầu file plan này (mục "Ghi chú thực hiện"). Nếu thiếu tag: dừng và báo người dùng.
- [ ] **Step 2: Viết test hỏng**
```ts
it('mulberry32 tất định và trong [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const xs = Array.from({ length: 5 }, a), ys = Array.from({ length: 5 }, b);
  expect(xs).toEqual(ys);
  expect(xs.every(v => v >= 0 && v < 1)).toBe(true);
  expect(Array.from({ length: 5 }, mulberry32(43))).not.toEqual(xs);
});
it('DECOR_PALETTE khớp bảng chuẩn', () => {
  expect(DECOR_PALETTE.sky).toBe(0x0e1430);  expect(DECOR_PALETTE.mist).toBe(0x1b2350);
  expect(DECOR_PALETTE.grass).toBe(0x2f5d50); expect(DECOR_PALETTE.sand).toBe(0xc9b48a);
  expect(DECOR_PALETTE.wood).toBe(0x6b4a2f);  expect(DECOR_PALETTE.cloudSea).toBe(0x12384a);
  expect(DECOR_PALETTE.lanternLit).toBe(0xffb347); expect(DECOR_PALETTE.moteGlow).toBe(0xffe58a);
  expect(DECOR_PALETTE.gold).toBe(0xf2c14e);
});
```
- [ ] **Step 3: Chạy** `npx vitest run tests/decor` → FAIL (module không tồn tại).
- [ ] **Step 4: Cài đặt** `mulberry32` (thuật toán mulberry32 chuẩn) và `DECOR_PALETTE` (re-export giá trị từ `palette.ts` của Task 8 nếu có khóa tương ứng, còn lại khai báo hằng; màu prop riêng tự chọn, hài hòa bảng).
- [ ] **Step 5: Chạy** `npx vitest run tests/decor` → PASS.
- [ ] **Step 6: Commit (local)** `git add src/web/decor tests/decor && git commit -m "feat(decor): add seeded random and decor palette"`

### Task 2: Vùng cấm và độ cao hợp lệ (thuần)

**Files:**
- Create: `src/web/decor/decor-exclusion-zones.ts`
- Test: `tests/decor/decor-exclusion-zones.test.ts`

**Interfaces:**
- Consumes: `NightConfig`, `getNight` (`src/core/nights`), `groundBelow(cfg, x, z, footY)` (`src/core/terrain/terrain-queries.ts`).
- Produces:
  - `EXCLUSION_RADII = { lantern: 2.5, moteSpawn: 1.5, shadeSpawn: 2, jumpPad: 2, charm: 1.5, start: 3, obstacleMargin: 1, rectRampMargin: 1 }`
  - `isExcluded(cfg: NightConfig, x: number, z: number): boolean` - trong bán kính (≤) của bất kỳ điểm nào ở trên, hoặc trong obstacle `r + 1`, hoặc trong surface `rect`/`ramp` nới rộng 1 m mỗi phía (ramp xét trong hệ trục along/across như `terrain-queries.ts`).
  - `scatterGroundY(cfg: NightConfig, x: number, z: number): number | null` - `groundBelow(cfg, x, z, 100)`; trả `null` nếu tâm hoặc bất kỳ điểm nào trong 8 điểm trên vòng tròn bán kính 1 m quanh tâm là `null` hoặc lệch Y so với tâm > 0.5 (loại mép đảo, mép tầng).

- [ ] **Step 1: Viết test hỏng**
```ts
const n1 = getNight(1), n2 = getNight(2), n3 = getNight(3);
it('vùng cấm Đêm 1', () => {
  expect(isExcluded(n1, 0, 27)).toBe(true);     // đèn L1 (0,25), 2 m
  expect(isExcluded(n1, 0, 2.9)).toBe(true);    // điểm xuất phát
  expect(isExcluded(n1, 35.74, 11.0)).toBe(true); // điểm sinh Bóng Mực 15° r37, ~1.42 m
  expect(isExcluded(n1, 0, 29)).toBe(false);
});
it('vùng cấm cầu Đêm 2', () => {
  expect(isExcluded(n2, 30, 2.9)).toBe(true);   // rect z∈[-2,2] + 1 m
  expect(isExcluded(n2, 30, 3.5)).toBe(false);
});
it('scatterGroundY loại mép và lấy đúng tầng', () => {
  expect(scatterGroundY(n1, 20, 0)).toBe(0);
  expect(scatterGroundY(n1, 39.5, 0)).toBeNull(); // mép đảo r=40
  expect(scatterGroundY(n3, 0, 18)).toBe(3);      // tầng 1, z>0
  expect(scatterGroundY(n3, 0, -18)).toBe(0);
  expect(scatterGroundY(n3, 0, 23.5)).toBeNull(); // sát mép ngoài tầng 1 (24)
  expect(scatterGroundY(n2, 35, 5)).toBeNull();   // biển mây giữa 2 đảo
});
```
- [ ] **Step 2: Chạy** `npx vitest run tests/decor/decor-exclusion-zones.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** 2 hàm trên trong `decor-exclusion-zones.ts`.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit (local)** `feat(decor): add exclusion zones and scatter ground height`

### Task 3: Rải vị trí và vị trí vật neo (thuần)

**Files:**
- Create: `src/web/decor/decor-scatter-placement.ts`
- Test: `tests/decor/decor-scatter-placement.test.ts`

**Interfaces:**
- Consumes: Task 1 `mulberry32`; Task 2 `isExcluded`, `scatterGroundY`.
- Produces:
  - `interface ScatterOptions { seed: number; count: number; minRadiusFrac?: number; maxRadiusFrac?: number; minSpacing?: number; maxAttempts?: number }` (mặc định frac 0-1, spacing 0, attempts `count × 20`).
  - `scatterPoints(cfg: NightConfig, opts: ScatterOptions): Vec3[]` - lấy mẫu trong các surface `disc` có `y` nhỏ nhất (đảo nền; Đêm 2 có 2 đĩa, chia đều `count`), bán kính trong `[minFrac, maxFrac] × r` của đĩa đó; Y từ `scatterGroundY`; bỏ điểm `isExcluded` hoặc cách điểm đã chọn < `minSpacing`. Có thể trả ít hơn `count` khi hết lượt thử.
  - `paperLanternPositions(cfg: NightConfig, spacingM = 3): Vec3[]` - với mỗi surface `rect`: điểm ở `z = zMin - 0.3` và `z = zMax + 0.3`, `x` từ `xMin` tới `xMax` cách đều `spacingM`, `y = rect.y`. Đêm không có rect → `[]`.
  - `dockAnchor(cfg: NightConfig): { pos: Vec3; facingRad: number } | null` - Đêm 1: điểm ở mép đĩa nền góc 200° (xa các đèn), hướng ra ngoài; Đêm khác → `null`.

- [ ] **Step 1: Viết test hỏng**
```ts
it('tất định theo seed', () => {
  const o = { seed: 7, count: 200, minSpacing: 0.8 };
  expect(scatterPoints(getNight(1), o)).toEqual(scatterPoints(getNight(1), o));
  expect(scatterPoints(getNight(1), { ...o, seed: 8 })).not.toEqual(scatterPoints(getNight(1), o));
});
it('mọi điểm hợp lệ, đúng khoảng cách và vành bán kính', () => {
  for (const id of [1, 2, 3] as const) {
    const cfg = getNight(id);
    const pts = scatterPoints(cfg, { seed: 1, count: 150, minSpacing: 1, minRadiusFrac: 0.75, maxRadiusFrac: 0.95 });
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.length).toBeLessThanOrEqual(150);
    for (const [x, y, z] of pts) {
      expect(isExcluded(cfg, x, z)).toBe(false);
      expect(scatterGroundY(cfg, x, z)).toBe(y);
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
      expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][2] - pts[j][2])).toBeGreaterThanOrEqual(1);
  }
});
it('đèn giấy dọc cầu Đêm 2', () => {
  const p = paperLanternPositions(getNight(2));
  expect(p.length).toBeGreaterThan(0);
  expect(p.every(([x, , z]) => x >= 26 && x <= 44 && Math.abs(Math.abs(z) - 2.3) < 1e-9)).toBe(true);
  expect(paperLanternPositions(getNight(1))).toEqual([]);
});
it('bến gỗ chỉ ở Đêm 1, tại mép đảo', () => {
  const d = dockAnchor(getNight(1))!;
  expect(Math.hypot(d.pos[0], d.pos[2])).toBeCloseTo(40, 5);
  expect(dockAnchor(getNight(2))).toBeNull();
});
```
- [ ] **Step 2: Chạy** `npx vitest run tests/decor/decor-scatter-placement.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** 3 hàm trên.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit (local)** `feat(decor): add deterministic scatter placement and anchored prop positions`

### Task 4: Địa hình, không khí và vòng sáng quanh đèn

**Files:**
- Create: `src/web/decor/island-terrain-meshes.ts`, `src/web/decor/decor-atmosphere.ts`, `src/web/decor/decor-lantern-glow-ring.ts`
- Test: `tests/decor/decor-atmosphere.test.ts`

**Interfaces:**
- Consumes: Task 1 `DECOR_PALETTE`, `mulberry32`; Task 3 `scatterPoints`; Task 8 Phase 2 terrain builder (tên ghi ở Task 1 Step 1).
- Produces:
  - `buildTerrainLayer(cfg: NightConfig): THREE.Group` - gọi builder của Task 8; Đêm/phần nào Task 8 thiếu thì tự vẽ (disc → Cylinder, annulus nửa → RingGeometry cắt + extrude, rect → Box gỗ, ramp → Box nghiêng, obstacle → Cylinder).
  - `ambientIntensityFor(lit: number, total: number): number` = `0.15 + 0.55 × clamp(lit, 0, total) / total`; `total <= 0` → `0.15`.
  - `buildAtmosphereLayer(scene: THREE.Scene, cfg: NightConfig, lowQuality: boolean): { group: THREE.Group; setLitRatio(r: number): void; update(dtS: number): void }` - đặt `scene.background` và `scene.fog = new THREE.Fog(0x0e1430, 60, 190)`; sao (Points), trăng, các plane sương `#1B2350` trong suốt cuộn chậm quanh mép đảo, Ambient + Hemisphere (cường độ theo `ambientIntensityFor`).
  - `buildLanternGlowLayer(cfg: NightConfig, seed: number): { group: THREE.Group; setLit(ids: string[]): void; update(dtS: number): void }` - mỗi đèn: hạt sáng additive `#FFE58A` + đĩa vòng sáng lan ra bán kính 6 m trong ~1 s khi chuyển sang sáng; id lạ hoặc trùng bị bỏ qua. Cỏ trong 6 m đổi màu do Task 5 đọc qua `isLitNear(x, z): boolean` được export từ handle này.

- [ ] **Step 1: Viết test hỏng**
```ts
it('ambientIntensityFor', () => {
  expect(ambientIntensityFor(0, 5)).toBeCloseTo(0.15);
  expect(ambientIntensityFor(5, 5)).toBeCloseTo(0.70);
  expect(ambientIntensityFor(9, 5)).toBeCloseTo(0.70);
  expect(ambientIntensityFor(-1, 5)).toBeCloseTo(0.15);
  expect(ambientIntensityFor(0, 0)).toBeCloseTo(0.15);
});
it('glow layer bỏ qua id lạ/trùng', () => {
  const g = buildLanternGlowLayer(getNight(1), 1);
  expect(() => g.setLit(['L1', 'L1', 'X9'])).not.toThrow();
  expect(g.isLitNear(0, 25)).toBe(true);
  expect(g.isLitNear(0, -20)).toBe(false);
});
it('terrain Đêm 3 có tháp', () => {
  const t = buildTerrainLayer(getNight(3));
  expect(t.children.length).toBeGreaterThan(0);
});
```
(Signature glow chuẩn: `{ group; setLit(ids: string[]): void; isLitNear(x: number, z: number): boolean; update(dtS: number): void }`.)
- [ ] **Step 2: Chạy** `npx vitest run tests/decor/decor-atmosphere.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** 3 file trên (geometry dùng chung, không tạo trong vòng `update`).
- [ ] **Step 4: Chạy lại** → PASS; `npx tsc --noEmit` → không lỗi.
- [ ] **Step 5: Commit (local)** `feat(decor): add terrain, atmosphere and lantern glow layers`

### Task 5: Trang trí riêng từng Đêm và `buildIslandDecor`

**Files:**
- Create: `src/web/decor/decor-props-per-night.ts` (nếu > 200 dòng, tách `decor-props-shared.ts` cho cỏ/đá/cát), `src/web/decor/index.ts`
- Test: `tests/decor/build-island-decor.test.ts`

**Interfaces:**
- Consumes: Task 3 `scatterPoints`, `paperLanternPositions`, `dockAnchor`; Task 4 các layer.
- Produces:
  - `buildPropsLayer(cfg: NightConfig, seed: number, lowQuality: boolean, isLitNear: (x: number, z: number) => boolean): { group: THREE.Group; refreshLitTint(): void; update(dtS: number): void }`. Nội dung theo spec §5.4: chung (cỏ instanced đung đưa, đá, vành cát), Đêm 1 (bến gỗ + 2-3 thuyền thúng tại `dockAnchor`, cọc tre phơi lưới, cột mốc đá cạnh đèn), Đêm 2 (cau ở vành 0.75-0.95, đèn giấy tại `paperLanternPositions`, giếng + chum), Đêm 3 (mái đình + chuông trên tháp, bậc đá ốp vách, cây đa ở z < 0, cờ/phướn, lư hương chân 2 dốc). `lowQuality` giảm mật độ cỏ còn ~40%.
  - `type DecorLayer = 'terrain' | 'props' | 'atmosphere' | 'glow'`
  - `interface IslandDecorHandle { setLitLanterns(litIds: string[]): void; setLayerVisible(layer: DecorLayer, v: boolean): void; update(dtS: number): void; dispose(): void }`
  - `buildIslandDecor(scene: THREE.Scene, nightId: 1 | 2 | 3, opts?: { seed?: number; lowQuality?: boolean }): IslandDecorHandle` - seed mặc định `20261120`.

- [ ] **Step 1: Viết test hỏng**
```ts
it('build rồi dispose trả scene về như cũ', () => {
  for (const id of [1, 2, 3] as const) {
    const scene = new THREE.Scene();
    const before = scene.children.length;
    const h = buildIslandDecor(scene, id);
    expect(scene.children.length).toBeGreaterThan(before);
    h.dispose();
    expect(scene.children.length).toBe(before);
  }
});
it('bật/tắt lớp và cập nhật đèn không lỗi', () => {
  const h = buildIslandDecor(new THREE.Scene(), 2);
  h.setLayerVisible('props', false);
  expect(() => { h.setLitLanterns(['L1', 'L6']); h.update(1 / 60); }).not.toThrow();
  h.dispose();
});
```
- [ ] **Step 2: Chạy** `npx vitest run tests/decor/build-island-decor.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** `buildPropsLayer` và `buildIslandDecor` (`dispose` duyệt cây, gọi `geometry.dispose()` / `material.dispose()`, gỡ `scene.fog`/`background` do decor đặt).
- [ ] **Step 4: Chạy** `npx vitest run tests/decor` và `npx tsc --noEmit` → PASS, không lỗi.
- [ ] **Step 5: Commit (local)** `feat(decor): add per-night props and buildIslandDecor entry`

### Task 6: Trang demo

**Files:**
- Create: `decor-demo.html`, `src/web/decor-demo/decor-demo-main.ts`, `src/web/decor-demo/decor-demo-control-panel.ts`, `src/web/decor-demo/parse-decor-demo-query.ts`
- Test: `tests/decor/parse-decor-demo-query.test.ts`

**Interfaces:**
- Consumes: Task 5 `buildIslandDecor`, `IslandDecorHandle`, `DecorLayer`; `getNight`; `createLanternModel(withLight)` (`src/web/models/lantern-model.ts`, chỉ import).
- Produces: `parseDecorDemoQuery(search: string): { night: 1 | 2 | 3; lit: number }` - `night` không hợp lệ → 1; `lit` không phải số nguyên → 0; kẹp `lit` trong `[0, getNight(night).lanterns.length]`.

- [ ] **Step 1: Viết test hỏng**
```ts
it('parseDecorDemoQuery', () => {
  expect(parseDecorDemoQuery('?night=2&lit=3')).toEqual({ night: 2, lit: 3 });
  expect(parseDecorDemoQuery('?night=9&lit=-1')).toEqual({ night: 1, lit: 0 });
  expect(parseDecorDemoQuery('?night=3&lit=99')).toEqual({ night: 3, lit: 7 });
  expect(parseDecorDemoQuery('?night=abc&lit=x')).toEqual({ night: 1, lit: 0 });
  expect(parseDecorDemoQuery('')).toEqual({ night: 1, lit: 0 });
});
```
- [ ] **Step 2: Chạy** `npx vitest run tests/decor/parse-decor-demo-query.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** `parseDecorDemoQuery`.
- [ ] **Step 4: Cài đặt trang demo** theo layout spec §5.5:
  - `decor-demo.html`: `<canvas>` toàn màn hình + `<aside id="panel">` bên phải + `<div id="fps">`, nạp `/src/web/decor-demo/decor-demo-main.ts`.
  - `decor-demo-main.ts`: tạo `WebGLRenderer({ antialias: true })` trong try/catch (lỗi → ghi "Trình duyệt không hỗ trợ WebGL" vào body); camera `PerspectiveCamera(60, aspect, 0.1, 400)` + `OrbitControls`; đặt `createLanternModel(false)` tại các đèn để tham chiếu và `setLit` theo `lit` (lấy `lit` đèn đầu theo thứ tự id); vòng `requestAnimationFrame` gọi `handle.update(dt)`; FPS trung bình trượt 1 s; `resize` cập nhật aspect và `setSize`.
  - `decor-demo-control-panel.ts`: `createControlPanel(root: HTMLElement, init: { night: 1|2|3; lit: number }, onChange: (s: { night: 1|2|3; lit: number; layers: Record<DecorLayer, boolean> }) => void): void` - 3 nút Đêm, slider đèn sáng (max = số đèn của Đêm), 4 checkbox lớp.
  - Khi đổi Đêm: `dispose()` handle cũ + gỡ model đèn cũ, build mới, **áp lại** trạng thái 4 lớp và số đèn sáng hiện tại.
- [ ] **Step 5: Kiểm tra** `npx vitest run tests/decor` PASS; `npm run build` PASS (demo không có trong `dist/`: `ls dist` không có `decor-demo.html`); `npm run dev` rồi mở `http://localhost:5173/decor-demo.html?night=3&lit=7` thấy đảo Đêm 3 đủ trang trí.
- [ ] **Step 6: Commit (local)** `feat(decor): add standalone decor demo page`

### Task 7: Bằng chứng và kiểm tra không ảnh hưởng

**Files:**
- Create: `evidence/decor-demo/*.png`, `evidence/decor-demo/README.md`

- [ ] **Step 1: Kiểm tra headless không đổi** - trước khi bắt đầu Task 1 (hoặc từ commit trước Task 1 qua `git stash`/`git worktree`), chạy `headless_cmd` trong `game.contract.json` với `--seed 1 --night 1 --ticks 3600 --out before.jsonl`; sau Task 6 chạy lại ra `after.jsonl`. Kỳ vọng: hai file giống hệt (`diff` rỗng). Lặp với `--night 2` và `--night 3`.
- [ ] **Step 2: Toàn bộ test** `npm test` → PASS (cả test cũ).
- [ ] **Step 3: Chỉ có file mới** `git diff --stat <commit-trước-Task-1>..HEAD --diff-filter=M` → rỗng.
- [ ] **Step 4: Ảnh chụp** 6 ảnh: `?night={1,2,3}&lit=0` và `lit=max`, cửa sổ 1280×720, lưu `evidence/decor-demo/night{N}-lit{K}.png`.
- [ ] **Step 5: FPS** - ghi FPS trung bình mỗi Đêm với mọi lớp bật vào `evidence/decor-demo/README.md`; kỳ vọng ≥ 30. Nếu thấp: giảm mật độ cỏ/hạt hoặc bật `lowQuality` mặc định rồi đo lại.
- [ ] **Step 6: Commit (local)** `docs(decor): add decor demo evidence`

## Ghi chú thực hiện
- (Task 1 Step 1 ghi tên export thật của `palette.ts` / `night-terrain-meshes.ts` tại đây.)
