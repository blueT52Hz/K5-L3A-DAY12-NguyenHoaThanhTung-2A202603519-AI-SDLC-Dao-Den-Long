# Bang chung demo trang tri dao (Dem 1-3) - ban nang cap hinh anh

## Cach mo demo
`npm run dev` roi mo http://localhost:5173/decor-demo.html?lit=5
- `lit` = so den long da sang (0..5).
- `cam=overview|dock|trees` = goc may quay dat san (mac dinh overview).
- `bloom=0` = tat UnrealBloomPass (render thang, van ACES + sRGB).

## Thay doi chinh
- Dia hinh: mat co nhap nho (nhieu sin, toi da ~0.24 m, phang trong 3 m quanh den/diem xuat phat), mau co bien thien theo dinh, vien cat doc xuong mep, vach da nhieu tang (flatShading), re cay treo va da troi duoi dao.
- Cay coi: dua/cau than cong co dot, 9 la kep ru; bui tre co dot va chum la; cay tan tron 5 khoi la 3 tong xanh, day toi; bui duoi goc cay; cum hoa nhieu mau; tuft co 5 la gradient. Co lac nhe theo gio (update).
- Lang chai: cau tau go (van lech mau, dam, coc, lan can day thung), cong tre treo den giay do, thuyen thung dan (Lathe, vanh dam), luoi tren khung tre, 2 nha tranh co cua so am, thung go va chum sanh.
- Khi quyen: bau troi gradient, sao lap lanh, trang tron (billboard) co quang, bien may khoi phong nhap nho, dom dom (Points + additive shader).
- Demo: ACES + sRGB + UnrealBloomPass (EffectComposer) + resize; khung may moi.

## Anh chup (1280x720)
- `night1-lit0.png` (`?lit=0&bloom=0`): dao toi, chi cau tau va nha tranh am.
- `night1-lit5.png` (`?lit=5&bloom=0`): 5 den sang, co quanh den am.
- `night1-dock-closeup.png` (`?lit=5&bloom=0&cam=dock`): can canh cau tau, thuyen thung, luoi, nha, chum.
- `night1-lit5-bloom.png` (`?lit=5`, bloom bat): xem ghi chu ben duoi.

Ghi chu: trinh duyet automation dung de chup (GPU bao "Adreno 612" qua ANGLE) render moi render-target bi lech/ho vuong (ca khi chi co RenderPass + OutputPass), nen anh co bloom co vet soc va khoi vuong. Ma bloom dung chuan three r170; can kiem tra lai tren may that. Anh chinh chup voi `bloom=0`.

## FPS (#fps, sau ~5 s)
- lit=0, bloom=0: 61 FPS; lit=5, bloom=0: 61 FPS; lit=5 bloom bat: ~47 FPS.
- Console: khong co loi.

## Dem 2, Dem 3 va nhan vat (cap nhat)
Mo: `?night=1|2|3&lit=N|max` (vd `?night=2&lit=max&bloom=0`). Nut "Dem 1/2/3" dung lai toan bo (decor + den + nhan vat + goc may). O "Nhan vat" bat/tat May.
- Camera: `cam=overview` (moi dem), Dem 2 `cam=bridge|village`, Dem 3 `cam=temple|banyan`, moi dem `cam=follow` (bam theo May).
- Dia hinh chung cho moi dem, dung theo cfg.surfaces: mat co + vien cat cho moi dia goc, vach da nhieu tang theo ban kinh; Dem 3: mat tang co vien lat da, tuong da xep vien op, bac da tren 2 doc; Dem 2: cau tre (ong tre ngang, dam, day buoc).
- Dem 2 "Dao Cau": hang cau 2 vong ngoai moi dao (1/3 than co day trau), cot tre + den giay do treo 2 ben cau (z = +-2.3, paperLanternPositions) + lan can + day den nho, gieng lang + chum nuoc, ao sen (la, hoa), co/hoa/tre/cay/bui chung, dom dom tren ca hai dao.
- Dem 3 "Dao Chuong": thap chuong (be da bat giac, 4 cot son do, 2 tang mai cong kieu dinh, dau dao vang, chuong dong dung dua), cay da lon re phu o tang 0 (z < 0), phuon tren 3 tang lay theo gio (gio manh), 4 lu huong o chan 2 doc, cay coi chung.
- Khi quyen can giua theo cac dia cua dem (may, suong, dom dom, bau troi, fog).
- May: di vong (Dem 1 vong cu; Dem 2 r 14 quanh dao A; Dem 3 r 32.8 tren tang 0, tranh den va doc), chan theo do cao dia hinh.

Anh: `night2-lit6.png` (`?night=2&lit=max&bloom=0`), `night3-lit7.png` (`?night=3&lit=max&bloom=0`), `night1-character.png` (`?night=1&lit=max&bloom=0&cam=follow`).

FPS (1280x720, sau ~5 s, overview, lit=max): Dem 1 ~60 / Dem 2 ~45 / Dem 3 ~50 (bloom=0); bloom bat: ~46 / ~39 / ~47. Console: khong co loi.
