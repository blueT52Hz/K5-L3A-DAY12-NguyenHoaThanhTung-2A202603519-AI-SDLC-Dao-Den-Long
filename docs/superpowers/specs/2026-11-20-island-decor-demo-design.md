# Thiết kế: Trang trí đảo + trang demo riêng (Island Decor Demo)

Ngày: 2026-11-20 · Trạng thái: chờ duyệt · Thực hiện: **sau khi Phase 2 hoàn tất (tag `phase-2`)**

## 1. Mục đích và lý do
- Làm đồ họa đảo đẹp hơn (trang trí, không khí, ánh sáng) cho cả 3 Đêm.
- Dựng **tách riêng**, **chưa gắn vào luồng game chính**, xem được qua **trang demo ở tab khác**. Khi ưng mới tích hợp (việc tích hợp là ticket sau, không thuộc thiết kế này).
- Ưu tiên số 1: **ảnh hưởng codebase hiện có ít nhất**.

## 2. Mục tiêu / Không làm / Phản mục tiêu
**Mục tiêu**
- Module trang trí trong `src/web/decor/` dựng được đảo + trang trí cho Đêm 1/2/3 từ `NightConfig` (`getNight(id)` trong `src/core/nights/index.ts`).
- Trang `decor-demo.html` ở gốc repo: xoay camera, chọn Đêm, kéo số đèn sáng, bật/tắt từng lớp, hiện FPS.
- Logic rải trang trí là hàm thuần, có test Vitest.

**Không làm**
- Không sửa `index.html`, `src/web/main.ts`, `game-boot.ts`, `scene-sync.ts`, `island-environment.ts`, các model hiện có, `vite.config.ts`, `package.json`.
- Không tích hợp vào game, không thêm demo vào `dist` (chỉ chạy dev).
- Không thêm thư viện mới (không postprocessing/bloom thật; dùng sprite additive).
- Không âm thanh, không gameplay mới.

**Phản mục tiêu (coi là thất bại dù chạy được)**
- Bất kỳ thay đổi nào ở `src/core`, `src/headless` hoặc đầu ra headless.
- Test hiện có đỏ, `npm run build` (gồm `tsc --noEmit`) lỗi.
- Trang trí che đèn, điểm sinh, bục nhảy, cầu, dốc, hoặc vật rải lơ lửng giữa trời (vật neo theo §5.3 là ngoại lệ có chủ đích).
- Demo < 30 FPS trung bình ở 1280×720 với mọi lớp bật (DoD Phase 2).

## 3. Ràng buộc
- Three.js 0.170, Vite 8, TypeScript, Vitest (đã có). File < 200 dòng, tên kebab-case.
- `src/web/decor/` chỉ **đọc** (import, không sửa) từ: `three`, `src/core/nights`, `src/core/terrain/terrain-queries.ts` (`groundBelow` để lấy Y, tránh chép lại logic dốc/tầng), và sản phẩm của Phase 2 Task 8: `src/web/models/palette.ts`, `src/web/models/night-terrain-meshes.ts`. *(Quyết định của người viết: thiết kế chạy sau Phase 2, nên dùng lại thay vì viết trùng - DRY. Nếu khi thực hiện tên/API Task 8 khác, dùng tên thật; nếu Task 8 không có terrain cho Đêm nào thì `island-terrain-meshes.ts` chỉ bù phần thiếu.)*
- `@types/three` 0.187 lệch `three` 0.170: dùng API OrbitControls/InstancedMesh phổ biến, không dùng API mới hơn 0.170.
- Rải ngẫu nhiên dùng PRNG riêng có seed cố định (không dùng RNG gameplay, không `Math.random`) để mỗi lần mở trông giống nhau.
- Không shadow (giống `render-quality.ts`). Vật lặp lại dùng `InstancedMesh`.
- Màu theo bảng màu chuẩn Phase 2 (ticket `D:\VinAI\Day12\phase-2.html`, lệch ≤ 10% mỗi kênh), ưu tiên lấy từ `palette.ts` của Task 8; nếu thiếu thì dùng bảng dưới. Lưu ý: game hiện dùng nền/fog `#1a1033`; việc đổi màu game hiện tại thuộc ticket tích hợp.

| Dùng cho | Hex |
|---|---|
| Trời đêm / sương | `#0E1430` / `#1B2350` |
| Cỏ / cát / gỗ / biển mây | `#2F5D50` / `#C9B48A` / `#6B4A2F` / `#12384A` |
| Đèn sáng / lõi / đèn tắt | `#FFB347` / `#FFE9B0` / `#5B5F6E` |
| Đom đóm lõi / quầng | `#FFF6C2` / `#FFE58A` |
| Bóng Mực thân / viền / choáng | `#120A1A` / `#7A3CFF` / `#3A3450` |
| Áo Mây / khăn Mây, Bùa Gió | `#E8E2D0` / `#C8102E` |
| Viền vàng, điểm số / Gió Lạc | `#F2C14E` / `#8FA3B8` |
| UI nguy hiểm / chữ UI | `#FF5A5F` / `#F5F1E6` |

Màu prop khác (đá, mái đình, chuông đồng, lá cau...) do người thực hiện chọn, hài hòa với bảng trên.

## 4. Các cách đã cân nhắc
| Cách | Đánh đổi | Kết quả |
|---|---|---|
| **1. Trang `decor-demo.html` + `src/web/decor/` mới** | 0 file cũ bị sửa (Vite dev tự phục vụ HTML ở gốc); demo không có trong `dist` | **Được chọn** |
| 2. Query `?decor=1` trên `index.html` | Phải sửa `main.ts` (luồng chính) | Loại: ngược mục tiêu |
| 3. Mini app Vite riêng `sandbox/` | Cô lập nhưng thêm config/cách chạy riêng | Loại: dư thừa |

Về dữ liệu đảo, đã chọn **đọc `NightConfig` thật của 3 Đêm** (thay vì chỉ làm trên đảo Đêm 1) để trang trí đặt đúng vùng và tái dùng được khi tích hợp.

## 5. Thiết kế

### 5.1 Cấu trúc file (tất cả mới)
```
decor-demo.html                                   # entry demo, nạp /src/web/decor-demo/decor-demo-main.ts
src/web/decor/
  decor-palette.ts                                # re-export palette.ts (Task 8) + màu riêng của prop
  seeded-random.ts                                # PRNG mulberry32(seed)
  decor-exclusion-zones.ts                        # (thuần) vùng cấm + kiểm tra điểm có trên mặt đi được, độ cao Y
  decor-scatter-placement.ts                      # (thuần) sinh danh sách vị trí cho từng loại trang trí
  island-terrain-meshes.ts                        # bọc night-terrain-meshes.ts (Task 8) thành lớp 'terrain'; chỉ tự vẽ phần Task 8 thiếu
  decor-props-per-night.ts                        # bộ trang trí riêng: Bến / Cau / Chuông
  decor-atmosphere.ts                             # nền trời, fog, sao, trăng, sương mép đảo, hạt sáng
  decor-lantern-glow-ring.ts                      # hiệu ứng "đảo sáng dần" quanh đèn đã sáng
  index.ts                                        # buildIslandDecor(scene, nightId, opts) -> handle
src/web/decor-demo/
  decor-demo-main.ts                              # renderer, OrbitControls, vòng render, FPS
  decor-demo-control-panel.ts                     # panel DOM: chọn Đêm, slider đèn sáng, checkbox lớp
tests/decor/
  decor-scatter-placement.test.ts
  decor-exclusion-zones.test.ts
```
OrbitControls lấy từ `three/examples/jsm/controls/OrbitControls.js` (có sẵn trong gói `three`).

### 5.2 API chính
```ts
type DecorLayer = 'terrain' | 'props' | 'atmosphere' | 'glow';
interface IslandDecorHandle {
  setLitLanterns(litIds: string[]): void;   // cập nhật ánh sáng môi trường + vòng sáng quanh đèn
  setLayerVisible(layer: DecorLayer, v: boolean): void;
  update(dtS: number): void;                // hoạt ảnh: cỏ đung đưa, sương trôi, hạt sáng
  dispose(): void;                          // gỡ khỏi scene, giải phóng geometry/material
}
function buildIslandDecor(scene: THREE.Scene, nightId: 1|2|3, opts?: { seed?: number; lowQuality?: boolean }): IslandDecorHandle;
```
Đổi Đêm trong demo = `dispose()` rồi `buildIslandDecor` lại.

### 5.3 Vùng cấm và đặt vật (phần thuần, có test)
Có 2 loại vật:
- **Vật rải (scatter)**: cỏ, đá, cây, giếng... Điểm hợp lệ: có mặt đất bên dưới (Y lấy từ `groundBelow`), cách mép surface ≥ 1 m, ngoài mọi vùng cấm.
- **Vật neo (anchored)**: vị trí cố định theo dữ liệu, được phép nằm ngoài mặt đi được: bến gỗ + thuyền thúng (neo ở mép đảo Đêm 1, nhô ra ngoài r = 40), đèn lồng giấy dọc cầu (Đêm 2, đặt ở z = ±2.3 trên cọc cắm xuống biển mây, ngoài rect), mái đình/chuông (bọc tháp Đêm 3), bậc đá ốp vách, lư hương chân dốc. Vật neo không chặn được điểm nào trên mặt đi được. *(Quyết định của người viết.)*

Vùng cấm cho vật rải (khoảng cách XZ): đèn 2.5 m, điểm sinh đom đóm 1.5 m, điểm sinh Bóng Mực 2 m, bục nhảy 2 m, bùa 1.5 m, điểm xuất phát 3 m, obstacle r + 1 m, surface `rect` (cầu) và `ramp` + 1 m lề. *(Bán kính điểm sinh Bóng Mực: quyết định của người viết.)*
- Vật lớn (cau, đa) đặt ở vành 75-95% bán kính đảo, ngoài vùng cấm (gồm điểm sinh Bóng Mực ở vành ngoài).
- Cùng seed + cùng Đêm → cùng danh sách vị trí (tất định).

### 5.4 Nội dung trang trí
- **Chung**: cỏ instanced (đung đưa bằng shader nhỏ), đá cuội, vành cát ở mép đảo, sương đáy đảo (vài plane trong suốt cuộn chậm), bầu trời sao + trăng, fog `#0E1430`, hạt sáng quanh đèn đã sáng (`#FFE58A`).
- **Đêm 1 - Đảo Bến**: bến gỗ nhô ra biển mây, 2-3 thuyền thúng, cọc tre phơi lưới, cột mốc đá cạnh đèn.
- **Đêm 2 - Đảo Cau**: hàng cau vòng ngoài mỗi đảo, đèn lồng giấy treo dọc hai bên cầu (ngoài phạm vi rect), giếng và chum nước.
- **Đêm 3 - Đảo Chuông**: mái đình + chuông trên tháp (bọc quanh obstacle, không đổi kích thước logic), bậc đá ốp vách tầng, cây đa ở tầng 0 phía z < 0, cờ/phướn, lư hương ở chân 2 dốc.
- **Đảo sáng dần**: cường độ ánh sáng môi trường = `0.15 + 0.55 × lit/total`; quanh mỗi đèn đã sáng, cỏ trong 6 m chuyển từ xám sang màu thật + vòng sáng lan ra (~1 s).

### 5.5 Trang demo
```
┌───────────────────────────────────────────┬──────────────┐
│                                           │ Đêm: (1)(2)(3)│
│        canvas 3D (OrbitControls)          │ Đèn sáng: ──●─ │
│                                           │ ☑ Địa hình    │
│                                           │ ☑ Trang trí   │
│                                           │ ☑ Không khí   │
│ FPS 58                                    │ ☑ Vòng sáng   │
└───────────────────────────────────────────┴──────────────┘
```
- Mở: `npm run dev` → `http://localhost:5173/decor-demo.html`.
- Đèn hiển thị bằng `lantern-model.ts` có sẵn chỉ để tham chiếu vị trí (import vào demo, không sửa file đó).
- Query `?night=2&lit=3` để mở thẳng một trạng thái (tiện chụp ảnh bằng chứng).

## 6. Kiểm chứng
- `npm test` xanh (gồm test mới); `npm run build` xanh; headless không đổi (chạy lại 1 scenario Phase 1, so output giống hệt trước/sau).
- Ảnh chụp demo 3 Đêm × (0 đèn, tất cả đèn) lưu vào `evidence/decor-demo/`.
- FPS trung bình ≥ 30 ở 1280×720, mọi lớp bật, ghi lại số đo.
- `git diff --stat` chỉ có file mới (không file cũ nào bị sửa).

## 7. Để lại cho người thực hiện
- Hình dạng cụ thể từng prop (số poly, tỉ lệ), mật độ cỏ, tốc độ hoạt ảnh: tự chọn, giữ FPS.
- Cách vẽ ramp/annulus nửa (`zMinExclusive`) bằng geometry nào: tự chọn, miễn khớp dữ liệu.
- Chế độ `lowQuality` giảm mật độ cỏ/hạt bao nhiêu: tự chọn.

## 8. Điều kiện tiên quyết
- Phase 2 đã xong (có tag `phase-2`), đặc biệt Task 8 (`palette.ts`, `night-terrain-meshes.ts`). Trước khi bắt đầu: xác minh tên file/API thật của Task 8.

## 9. Câu hỏi còn mở
- (chưa có)
