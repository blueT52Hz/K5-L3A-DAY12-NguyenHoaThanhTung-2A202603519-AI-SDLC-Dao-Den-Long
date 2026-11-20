# Bang chung demo trang tri dao (Dem 1)

## Cach mo demo
`npm run dev` roi mo http://localhost:5173/decor-demo.html?lit=5
(`lit` = so den long da sang, 0 den 5; co the keo thanh truot trong bang dieu khien).

## Anh chup (1280x720, Dem 1)
- `night1-lit0.png` (`?lit=0`): troi dem co sao va trang trong khung hinh, dao toi voi co xanh duc, vien cat am, suong mo tham duoi vien dao (khong con o chu nhat), cau tau go va thuyen thung (da phong to) o ben trai, den long tat (khong co vong sang).
- `night1-lit5.png` (`?lit=5`): cung canh, 5 den long sang voi vong sang vang quanh moi den, co quanh den chuyen sang xanh la.
- Keo thanh truot ve 0 sau khi `lit=5`: vong sang va co tat het (da kiem tra, anh tam).

Pham vi tam thoi: chi Dem 1 (CLI headless hien chi ho tro `--night 1`).

## FPS
- lit=0: 61 FPS; lit=5: 61 FPS (doc tu phan tu `#fps` sau ~5 s).
- Do trong trinh duyet headless/automation (chrome-devtools), co the khac tren may that.
- Console: khong co thong bao nao.

## Kiem tra khong anh huong
- Headless: `node dist-headless/headless.mjs --seed 1 --night 1 --ticks 3600` sau `npm run build`, so voi baseline truoc Task 1: `diff` rong (giong het, 76 dong). Dem 2/3: CLI tu choi (`only --night 1 is supported`), bo qua.
- `git diff --stat 9292267..HEAD --diff-filter=M`: rong (khong sua file cu). `--diff-filter=D`: rong.
- `npm test`: 21 file, 125 test, tat ca PASS.
