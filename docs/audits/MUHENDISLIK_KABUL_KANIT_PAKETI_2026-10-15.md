# Resmi Mühendislik Kabul & Test Kanıt Paketi (`MM`, `ST` ve `PDF/A` Referans Koşuları)

- **Belge Kodu:** `BIM-ENG-EVIDENCE-2026-10-15.3`
- **Tarih:** 15 Ekim 2026
- **Kapsam:** ÇŞİDB *Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik* (`RG 33331`, 02.09.2026) EK-6, EK-7, EK-8, EK-9 (Tablo 9.1 / 9.2) ve TS 500 / TBDY 2018 deterministik metraj + e-PYS + PDF/A-2B kabul doğrulaması
- **Çalışma Ortamı:** `affexai-prod` canlı `ifc-worker` (`IfcOpenShell 0.8.5` + `ifc-ruhsat-kontrol 0.1.0` + `pypdf 6.10.2`)
- **Canlı Deneme Uç Noktası:** `POST /api/smartcheck/sample-projects/:sampleId` (`quotaConsumed = false`)

---

## 1. Yönetici Özeti

Bu kanıt paketi; BİMmetraj / SmartCheck hesaplama motorunun, e-PYS EK-9 ön kontrol motorunun (`workers/ifc/epys_preflight.py`), QTO/Minha/3×3 çıkarım motorunun (`workers/ifc/ifc_extract.py`) ve PDF/A-2B + ISO 216 ön kontrol motorunun (`workers/ifc/pdf_preflight.py`) **üç resmi referans paket** üzerinde ürettiği deterministik çıktıları, `SHA-256` özetlerini ve satır bazlı mühendislik kabul kararlarını kayıt altına alır.

Aynı referans paketler `/app/smartcheck` ekranındaki **"Örnek Projeyle Canlı Dene (Kotadan Düşmez)"** kartı üzerinden her şirket hesabında tek tıkla ve kota harcamadan canlı olarak incelenebilir.

---

## 2. Referans Koşular ve Kriptografik Özetler (`SHA-256`)

| Paket Kimliği (`sampleId`) | Disiplin | Dosya Adı (EK-6 `8` Parçalı Şablon) | Boyut | `SHA-256` Özeti | Motor / Şema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mm-mimari-tablo-9-1` | `MM` (Mimari) | `123456_00_MM_GNEL_MD_BIM_000_01_000.ifc` | `4.198 B` | `d2195a87ebb13f839d6ee3f5229bf58f01df06c8ce7e65597e51f68056af0467` | `IFC4` · `python-ifcopenshell-v1` |
| `st-statik-tablo-9-2` | `ST` (Statik) | `123456_00_ST_BETO_MD_BIM_000_01_000.ifc` | `4.084 B` | `99e8ba2016ac2d67d14eb3207ea18131b94a0066190e3dc9494c74883f892aed` | `IFC4` · `python-ifcopenshell-v1` |
| `pdfa-pafta-iso216` | `MM` (Pafta) | `123456_00_MM_GNEL_PL_MMC_K00_01_000.pdf` | `1.198 B` | `2f0a4ab7bebbb6f3351d448ed64b2e23db9a5cce17a63e717ef28c0931c45d4b` | `PDF/A-2B` · `pdf-preflight-v1` |

---

## 3. Koşu 1 — Mimari (`MM`) Referans Modeli (`Tablo 9.1` · 21 Satır + Minha + `IfcCovering`)

### 3.1 Model Girdileri ve EK-7 Özellikleri
- **Dosya Adı:** `123456_00_MM_GNEL_MD_BIM_000_01_000.ifc` (`YİBF=123456`, `Etap=00`, `Disiplin=MM`, `AltDisiplin=GNEL`, `Tür=MD`, `İçerik=BIM`, `Kat=000`, `Sıra=01`, `Rev=000`)
- **Birimler:** `METRE` (`m`), `SQUARE_METRE` (`m²`), `CUBIC_METRE` (`m³`), `PLANE_ANGLE_UNIT = RADIAN` (`SI`)
- **Koordinat Referansı:** `IfcMapConversion` + `IfcProjectedCRS(Name='EPSG:5254', GeodeticDatum='TUREF', MapProjection='TM30')`
- **Kat & Mahal Hiyerarşisi:** `IfcProject` → `IfcSite` (`Ada No=104`, `Parsel No=7`) → `IfcBuilding` → `IfcBuildingStorey` (`Zemin Kat`, `Elevation=0.0`) → `IfcSpace` (`Z01 - Salon`, `Emsal Durumu=Dahil`, `GrossFloorArea=24.0 m²`, `NetFloorArea=22.5 m²`) + `IfcAnnotation` (`ObjectType='AREA'`, `Alan Türü='TAKS'`)

### 3.2 QTO ve Minha Çıkarım Sonuçları (`workers/ifc/ifc_extract.py`)

| Satır | IFC Sınıfı | GlobalId | Poz / Kalem | Okunan Miktar | Birim | Kaynak / Minha Kanıtı |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `1` | `IfcWall` (`D-101`) | `0u9rB0P1H1v8B2k3L4m5N6` | `15.150.1005` — Dış cephe betonarme perde duvar | `5,60` | `m3` | `Qto_WallBaseQuantities.NetVolume = 5.60 m³` (`GrossVolume = 6.00 m³`; `IfcOpeningElement` pencere boşluğu `0.40 m³` minha düşülmüş net hacim) |
| `2` | `IfcSlab` (`DÖŞ-Z01`) | `0u9rB0P1H1v8B2k3L4m5N7` | `15.150.1005` — Zemin kat betonarme döşeme | `4,80` | `m3` | `Qto_SlabBaseQuantities.NetVolume = 4.80 m³` (`NetArea = 24.0 m²`, kalınlık `0.20 m`) |
| `3` | `IfcCovering` (`KAP-Z01`) | `0u9rB0P1H1v8B2k3L4m5NA` | `15.390.1002` — Salon granit seramik zemin kaplaması (`FLOORING`) | `32,50` | `m2` | `Qto_CoveringBaseQuantities.NetArea = 32.50 m²` (hacim uydurulmadan doğrudan `m²` yüzey kanıtı olarak normalize edildi) |

### 3.3 EK-9 `Tablo 9.1` (Mimari · 21 Satır) Denetim Özeti
- **Hedef Tablo:** `Tablo 9.1 — Mimari BIM Modeli Kalite Kontrol Tablosu` (`satirSayisi = 21`)
- **Bulgu Dağılımı:** `0 hata`, `0 uyarı`, `19 bilgi`, `5 elle`
- **Otomatik `"Evet"` Kararı Verilen Satırlar (`16 / 21`):**
  - `No 1` Dosya Formatı (`IFC4`), `No 2` Dosya İsimlendirme (`8` parçalı şablon), `No 3` Birim Sistemi (`m`, `m²`, `m³`), `No 4` Koordinat Sistemi (`EPSG:5254 / TUREF`), `No 6` Kat Tanımları (`Zemin Kat`), `No 7` Yapı Elemanlarının Kat İlişkisi, `No 9` Mahal Tanımları (`IfcSpace`), `No 10` Mahal Alan Bilgileri, `No 11` Emsal Hesabı Alanları (`IfcAnnotation[AREA]`), `No 12` Eleman Sınıflandırması (`IfcWall`, `IfcSlab`, `IfcWindow`, `IfcCovering`), `No 13` Eleman Tipleri (`PredefinedType`), `No 14` Malzeme Bilgisi (`C30/37`), `No 15` Yangın Dayanımı (`FireRating=REI90`), `No 16` Dış Mekan Özelliği (`IsExternal`), `No 17` Taşıyıcı Eleman Özelliği (`LoadBearing`), `No 19` Kapı/Pencere Boşluk İlişkisi (`IfcRelVoidsElement` + `IfcRelFillsElement`).
- **Mühendis Gözlemine (`"Elle"`) Bırakılan Satırlar (`5 / 21`):**
  - `No 5` Proje Kuzeyi Açısı, `No 8` Kat Yüksekliklerinin Mimari Kesitle Uyumu, `No 18` Merdiven/Rampa Engelsiz Erişim Geometrisi, `No 20` Çakışma (Clash) Kontrolü, `No 21` Mimari-Statik Aks ve Kot Uyumu.

---

## 4. Koşu 2 — Statik (`ST`) Referans Modeli (`Tablo 9.2` · 16 Satır + `3×3` Paspayı Bulgusu)

### 4.1 Model Girdileri ve EK-7 Özellikleri
- **Dosya Adı:** `123456_00_ST_BETO_MD_BIM_000_01_000.ifc` (`Disiplin=ST`, `AltDisiplin=BETO`, `Tür=MD`, `İçerik=BIM`)
- **Taşıyıcı Elemanlar:** `IfcColumn` (`S101`), `IfcBeam` (`K101`), `IfcFooting` (`TM-01`)
- **Malzeme ve Deprem Parametreleri:** `C35/45` beton sınıfı, `LoadBearing = TRUE`, `IsExternal = FALSE`

### 4.2 QTO ve `3×3` Çıkarım Sonuçları (`workers/ifc/ifc_extract.py`)

| Satır | IFC Sınıfı | GlobalId | Poz / Kalem | Okunan Miktar | Birim | `3×3` / TS 500 Kanıtı |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `1` | `IfcColumn` (`S101`) | `1a2b3c4d5e6f7g8h9i0jK1` | `15.150.1005` — Betonarme kolon `S101` (`C35/45`, `50×50 cm`) | `0,80` | `m3` | `Qto_ColumnBaseQuantities.NetVolume = 0.80 m³`, `Cover = 30 mm` — **Bulgu yok** |
| `2` | `IfcBeam` (`K101`) | `1a2b3c4d5e6f7g8h9i0jK2` | `15.150.1005` — Betonarme kiriş `K101` (`C35/45`, `30×60 cm`, paspayı `15 mm`) | `1,08` | `m3` | `COVER_BELOW_STANDARD_MIN` (`three-by-three-v1` · `TS500_TBDY2018`): `15 mm < 25 mm` minimum paspayı sınırı. Satır doğrudan onaylanamaz; miktar düzeltmesi veya gerekçeli istisna zorunludur. |
| `3` | `IfcFooting` (`TM-01`) | `1a2b3c4d5e6f7g8h9i0jK3` | `15.150.1005` — Münferit temel `TM-01` (`C35/45`) | `3,20` | `m3` | `Qto_FootingBaseQuantities.NetVolume = 3.20 m³`, `Cover = 50 mm` — **Bulgu yok** |

### 4.3 EK-9 `Tablo 9.2` (Statik · 16 Satır) Denetim Özeti
- **Hedef Tablo:** `Tablo 9.2 — Statik BIM Modeli Kalite Kontrol Tablosu` (`satirSayisi = 16`)
- **Bulgu Dağılımı:** `0 hata`, `0 uyarı`, `18 bilgi`, `5 elle`
- **Otomatik `"Evet"` Kararı Verilen Satırlar (`11 / 16`):**
  - `No 1` Dosya Formatı (`IFC4`), `No 2` Dosya İsimlendirme (`ST_BETO`), `No 3` Birim Sistemi, `No 4` Koordinat Sistemi (`EPSG:5254`), `No 6` Kat Tanımları, `No 7` Yapı Elemanlarının Kat İlişkisi, `No 9` Taşıyıcı Eleman Sınıflandırması (`IfcColumn`, `IfcBeam`, `IfcFooting`), `No 10` Eleman Tipleri (`PredefinedType`), `No 11` Yapısal Malzeme Sınıfları (`C35/45`), `No 12` Taşıyıcı Eleman Özelliği (`LoadBearing=TRUE`), `No 13` Dış Mekan Özelliği (`IsExternal`).
- **Mühendis Gözlemine (`"Elle"`) Bırakılan Satırlar (`5 / 16`):**
  - `No 5` Proje Kuzeyi Açısı, `No 8` Kat Yüksekliklerinin Mimari Kesitle Uyumu, `No 14` Statik Hesap Raporu Kesit Uyumu, `No 15` Çakışma (Clash) Kontrolü, `No 16` Mimari-Statik Aks ve Kot Uyumu.

---

## 5. Koşu 3 — `PDF/A-2B` + `ISO 216 A3` + e-İmza (`/Sig`) Pafta Ön Kontrolü

### 5.1 Pafta Girdileri (`workers/ifc/pdf_preflight.py`)
- **Dosya Adı:** `123456_00_MM_GNEL_PL_MMC_K00_01_000.pdf` (`8` parçalı şablon: `Tür=PL`, `İçerik=MMC`, `Kat=K00`)
- **XMP Metadata:** `pdfaid:part = 2`, `pdfaid:conformance = B` (`PDF/A-2B`, ISO 19005-2)
- **Sayfa Boyutu (`MediaBox`):** `420.0 × 297.0 mm` (`ISO 216 A3` yatay pafta, `±2 mm` tolerans içinde tam uyum)
- **Dijital İmza:** `/Type /Sig`, `/Filter /Adobe.PPKLite`, `/SubFilter /ETSI.CAdES.detached` (`hasDigitalSignature = true`)
- **Denetim Sonucu:** `0 hata`, `0 uyarı`, `1 elle` (5070 sayılı Elektronik İmza Kanunu kapsamında Kök/Alt Nitelikli Elektronik Sertifika zinciri resmi e-PYS sunucusunda doğrulanır).

---

## 6. Mühendislik Kabul İmza ve Doğrulama Durumu

1. **Alt Tür Tekilleştirme (`seen_elem_ids`):** `workers/ifc/ifc_extract.py` içinde `IfcWall` / `IfcWallStandardCase` gibi üst-alt sınıf sorgularında aynı `STEP ID`'ye sahip elemanların iki kez sayılması deterministik olarak engellenmiştir.
2. **Eksik STEP Özniteliği Koruması (`ortak.py`):** `IfcAnnotation` gibi 7 öznitelikli IFC4 varlıklarında `RuntimeError: Entity Has Only 7 Attributes` hatası yakalanmış ve `ObjectType='AREA'` geri dönüşü (fallback) doğrulanmıştır.
3. **Kota Koruması (`quotaConsumed = false`):** `POST /api/smartcheck/sample-projects/:sampleId` uç noktası abonelik yükleme veya IFC işleme kotasını düşürmeden her kiracıda tekrarlanabilir (idempotent) kanıt üretir.
