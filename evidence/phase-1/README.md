# Evidence Phase 1

Tất cả file ở đây (trừ `scenarios/` và `screenshots/`) do script sinh ra bằng cách chạy thật, không sửa tay.

Sinh lại bằng một lệnh (sau `npm ci && npm run build`):

```
node scripts/generate-evidence.mjs
```

| File | Nội dung |
|---|---|
| `scenarios/<tên>.scenario.json`, `<tên>.inputs.json` | Đầu vào (viết tay) cho từng tình huống |
| `pickup.jsonl` | Đi tới đom đóm: event `mote_picked`, +10 điểm |
| `deposit-lit.jsonl` | Đứng gần L1 mang 5 đom đóm, nhấn interact: `deposit` rồi `lantern_lit`, +100 |
| `pulse.jsonl` | Pulse với 2 Bóng Mực trong 6m: `pulse` với `stunned_ids` S1,S2, +40 |
| `hit.jsonl` | Bóng Mực chạm khi mang 4: `player_hit`, flames 2, dropped 2 |
| `win.jsonl` | 4 đèn đã sáng, thắp đèn thứ 5: `game_over won/all_lit`, kèm thưởng giây/máu |
| `dawn.jsonl` | `time_left_s = 1`: `game_over lost/dawn` ở tick 60 |
| `default-seed42-run1.jsonl`, `...run2.jsonl` | Seed 42, 1200 tick mặc định, chạy 2 lần |
| `determinism.txt` | Kết quả so sánh byte hai lần chạy ở trên |
| `vitest.txt` | Output `npm test` |
| `screenshots/` | Ảnh chụp bản web (Chrome, qua `npm run preview`): màn bắt đầu và HUD khi di chuyển/nhặt đom đóm |

Mỗi tình huống chạy qua `node dist-headless/headless.mjs --seed 1 --night 1 --scenario ... --inputs ... --ticks N --out ...`. Script thoát mã khác 0 nếu hai lần chạy khác nhau hoặc test fail.

## Ghi chú về phiên bản contract

Các file JSONL ở đây do contract v1.0 sinh (tag `phase-1`). Dưới luật v1.2 trở lên (Phase 3 và 4: dầu đèn, thắng ở bình minh, điểm mới, sửa recoil và hết choáng) chạy lại cùng lệnh cho output khác, và một số kỳ vọng trong các file này (vd `all_lit`, điểm theo đom đóm) không còn đúng. Không sinh lại để giữ nguyên bằng chứng của đúng phase đó; muốn xem bản cũ: `git checkout phase-1`.
