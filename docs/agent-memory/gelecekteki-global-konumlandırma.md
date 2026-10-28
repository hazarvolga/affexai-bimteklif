# BIMMetraj — Gelecekteki Global Konumlandırma ve Çoklu Ülke (ABD / AB / Körfez) Altyapı Analizi

- **Tarih:** 19 Ekim 2026
- **Kapsam:** Mevcut kod tabanında (`Rev. 35` / `BIM-CALC-2026-10-18.29`) Türkiye (`TR`) dışındaki ülkelere — özellikle **ABD (`US`)**, **Almanya/AB (`DE`)**, **Birleşik Krallık (`GB`)** ve **Körfez (`AE`)** pazarlarına — hizmet verebilmek için daha önce atılmış mimari temellerin, ilgili Git commit geçmişinin ve hesap motorlarının uygunluk analizi.

---

## 1. Git Geçmişinde Kurulmuş Olan Çoklu Bölge (Multi-Region) Altyapı Commit’leri

Proje geçmişinde uluslararası ölçeklenme ve çoklu standart desteği için atılmış çekirdek adımlar şunlardır:

| Tarih | Commit SHA / Tag | Başlık ve Teknik Kapsam |
| :--- | :--- | :--- |
| **11 Ekim 2026** | `9ad2a15` & tag `restore-point-multi-region-baseline` (`821e63f`) | **`feat(core): implement multi-region international architecture and connect settings to real database`**<br>• `companies` tablosuna (`src/db/schema.ts`) `country_code`, `measurement_system`, `active_standard`, `classification_system` kolonları eklendi.<br>• `GET /api/company/profile` ve `PATCH /api/company/profile` uç noktaları (`src/server/routes/company.ts`) rol denetimiyle canlı veritabanına bağlandı.<br>• `src/pages/Settings.tsx` içinde **TR, DE, GB, US, AE** için hazır ülke/yargı yetkisi profilleri (`JURISDICTION_PRESETS`) tanımlandı.<br>• `src/server/routes/company.multiregion.test.ts` ile birim testleri eklendi. |
| **11 Ekim 2026** | `f0b1043` | **`feat(bim): Faz 7 - Eurocode 2 mandrel fix, e-PYS metadata and FireRating type, 3x3 boundary rules and executedRuleSet passthrough`**<br>• SmartCheck 3×3 motoruna aktif standarda göre (`TBDY_TS500`, `EUROCODE_2`, `ACI_318`) kural seçimi ve `executedRules` izlenebilirliği eklendi. |
| **13 Ekim 2026** | `6f36307`, `b103991`, `e661afb` | **`fix(smartcheck): source 3x3 rules and pick cover rule by active standard`**<br>• Sunucu tarafındaki IFC işlemcisinin (`src/smartcheck/import/processor.ts`) şirketin veritabanındaki `activeStandard` değerini okuyup `evaluateIfcRulePacks(artifact, company.activeStandard)` üzerinden kural motoruna geçirmesi sağlandı. |
| **14–16 Ekim 2026** | `9521d85` & `9f6a963` | **`feat(smartcheck): add contractual opening deduction (minha) and structural intersection engine`**<br>• Minha (boşluk düşümü) motoruna (`src/smartcheck/rules/minha.ts` ve `src/ifc/openings-minha.ts`) Türkiye (`CSB_2026`), Almanya (`DIN_18350`) ve uluslararası özel sözleşmeler için parametrik **`CUSTOM_CONTRACT`** profili eklendi. |
| **16 Ekim 2026** | `63ea873` & `65f4acd` | **`feat(iso19650-minha-kik)` & `feat(escalation-byol)`**<br>• Uluslararası **ISO 19650-1/2 CDE Durum Makinesi** ve **EN 17412-1 LOIN** tamlık motoru (`src/smartcheck/rules/iso19650.ts`) ile **BYOL (Bring Your Own License / Kendi Fiyat Kitabını Getir)** altyapısı devreye alındı. |

---

## 2. Mevcut Kodda Tanımlı Ülke / Yargı Yetkisi Profilleri (`JURISDICTION_PRESETS`)

`src/db/schema.ts`, `src/server/routes/company.ts` ve `src/pages/Settings.tsx` içinde veritabanı ve API seviyesinde aktif olan 5 ülke profili:

| Ülke Kodu (`countryCode`) | Bölge Etiketi | Para Birimi (`defaultCurrency`) | Ölçü Sistemi (`measurementSystem`) | Yapısal Standart (`activeStandard`) | Maliyet / Poz Sınıflandırma (`classificationSystem`) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **`TR`** | 🇹🇷 Türkiye | `TRY` | `metric` | `TBDY_TS500` | `CSB_TR` (ÇŞB Ek-6 & Birim Fiyat Poz Sistemi) |
| **`US`** | 🇺🇸 Amerika Birleşik Devletleri | `USD` | `imperial` | `ACI_318` | `CSI_MASTERFORMAT` (CSI MasterFormat 50 Division) |
| **`DE`** | 🇩🇪 Almanya / DACH | `EUR` | `metric` | `EUROCODE_2` | `DIN_276` (DIN 276 Kostengruppen) |
| **`GB`** | 🇬🇧 Birleşik Krallık | `EUR` / `GBP` | `metric` | `EUROCODE_2` | `NRM2_UK` (RICS NRM1 / NRM2) |
| **`AE`** | 🇦🇪 Körfez / BAE | `USD` | `metric` | `ACI_318` | `CSI_MASTERFORMAT` (CSI / FIDIC Formatı) |

Ayrıca `src/services/pricing/source-catalog.ts` içinde her fiyat kaynağının kendi `countryCode` ve `currency` alanı bulunmaktadır.

---

## 3. ABD (`US`) Pazarı İçin Hesap Motorlarının Katman Bazlı Uygunluk Analizi

Yarın ABD pazarında bir müşteriye hizmet vermek istediğimizde mevcut 6 çekirdek katmanın durumu:

| # | Katman / Hesap Motoru | İlgili Kod Dosyaları | ABD (`US`) Hazırlık Oranı | Mevcut Durum ve Teknik Detay |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Şirket, Bölge, Para Birimi (`USD`) ve Teklif Yuvarlama Motoru** | `src/db/schema.ts`<br>`src/server/routes/company.ts`<br>`src/pages/Settings.tsx` | ✅ **%100 Hazır** | Şirket profilinde `US` seçildiğinde `USD`, `imperial`, `ACI_318`, `CSI_MASTERFORMAT` veritabanına kaydedilir. Teklif motoru `USD` ve cent (`0.01`) hassasiyetiyle çalışır. |
| **2** | **IFC 3B Geometri ve Birim Okuma Motoru (`IfcOpenShell`)** | `workers/ifc/ifc_extract.py` (`unit_scale`, `project_unit_scale`) | ✅ **%85 Hazır** | Python motorumuzdaki `unit_scale()` fonksiyonu `IfcConversionBasedUnit` (ABD Revit modellerindeki **`FOOT`**, **`INCH`**, **`SQUARE_FOOT`**, **`CUBIC_FOOT`**, **`POUND`**) birimlerini özyinelemeli (recursive) okuyup içerde hatasız olarak SI (`m`, `m²`, `m³`, `kg`) birimine normalize eder.<br>**Eksik olan %15:** Şirket `measurementSystem = "imperial"` seçtiğinde, arayüzde ve Excel/PDF çıktılarında SI sonuçlarını tekrar **`cu. yd.` (cubic yard)**, **`sq. ft.` (square feet)**, **`lf` (linear feet)** ve **`lbs` / `ton`** olarak gösteren görüntüleme/raporlama dönüştürücüsü. |
| **3** | **Poz ve Maliyet Sınıflandırma Motoru (`İcmal / BoQ`)** | `src/ifc/calm-icmal.ts` | ⚠️ **%40 Hazır** *(En kritik köprü)* | Veritabanında `classificationSystem = "CSI_MASTERFORMAT"` seçilebiliyor **ancak** `src/ifc/calm-icmal.ts` şu an elemanları yalnızca **Türkiye ÇŞB (`15.xxx`)** pozlarına eşleştiriyor (`CSB_TR` sabit kodlu).<br>**Tamamlanması gereken:** `aec-platform/qto` açık kaynak reposundaki gibi deklaratif `CSI MasterFormat` (Division 03 Concrete, Division 04 Masonry, Division 09 Finishes) ve `UniFormat II` (`A10`, `B10`, `B20`, `C10`, `C30`) eşleştirme şemasının `calm-icmal.ts` içine bağlanması. |
| **4** | **Betonarme & Yapısal Kural Motoru (`SmartCheck 3x3` & `ACI 318`)** | `src/smartcheck/import/processor.ts`<br>`src/smartcheck/rules/three-by-three.ts` | ⚠️ **%60 Hazır** | Sunucu (`processor.ts`) şirketin `activeStandard = "ACI_318"` ayarını okuyup `validateThreeByThreeRules` fonksiyonuna geçiriyor. `ACI_318` seçildiğinde %3 metraj sapması (`RULE_3X3_QTO_TOLERANCE_3PCT`) ve STR disiplin kontrolü (`RULE_3X3_LAYER_PRIORITY`) çalışıyor.<br>**Eksik olan %40:** `three-by-three.ts` satır 125’te belirtildiği üzere (`// ACI 318 cover tables are not sourced in this pack`), **ACI 318-19 Table 20.5.1.3.1** beton paspayı kuralları ve ACI 318 büküm/mandrel çapı tabloları henüz koda eklenmemiştir. |
| **5** | **Boşluk Düşümü (`Minha`) ve Kesişim Motoru** | `src/smartcheck/rules/minha.ts`<br>`src/ifc/openings-minha.ts` | ✅ **%80 Hazır** | Motor `CSB_2026` (Türkiye), `DIN_18350` (Almanya VOB/C) ve **`CUSTOM_CONTRACT`** (özel sözleşme eşiği) destekliyor. ABD’de kamusal tek bir minha eşiği olmadığından sözleşmeye veya **ASTM E1557 / CSI / RSMeans** kurallarına göre belirlenir; `CUSTOM_CONTRACT` buna zaten izin vermektedir. Sadece hazır `"US_CSI_RSMEANS"` ön-ayarı eklenebilir. |
| **6** | **Uluslararası BIM Yönetişimi (`ISO 19650` & `LOIN`) vs. Yerel Mevzuat (`e-PYS`, `KİK`, `YAMBİS`)** | `src/smartcheck/rules/iso19650.ts`<br>`src/smartcheck/rules/epys.ts`<br>`src/lib/kik-adt.ts` | ✅ **ISO 19650 %100 Hazır**<br>🇹🇷 **Yerel Modüller TR’ye Özel** | `iso19650.ts` (CDE WIP → SHARED → PUBLISHED iş akışı ve EN 17412-1 LOIN geometrik/alfanümerik tamlık skoru) tamamen uluslararasıdır ve ABD’de **NBIMS-US V4 / ISO 19650** olarak doğrudan kullanılır.<br>Buna karşılık `RG 33331 e-PYS`, `4734 KİK`, `4735 Fiyat Farkı`, `Kat Karşılığı (KDV I/B-8)` ve `YAMBİS` modülleri Türkiye mevzuatına özeldir; `countryCode !== "TR"` seçildiğinde arayüzde otomatik gizlenmelidir. |

---

## 4. ABD ve Global Pazar İçin Tamamlanması Gereken 4 Somut Mühendislik Köprüsü

Mevcut altyapıyı (`9ad2a15`) uçtan uca çalışan bir ABD / Global 5D BIM ürününe dönüştürmek için sıfırdan mimari kurmaya gerek yoktur; yalnızca aşağıdaki **4 bağlantı noktasının** tamamlanması yeterlidir:

### Köprü 1: Çoklu Standart Poz Sınıflandırma Paketi (`src/ifc/calm-icmal.ts`)
- `aec-platform/qto` mimarisi örnek alınarak şirketin `classificationSystem` ayarına göre (`CSB_TR`, `CSI_MASTERFORMAT`, `UNIFORMAT_II`, `DIN_276`, `NRM2_UK`) poz/grup kodlarını üreten deklaratif eşleştirme katmanı eklenecek:
  - **`CSB_TR` (Varsayılan):** `15.150.1005` (C30/37 Beton), `15.180.1003` (Kalıp), `15.160.1003` (Donatı), `15.270.1003` (Şap) vb.
  - **`CSI_MASTERFORMAT` (ABD):** `03 30 00 Cast-in-Place Concrete`, `03 11 00 Concrete Forming`, `03 21 00 Reinforcing Steel`, `04 20 00 Unit Masonry`, `09 29 00 Gypsum Board`, `09 30 00 Tiling`, `09 65 00 Resilient Flooring`, `09 91 00 Painting`.
  - **`UNIFORMAT_II` (ABD / Uluslararası Yatırım):** `A10 Foundations`, `B10 Superstructure`, `B20 Exterior Enclosure`, `C10 Interior Construction`, `C20 Stairs`, `C30 Interior Finishes`.

### Köprü 2: İmperyal (`Imperial`) Birim Gösterim ve Raporlama Katmanı (`src/lib/units.ts`)
- Arka uç (`ifc_extract.py` ve `calm-icmal.ts`) içerde **SI (`m`, `m²`, `m³`, `kg`)** ile hesaplamaya devam edecek (kayan nokta ve dönüşüm hatasını önlemek için en güvenli yöntem).
- Şirketin `measurementSystem === "imperial"` ayarı aktif olduğunda İcmal, Teklif ve Excel/PDF çıktılarında birimler otomatik dönüştürülecek:
  - Hacim (`m³`) → **`cu. yd.` (Cubic Yards, `CY`)** (`1 m³ = 1.30795062 cu. yd.`) veya `cu. ft.`
  - Alan (`m²`) → **`sq. ft.` (Square Feet, `SF`)** (`1 m² = 10.7639104 sq. ft.`)
  - Uzunluk (`m` / `mtül`) → **`lf` (Linear Feet, `LF`)** (`1 m = 3.2808399 ft`)
  - Ağırlık (`kg` / `ton`) → **`lbs` (Pounds)** (`1 kg = 2.20462262 lbs`) veya **`US Short Ton`** (`2,000 lbs`)

### Köprü 3: `ACI 318-19` Betonarme Paspayı ve Büküm Kuralları (`src/smartcheck/rules/three-by-three.ts`)
- `activeStandard === "ACI_318"` seçildiğinde `RULE_3X3_COVER_MIN_ACI318` kuralı devreye girecek (**ACI 318-19 Table 20.5.1.3.1 — Cast-in-place nonprestressed concrete**):
  - Zeminle kalıcı temaslı (`Cast against and permanently in contact with ground`): **75 mm (`3 in.`)**
  - Hava/zemin temaslı (`Exposed to weather or in contact with ground`, `#6` through `#18` bars): **50 mm (`2 in.`)** (`#5` ve altı: **40 mm / `1.5 in.`**)
  - İç ortam döşeme/duvar (`Not exposed to weather — Slabs, joists, walls`, `#11` ve altı): **20 mm (`3/4 in.`)**
  - İç ortam kiriş/kolon (`Not exposed to weather — Beams, columns, pedestals`): **40 mm (`1.5 in.`)**

### Köprü 4: Ülke Bazlı Arayüz ve Mevzuat Görünürlüğü (`Jurisdiction UI Gating`)
- Şirket `countryCode === "TR"` iken tüm Türkiye mevzuat modülleri (`RG 33331 e-PYS`, `4734 KİK Sınır Değer`, `4735 Fiyat Farkı`, `Kat Karşılığı & 6306`, `YAMBİS`) tam kapasiteyle görünür.
- Şirket `countryCode === "US"` (veya `DE`, `GB`, `AE`) seçtiğinde Türkiye’ye özgü kamu ihale/ruhsat modülleri gizlenir; yerine **CSI MasterFormat / UniFormat II BoQ**, **ACI 318 / Eurocode 2 Yapısal Denetim**, **ISO 19650 CDE / LOIN** ve **BYOL (RSMeans / Özel Fiyat Kitabı İçe Aktarım)** akışları öne çıkarılır.
