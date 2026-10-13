# TS 500:2000 — Betonarme Tasarım Özeti (madde numaralı)

Kaynak: TS 500 Şubat 2000 metni (Madde numaraları birebir). TS 500/T3 (2014, RG 29240) yalnız Madde 3.4 beton kabulünü değiştirdi. Deprem etkisindeki binalarda TBDY 2018 Bölüm 7 TS 500'ün üstüne ek/sıkı koşullar getirir — ikisini birlikte uygula.

## İçindekiler
1. Malzeme ve katsayılar
2. Yük birleşimleri
3. Kiriş (eğilme) koşulları
4. Kolon koşulları
5. Kesme
6. Kenetlenme ve ekler
7. Döşemeler
8. Sehim
9. Perde/duvar, temel
10. Beton örtüsü (paspayı) — TS 500 / yangın / Eurocode farkı

## 1. Malzeme
| Büyüklük | Formül / değer | Madde |
|---|---|---|
| fcd | fck/γmc, γmc = 1.5 (yerinde döküm), 1.4 (öndökümlü), 1.7 (denetimsiz) | 6.2.5 |
| fctk | 0.35·√fck (MPa) | 3.3.2, Denk. 3.1 |
| fctd | fctk/γmc | 6.2 |
| fyd | fyk/γms, γms = 1.15 | 6.2.5 |
| Ec | 3250·√fck + 14000 (MPa) | Denk. 3.2 |
| Es | 2·10⁵ MPa; ν = 0.2; αt = 10⁻⁵/°C | 3.3–3.4 |
| εcu | 0.003 | 7.1 |
| k1 | C16–C25: 0.85; C30 0.82; C35 0.79; C40 0.76; C45 0.73; C50 0.70 | Çizelge 7.1 |
| Beton kabul (T3) | fcm ≥ fck + 1.0; fcmin ≥ fck − 3.0 MPa | 3.4 |

Donatı: S420 → fyk = 420, fyd = 365.2 MPa; B500C → fyk = 500, fyd = 434.8 MPa. TBDY 2018: B420C ve B500C dışında donatı kullanılamaz; beton ≥ C25.

## 2. Yük birleşimleri (Madde 6.2.6)
- 1.4G + 1.6Q
- 1.0G + 1.2Q + 1.2T
- Rüzgâr: 1.0G + 1.3Q + 1.3W; 0.9G + 1.3W
- Deprem: 1.0G + 1.0Q + 1.0E; 0.9G + 1.0E (TBDY 2018 Madde 4.4.4 deprem birleşimleri: G + Q + 0.2S + E(H) + 0.3E(V) vb. — deprem hesabında TBDY'yi esas al)
- Toprak itkisi: 1.4G + 1.6Q + 1.6H; 0.9G + 1.6H
- Akışkan basıncı 1.4 katsayıyla hareketli yük içeren birleşimlere eklenir.

## 3. Kiriş (Madde 7.3)
- Eğilme elemanı tanımı: Nd ≤ 0.1·fck·Ac (Denk. 7.2).
- h ≥ 300 mm ve h ≥ 3t (t: döşeme kalınlığı). bw ≥ 200 mm (TBDY sünek: ≥ 250), bw ≤ a + h (a: kolon genişliği). TBDY: h ≤ 3.5bw.
- Net beton örtüsü: içte ≥ 20 mm, dışta ≥ 25 mm.
- Çubuklar arası net aralık ≥ 20 mm, ≥ φ, ≥ 4/3·Dmax.
- ρmin = 0.8·fctd/fyd (Denk. 7.3); ρ − ρ' ≤ 0.85ρb (7.4); ρ ≤ 0.02 (7.5).
- ρb = 0.85·k1·(fcd/fyd)·εcu/(εcu + εyd), εyd = fyd/Es.
- Boyuna donatı çapı ≥ Ø12. Gövde yüksekliği > 600 mm → gövde donatısı Asl = 0.001·bw·d, her yüzde, ≥Ø10, aralık ≤ 300 mm (TBDY: h > ln/4 ise ≥ %30·max(As) ve ≥Ø12).
- Açıklık alt donatısının ≥ 1/3'ü mesnede uzatılıp kenetlenir.
- Yüksek kiriş: sürekli kirişte ln < 2.5h, basitte ln < 1.5h.

Tek donatılı dikdörtgen kesit tasarımı:
a = d − √(d² − 2Md/(0.85·fcd·b)),  As = 0.85·fcd·b·a/fyd,  c = a/k1.

## 4. Kolon (Madde 7.4)
- Dikdörtgen kesitte b ≥ 250 mm (TBDY 7.3.1.1 sünekliği yüksek kolon: en küçük boyut ≥ 300 mm); daire ≥ 300 mm (TBDY: 350).
- Nd ≤ 0.9·fcd·Ac (Denk. 7.7). TBDY 7.3.1.2: Ac ≥ Ndm/(0.40·fck) (Ndm: G+Q+E altındaki en büyük eksenel kuvvet). Perde: Ac ≥ Ndm/(0.35·fck).
- Net örtü: içte ≥ 20, dışta ≥ 25 mm.
- 0.01 ≤ ρt ≤ 0.04; ek bölgesinde ≤ 0.06. Gerekli donatının 1.3 katı sağlanırsa 0.005'e inebilir (TBDY'de inemez).
- Boyuna çubuk ≥ Ø14; her köşede çubuk; fretli kesitte ≥ 6 çubuk.
- Etriye çapı ≥ φmax/3; aralık ≤ 12φmin ve ≤ 200 mm; tutulmuş çubuklar arası ≤ 300 mm.
- Narinlik: lk/i ≤ 100 ise moment büyütme yöntemi (7.6.2) kullanılabilir.

## 5. Kesme (Madde 8.1)
- Vcr = 0.65·fctd·bw·d·(1 + γ·Nd/Ac); γ = 0.07 basınç, −0.3 çekme (Denk. 8.1).
- Vr = Vc + Vw; Vc = 0.8·Vcr; Vw = (Asw/s)·fywd·d.
- Vd ≤ Vcr → minimum etriye yeterli. (Asw/s) ≥ 0.3·(fctd/fywd)·bw (Denk. 8.6).
- Vd ≤ 0.22·fcd·bw·d (Denk. 8.7), aksi halde kesit büyütülür.
- s ≤ d/2; Vd > 3Vcr ise s ≤ d/4. Çerçeve kiriş uçlarında 2h boyunca: s ≤ d/4, ≤ 8φl, ≤ 150 mm.
- Burulma: Td ≤ 0.65·fctd·Se ise ihmal (Tcr = 1.35·fctd·Se).
- TBDY kapasite tasarımı: kiriş ve kolonda Ve, pekleşmeli moment Mp = 1.4·Mr ile hesaplanır; Ve − Vdy ≥ 0.5·Vd ise sarılma bölgesinde Vc = 0.

## 6. Kenetlenme ve ekler (Bölüm 9)
- Konum II: betonlamada eğimi 45–90° olanlar ve yatay olup kesitin alt yarısında ya da serbest üst yüzden 300 mm'den uzakta olanlar. Konum I: diğerleri (kötü aderans).
- lb = 0.12·(fyd/fctd)·φ ≥ 20φ (Denk. 9.1), nervürlü çubuk. Düz yüzeyli ×2. 32 < φ ≤ 40: ×100/(132 − φ). Konum I ×1.4. Örtü < φ veya net aralık < 1.5φ: ×1.2. Fazla donatı varsa As,gerekli/As,mevcut ile azaltılabilir (≥ lb/2, ≥ 20φ; sünek çerçeve ve perde kritik bölgesinde azaltılamaz).
- Standart kanca: lbk = 0.75·lb. 180° kanca uç ≥ 4φ ve ≥ 60 mm; 90° kanca uç ≥ 12φ; bükme iç çapı ≥ 6φ, fiyong ≥ 12φ.
- Basınç kenetlenmesi: 0.75·lb'ye kadar azaltılabilir, kanca yapılamaz.
- Çekme bindirmesi: l0 = α1·lb, α1 = 1 + 0.5r (r: aynı kesitte eklenen/toplam donatı). Tüm kesit çekmede α1 = 1.8. Konum I ×1.4. Kancalı ×0.75. Şaşırtma: ek merkezleri arası ≥ 1.5·l0.
- Bindirme boyunca sargı: ≥ 6 adet, çap ≥ φ/3 ve ≥ Ø8, aralık ≤ h/4 ve ≤ 200 mm.
- Basınç bindirmesi: l0 ≥ lb ve ≥ 300 mm; φ > 30 mm bindirmeli eklenemez.
- Kolon ekleri (9.2.7): orta bölgede l0 ≥ lb; çekme varsa alt uçta ≤%50 eklenirse l0 ≥ 1.25lb, >%50 eklenirse ≥ 1.50lb. TBDY 2018'de kolon boyuna donatı ekleri kolon orta üçte birinde yapılır ve sargı koşulları vardır.
- Kaynaklı ek: her 50 ekte 1 (en az 5) çekme deneyi, 1.25·fyk taşımalı.

Örnek (C30, B420C, Ø16, Konum II, r=1): fctd = 1.278, fyd = 365.2 → lb = 0.12·285.8·16 = 549 mm (≈34φ); l0 = 1.5·549 = 823 mm (≈52φ).

## 7. Döşemeler (Bölüm 11)
Tek doğrultuda (ll/ls > 2):
- h ≥ 80 mm (çatı/bakım döşemesi 60, taşıt geçen 120). h/ln ≥ 1/25 basit, 1/30 sürekli, 1/12 konsol.
- Net örtü ≥ 15 mm. ρ ≥ 0.002 (S420/S500), 0.003 (S220). Asal donatı aralığı ≤ 1.5h ve ≤ 200 mm.
- Dağıtma donatısı ≥ asal/5, aralık ≤ 300 mm. Mesnet üst ek donatısı ≥ %60 asal, ≥ Ø8/300 (S420).
İki doğrultuda kirişli:
- h ≥ [ls/(15 + 20/m)]·(1 − αs/4) ve ≥ 80 mm (Denk. 11.1). m = ll/ls; αs = sürekli kenar uzunlukları toplamı / tüm kenarlar toplamı.
- Her doğrultuda ρ ≥ 0.0015, toplam ≥ 0.0035 (S420/S500). Aralık: kısa yön ≤ 200, uzun yön ≤ 250 mm, ≤ 1.5h.
Kirişsiz: tablasız h ≥ ln/30 ve ≥ 180 mm; tablalı h ≥ ln/35 ve ≥ 140 mm; yaklaşık yöntemle h ≥ ll/30 ve ≥ 200 mm.
Dişli döşeme tablası ≥ serbest diş aralığı/10 ve ≥ 50 mm; diş genişliği ≥ 100 mm.

## 8. Sehim (Bölüm 13)
Çizelge 13.1 — hesap gerektirmeyen h/l oranları:
| Eleman | Basit | Kenar açıklık | İç açıklık | Konsol |
|---|---|---|---|---|
| Tek doğrultulu döşeme | 1/20 | 1/25 | 1/30 | 1/10 |
| İki doğrultulu döşeme (kısa açıklık) | 1/25 | 1/30 | 1/35 | — |
| Dişli döşeme | 1/15 | 1/18 | 1/20 | 1/8 |
| Kiriş | 1/10 | 1/12 | 1/15 | 1/5 |
Mcr = 2.5·fctd·Ic/yt yaklaşığı ile ani sehim; zamana bağlı sehim katsayısı ile; sürekli yüklerden toplam sehim sınırı ln/480 (bölme duvar taşıyan elemanlar) — ayrıntı Çizelge 13.3.

## 9. Perde, temel
- Betonarme duvar kalınlığı ≥ 150 mm; düşey donatı toplamı ≥ 0.0015·Ag; aralık ≤ 1.5t ve ≤ 300 mm. TBDY perdeleri: kritik bölgede t ≥ kat yüksekliği/16 ve ≥ 250 mm (Bölüm 7.6).
- Tekil temel: plan en küçük boyut ≥ 0.7 m, alan ≥ 1.0 m², h ≥ 250 mm ve konsol/3; çekme donatısı her doğrultuda ≥ 0.002.
- Temel altına ≥ 50 mm grobeton.

## 10. Paspayı — hangi kural?
| Kaynak | Değer | Not |
|---|---|---|
| TS 500 7.3/7.4 | kiriş/kolon net örtü: iç 20, dış 25 mm | minimum; elverişsiz çevre ve yangında artırılır |
| TS 500 11.2.2 | döşeme net örtü 15 mm | |
| Yangın Yönetmeliği Md. 23(5) | 120 dk için kolon 35, kiriş 25, döşeme 20 mm | yüksek binalarda belirleyici olabilir |
| TS EN 1992-1-1 Tablo 4.4N | XC3, S4: cmin,dur = 25 mm; cnom = cmin + Δcdev(10) = 35 mm | TeklifPro RULE_3X3_XC3_COVER_35MM bunu kullanır |
| TS EN 206 + TS 13515 | çevre etki sınıfları (XC, XD, XS, XF, XA) | Türkiye'de beton siparişi bununla |

Rapor yazarken şunu ayır: TS 500 "net beton örtüsü" (en dış donatı yüzünden) ile TS 500 "beton örtüsü" (boyuna donatı ağırlık merkezinden — d hesabında kullanılır) farklı tanımlardır (Madde 0.2.2, 0.2.15). Eurocode cnom etriye dahil en dış donatıya göredir.
