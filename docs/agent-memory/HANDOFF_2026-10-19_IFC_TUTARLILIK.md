# Handoff Raporu: IFC Kapsam, Veri Tutarlılığı ve Metraj Bütünlüğü Kapısı (2026-10-19)

- **Dal (Branch):** `feat/ifc-consistency-gate` (`main` @ `2a5c8658495a7ad707e2bec4a613dc0eb23b80bd` üzerinden açıldı, push edilmedi)
- **Hesaplama Doğrulama Sürümü:** `BIM-CALC-2026-10-19.30` (`Rev. 36`)
- **Görev Kaynağı:** `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-19_IFC_TUTARLILIK.md` ve `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-19_IFC_TUTARLILIK_DUZELTME.md`

---

## 1. Üretilen Test Fikstürü Dosyaları (`workers/ifc/fixtures/`)

Gerçek bir IFC modelinde karşılaşılabilecek şema ve metraj tutarsızlıklarını deterministik olarak doğrulamak üzere 5 adet geçerli STEP-File (`ISO-10303-21`, `IFC4`) fikstürü oluşturuldu:

1. `workers/ifc/fixtures/duplicate_guid_and_orphan_opening.ifc`
   - Aynı `GlobalId` (`DUPLICATE_GUID_0000001`) değerini paylaşan iki yapı elemanı içerir; Python çıkarıcısı her iki örneği de `elements` listesinde korur ve her ikisi için de `DUPLICATE_GLOBAL_ID` (`severity: "high"`) bulgusu üretir.
   - `IfcRelVoidsElement` ilişkisi bulunmayan sahipsiz bir `IfcOpeningElement` (`ORPHAN_OPENING_0000001`) içerir; yetim boşluk `ORPHAN_OPENING_ELEMENT` (`severity: "high"`) olarak raporlanır ve minha düşümüne katılmaz.
2. `workers/ifc/fixtures/invalid_quantities_and_unassigned_storey.ifc`
   - Negatif (`-4,5 m³`), sıfır (`0,0 m³`) ve eksik QTO/Pset miktarına sahip elemanlar ile `IfcRelContainedInSpatialStructure` ilişkisi olmayan (`Kat atanmamış`) elemanı doğrular; geçerli net miktarı olmayan elemanlar `measured: false`, `measurementStatus: "ölçülemedi"` olarak işaretlenir ve toplama dahil edilmez.
3. `workers/ifc/fixtures/proxy_and_unmapped_poz.ifc`
   - 1 adet `IfcBuildingElementProxy` (`PROXY_ELEM_00000000001`), 1 adet açık `PozNo` etiketi veya eşleşen kaplama katmanı olmayan `IfcCovering` (`COV_UNMAPPED_000000001`) ve 1 adet `TREpys_PozOzellikSeti.PozNo = 15.225.1004` tanımlı `IfcWall` (`WALL_POZ_MATCHED_00001`) içerir. `IfcBuildingElementProxy` metraj toplamlarına ve `elements` çıktısına girmez; `uncoveredElements` altında `"metraja alınmayan eleman"` olarak raporlanır.
4. `workers/ifc/fixtures/type_pset_inheritance.ifc`
   - `IfcRelDefinesByType` üzerinden `IfcWallType.HasPropertySets` (`Pset_WallCommon`, `TREpys_PozOzellikSeti`) üstverilerini (`LoadBearing`, `IsExternal`, `ExposureClass`, `PozNo`) miras alan 2 duvar içerir: birinci duvar tip üstverilerini miras alır (`inheritedFromType: true`), ikinci duvar kendi örnek özellikleriyle tip değerlerini ezer (`instance > type`). Geometrik örnek miktarları (`NetVolume`) tipten miras alınmaz.
5. `workers/ifc/fixtures/assembly_double_count.ifc`
   - Kendi açık pozitif miktarına (`NetVolume = 4,0 m³`) sahip `IfcElementAssembly` (`ASM_PARENT_00000000001`) altındaki 2 adet `IfcBeam` parçasını çift sayımdan koruyarak bastırır (`suppressedAssemblyPartCount = 2`).
   - Kendi miktarı olmayan `IfcElementAssembly` (`ASM_NO_QTO_00000000001`) altındaki `IfcBeam` (`1,5 m³`, `6,0 m²` kalıp) ve `IfcColumn` (`2,5 m³`, `10,0 m²` kalıp) parçalarını rollup yapmadan kendi satırlarında bırakır.
   - `IfcStair`, `IfcStairFlight`, `IfcCurtainWall`, `IfcPlate` ve `IfcMember` sınıflarının `elements` çıktısına ve metraj/kalıp toplamlarına girmediğini, yalnızca `consistencyReport.uncoveredElements` altında raporlandığını doğrular.

---

## 2. Uygulanan 5 Düzeltme Kalemi (`NEXT_AGENT_PROMPT_2026-10-19_IFC_TUTARLILIK_DUZELTME.md`)

1. **Derleme Hatası (`tsc --noEmit`) ve GlobalId Filtreleme Bağlantısı (`CalmIfcWorkspace.tsx` & `IfcCoverageCard.tsx`):**
   - `IfcCoverageCardProps` arayüzü `{ report, elements?, selectedGlobalId?, onSelectGlobalId? }` olarak hizalandı.
   - `CalmIfcWorkspace.tsx` içinde `selectedGlobalId` durumu `<IfcCoverageCard />` bileşenine bağlandı; kapsama kartında açıkta kalan veya bulgulu bir elemana tıklandığında icmal sekmesi bu `GlobalId` için filtrelenir ve üst bilgi çubuğundan (`Filtreyi Temizle`) temizlenebilir.
2. **Uydurma Poz Tablosunun Kaldırılması (`ifc_extract.py`, `legacy-parser.ts`, `calm-icmal.ts`):**
   - `workers/ifc/ifc_extract.py` içindeki `_resolve_matched_poz_code` fonksiyonu ve `src/ifc/parser/legacy-parser.ts` içindeki varsayılan `"15.150.1005"` / `"15.160.1003"` atamaları kaldırıldı; ayrıştırıcı katmanı yalnızca IFC'deki açık `PozNo` etiketini taşır.
   - `src/ifc/calm-icmal.ts` (`classifyMaterialLayer`) içindeki catch-all `pozCode: "15.390.1001"` fallback'i kaldırıldı; açık `PozNo` etiketi olmayan ve hiçbir imalat kuralına uymayan kaplamalara sahte poz kodu yazılmaz.
   - `pozMatchedElementCount`, `pozMatchedRatio` ve icmale yerleşemeyen `uncoveredElements` kayıtları tek doğru kaynak olarak `buildCalmIfcDatasetFromElements` (`src/ifc/calm-icmal.ts`) içinde hesaplanır.
3. **İstenmeyen Kapsam Genişlemesinin Geri Alınması (`primary_types` — `workers/ifc/ifc_extract.py`):**
   - `IfcStair`, `IfcStairFlight`, `IfcCurtainWall`, `IfcPlate`, `IfcMember`, `IfcBuildingElementProxy` sınıfları `primary_types` listesinden çıkarıldı; bu sınıflar `elements` çıktısına ve metraj toplamlarına (`volumeM3`, `areaM2`, `formworkM2`) girmez, yalnızca `consistencyReport.uncoveredElements` altında `"metraja alınmayan eleman"` olarak raporlanır.
4. **Montaj Baskılamanın (`IfcRelAggregates`) Daraltılması (`workers/ifc/ifc_extract.py`):**
   - Alt parça baskılama yalnızca üst eleman kendi pozitif açık miktarına sahipse (`_has_own_positive_explicit_quantity`) ve metraj kapsamındaki bir sınıfsa uygulanır; baskılanan her parça `suppressedAssemblyParts` listesinde açıkça gösterilir.
   - Üst elemanın kendi miktarı yoksa alt parçalar kendi satırlarında kalır (rollup kaldırıldı).
   - `IfcTypeObject.HasPropertySets` mirası yalnızca tip üstverilerini (`pozNo`, `loadBearing`, `exposure`, `exposureClass`, `coverMm`, `discipline`, `materialLayers`) miras alır; geometrik örnek miktarlarını (`NetVolume`, `NetArea`, `GrossVolume`, `Weight`) tipten miras almaz.
5. **Handoff ve Satır Sınırı Doğrulaması:**
   - `src/components/smartcheck/IfcCoverageCard.tsx` **377 satır** (`< 400` satır kuralına tam uyumlu) olarak doğrulandı.

---

## 3. Referans 3 IFC Modelinde Önce (`main`) / Sonra (`feat/ifc-consistency-gate`) Karşılaştırma Tablosu

| Referans IFC Modeli | Metrik | `main` (`2a5c865`) | `feat/ifc-consistency-gate` | Fark / Açıklama |
|---|---|---:|---:|---|
| **`2026_45_MM_XXXX_MD_MMC_NNN_01_duzenlenmis.ifc`** | `elementCount` (`uniqueGuidCount`) | `1731` (`1731`) | `1731` (`1731`) | **%100 aynı** |
| | `totalVolumeM3` | `1559.21 m³` | `1559.21 m³` | **%100 aynı** |
| | `coveringAreaM2` | `6268.95 m²` | `6268.95 m²` | **%100 aynı** |
| | `totalFormworkM2` | `7861.01 m²` | `7861.01 m²` | **%100 aynı** |
| | `pozMatchedElementCount` (Python / Calm İcmal) | — | `0` / `1731` (`%100,0`) | Modelde açık `PozNo` yok; 1.731 elemanın tamamı `calm-icmal.ts` kurallarıyla icmal gruplarına yerleşir |
| | `uncoveredElementCount` / `suppressedAssemblyPartCount` | — | `6` / `0` | 6 adet `IfcStair` / `IfcStairFlight` metraja alınmayan eleman olarak raporlanır |
| **`01_BIMcollab_Example_ARC.ifc`** | `elementCount` (`uniqueGuidCount`) | `335` (`335`) | `335` (`335`) | **%100 aynı** |
| | `totalVolumeM3` | `1166.31 m³` | `1166.31 m³` | **%100 aynı** |
| | `coveringAreaM2` | `2298.11 m²` | `2298.11 m²` | **%100 aynı** |
| | `totalFormworkM2` | `6220.08 m²` | `6220.08 m²` | **%100 aynı** |
| | `pozMatchedElementCount` (Python / Calm İcmal) | — | `0` / `249` (`%74,3`) | Yalnız 249 kaba yapı elemanı icmale yerleşir; İngilizce katmanlı 86 `IfcCovering` sahte poza atılmaz, açıkta kalan olarak raporlanır |
| | `uncoveredElementCount` / `suppressedAssemblyPartCount` | — | `767` / `0` | 681 kapsam dışı (`IfcCurtainWall`/`IfcStair`/`IfcStairFlight`) + 86 eşleşmeyen `IfcCovering` = 767 açıkta kalan; 0 bastırılan parça |
| **`02_BIMcollab_Example_STR_optimized.ifc`** | `elementCount` (`uniqueGuidCount`) | `225` (`225`) | `225` (`225`) | **%100 aynı** |
| | `totalVolumeM3` | `608.40 m³` | `608.40 m³` | **%100 aynı** |
| | `coveringAreaM2` | `0.00 m²` | `0.00 m²` | **%100 aynı** |
| | `totalFormworkM2` | `4039.42 m²` | `4039.42 m²` | **%100 aynı** |
| | `pozMatchedElementCount` (Python / Calm İcmal) | — | `0` / `225` (`%100,0`) | 225 taşıyıcı betonarme elemanın tamamı `calm-icmal.ts` kaba yapı grubuna yerleşir |
| | `uncoveredElementCount` / `suppressedAssemblyPartCount` | — | `0` / `0` | Açıkta kalan veya bastırılan parça yok |

---

## 4. Tutarlılık Kuralları, Ciddiyet Seviyeleri ve Test Kanıtları

| # | Kural Kodu | Ciddiyet | Mühendislik Davranışı | Test Kanıtı |
|---|---|---|---|---|
| 1 | `DUPLICATE_GLOBAL_ID` | `high` | Her iki örnek `elements` içinde korunur ve her ikisi için de `DUPLICATE_GLOBAL_ID` bulgusu üretilir. | `workers/ifc/test_ifc_extract.py::test_consistency_check_1_and_2_duplicate_guid_and_orphan_opening` |
| 2 | `ORPHAN_OPENING_ELEMENT` | `high` | `IfcRelVoidsElement` ilişkisi olmayan boşluklar minha hesabına katılmaz. | `workers/ifc/test_ifc_extract.py::test_consistency_check_1_and_2_duplicate_guid_and_orphan_opening` |
| 3 | `NEGATIVE_NET_QUANTITY` | `high` | Negatif QTO değeri reddedilir; `measured: false`, `measurementStatus: "ölçülemedi"`. | `workers/ifc/test_ifc_extract.py::test_consistency_check_3_and_4_invalid_quantities_and_unassigned_storey` |
| 4 | `ZERO_NET_QUANTITY` | `high` | Sıfır QTO değeri toplama katılmaz; `measured: false`, `measurementStatus: "ölçülemedi"`. | `workers/ifc/test_ifc_extract.py::test_consistency_check_3_and_4_invalid_quantities_and_unassigned_storey` |
| 5 | `MISSING_NET_QUANTITY` | `high` | QTO/Pset/geometri miktarı olmayan eleman `"ölçülemedi"` olarak işaretlenir. | `workers/ifc/test_ifc_extract.py::test_consistency_check_3_and_4_invalid_quantities_and_unassigned_storey`, `src/ifc/calm-icmal.test.ts` |
| 6 | `MISSING_SPATIAL_STOREY` | `medium` | Kat ilişkisi olmayan elemana uydurma kat atanmaz; `"Kat atanmamış"` yazılır. | `workers/ifc/test_ifc_extract.py::test_consistency_check_3_and_4_invalid_quantities_and_unassigned_storey` |
| 7 | `UNCOVERED_PROXY_ELEMENT` / `UNMAPPED_POZ_ELEMENT` | `medium` | `IfcBuildingElementProxy`, `IfcStair`, `IfcCurtainWall` ve icmale yerleşemeyen elemanlar `uncoveredElements` listesinde raporlanır. | `workers/ifc/test_ifc_extract.py::test_consistency_check_5_proxy_and_unmapped_poz_elements`, `workers/ifc/test_ifc_extract.py::test_curtain_wall_and_stair_excluded_from_takeoff_totals_and_formwork`, `src/ifc/calm-icmal.test.ts` |
| 8 | `IfcTypeObject.HasPropertySets` Mirası | — | Yalnızca tip üstverileri (`pozNo`, `loadBearing`, `exposure`, `exposureClass`, `coverMm`, `discipline`, `materialLayers`) miras alınır (`instance > type`). | `workers/ifc/test_ifc_extract.py::test_consistency_check_6_type_pset_inheritance_and_instance_override` |
| 9 | `IfcRelAggregates` Çift Sayım Koruması | — | Yalnızca kendi pozitif açık miktarına sahip üst montajın alt parçaları bastırılır; üst elemanın miktarı yoksa alt parçalar kendi satırlarında kalır (rollup yapılmaz). | `workers/ifc/test_ifc_extract.py::test_consistency_check_7_assembly_double_counting_prevention`, `src/ifc/server-path.e2e.test.ts` |

---

## 5. Çalıştırılan Doğrulama Komutları ve Gerçek Çıktıları

1. `./node_modules/.bin/tsc --noEmit` → **0 hata (exit code 0)**
2. `./node_modules/.bin/tsx --test src/ifc/*.test.ts src/pages/admin/roadmap/content.test.ts` → **66/66 test geçti, 0 hata** *(Not: Depodaki 4 adet DB entegrasyon testi paylaşımlı yerel servislere dokunmama güvenlik kuralı gereği izole PostgreSQL 16 ortamı gerektirir ve yerelde çalıştırılmamıştır).*
3. `workers/ifc/.venv/bin/python -m pytest workers/ifc -q` → **60 passed in 6.15s**
4. `./node_modules/.bin/vite build` → **✓ built (exit code 0)**
