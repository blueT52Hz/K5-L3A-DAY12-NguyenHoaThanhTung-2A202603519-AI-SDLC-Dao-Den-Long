# Bang chung demo trang tri dao (Dem 1) - ban nang cap hinh anh

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
