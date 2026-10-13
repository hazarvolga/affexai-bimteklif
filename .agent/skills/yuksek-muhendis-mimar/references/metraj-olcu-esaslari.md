# Metraj (QTO) ve Ölçü Esasları

TeklifPro/BIMMetraj'ın çekirdeği metrajdır. Bu dosya, hangi kuralla ölçüldüğünü açıkça söyleyen, denetlenebilir metraj üretmek içindir.

## İçindekiler
1. Temel ilkeler
2. Betonarme hiyerarşisi (beton, kalıp)
3. Donatı (TS 708)
4. İnce işler: minha (boşluk düşme) — ÇŞB vs DIN 18350
5. Duvar, kaplama, yalıtım
6. Zayiat/fire
7. IFC'den metraj — öncelik ve tuzaklar
8. Tolerans ve SmartCheck

## 1. İlkeler
- Hakediş/kamu işinde ölçü, sözleşmenin bağlı olduğu birim fiyat tarifinin "ölçü esasları"na göredir (ÇŞB pozu → ÇŞB tarifi; özel sözleşme → sözleşme eki). Rapora hangi kuralı uyguladığını yaz.
- Net (proje) ölçü ile maliyet miktarı ayrıdır: fire, kalıp şişmesi, zayiat hakediş miktarına değil maliyete (birim fiyat analizine) girer.
- Her kalemde: poz no, tanım, birim, miktar, formül/ölçü kaynağı (pafta/IFC GUID), kural.
- Birimler: beton m³, kalıp m², donatı ton (kg/1000), duvar m² veya m³ (poza göre), sıva/boya m², kazı m³, dolgu m³.

## 2. Betonarme hiyerarşisi
Çift sayımı önlemek için tek ve tutarlı bir kesişim önceliği uygula:
1. Kolon/perde: döşeme (tabliye) üstünden bir üst döşeme altına kadar sürekli (yani kat yüksekliği − döşeme kalınlığı). Bazı ofisler kolonu döşeme üstüne kadar alır ve döşemeyi kolon kesitinden düşer — hangisi seçilirse seçilsin tüm projede aynı olmalı.
2. Kiriş: kolon/perde yüzleri arasındaki net açıklık (ln) × bw × (h − t). Döşeme kalınlığı kirişten düşülür.
3. Döşeme: kirişlerle çevrili net alan × t (kirişsiz döşemede kolon kesitleri düşülür). Döşeme boşlukları (şaft, merdiven) düşülür; küçük delikler için sözleşmede eşik varsa uygulanır, yoksa ÇŞB'de hepsi düşülür.
4. Temeller: radye/sürekli temel kendi hacmi; kolon temel üstünden başlar.
Kalıp (kırık ölçü): betonla temas eden yüzey. Kolon: çevre × (H − t) − kiriş birleşim yüzleri; kiriş: (bw + 2(h − t))·ln (kenar kirişte dış yüz h ile); döşeme: alt yüzey + alın. Boşluk yanları eklenir, birleşim yüzleri düşülür.

Örnek: 30×60 kolon, H = 3.00, t = 0.15 → V = 0.30·0.60·2.85 = 0.513 m³; kalıp = 2(0.30+0.60)·2.85 = 5.13 m² (sonra kiriş birleşim yüzleri düşülür).

## 3. Donatı (TS 708:2016)
- Nominal kütle = π·d²/4 · 7.85 kg/dm³ ≈ 0.006165·d² kg/m (d mm). Pratikte d²/162 de kullanılır (≈%0.1 fark).
| Ø (mm) | A (mm²) | kg/m |
|---|---|---|
| 6 | 28.3 | 0.222 |
| 8 | 50.3 | 0.395 |
| 10 | 78.5 | 0.617 |
| 12 | 113.1 | 0.888 |
| 14 | 153.9 | 1.208 |
| 16 | 201.1 | 1.578 |
| 18 | 254.5 | 1.998 |
| 20 | 314.2 | 2.466 |
| 22 | 380.1 | 2.984 |
| 25 | 490.9 | 3.853 |
| 28 | 615.8 | 4.834 |
| 32 | 804.2 | 6.313 |
- Kütle toleransı (EN 10080/TS 708): d ≤ 8 mm ±%6, d > 8 mm ±%4.5. Hakedişte nominal kütle kullanılır.
- Repodaki `docs/kaynaklar/İnşaat Metraj Doğrulama Araştırması.md` Ø18 için 1.997 kg/m ve "2.000 yazmak yasal hata" diyor; π·18²/4·0.00785 = 1.998 kg/m'dir, EN 10080 tablosu 2.00 verir. Bu tür iddiaları birinci prensiple yeniden hesapla, kaynağa körü körüne güvenme.
- Kesim boyu = net boy + kanca payları + bindirme boyları (TS 500/TBDY'ye göre) − bükme düzeltmeleri (genelde ihmal). Etriye boyu ≈ 2(b + h − 4c) + 2·kanca (135° kancada her kanca ≥ 10φ ve ≥ 75–100 mm; TBDY özel deprem etriyesi).
- Bindirme sayısı: çubuk boyu 12 m (stok); L > 12 m ise ek sayısı = ⌈L/(12 − l0)⌉ − 1 yaklaşığı.
- Hasır çelik: m² veya kg; bindirme payı Çizelge 9.2.

## 4. Minha — ÇŞB vs DIN 18350
- ÇŞB birim fiyat tarifi sıva/boya/kaplama ölçü esasları: projedeki ölçülerle, tüm boşluklar boyutuna bakılmaksızın düşülür; boşluk yanları (iç dişler, lento altı, denizlik) ayrıca eklenir. Piyasadaki "3 m² (veya 2.5 m²) altı düşülmez" inancı ÇŞB kuralı değildir.
- DIN 18350 (VOB/C): ≤ 2.5 m² boşluklar düşülmez (übermessen), yanları da eklenmez; daha büyükler düşülür ve yanları eklenir.
- Pencere alt yüzüne denizlik (mermer/ahşap) konuyorsa o yüz sıvanmaz → iç diş = (2·y + g)·derinlik; alt yüz de sıvanıyorsa 2(g + y)·derinlik. Hangisini aldığını yaz ve diğer varyantı da göster (detay paftası belirler).
- Kural sözleşmeye göre seçilir. Kamu (4734/YFK) işinde DIN kuralı fazla ödemeye yol açar.
- Bu iki kuralı `eng_calc.py siva_boya_alani` ile karşılaştırmalı göster.

## 5. Duvar, kaplama, yalıtım
- Duvar: net alan (boşluklar düşülür) × kalınlığa göre poz (m² veya m³). Taşıyıcı elemanlarla kesişen hacim duvardan düşülür (taşıyıcı öncelikli; BIM'de taşıyıcı öncelik > 900, mimari < 500 mantığı).
- IfcMaterialLayerSet katmanları ayrı pozlanır: taşıyıcı gazbeton m², yalıtım m², sıva m².
- Su yalıtımı: yatay + düşey (perde dibi pah, bindirmeler) — bindirme miktarı maliyete, net yüzey hakedişe.

## 6. Zayiat (maliyete girer, hakedişe girmez)
| Kalem | Tipik |
|---|---|
| Hazır beton | %2–3 (pompa/mikser kalıntısı, kalıp şişmesi) |
| Donatı | %3–5 (kesim artığı; bağ teli ayrı) |
| Tuğla/gazbeton | %3–5 |
| Seramik/kaplama | %5–10 (desene göre) |
| Kalıp malzemesi | kullanım sayısına göre amortisman (plywood 5–8, çelik 50+) |
Bu oranlar sektör pratiğidir, normatif değildir; firmanın gerçek verisi varsa onu kullan. TeklifPro'da `wastePercent` alanı maliyete uygulanır (`financial-calculations.ts`: effectiveCost = q·cost·(1 + waste/100)).

## 7. IFC'den metraj
TeklifPro önceliği (`workers/ifc/ifc_extract.py`): (1) IfcElementQuantity (Qto_*BaseQuantities: NetVolume, GrossVolume…), (2) onaylı property set (AllplanAttributes, Pset_*Common), (3) geometri tahmini yok. Tuzaklar:
- Net vs brüt hacim: Qto NetVolume kesişim düşülmüş, GrossVolume düşülmemiş olabilir; ihracatçı yazılıma göre değişir. Hangi alanı aldığını raporla.
- Birim: IfcProject.UnitsInContext; mm modelde hacim 10⁹ ölçekli gelebilir.
- Kesişim önceliği modelde doğru değilse IFC hacmi çift sayım içerir.
- Kalıp alanı IFC'de standart değil; kural (net/brüt, açıklık) tanımlanmadan aktarılmaz (repo bunu bilinçli olarak `FORMWORK_REQUIRES_MODEL_EVIDENCE` ile atlıyor).
- Donatı: IfcReinforcingBar yoksa tonaj "tahmin"dir; kg/m³ oranları (konut ~90–130 kg/m³) yalnız ön keşif için, kaynak etiketiyle.
- e-PYS: Tr_Pset_CSB.PozNo, TREpys_ParselOzellikSeti (TAKS/KAKS/çekme), malzeme adı ≤ 15 karakter, IfcSpace adlandırma (Ek-3).

## 8. Tolerans ve SmartCheck
- `RULE_3X3_QTO_TOLERANCE_3PCT`: |gerçek − beklenen|/beklenen > %3 → uyarı. Bu bir ürün politikasıdır; TS 500 veya ISO 19650 normatif bir "%3 metraj toleransı" tanımlamaz. Raporda "firma politikası" diye etiketle.
- Sapma bulunduğunda kök neden sırası: (1) farklı ölçü kuralı (minha, hiyerarşi), (2) birim/ölçek, (3) net/brüt, (4) model kesişim önceliği, (5) gerçek tasarım değişikliği.
