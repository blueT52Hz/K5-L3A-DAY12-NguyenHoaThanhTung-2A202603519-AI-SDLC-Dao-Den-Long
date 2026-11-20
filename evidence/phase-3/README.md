# Evidence Phase 3 (contract v1.2)

Sinh bang `npm run build && node scripts/generate-evidence-phase-3.mjs` (JSONL, determinism, timing, vitest) va Playwright (anh, FPS). Khong sua tay.

| File | Chung minh |
|---|---|
| `fuel-out.jsonl` | den het dau tat, event `lantern_out` |
| `refuel.jsonl` | chau dau bang dom dom, event `refuel` |
| `relight.jsonl` | den tung sang chi can 5 dom dom, `lantern_lit` voi `relight: true` |
| `drain.jsonl` | Bong Muc `drain` hut den yeu, event `fuel_drain` cung gia tri dau trong cung tick |
| `win-dawn.jsonl` | thang o binh minh `dawn_survived` (+ thuong binh minh) |
| `lose-dawn.jsonl` | thua `dawn` khi it hon ceil(0.6 x tong) den sang |
| `default-night{1,2,3}-seed42-run{1,2}.jsonl`, `determinism.txt` | cung seed + input cho output byte-identical (3 Dem) |
| `headless-timing.txt` | headless chay du 3 Dem duoi 30 s moi Dem |
| `scenarios/` | scenario + inputs dung de sinh cac file tren |
| `vitest.txt` | ket qua `npm test` xanh tai commit nay |
| `fps.txt` | FPS trung binh moi Dem (headless Chromium, SwiftShader, thap hon GPU that) |
| `screenshots/lantern-lit-fuel-bar.png` | den sang co thanh dau, HUD `Den sang k/tong (can n)` |
| `screenshots/lantern-low-fuel.png` | den dau < 30: thanh dau do, canh bao "Den sap can dau!" |
| `screenshots/colorblind-shade-warning.png` | che do de phan biet: vien/mat Bong Muc `#00B3FF`, canh bao trang kem bieu tuong |
| `screenshots/lantern-unlit-squashed.png` | den tat (da tung sang) bi be/rach, khong co thanh dau |
| `screenshots/01-menu.png`, `night{1,2,3}-intro/hud.png`, `night1-pause.png` | menu, intro, HUD 3 Dem, tam dung |

Anh den dung `?scenario=fuel-demo&focus=1..5[&shade=1]` (chi web, `src/web/dev-fuel-demo-scenario.ts`).
