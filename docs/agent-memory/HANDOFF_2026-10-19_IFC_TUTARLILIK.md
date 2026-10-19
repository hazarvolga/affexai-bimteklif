# Handoff Raporu: IFC Kapsam, Veri Tutarlılığı ve Metraj Bütünlüğü Kapısı (2026-10-19)

- **Dal (Branch):** `feat/ifc-consistency-gate` (`main` @ `2a5c8658495a7ad707e2bec4a613dc0eb23b80bd` üzerinden açıldı, push edilmedi)
- **Hesaplama Doğrulama Sürümü:** `BIM-CALC-2026-10-19.30` (`Rev. 36`)
- **Görev Kaynağı:** `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-19_IFC_TUTARLILIK.md`

---

## 1. Üretilen Test Fikstürü Dosyaları (`workers/ifc/fixtures/`)

Gerçek bir IFC modelinde karşılaşılabilecek şema ve metraj tutarsızlıklarını deterministik olarak doğrulamak üzere 5 adet geçerli STEP-File (`ISO-10303-21`, `IFC4`) fikstürü oluşturuldu:

1. `workers/ifc/fixtures/duplicate_guid_and_orphan_opening.ifc`
   - Aynı `GlobalId` (`DUPLICATE_GUID_0000001`) değerini paylaşan `IfcWall` (`NetVolume = 12,0 m³`) ve `IfcSlab` (`NetVolume = 99,0 m³`) içerir; ilk örnek korunur, mükerrer elenir.
   - `IfcRelVoidsElement` ilişkisi bulunmayan sahipsiz bir `IfcOpeningElement` (`ORPHAN_OPENING_0000001`) içerir; yetim boşluk minha düşümüne katılmaz.
2. `workers/ifc/fixtures/invalid_quantities_and_unassigned_storey.ifc`
   - `NetVolume = -4,5 m³` olan `IfcBeam`, `NetVolume = 0,0 m³` olan `IfcColumn`, hiçbir QTO/Pset miktarı olmayan `IfcSlab` ve `IfcRelContainedInSpatialStructure` ilişkisi olmayan (`Kat atanmamış`) `IfcWall` (`NetVolume = 8,25 m³`) içerir.
3. `workers/ifc/fixtures/proxy_and_unmapped_poz.ifc`
   - 1 adet `IfcBuildingElementProxy`, 1 adet PozNo/sınıflandırması olmayan `IfcSlab` ve 1 adet `TREpys_PozOzellikSeti.PozNo = 15.150.1005` tanımlı `IfcColumn` içerir (`coveredRatio = 2/3`, `pozMappedRatio = 1/3`).
4. `workers/ifc/fixtures/type_pset_inheritance.ifc`
   - `IfcRelDefinesByType` üzerinden `IfcColumnType.HasPropertySets` (`Pset_ConcreteElementGeneral`, `TREpys_PozOzellikSeti`) özelliklerini miras alan 2 kolon içerir: birinci kolon tüm özellikleri tipten miras alır (`C35/45`, `15.150.1006`, `35 mm`), ikinci kolon örnek düzeyinde `PozNo = 15.150.9999` tanımlayarak tip değerini ezer (`instance > type`).
5. `workers/ifc/fixtures/assembly_double_count.ifc`
   - Kendi `Qto_ElementAssemblyBaseQuantities.NetVolume = 10,0 m³` niceliğine sahip `ASM_WITH_OWN_QTO_00001` montajının alt parçalarını (`4,0 + 6,0 m³`) çift sayımdan koruyarak bastırır (`suppressedAssemblyPartCount = 2`).
   - Kendi QTO'su olmayan `ASM_ROLLUP_PARTS_00001` montajının alt parçalarını (`2,5 + 3,5 = 6,0 m³`) ana montaj altında toplar (`assemblyRollupCount = 1`, toplam hacim `16,0 m³`).

---

## 2. `workers/ifc/ifc_extract.py` ve TypeScript Şemasında Yapılan Değişiklikler

- **Python Çıkarıcı (`workers/ifc/ifc_extract.py`):**
  - `_build_type_pset_Lookup`: `IfcRelDefinesByType` ve `IfcTypeObject.HasPropertySets` üzerinden tip özelliklerini okur; örnek (`IfcRelDefinesByProperties`) özellikleri her zaman tip özelliklerini ezer.
  - `_build_aggregation_lookup`: `IfcRelAggregates` ilişkilerini tarar; üst `IfcElementAssembly` kendi pozitif QTO'suna sahipse alt parçaları `suppressedAssemblyParts` listesine alır ve metraj toplamından hariç tutar; üst montajın QTO'su yoksa alt parçaların ölçülen net hacimlerini üst montajda toplar (`IfcRelAggregates/ChildRollup`).
  - Mükerrer `GlobalId` kontrolü, sahipsiz `IfcOpeningElement` kontrolü, `<= 0` / eksik QTO (`measured: False`, `measurementStatus: "ölçülemedi"`) kapısı, `"Kat atanmamış"` kontrolü ve `consistencyReport` (`IfcConsistencyReport`) çıktısı eklendi.
- **TypeScript Şema & Kanıt Hattı (`src/ifc/types.ts`, `src/smartcheck/import/ifc-python-runner.ts`, `src/ifc/smartcheck-evidence.ts`, `src/ifc/parser/legacy-parser.ts`, `src/ifc/calm-icmal.ts`):**
  - `IfcConsistencyFindingCode`, `IfcConsistencyFinding`, `IfcUncoveredElementRecord`, `IfcSuppressedAssemblyPartRecord` ve `IfcConsistencyReport` tipleri tanımlandı.
  - `ifc-python-runner.ts` içindeki `consistencyReportSchema` Zod doğrulamasıyla Python çıktısını doğrular.
  - `legacy-parser.ts` tarayıcı ön analizinde aynı 7 kuralı çalıştırarak `summary.consistencyReport` üretir (`e-proje_4x3.manifest.json` geriye dönük uyumluluğu korunarak).
  - `calm-icmal.ts` içinde ölçüsü olmayan elemanlar `0 m³` olarak toplama sızdırılmaz; `dataset.consistencyReport` doğrudan `<CalmIfcWorkspace />` ve `<IfcCoverageCard />` bileşenlerine aktarılır.

---

## 3. Tutarlılık Kuralları, Ciddiyet Seviyeleri ve Test Kanıtları

| # | Kural Kodu | Ciddiyet | Mühendislik Davranışı | Test Kanıtı |
|---|---|---|---|---|
| 1 | `DUPLICATE_GLOBAL_ID` | `high` | İlk örnek korunur, mükerrer örnekler metraj toplamından elenir. | `workers/ifc/test_ifc_extract.py::test_fixture_duplicate_guid_and_orphan_opening`, `src/ifc/calm-icmal.test.ts`, `src/ifc/server-path.e2e.test.ts` |
| 2 | `ORPHAN_OPENING_ELEMENT` | `high` | `IfcRelVoidsElement` ilişkisi olmayan boşluklar minha hesabına katılmaz. | `workers/ifc/test_ifc_extract.py::test_fixture_duplicate_guid_and_orphan_opening`, `src/ifc/server-path.e2e.test.ts` |
| 3 | `NEGATIVE_NET_QUANTITY` | `high` | Negatif QTO değeri reddedilir; `measured: false`, `measurementStatus: "ölçülemedi"`. | `workers/ifc/test_ifc_extract.py::test_fixture_invalid_quantities_and_unassigned_storey` |
| 4 | `ZERO_NET_QUANTITY` | `high` | Sıfır QTO değeri toplama katılmaz; `measured: false`, `measurementStatus: "ölçülemedi"`. | `workers/ifc/test_ifc_extract.py::test_fixture_invalid_quantities_and_unassigned_storey` |
| 5 | `MISSING_NET_QUANTITY` | `medium` | QTO/Pset/geometri miktarı olmayan eleman `"ölçülemedi"` olarak işaretlenir. | `workers/ifc/test_ifc_extract.py::test_fixture_invalid_quantities_and_unassigned_storey`, `src/ifc/calm-icmal.test.ts` |
| 6 | `MISSING_SPATIAL_STOREY` | `medium` | Kat ilişkisi olmayan elemana uydurma kat atanmaz; `"Kat atanmamış"` yazılır. | `workers/ifc/test_ifc_extract.py::test_fixture_invalid_quantities_and_unassigned_storey`, `src/ifc/server-path.e2e.test.ts` |
| 7 | `UNCOVERED_PROXY_ELEMENT` / `UNMAPPED_POZ_ELEMENT` | `medium` | `IfcBuildingElementProxy` ve PozNo eşleşmesi olmayan elemanlar `uncoveredElements` listesinde raporlanır. | `workers/ifc/test_ifc_extract.py::test_fixture_proxy_and_unmapped_poz`, `src/ifc/calm-icmal.test.ts` |
| 8 | `IfcTypeObject.HasPropertySets` Mirası | — | `IfcRelDefinesByType` özellikleri örneğe miras alınır (`instance > type`). | `workers/ifc/test_ifc_extract.py::test_fixture_type_pset_inheritance`, `src/ifc/server-path.e2e.test.ts` |
| 9 | `IfcRelAggregates` Çift Sayım Koruması | — | Kendi QTO'su olan `IfcElementAssembly` alt parçaları bastırılır; yoksa alt parçalar toplanır. | `workers/ifc/test_ifc_extract.py::test_fixture_assembly_double_count`, `src/ifc/server-path.e2e.test.ts` |

---

## 4. `<IfcCoverageCard />` Ekran Görüntüsü ve Erişilebilirlik Doğrulaması

- **Bileşen:** `src/components/smartcheck/IfcCoverageCard.tsx` (368 satır `< 400`, tüm alt fonksiyonlar `< 50` satır, Pafta Tasarım Sistemi semantik tokenları, sıfır ham hex renk).
- **Gerçek Chromium + `axe-core` WCAG 2.2 AA Denetimi:**
  - `/app/ifc-parser` rotasında `duplicate_guid_and_orphan_opening.ifc` fikstürü yüklendi ve `Yüksek: 3` filtresi açılarak bulgu çekmecesi genişletildi.
  - Açık Pafta (`lightViolations: 0`) ve Gece Paftası (`darkViolations: 0`) modlarında **0 ihlal** doğrulandı.
  - Ekran görüntüleri artifact dizinine kaydedildi: `ifc_coverage_card_light.png` ve `ifc_coverage_card_dark.png`.

---

## 5. Çalıştırılan Doğrulama Komutları ve Çıktıları

1. `npx tsc --noEmit` → **0 hata (exit code 0)**
2. `npx tsx --test src/ifc/*.test.ts src/pages/admin/roadmap/content.test.ts src/capabilities/registry.test.ts src/lib/a11y-audit.test.ts` → **77/77 test geçti (0 hata)** *(Not: `npx tsx --test "src/**/*.test.ts"` içindeki 4 DB entegrasyon testi paylaşımlı yerel veritabanına dokunmama güvenlik kuralı gereği tasarım olarak izole PostgreSQL 16 bekler; birim ve E2E testlerin tamamı yeşildir).*
3. `workers/ifc/.venv/bin/python -m pytest workers/ifc -q` → **59 passed in 5.22s**
4. `npx vite build` → **✓ built in 6.37s (`index` chunk 105,41 kB / 33,82 kB gzip)**
5. `node scripts/dependency-audit-policy.mjs` → **`{ "blocked": [] }` (exit code 0)**
6. `graphify update .` → **Rebuilt: 11220 nodes, 16411 edges, 922 communities**

---

## 6. Canlıya Alınmadan Önce Yapılması Gereken Son Kontroller

1. `feat/ifc-consistency-gate` dalındaki commit'in incelenip `main` dalına merge edilmesi ve GitHub Actions `Verify` iş akışının (izole PostgreSQL 16 + Python worker + Docker build) yeşil olduğunun teyit edilmesi.
2. Coolify üzerinden `ifc-worker`, `worker` ve `app` konteynerlerinin yeniden derlenerek yayınlanması (`workers/ifc/ifc_extract.py` değişikliklerinin `ifc-worker` imajına girmesi için).
3. Canlı ortamda (`/app/smartcheck`) örnek bir IFC4 modeli yüklenerek `<IfcCoverageCard />` metriklerinin sunucu kuyruğu (`ifc-worker`) üzerinden de eksiksiz görüntülendiğinin kontrol edilmesi.
