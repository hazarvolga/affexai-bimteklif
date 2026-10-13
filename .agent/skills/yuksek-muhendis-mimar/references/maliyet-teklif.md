# Maliyet, Birim Fiyat ve Teklif

## Birim fiyat analizi (ÇŞB mantığı)
Birim fiyat = Σ(malzeme rayici × miktar) + Σ(işçilik rayici × saat) + Σ(makine rayici × saat) → ara toplam × 1.25 (%25 yüklenici kârı ve genel giderler). KDV ayrı.
- Rayiçler: ÇŞB yıllık birim fiyat/rayiç listeleri (2026 listesi yayımlandı), firma tedarikçi teklifleri, TeklifPro `price_sources`/`price_snapshots`.
- Özel sektör teklifinde %25 sabit değildir; genel gider (şantiye, sigorta, teminat, finansman) ve kâr ayrı modellenir.
- `eng_calc.py birim_fiyat_analizi` ile analiz tablosu üret.

Örnek analiz yapısı (1 m³ C30/37 hazır beton dökülmesi):
| Bileşen | Birim | Miktar | Not |
|---|---|---|---|
| Hazır beton C30/37 | m³ | 1.02 | %2 fire — rayiç: tedarikçi |
| Beton pompası | m³ | 1.00 | |
| Vibratör + işçilik (düz işçi, usta) | sa | ~0.6–0.8 | ekip verimine göre |
| Kür malzemesi | m² | yüzeye göre | |
Sayısal rayiçleri her zaman güncel kaynaktan al ve tarihini yaz; bellekten fiyat verme.

## Teklif fiyatlandırması
- Satış net = Σ q·p·(1 − iskonto); KDV oranı kaleme göre (inşaatta genelde %20; konut teslimlerinde net alana göre %1/%10 özel oranlar ve tevkifat — mali müşavir/hukuk teyidi gerekli, TeklifPro bunu "advisory" tutar).
- Marj = (satış − maliyet)/satış. Markup ≠ marj: markup %25 → marj %20.
- Risk primleri ayrı satır: eskalasyon, kur, karbon/tedarik, bilgi teslim (COBie/as-built). TeklifPro'daki eskalasyon formülü: maliyet × ay × aylık volatilite% (doğrusal). Bileşik alternatif: maliyet × ((1+v)^(ay/2) − 1) (harcamanın sürede ortalama dağıldığı varsayımıyla) — hangisini kullandığını belirt.
- Fiyat farkı (kamu): 4734 sayılı Kanun kapsamı işlerde Fiyat Farkı Esasları formülü (Pn katsayısı, ÜFE/TÜFE alt endeksler) sözleşmeye göre; teklifte "fiyat farkı verilecek/verilmeyecek" bilgisi marj riskini kökten değiştirir.

## Yaklaşık maliyet (ön fizibilite)
1. Kaba: alan × yapı sınıfı birim maliyeti (2026 tebliği) — yalnız resmi bedel hesapları için; piyasa maliyeti genelde farklıdır.
2. Elemanter: (beton m³ × birim) + (donatı t × birim) + (kalıp m² × birim) + ince işler m² + MEP % + genel gider.
3. Oran kontrolleri (konut, tipik): beton 0.30–0.45 m³/m² inşaat alanı; kalıp 2.0–3.0 m²/m²; donatı 35–55 kg/m². Sapma varsa metrajı sorgula.

## Raporlama kuralı
Her maliyet sayısının yanında: kaynak (poz/rayiç listesi/tedarikçi teklifi + tarih), varsayım, para birimi, KDV durumu. Kaynaksız sayı "tahmin" etiketiyle ve TeklifPro'da `priceSource: ai_estimate` / `verificationStatus: needs_review` ile girilir.
