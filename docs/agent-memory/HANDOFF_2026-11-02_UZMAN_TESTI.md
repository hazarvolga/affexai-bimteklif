# Devir: 1–2 Kasım 2026, uzman testi sonrası

Canlı: `https://bimmetraj.com`, sürüm `f1bdedd` (Rev. 158, `verify` yeşil). Açık PR yok. Bu oturumun PR'ları 53–62.

## Bu oturumda canlıya alınanlar

| PR | Rev. | Ne |
|---|---|---|
| 53, 56, 62 | 149, 152, 158 | TÜİK bağlantı kontrolü (`/api/admin/tuik/connection`) ve akış yapısı görünümü (`/api/admin/tuik/dataflows/:id`). Kart: Mevzuat Bekçisi sayfası |
| 54 | 150 | ÇŞB boşluk düşümü: 1.879 analizin "Ölçü" maddelerinden. Sıva/alçı/boya tüm boşluk; duvar 0,10, alçı levha 0,50, asma tavan 0,25 m² altı düşülmez. Eski "0,50 m²" ve "Genel Teknik Şartname" kaynağı kaldırıldı |
| 55 | 151 | Sunucuda işlenen IFC ekranı kapı/pencere ve kaynak yazılımı almıyordu (özet `null` geçiyordu). `/api/smartcheck/documents/:id/ifc-summary` |
| 57, 58 | 153, 154 | Kapsam kartı gerçek eleman sayısı (160/1.731); yanıltıcı etiketler kalktı; sonuç özeti kanıtlı/kanıtsız ayırır |
| 59 | 155 | Oda ve bağımsız bölüm cetveli kayıtlı kanıta girer |
| 60 | 156 | Worker `classInventory`, model envanteri kartı, kapı/pencere bloğu, betonarme satırı "Bu modelde: 30 döşeme" |
| 61 | 157 | 3B: düşey kesit (sağ-sol, ön-arka) ve oynat düğmesi |

Ölçülen sayı kontrolü: `2026_45_...duzenlenmis.ifc` için Allplan'ın kendi döşeme raporu (`1.xlsx`, kök dizin) bizimle 160 döşemede hacimce birebir aynı (322,37 m³). B01 = 68,34 m³ yalnız bodrum katı.

## Uzman testinde (Melih Bey) çıkanlar
- İstediği ama yapılmayanlar: **katlara ve sınıflara göre aç-kapat ağacı** (kat işaretle, yalnız kirişler gibi). Görüntüleyici web-ifc ile çalışıyor; sınıf ve kat bilgisini oradan almak gerekir.
- Cevap beklenenler (mail taslağı: oturum klasöründe `Melih Bey mail taslağı.txt`, sunumun 15. sayfası): `ST_TML_BETON-C35` adlı 9 parça (geometri ≈295 m³) Allplan'da nerede; ad `BETON_C30`/malzeme `Beton_C35` çelişkisinde hangisi esas; 15.275 sıva ve 15.380 fayans boşluk kuralı ve Genel Teknik Şartname; zemin kaplamasını oda net alanından türetmek; kolon/kiriş/duvar için Allplan raporları.

## Açık işler (öncelik sırasıyla)
1. **TÜİK otomatik endeks çekimi.** İstek biçimi artık doğru: `/rest/data/TR,{akış},{sürüm}?format=SDMX-CSV&startPeriod=` (belge §6; SDMX-JSON yok). Hazar'ın "Yapıyı göster" çıktısı (`DF_UFE_INSAAT_V1`, `DF_YIUFE_EDO_V1`) gelmeden yazılmadı. `tuik-sdmx-adapter.ts` içinde kurum kodu `TUIK`, akış adları `DF_IME`/`DF_YI_UFE`, SDMX-JSON isteği yanlış: gerçek kimlikler `TR`, `DF_UFE_INSAAT_V1` (İME, 2015=100), `DF_YIUFE_EDO_V1` (Yİ-ÜFE, 2003=100), `DF_UFE_V6`, TÜFE yalnız `DF_TUFE_SDMX_*` (ÇŞB'nin 2023=100 tabanı listede görünmüyor).
2. Melih Bey'in cevapları gelince: boşluk kuralı (15.275, 15.380) teyidi, çatı ve kalıp için kitaptaki diğer eşikler, ad–malzeme kararı.
3. Kolon/kiriş/duvar karşılaştırması (Allplan raporu gelince, döşemedeki gibi IFC kimliğiyle).
4. Kanıtsız hacim sütunu (envanterde "kanıtsız ama modelde var: m³", toplam dışı). Ürün kararı: geometri hesabı "inceleme bekliyor" satırı olarak teklife girsin mi.
5. Zemin kaplamasını oda net alanından türetmek (uzman onayı).
6. Kat/sınıf görünürlük ağacı (yukarıda).
7. `src/smartcheck/rules/epys.ts` ve `epys-allplan-kit.ts` hâlâ **15 karakter malzeme sınırını hata sayıyor**; nihai yönetmelik metninde ve Python kuralında yok. Küçük düzeltme, e-PYS PRD işinden bağımsız.
8. e-PYS otomatik isimlendirme PRD'si (`epys_otomatik_isimlendirme_prd.md`, kök dizin): yalnız değerlendirildi, kod yazılmadı. Önerilen sıra: 15 karakter düzeltmesi, yalnız-analiz Faz 1, sonra apply.
9. Doğrulama kalanları (canlıda gerçek tarayıcıda): 2026_45'i yeniden yüklemek (oda cetveli ve envanter görünmeli); düşey kesit ön-arka ve kesilen kısımda eleman seçimi.
10. Telif: ÇŞB, İller Bankası ve TEDAŞ PDF'lerinde "yazılı izin" uyarısı var; kodda gömülü 18.848 ÇŞB satırı için ÇŞB/hukukçu cevabı bekleniyor, o zamana kadar yeni fiyat satırı eklenmez. TEDAŞ RAR'ları şifreli (ücretli abonelik).
11. Küçük: Resmî Gazete 29 Ekim günü "düzen tanınmadı"; Rev. 132–147 `commit: "pending"` alanları; `Modelde Çoklu Katman Bilgisi Yok` satırı yalnız IfcCovering'e bakıyor; diğer worker özet alanları (örn. `trPsetCsb`) sunucu ekranına taşınmıyor.

## Çalışma notları
- Canlıya alım: `main` CI yeşil → Coolify "Deploy" → `/api/health` revizyonu. Bir birleştirme başka birleştirmeyle çakışırsa dokümandaki Rev satırları çakışır (aynı satırlar); sırayla birleştirin.
- Bu Mac'te `pdftotext`/`tesseract` yok; Docker (`debian:bookworm-slim`, poppler, `tesseract-ocr-tur`) ile okunur. `ifc-bench-amd64` imajı işçiyi yerelde çalıştırır: `python3 -m workers.ifc --input X --output Y`. İşçi testleri için `pip install pytest` ve `fixtures/` bağlanmalı.
- Sunum: <https://claude.ai/artifact/FeNotYCxRAbRPvvqpAKRmJ> (16 sayfa). PDF: kök dizinde `BIMMetraj Uzman Test Rehberi (2 Kasım).pdf`.
- Resmî kaynak PDF'leri (77 dosya) kökte `Birim Fiyat Katalogları/`, git dışı, hiçbir zaman commit'lenmez.
