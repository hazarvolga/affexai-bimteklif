# Faz 10 — T53 & T54 Kaynaklı Pazar Envanteri ve Karşılaştırılabilir Yetenek Kanıtı

- **Tarih:** 26 Ekim 2026
- **Revizyon:** Rev. 89 (`BIM-CALC-2026-10-25.83`)
- **İş ID'leri:** `T53` (Kaynaklı pazar envanteri — TAMAMLANDI), `T54` (Karşılaştırılabilir yetenek kanıtı — TAMAMLANDI)
- **Açık Kalan Karar Kapısı:** `T55` (İddia kararı, hukuk/reklam incelemesi ve geçerlilik süresi — `T50–T52` bağımsız uzman ve canlı kabul sonrasında değerlendirilecek; **AÇIK**)
- **Makine-Okunur Kayıt:** `docs/audits/phase-10/market-inventory-register.json`
- **Önkoşul Protokol Bağı:** `docs/audits/phase-0/capability-claim-register.json` (`uniqueClaimProtocol`) ve `src/capabilities/registry.ts` (`BIM-CAP-2026-10-23.12`)

---

## 1. Yöntem ve Kanıt Kuralları (`T03` Protokolüne Bağlılık)

Faz 0 (`T03`) kapsamında önceden sabitlenen araştırma protokolü uyarınca:

1. **Kategori, Coğrafya ve Özellik Bileşimi Sonradan Daraltılamaz:**
   - **Kategori:** Türkiye'de erişilebilen BIM tabanlı metraj, teklif, mevzuat ön-kontrolü ve ihale/hakediş yazılımları.
   - **Coğrafya:** Türkiye.
   - **6 Halkalı Özellik Bileşimi (`S1..S6`):**
     - `S1_IFC_QTO_TRACEABLE`: IFC2x3 / IFC4 / IFC4X3 fiziksel metraj (QTO), çok katmanlı `IfcCovering` ayrıştırması ve STEP/GUID kanıt izi.
     - `S2_EPYS_RG33331_PDFA`: 05.08.2026 tarihli ve 33331 sayılı Resmî Gazete Yönetmeliği EK-1..EK-9 (Tablo 9.1 & 9.2) IFC ön kontrolü ve veraPDF PDF/A + ISO 216 pafta denetimi.
     - `S3_CSB_BYOL_MINHA`: Tarihli/mühürlü ÇŞB & BYOL poz katalogları, birim sözleşmesi ve ÇŞB/DIN/Özel Şartname minha boşluk düşüm motoru.
     - `S4_KIK_4734_4735`: 4734 KİK m.38 / Tebliğ m.45.1 sınır değer + %80 Pareto ve 4735 fiyat farkı (21 TÜİK alt endeksi).
     - `S5_PROGRESS_PAYMENT`: Çok dönemli kümülatif hakediş, Yeşil Defter, ataşman, mukayeseli keşif ve kesin hesap döngüsü.
     - `S6_ISO19650_CDE_GATE`: TS EN ISO 19650-2 çok kullanıcılı CDE durum geçiş kapıları (`WIP → SHARED → PUBLISHED → ARCHIVED`) ve kanıt kapısı.
2. **Kanıt Yokluğu ≠ Yokluk Kanıtı:**
   - Bir rakibin kamuya açık ürün sayfasında, kullanım kılavuzunda veya sürüm notlarında görülmeyen bir özellik **`yok` (`verified_absent`) olarak yazılmaz**; **`doğrulanamadı` (`unverified_publicly`)** olarak sınıflandırılır. Yalnızca ürünün kendi kapsam tanımı gereği açıkça kapsam dışı olan durumlar (ör. açık kaynak CLI kural motoru `ifc-ruhsat`'ın hakediş/CDE veritabanı içermemesi veya BIM müelliflik aracı ALLPLAN'ın 4734 KİK sınır değer ihale motoru olmaması) `verified_absent` olarak işaretlenir.
3. **Masaüstü / Bulut, Lisans / Tier ve Eklenti / Yerleşik Ayrımı (`GAP_RAPORU_KOD_DOGRULAMA_2026-10-23.md` §6 Düzeltmesi):**
   - Aynı üreticinin masaüstü ve bulut ürünleri birbirine karıştırılmaz: **OSKA e-Hakediş Pro / HakedişPlus (Masaüstü)** ile **OSKABULUT (Web/Bulut)** ayrı satırlarda incelenir; **RIB CostX** için hem masaüstü/sunucu hem de AWS tabanlı **CostX Cloud** açıkça kaydedilir; **AMP Kurumsal Masaüstü** ile **AMP Hakediş Bulut (Zero-Client)** birlikte belirtilir.
4. **BIMMetraj Satırı Aynı Kanıt Eşiğine Tabidir:**
   - Rakiplerde resmî saha/kullanıcı kabulü aranırken `BIMMetraj` kendi kod varlığını "tamamlanmış L3/L4 canlı yetenek" gibi sunamaz. `CAPABILITY_REGISTRY` (`BIM-CAP-2026-10-23.12`) uyarınca `BIMMetraj`'ın 19 yeteneğinin **15'i `Pilot (L2)`**, **4'ü `Yol Haritası (L1)`** ve **0'ı `Canlı (L3/L4)`** durumundadır.

---

## 2. Kaynaklı Pazar Envanteri (`T53`)

| # | Ürün / Üretici | Kategori Grubu | Dağıtım Modeli | Lisans / Tier Yapısı | Türkiye Mevzuatı & Entegrasyon Özeti | Doğrulanan Kaynaklar (26.10.2026) |
|---|---|---|---|---|---|---|
| 1 | **e-Hakediş Pro / HakedişPlus** (Oska Yazılım) | Yerel İhale & Hakediş (Masaüstü) | `desktop` | Ticari masaüstü lisansı + yıllık güncelleme/birim fiyat aboneliği | 4734 KİK yaklaşık maliyet, 4735 fiyat farkı, ÇŞB ve tüm kamu kurumlarının birim fiyat kitapları, Yeşil Defter, ataşman, mukayeseli keşif ve kesin hesap yerleşiktir. Allplan ve Revit ile BIM metraj aktarım köprüsü bulunur. | [HakedişPlus Kılavuzu](https://www.oska.com.tr/pdfdokumanlar/hakedispluskullanim-kilavuzu.pdf), [Yeşil Defter Yardımı](https://destek.oska.com.tr/hakedisplus-yardimi/hakedis-islemleri/yesil-defter/) |
| 2 | **OSKABULUT — HakedişBulut & MaliyetBulut** (Oska Yazılım) | Yerel İhale & Hakediş (Bulut) | `cloud_web` | Yıllık modüler bulut SaaS aboneliği | Web tarayıcısı üzerinden ÇŞB/idare birim fiyatları, 4734 yaklaşık maliyet, 4735 fiyat farkı, Yeşil Defter ve çok dönemli hakediş. Masaüstü e-Hakediş'ten ayrı bir web ürünüdür. | [OSKABULUT Resmi Sayfası](https://www.oska.com.tr/menu/oskabulut/) |
| 3 | **AMP Kurumsal Hakediş ve Yaklaşık Maliyet / AMP Bulut** (AMP Yazılım) | Yerel İhale & Hakediş (Hibrit) | `hybrid_desktop_cloud` | Kurumsal masaüstü lisansı ve Zero-Client AMP Bulut aboneliği | 4734/4735 kamu ihale mevzuatı, ÇŞB/kurum poz kitapları, yaklaşık maliyet, aşırı düşük teklif, çok dönemli hakediş, Yeşil Defter, mukayeseli keşif ve BIM/Revit metraj aktarım araçları. | [AMP Kurumsal Ürün Sayfası](https://www.amp.com.tr/urunler/kurumsal-hakedis-ve-yaklasik-maliyet), [AMP Kullanım Kılavuzu](https://www.amp.com.tr/dosyalar/kh/dokumanlar/kullanim-kilavuzu-amp-kurumsal-hakedis-ve-yaklasik-maliyet.pdf) |
| 4 | **İhale Pro** | Yerel İhale Takip & Maliyet (Bulut) | `cloud_web` | Bulut SaaS aboneliği | Kamu İhale Bülteni / EKAP ilan takibi, rakip/idare analizi, kamu birim fiyat arama ve bulut yaklaşık maliyet/hakediş cetvelleri. | [İhale Pro Resmi Sayfası](https://www.ihalepro.com/) |
| 5 | **BEXEL Manager + BEXEL CDE** (Bexel Consulting) | Küresel 3D/4D/5D/6D BIM & CDE | `hybrid_desktop_cloud` | Kurumsal modüler lisans (Engineer / Manager / Viewer + BEXEL CDE Cloud) | Native IFC2x3/IFC4/IFC4.3 motoru, IDS/bSDD model denetimi, kural tabanlı 5D QTO, 4D iş programı ve hakediş/nakit akışı. Türkiye'de distribütör/danışman kanalıyla sunulur; yerleşik RG 33331 EK-9 veya 4734/4735 kamu ihale paketi açık belgelerde doğrulanamadı. | [BEXEL Manager Resmi Sayfası](https://bexelmanager.com/) |
| 6 | **RIB CostX & CostX Cloud** (RIB Software) | Küresel 2D/5D BIM Metraj & Maliyet | `hybrid_desktop_cloud` | Kurumsal lisans (Desktop/Server ve AWS tabanlı **CostX Cloud** SaaS) | 3B IFC/Revit ve 2B PDF/DWG üzerinden canlı bağlantılı workbook metrajı, özel fiyat kütüphaneleri, revizyon karşılaştırma ve ara değerleme (interim valuation). Yerleşik RG 33331 e-PYS veya 4734/4735 paketi açık belgelerde doğrulanamadı. | [RIB CostX Resmi Sayfası](https://www.rib-software.com/en/rib-costx) |
| 7 | **Autodesk Takeoff & Autodesk Construction Cloud (ACC / Docs)** | Küresel Bulut 2D/3D Metraj & CDE | `cloud_web` | Kullanıcı bazlı yıllık ACC bulut aboneliği | Bulutta 3B RVT/IFC ve 2B PDF metrajı (Takeoff) ile ISO 19650 uyumlu Autodesk Docs CDE iş akışı. Yerleşik RG 33331 e-PYS EK-9, ÇŞB 2026 poz kataloğu veya 4734/4735 motoru açık belgelerde doğrulanamadı. | [Autodesk Takeoff Resmi Sayfası](https://construction.autodesk.com/products/autodesk-takeoff/) |
| 8 | **Kreo 2D Takeoff & BIM Takeoff** (Kreo Software) | Küresel Bulut AI/BIM Metraj | `cloud_web` | Bulut SaaS aboneliği | Web tarayıcısında IFC/Revit ve AI destekli 2B PDF metraj çıkarımı, özel maliyet şablonları. Yerleşik Türkiye mevzuat (RG 33331, ÇŞB, 4734/4735) paketi açık belgelerde doğrulanamadı. | [Kreo Resmi Sayfası](https://www.kreo.net/) |
| 9 | **Glodon Cubicost (TAS / TRB / TME / TBQ)** | Küresel 5D BIM Metraj & BOQ | `hybrid_desktop_cloud` | Modüler ticari abonelik (TAS, TRB, TME, TBQ) | Mimari/yapısal (TAS), donatı (TRB), MEP (TME) model tabanlı metraj, düğüm/boşluk kesintileri ve TBQ ihale/maliyet yönetimi; Türkiye'de yerel kanal mevcuttur. Yerleşik RG 33331 EK-9 veya 4734/4735 kamu ihale paketi açık belgelerde doğrulanamadı. | [Glodon Cubicost Resmi Sayfası](https://www.glodon.com/en/products/cubicost/) |
| 10 | **ALLPLAN 2026 + Bimplus + Solibri** (Nemetschek / Aluplan) | BIM Müelliflik, IDS Kontrol & CDE | `hybrid_desktop_cloud` | Ticari lisans / abonelik | ALLPLAN 2026 içinde canlı IDS doğrulama, bSDD erişimi, PythonParts ve otonom `IfcCovering` üretimi; Bimplus CDE ve Solibri model kontrolü; OSKA ve BIMMetraj'a metraj aktarımı. Doğrudan 4734/4735 ihale veya Yeşil Defter hakediş yazılımı değildir. | [ALLPLAN 2026 Özellikleri](https://www.allplan.com/products/allplan-2026-features/modeling-management-collaboration/), [ALLPLAN 2026 Sürüm Notları](https://www.allplan.com/system/releasenotes/2026/allplan-2026/) |
| 11 | **ifc-ruhsat** (Berkant Acun) | Açık Kaynak RG 33331 e-PYS Kural Motoru | `cli_library` | Açık kaynak (`MIT`) | RG 33331 (05.08.2026) EK-1..EK-9 için Python/IfcOpenShell tabanlı CLI/MCP kural denetimi ve IDS üretimi. 5D metraj, ÇŞB fiyatlandırma, 4734/4735, hakediş ve CDE veritabanı içermez. | [ifc-ruhsat GitHub Deposu](https://github.com/BerkantACUN/ifc-ruhsat) |
| 12 | **BIMMetraj** (Bu Depo) | Bulut 5D BIM Metraj, e-PYS Ön Kontrol, Teklif ve Pilot Hakediş/CDE | `cloud_web` | SaaS abonelik (Paket Kataloğu v6) | `CAPABILITY_REGISTRY` (`BIM-CAP-2026-10-23.12`) kapsamında **15 Pilot (`L2`)**, **4 Yol Haritası (`L1`)**, **0 Canlı (`L3/L4`)** yetenek. Tüm 6 halkada kod ve otomatik test kanıtı mevcuttur; ancak bağımsız uzman imzaları (`T50`), izinli gerçek müşteri/vendor dosyaları (`T51`) ve canlı kabul (`T52`) tamamlanmamıştır. | `src/capabilities/registry.ts`, `docs/audits/phase-6/PHASE_6_REPORT_2026-10-24.md` |

---

## 3. Karşılaştırılabilir Yetenek Matrisi (`T54`)

Aşağıdaki matriste kullanılan durum kodları:
- **`VAR (Doğrulandı)` (`verified_present`):** Üreticinin resmî dokümanı, kullanım kılavuzu veya açık kaynak koduyla yerleşik olarak doğrulandı.
- **`KISMİ / KÖPRÜ` (`partial_bridge`):** Doğrudan yerleşik motor yerine harici eklenti, dosya aktarımı veya üçüncü taraf yazılım köprüsüyle sağlanıyor.
- **`KISMİ / ÖZELLEŞTİRİLEBİLİR` (`partial_customizable`):** Genel motor (ör. genel IDS, özel fiyat tablosu, uluslararası hakediş) mevcut; ancak Türkiye'ye özgü resmî kural/katalog/şablon kullanıcı tarafından elle kurulmalı veya açık belgelerde hazır paket olarak doğrulanamadı.
- **`DOĞRULANAMADI` (`unverified_publicly`):** Kamuya açık resmî ürün belgelerinde bu özelliğe dair kanıt bulunamadı; "yok" iddiası yapılmaz.
- **`YOK (Kapsam Dışı)` (`verified_absent`):** Ürünün kendi mimari/kategori tanımı gereği kapsam dışı olduğu açıkça doğrulandı.
- **`PİLOT / L2 (Uzman Onayı Bekliyor)` (`pilot_l2_unapproved`):** Kod, birim/entegrasyon testi ve resmî kaynak atfı depoda mevcut; bağımsız uzman imzası (`L3`) ve gerçek müşteri saha kabulü (`L4`) henüz yok.

| Ürün | `S1` IFC2x3/4/4X3 QTO & Çok Katmanlı Kanıt | `S2` RG 33331 e-PYS EK-9 & veraPDF PDF/A | `S3` ÇŞB 2026 / BYOL Poz & Minha Motoru | `S4` 4734 KİK ADT & 4735 Fiyat Farkı | `S5` Çok Dönemli Hakediş & Yeşil Defter | `S6` ISO 19650 CDE & Kanıt Kapısı |
|---|---|---|---|---|---|---|
| **OSKA e-Hakediş Pro** (Masaüstü) | `KISMİ / KÖPRÜ` (Allplan/Revit eklenti/dosya köprüsü; doğrudan IFC4X3 STEP ayrıştırıcı doğrulanamadı) | `DOĞRULANAMADI` | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** (Saha standardı) | `DOĞRULANAMADI` |
| **OSKABULUT** (Bulut/Web) | `DOĞRULANAMADI` | `DOĞRULANAMADI` | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` |
| **AMP Kurumsal / AMP Bulut** | `KISMİ / KÖPRÜ` (BIM/CAD metraj aktarım araçları) | `DOĞRULANAMADI` | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** (Saha standardı) | `DOĞRULANAMADI` |
| **İhale Pro** (Bulut/Web) | `DOĞRULANAMADI` | `DOĞRULANAMADI` | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` |
| **BEXEL Manager + CDE** | **`VAR (Doğrulandı)`** | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Genel IDS var; RG 33331 EK-9 ve veraPDF doğrulanamadı) | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Özel katalog/formül; yerleşik ÇŞB 2026 doğrulanamadı) | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (5D hakediş var; Türk Yeşil Defter doğrulanamadı) | **`VAR (Doğrulandı)`** |
| **RIB CostX & CostX Cloud** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Özel workbook/kütüphane; yerleşik ÇŞB 2026 doğrulanamadı) | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Uluslararası değerleme; Yeşil Defter doğrulanamadı) | `DOĞRULANAMADI` (RIB Project/Connex ayrı ürün) |
| **Autodesk Takeoff & ACC** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Özel fiyat listesi; ÇŞB 2026/minha doğrulanamadı) | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (ACC Build Cost; Türk kamu hakedişi doğrulanamadı) | **`VAR (Doğrulandı)`** (Autodesk Docs) |
| **Kreo 2D / BIM Takeoff** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` | `DOĞRULANAMADI` | `DOĞRULANAMADI` | `DOĞRULANAMADI` |
| **Glodon Cubicost** | **`VAR (Doğrulandı)`** | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Yerel düşüm kuralları; ÇŞB 2026 doğrulanamadı) | `DOĞRULANAMADI` | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (TBQ değerleme; Yeşil Defter doğrulanamadı) | `DOĞRULANAMADI` |
| **ALLPLAN 2026 + Bimplus + Solibri** | **`VAR (Doğrulandı)`** (Otonom `IfcCovering` + QTO) | `KISMİ / ÖZELLEŞTİRİLEBİLİR` (Canlı IDS var; RG 33331 kiti harici yüklenir, PDF/A yok) | `KISMİ / KÖPRÜ` (Poz niteliği atama ve OSKA/BIMMetraj köprüsü) | `YOK (Kapsam Dışı)` | `YOK (Kapsam Dışı)` | **`VAR (Doğrulandı)`** (Bimplus / Solibri BCF) |
| **ifc-ruhsat** (`MIT`) | `YOK (Kapsam Dışı)` | **`VAR (Doğrulandı)`** (IFC EK-1..EK-9; PDF/A hariç) | `YOK (Kapsam Dışı)` | `YOK (Kapsam Dışı)` | `YOK (Kapsam Dışı)` | `YOK (Kapsam Dışı)` |
| **BIMMetraj** (Bu Depo) | `PİLOT / L2 (Uzman Onayı Bekliyor)` | `PİLOT / L2` (Dönüştürme `L1/Roadmap`) | `PİLOT / L2` (ÇŞB ticari lisans & uzman onayı açık) | `PİLOT / L2` (EKAP içe aktarım `L1/Roadmap`) | `PİLOT / L2` (Varsayılan kapalı; OSKA/AMP `compatible=false`) | `PİLOT / L2` (ISO lisans & uzman onayı açık) |

---

## 4. Bulguların Sentezi ve `T55` Hukuk / İddia Kapısına Devir

1. **Pazar Boşluğu ve Farklılaşma Hipotezi Doğrulandı, Ancak "Tek" İddiası Yasaktır:**
   - Türkiye pazarında **4734/4735 ihale, ÇŞB birim fiyat ve Yeşil Defter/hakediş** tarafında **OSKA (e-Hakediş Pro / OSKABULUT)** ve **AMP (Kurumsal / Bulut)** tartışmasız saha olgunluğuna sahiptir; ancak kamuya açık belgelerinde **05.08.2026 tarihli RG 33331 e-PYS EK-9 IFC model denetimi, veraPDF PDF/A-2b pafta kontrolü ve doğrudan web tabanlı çok katmanlı IFC4X3 QTO + ISO 19650 CDE durum makinesi** doğrulanamamıştır.
   - Küresel **5D BIM ve CDE** tarafında **BEXEL Manager, RIB CostX (ve CostX Cloud), Autodesk Takeoff/ACC ve Glodon Cubicost** gelişmiş 3B QTO ve model koordinasyonuna sahiptir; ancak kamuya açık belgelerinde **yerleşik RG 33331 EK-9 (Tablo 9.1 & 9.2), SHA-256 mühürlü ÇŞB 2026 poz/rayiç kitapları ve 4734 KİK m.38 / 4735 TÜİK 21 alt endeks hesap motorları** doğrulanamamıştır.
   - Buna karşılık **`BIMMetraj`'ın kendi satırı da henüz `L3/L4` (uzman onaylı ve müşteri saha kabullü) değildir**: Faz 6 çok dönemli hakediş çekirdeği varsayılan kapalıdır (`default-off`), OSKA/AMP aktarımı yalnız `candidate/internal_roundtrip` (`compatible=false`) düzeyindedir, ÇŞB 2026 kataloglarının ticari kullanım yetki belgesi ve bağımsız mühendis/mali müşavir/ihale uzmanı imzaları (`T50–T51`) henüz tamamlanmamıştır.
2. **Kamu Yüzeylerinde Kullanılabilecek ve Yasaklanan İfadeler (`src/pages/public-copy.test.ts` & `T55`):**
   - **Yasaklanan ifadeler (`singleClaimPermitted = false`):** `"Türkiye'de tek"`, `"alternatifsiz"`, `"%100 mevzuata uyumlu"`, `"resmî e-PYS onaylı"`, `"OSKA/AMP tam uyumlu"`.
   - **Kanıtla desteklenen mevcut doğru ifade:** `BIMMetraj`, IFC2x3/IFC4/IFC4.3 metraj ön analizi, RG 33331 e-PYS EK-9 ve PDF/A ön kontrolü, kaynak izli poz/minha hesabı, 4734/4735 ön hesaplayıcıları ve ISO 19650 CDE iş akışını tek web uygulamasında **Pilot (`L2`)** ve **Yol Haritası (`L1`)** düzeyinde birleştiren mühendislik platformudur; bağımsız uzman onayı (`T50`), saha kabulü (`T51`) ve hukuk/reklam incelemesi (`T55`) tamamlanmadan tekillik veya resmî uygunluk beyanı yapılmaz.
