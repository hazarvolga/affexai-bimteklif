# TBDY 2018 — Deprem Hesabı Özeti

Türkiye Bina Deprem Yönetmeliği (RG 18.03.2018, yürürlük 01.01.2019). Tehlike verisi: AFAD Türkiye Deprem Tehlike Haritası (TDTH) — https://tdth.afad.gov.tr (koordinat → Ss, S1, PGA, PGV; DD-1…DD-4).

## İçindekiler
1. Deprem yer hareketi düzeyleri
2. Yerel zemin katsayıları ve spektrum
3. BKS, I, DTS, BYS
4. R, D ve azaltılmış spektrum
5. Eşdeğer deprem yükü yöntemi
6. Kat kütlesi ve hareketli yük katılım katsayısı
7. Göreli kat ötelemesi ve ikinci mertebe
8. Betonarme eleman koşulları (Bölüm 7) — kısa liste
9. Sık hata listesi

## 1. Düzeyler
| Düzey | Aşılma olasılığı (50 yıl) | Tekrarlanma | Kullanım |
|---|---|---|---|
| DD-1 | %2 | 2475 yıl | çok seyrek; yüksek bina/özel |
| DD-2 | %10 | 475 yıl | standart tasarım depremi; DTS bunla belirlenir |
| DD-3 | %50 | 72 yıl | sık deprem; λ katsayısı |
| DD-4 | %68 (30 yılda %50) | 43 yıl | servis depremi, yüksek binalar |

## 2. Spektrum (Bölüm 2.3)
SDS = Ss·Fs, SD1 = S1·F1 (Denk. 2.1). Ara değerler doğrusal enterpolasyonla.

Tablo 2.1 — Fs (Ss = ≤0.25 / 0.50 / 0.75 / 1.00 / 1.25 / ≥1.50):
| Zemin | | | | | | |
|---|---|---|---|---|---|---|
| ZA | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 |
| ZB | 0.9 | 0.9 | 0.9 | 0.9 | 0.9 | 0.9 |
| ZC | 1.3 | 1.3 | 1.2 | 1.2 | 1.2 | 1.2 |
| ZD | 1.6 | 1.4 | 1.2 | 1.1 | 1.0 | 1.0 |
| ZE | 2.4 | 1.7 | 1.3 | 1.1 | 0.9 | 0.8 |

Tablo 2.2 — F1 (S1 = ≤0.10 / 0.20 / 0.30 / 0.40 / 0.50 / ≥0.60):
| Zemin | | | | | | |
|---|---|---|---|---|---|---|
| ZA | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 |
| ZB | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 |
| ZC | 1.5 | 1.5 | 1.5 | 1.5 | 1.5 | 1.4 |
| ZD | 2.4 | 2.2 | 2.0 | 1.9 | 1.8 | 1.7 |
| ZE | 4.2 | 3.3 | 2.8 | 2.4 | 2.2 | 2.0 |
ZF: sahaya özel zemin davranış analizi zorunlu. (Tablolar ASCE 7-16 ile aynı yapıdadır; kritik işte yönetmelik metniyle teyit et.)

Yatay elastik tasarım spektrumu (Denk. 2.2):
- 0 ≤ T ≤ TA: SaE = (0.4 + 0.6·T/TA)·SDS
- TA ≤ T ≤ TB: SaE = SDS
- TB ≤ T ≤ TL: SaE = SD1/T
- T > TL: SaE = SD1·TL/T²
TA = 0.2·SD1/SDS, TB = SD1/SDS, TL = 6 s. Düşey spektrum: TAD = TA/3, TBD = TB/3, TLD = TL/2; SaeD = 0.8·SaE eşdeğeri bölgelere göre (Denk. 2.5).

## 3. Sınıflar
Bina Kullanım Sınıfı (Tablo 3.1): BKS-1 I = 1.5 (deprem sonrası kullanımı gereken: hastane, okul, itfaiye, enerji, müze vb. ve tehlikeli madde içerenler); BKS-2 I = 1.2 (insanların uzun süre ve yoğun bulunduğu: AVM, spor, sinema, konser); BKS-3 I = 1.0 (konut, işyeri, otel, endüstri…).

Deprem Tasarım Sınıfı (Tablo 3.2, DD-2 SDS ile):
| SDS | BKS = 1 | BKS = 2, 3 |
|---|---|---|
| < 0.33 | 4a | 4 |
| 0.33 – 0.50 | 3a | 3 |
| 0.50 – 0.75 | 2a | 2 |
| ≥ 0.75 | 1a | 1 |

Bina Yükseklik Sınıfı (Tablo 3.3): DTS ve HN (bina tabanından yükseklik) ile belirlenir; BYS = 1 yüksek bina (DTS 1/1a/2/2a için HN > 70 m). Diğer sınırlar için Tablo 3.3'e bak — tahmin etme.
Bina tabanı: rijit bodrum perdeleri en az üç taraftan çevreliyor ve Tp,tüm ≤ 1.1·Tp,üst ise bodrum üst döşemesi; değilse temel üstü.

## 4. R, D (Tablo 4.1, sık kullanılanlar)
| Sistem (betonarme) | R | D | Not |
|---|---|---|---|
| Süneklik düzeyi yüksek çerçeve | 8 | 3 | |
| Süneklik düzeyi yüksek bağ kirişli (boşluklu) perde | 8 | 2.5 | |
| Süneklik düzeyi yüksek boşluksuz perde | 6 | 2.5 | |
| Yüksek süneklikli çerçeve + perde (perdeli-çerçeveli) | 7 | 2.5 | Denk. 4.2 devrilme momenti koşulu |
| Süneklik düzeyi sınırlı çerçeve | 4 | 2.5 | yalnız DTS 3, 3a, 4, 4a… (4.3.4.1) |
| Karma sistemler | Tablo 4.1 | | BYS ≤ 6 ve DTS 1a/2a'da kullanılamaz |
Bu tabloyu proje kararında Tablo 4.1'den teyit et (prefabrik, çelik, yığma vb. satırlar farklı).
Rijit bodrumlu binada bodrum için R/I = 2.5, D = 1.5. DTS 1/1a/2/2a perdeli sistemlerde tek perde devrilme momenti ≤ M0/3 ve kenar akslardaki toplam ≥ M0/6; sağlanmazsa R yerine 0.8R.

Deprem yükü azaltma katsayısı (Denk. 4.1):
- T > TB: Ra(T) = R/I
- T ≤ TB: Ra(T) = D + (R/I − D)·T/TB
SaR(T) = SaE(T)/Ra(T).

## 5. Eşdeğer deprem yükü (Madde 4.7)
Uygulanabilirlik: Tablo 4.4 — kısaca az katlı, burulma düzensizliği katsayısı ηbi < 2.0 olan, B2 (yumuşak kat) düzensizliği olmayan binalar ve BYS sınırları. Sağlanmıyorsa Mod Birleştirme (4.8) zorunlu.
- Vt = mt·SaR(Tp)·g ≥ 0.04·mt·I·SDS·g (Denk. 4.19)
- Tepe ek kuvveti ΔFN = 0.0075·N·Vt
- Fi = (Vt − ΔFN)·mi·Hi / Σ(mj·Hj) (Denk. 4.20–4.21)
- Ampirik periyot TpA = Ct·HN^(3/4); Ct = 0.1 (BA çerçeve), 0.08 (çelik çerçeve), 0.07 (diğerleri) — perdeli BA binalarda Ct = 0.075/√At ≤ 0.07 formülü vardır (Denk. 4.27–4.28); teyit et. Hesaplanan Tp ≤ 1.4·TpA.
- ±%5 ek dışmerkezlik. İki doğrultu: E = ±E(X) ± 0.3E(Y) ve tersi.

## 6. Kat kütlesi (Madde 4.5.9, Tablo 4.3)
mi = (wG,i + n·wQ,i)/g. Hareketli yük katılım katsayısı n: konut/işyeri/otel 0.3; okul, yurt, spor, sinema, AVM, garaj, lokanta 0.6; depo, antrepo 0.8; çatı kar yükü katılımı ayrıca.
Hareketli yük azaltması TS 498 ile.

## 7. Öteleme ve ikinci mertebe (Madde 4.9)
- δi = (R/I)·Δi; δi,max = max(köşe/kolon) göreli öteleme.
- λ·δi,max/hi ≤ 0.008κ (dolgu duvarları çerçeveye bitişik) veya 0.016κ (esnek bağlantılı/ayrık). κ = 1.0 (BA), 0.5 (çelik). λ = SaE(DD-3)/SaE(DD-2) (aynı Tp için).
- İkinci mertebe göstergesi θΠ,i (Denk. 4.35–4.36) her katta hesaplanır; sınır aşılırsa rijitlik artırılır. Formülü yönetmelikten aktar, ezberden yazma.

## 8. Betonarme (Bölüm 7) — hızlı kontrol listesi
(Ana başlıklar; sayısal detayları raporda kullanmadan önce Bölüm 7 metniyle teyit et.)
- Beton ≥ C25; donatı B420C/B500C.
- Kolon: en küçük boyut ≥ 300 mm (daire ≥ 350); Ac ≥ Ndm/(0.40·fck); 0.01 ≤ ρt ≤ 0.04, eklerde ≤ 0.06; ≥ Ø14. Sarılma bölgesi uzunluğu ≥ max(kesit uzun boyutu, ln/6, 500 mm); etriye aralığı sarılmada ≤ bmin/3, ≤ 150 mm, ≤ 6φl (yüksek süneklik); orta bölgede ≤ bmin/2, ≤ 200 mm, ≤ 8φl; ilk etriye ≤ 50 mm. Minimum sargı Ash Denk. 7.1–7.2.
- Güçlü kolon-zayıf kiriş: (Mra + Mrü) ≥ 1.2·(Mri + Mrj) (Denk. 7.3).
- Kiriş: bw ≥ 250, h ≥ 300 ve ≥ 3t, h ≤ 3.5bw; Nd ≤ 0.1·Ac·fck; mesnet alt donatısı ≥ %50 üst (DTS 1–2), diğerlerinde ≥ %30; sarılma 2h boyunca s ≤ h/4, ≤ 8φl, ≤ 150 mm.
- Kolon-kiriş birleşimi kesme: kuşatılmış Ve ≤ 1.7·bj·h·√fck, kuşatılmamış ≤ 1.0·bj·h·√fck (Denk. 7.12).
- Perde: kritik bölge t ≥ kat yüksekliği/16 ve ≥ 250 mm; Ac ≥ Ndm/(0.35·fck); gövde ρ ≥ 0.0025 her doğrultuda; uç bölge.
- Hw/lw ≤ 2 perdelerde iç kuvvet büyütme 3/(1 + Hw/lw) ≤ 2.0.

## 9. Sık hatalar
- Ss/S1'i il merkezinden almak → parsel koordinatından TDTH.
- Zemin sınıfını varsaymak → geoteknik rapor (Vs30, SPT N60, cu) zorunlu; ZE/ZF'de risk büyük.
- BKS'yi işlev yerine taşıyıcı sisteme göre seçmek.
- Kütleye tüm hareketli yükü koymak (n katsayısı unutulur).
- Ötelemede Δ ile δ'yı karıştırmak (R/I büyütmesi).
- DTS 3/4 dışında süneklik düzeyi sınırlı sistem seçmek.
- Eşdeğer deprem yükünü uygulanamayan binada kullanmak.
