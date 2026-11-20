# Bang chung demo trang tri dao (Dem 1)

## Cach mo demo
`npm run dev` roi mo http://localhost:5173/decor-demo.html?lit=5
(`lit` = so den long da sang, 0 den 5; co the keo thanh truot trong bang dieu khien).

## Anh chup (1280x720, Dem 1)
- `night1-lit0.png` (`?lit=0`): dao toi, co moc, vat trang tri, den long tat (chi con than den, khong co vong sang), cau tau go ben trai, troi xanh dam.
- `night1-lit5.png` (`?lit=5`): cung canh nhung 5 den long sang, vong sang vang quanh moi den chieu len co va da, vien dao sang hon.

Pham vi tam thoi: chi Dem 1 (CLI headless hien chi ho tro `--night 1`).

## FPS
- lit=0: 61 FPS; lit=5: 61 FPS (doc tu phan tu `#fps` sau ~5 s).
- Do trong trinh duyet headless/automation (chrome-devtools), co the khac tren may that.
- Console: khong co loi (chi 404 `favicon.ico` o lan tai dau).

## Kiem tra khong anh huong
- Headless: `node dist-headless/headless.mjs --seed 1 --night 1 --ticks 3600` sau `npm run build`, so voi baseline truoc Task 1: `diff` rong (giong het, 76 dong). Dem 2/3: CLI tu choi (`only --night 1 is supported`), bo qua.
- `git diff --stat 9292267..HEAD --diff-filter=M`: rong (khong sua file cu). `--diff-filter=D`: rong.
- `npm test`: 19 file, 118 test, tat ca PASS.
