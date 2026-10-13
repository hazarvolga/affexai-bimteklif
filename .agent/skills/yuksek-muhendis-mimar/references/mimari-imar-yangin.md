# Mimari: İmar, Yangın, Erişilebilirlik, Enerji, Maliyet Sınıfı

Yüksek mimar şapkası: tasarım kararını mevzuat sınırları içinde, sayıyla gerekçelendir. Plan notları ve parselin uygulama imar planı yönetmelikten önce gelir — önce onları iste.

## İçindekiler
1. Planlı Alanlar İmar Yönetmeliği (PAİY) — 2026 değişiklikleri dahil
2. Binaların Yangından Korunması Hakkında Yönetmelik (BYKHY)
3. Merdiven, rampa, erişilebilirlik
4. Enerji: TS 825 (Ekim 2024) ve BEP
5. Yapı sınıfları ve 2026 yaklaşık birim maliyetler
6. e-PYS / BIM teslim

## 1. PAİY
Tanımlar ve hesap:
- TAKS = taban alanı / parsel alanı; KAKS (emsal) = emsale dahil toplam alan / parsel alanı.
- KAKS belirtilmemişse TAKS × kat adedi; bu durumda TAKS ≤ %60 (1 Temmuz 2026 değişikliği). Ayrık/blok nizamda planda aksi yoksa TAKS ≤ %40.
- Emsal dışı alanlar (Madde 5/8 ve umumi binalarda Madde 22/2): toplamı emsale konu alanın %30'unu aşamaz. 2026 değişikliği: ana taşıyıcıyla bütünleşmeyen pergola ve süs havuzu, bahçe alanının %20'sini aşmamak kaydıyla emsal dışı; umumi binalarda ticari olmayan çocuk oyun/bakım alanı, mescit, otopark, son kattaki kullanılmayan ortak teras emsal dışı (yine %30 sınırı içinde).
- Bodrum katta bağımsız bölüm/ortak alan/eklenti varsa asansör o kata ulaşmalı (tek bağımsız bölümlü konut ve teknik hacimler hariç). 1 Temmuz 2026'dan önce ruhsat başvurusu yapılanlar muaf.
- Yeniden ruhsat (Madde 54): ruhsattan itibaren 2 yıl içinde başlanan yapıda yangın, deprem, ısı/su yalıtımı, çevre ve enerji konularında güncel mevzuat; diğerlerinde ilk ruhsat tarihi mevzuatı.
- Kat yüksekliği, çekme mesafeleri, çıkma, saçak, çatı, otopark oranları: yönetmelik + plan notu + belediye otopark yönetmeliği; değerleri ezberden yazma, ilgili maddeyi alıntıla.

`eng_calc.py imar_hesabi` → taban alanı, emsal alanı, %30 emsal dışı tavanı.

## 2. Yangın (BYKHY)
Tanımlar: Yüksek bina = bina yüksekliği > 21.50 m veya yapı yüksekliği > 30.50 m (Madde 4). Kaçış uzaklığı ölçümü: mekândaki en uzak noktadan (duvardan 40 cm önden) en yakın çıkışa.

Kullanıcı yükü (Ek-5/A, m²/kişi): konferans/lokanta/sinema 1.5 (net); bar ayakta 0.5, oturma 1.0; derslik 1.5; bekleme/resepsiyon 3; spor 3; mağaza 5; galeri/atölye 5; ofis 10; mutfak 10; fabrika 10; otel/hastane yatak odası 20; depo, otopark 30. (1–4. satırlar net alan, diğerleri brüt alan.)

Ek-5/B — en uzun kaçış uzaklıkları (m) ve birim genişlik (50 cm) başına kişi:
| Kullanım | Tek yön (yok/sprinkler) | İki yön (yok/sprinkler) | Dış kapı | Diğer kapı/koridor | Merdiven | Rampa |
|---|---|---|---|---|---|---|
| Yüksek tehlikeli | 10 / 20 | 20 / 35 | 50 | 40 | 30 | 50 |
| Endüstri | 15 / 25 | 30 / 60 | 100 | 80 | 60 | 100 |
| Yurt | 15 / 30 | 45 / 75 | 50 | 40 | 30 | 50 |
| Mağaza | 15 / 25 | 45 / 60 | 100 | 80 | 60 | 100 |
| Büro | 15 / 30 | 45 / 75 | 100 | 80 | 60 | 100 |
| Otopark/depo | 15 / 25 | 45 / 60 | 100 | 80 | 60 | 100 |
| Okul | 15 / 30 | 45 / 75 | 100 | 80 | 60 | 100 |
| Toplanma | 15 / 25 | 45 / 60 | 100 | 80 | 60 | 100 |
| Hastane/huzurevi | 15 / 25 | 30 / 45 | 30 | 30 | 30 | 30 |
| Otel | 15 / 20 | 30 / 45 | 50 | 40 | 30 | 50 |
| Apartman | 15 / 30 | 30 / 75 | 50 | 40 | 30 | 50 |
Çıkmaz koridor: 10/20 (yüksek tehlike), diğerleri 15/20 m.

Genişlik (Madde 33): toplam çıkış genişliği ≥ (kişi / birim başına kişi) × 0.5 m. Tek kaçış yolu: 50–500 kişi ≥ 1.00 m; 501–2000 ≥ 1.50 m; > 2000 ≥ 2.00 m; koridor olarak da kullanılıyorsa ≥ 1.10 m; mutlak en az 0.80 m. Yüksek binada ≥ 1.20 m. Merdiven > 2.00 m ise ara küpeşte. Koridor yüksekliği ≥ 2.10 m. 50 kişiyi aşan mekânda kapı kaçış yönüne açılır.

Konut merdiven sayısı (Madde 35): yapı yüksekliği < 21.50 m → korunumsuz tek merdiven yeterli; 21.50–30.50 m → en az 2 merdiven, biri korunumlu, her daireden ikisine erişim; 30.50–51.50 m → 2 korunumlu merdiven, birinde yangın güvenlik holü veya basınçlandırma; > 51.50 m → yangın güvenlik hollü ve basınçlandırmalı 2 merdiven + acil durum asansörü.

Yangın dayanımı/paspayı (Madde 23/5): 120 dk için BA net örtü kolon 35, kiriş 25, döşeme 20 mm. Yangın duvarı 90 dk; yüksek binada şaft duvarı 120 dk. İtfaiye erişimi: araç yaklaşma noktasından bina dış yüzüne ≤ 45 m; yol ≥ 4 m (çıkmazda 8 m), eğim ≤ %6, iç dönüş yarıçapı ≥ 11 m, dış ≥ 15 m, yükseklik ≥ 4 m.
Kaynak metin sürümü: yönetmelik birçok kez değişti (2009, 2012, 2015, 2021…). Değerleri sonuca bağlamadan önce mevzuat.gov.tr'deki güncel metinle teyit et.

`eng_calc.py kacis_hesabi` → kullanıcı yükü, merdiven genişliği, kaçış mesafeleri.

## 3. Merdiven, rampa, erişilebilirlik
- Blondel: 2a + b = 60–64 cm (a rıht, b basamak). Konut ortak merdiveninde tipik a ≤ 18 cm, b ≥ 27 cm; ortak merdiven kol genişliği ve sahanlık için PAİY Madde 31'e bak (ezberden yazma, alıntıla).
- Rampa eğimi erişilebilirlikte ≤ %8 (TS 9111; kısa mesafede daha dik toleranslar tabloyla), sahanlık aralıkları ve ≥ 1.50 m manevra alanı.
- TS 9111 Engelliler için erişilebilirlik; Erişilebilirlik İzleme ve Denetleme Yönetmeliği.

## 4. Enerji
- TS 825 "Binalarda Isı Yalıtım Kuralları" Ekim 2024 sürümü, 20.02.2025 tarihli tebliğle (RG 32819) 01.04.2025'ten itibaren zorunlu; 2008 sürümü yürürlükten kalktı. Derece-gün bölgeleri ve sınır U değerleri yeni standarttan alınmalı (eski 4 bölgeli tablo artık geçerli değil). Standart metni TSE'den; değerleri ezberden verme.
- Isı kaybı temel bağıntısı: Q = U·A·ΔT; U = 1/(Rsi + Σd/λ + Rse). Yoğuşma kontrolü (Glaser) TS 825 ekinde.
- BEP-TR ile enerji kimlik belgesi; yeni binalarda en az C sınıfı ve 2025'ten itibaren yaklaşık sıfır enerjili bina (YSEB) hükümleri için güncel BEP Yönetmeliğine bak.

## 5. Yapı sınıfları ve 2026 yaklaşık birim maliyetler (RG 03.02.2026)
| Sınıf | A | B | C | D | E |
|---|---|---|---|---|---|
| I | 2 600 | 3 900 | 4 200 | 4 800 | — |
| II | 8 100 | 12 500 | 15 100 | — | — |
| III | 19 800 | 21 050 | 23 400 | — | — |
| IV | 26 450 | 33 900 | 40 500 | — | — |
| V | 42 350 | 43 850 | 48 750 | 53 500 | 103 500 |
TL/m², KDV/arsa/altyapı/peyzaj hariç. Yapının hangi sınıf/gruba girdiği (ör. konutlar yüksekliğe göre III ve IV sınıfları arasında ayrılır) tebliğ ekindeki listeden okunur — tahmin etme, listeden alıntıla. Bu tablo mimarlık/mühendislik hizmet bedeli, ruhsat harcı, yapı denetim bedeli içindir — gerçek ihale maliyeti değildir.

## 6. e-PYS / BIM
- "Projelerin Elektronik Ortamda Teslimi ve Yönetilmesi Hakkında Yönetmelik" ve "Projelerin Dijital Olarak Hazırlanması" düzenlemeleri (repo: docs/kaynaklar). Ek-3 mahal adlandırma, Ek-6 sınıf/özellik sözlüğü (Pset_*Common FireRating, LoadBearing, IsExternal; Tr_Pset_CSB.PozNo), Ek-7 parsel özellik seti (TAKS, KAKS, çekmeler).
- ISO 19650 LOIN (bilgi ihtiyacı seviyesi) — hangi aşamada hangi parametrenin modelde olacağı.
