# ÇŞİDB 2026 katalog yapısal ve kaynak denetimi

**Tarih:** 2026-10-23
**Kapsam:** Faz 1 / T05
**Veri seti:** 6 gömülü katalog, 18.848 kayıt

## Sonuç

- Toplam kayıt: **18.848**; benzersiz kod: **18.848**.
- Doğrudan birim fiyat/rayiç kaydı: **18.809**.
- Yapı yaklaşık maliyet sınıfı: **18**; TÜİK endeks eşlemesi: **21**. Bu iki grup doğrudan poz fiyatı sayılmadı.
- Yapısal olarak kullanılabilir kayıt: **18.848**.
- Yapısal olarak doğrudan fiyat seçimine uygun kayıt: **18.809**.
- Mevcut yayın/politika kapısında seçilebilir kayıt: **0**. Faz 0 ticari kullanım kaydı `pending`; ayrıca kayıt onayı, tenant kaynağı ve geçerlilik çözümü T08–T09 kapsamındadır. T05 yapısal uygunluğu tek başına yayın yetkisine dönüştürmez.
- Duplicate kod: **0**; çelişkili duplicate: **0**; eksik alan: **0**; sıfır/negatif fiyat: **0**; geçersiz fiyat: **0**; poz biçimi hatası: **0**; izin verilen normalize sözlük dışındaki birim: **0**.
- İzin verilen normalize birimler: `100 m²`, `1000 adet`, `adet`, `endeks`, `kg`, `lt`, `m`, `m²`, `m³`, `saat`, `takım`, `ton`. Bu kontrol yalnız normalize sözlük üyeliğidir; pozun beklenen ölçü birimiyle semantik uygunluğu T06–T07 kapısındadır.

## Kitap ve kaynak doğrulaması

| Katalog | Tür | Gömülü satır | Yapısal kullanılabilir | Aynı uygulamayla yeniden parse tam eşleşme | PDF SHA-256 |
|---|---|---:|---:|---:|---|
| csb_2026_mart_insaat_bf | direct_unit_price | 1.861 | 1.861 | 1.861 / 1.861 | eşleşti |
| csb_2026_mart_insaat_rayic | direct_market_rate | 5.360 | 5.360 | 5.360 / 5.360 | eşleşti |
| csb_2026_mart_mekanik_bf | direct_unit_price | 5.678 | 5.678 | 5.678 / 5.678 | eşleşti |
| csb_2026_mart_elektrik_bf | direct_unit_price | 5.910 | 5.910 | 5.910 / 5.910 | eşleşti |
| csb_2026_yapi_yaklasik_maliyet | approximate_cost_class | 18 | 18 | 18 / 18 | eşleşti |
| csb_2026_tuik_endeks_eslestirme | index_mapping | 21 | 21 | 0 / 21 | eşleşti |

6 kaynak PDF'nin hesaplanan SHA-256 değeri Faz 0 kaynak kaydı ve gömülü katalog metadata'sıyla birebir eşleşti. Sayım ve hash doğrulaması, katalog kullanım lisansı veya fiyat onayı değildir.

## Yeniden parse sınırı

Kaynak PDF'ler pinned extractor `pypdf 6.19.0` ve `parseCsbPdfText` ile gömülü katalog kısa devresi kullanılmadan tekrar işlendi. Bu kontrol gömülü veriyi üreten **aynı uygulama satır parser'ını** kullandığı için bağımsız parser doğrulaması değildir.

- Aynı uygulamayla tam eşleşen kayıt: **18.827 / 18.848** (**%99,89**).
- Tam eşleşen 5 kitapta **18.827 / 18.827** kayıt eşleşti.
- `csb_2026_tuik_endeks_eslestirme`: gömülü **21**, yeniden parse **20**, tam eşleşme **0**.
- Eksik yeniden parse kayıtları için bağımsız çıkarım veya satır/sayfa provenance kanıtı bulunmadığından kaynak-parite sonucu açık kaldı.
- Bilinen PDF hashleri normal `parseCsbPdfDocument` yolunda yeniden parse edilmeden gömülü JSON'a yönlenir. Bu denetim o kısa devreyi özellikle atladı; normal import başarısı bağımsız parse kanıtı sayılamaz.

## Kapanış yorumu

T05'in yapısal tarama bölümü tamamlandı: 18.848 kayıt 6 katalog türüne ayrıldı; uydurma kod, duplicate, çelişki, eksik alan, poz biçimi, birim ve fiyat kontrolleri tam veri setinde çalıştırıldı. Ticari kullanım yetkisi ve 21 endeks kaydının bağımsız kaynak-paritesi açık olduğundan bunlar seçilebilir resmî fiyat kanıtı olarak yükseltilmedi.
