# Açık Kaynak Repolardan Kazanımlar (`Rev. 36`) ve Sıradaki Geliştirme Fırsatları Raporu

- **Tarih:** 19 Ekim 2026
- **İncelenen Dal / Sürüm:** `feat/ifc-consistency-gate` @ `577575d` (`Rev. 36` / `BIM-CALC-2026-10-19.30`)
- **İlgili Önceki Belgeler:**
  - `harici-kaynaklar/raporlar-ve-notlar/Açık Kaynak Repolar ve BIMMetraj’a Katkı Analizi.md`
  - `docs/agent-memory/gelecekteki-global-konumlandırma.md`
  - `docs/agent-memory/HANDOFF_2026-10-19_IFC_TUTARLILIK.md`

---

## 1. Son Durum Özeti (`Rev. 36` — `feat/ifc-consistency-gate`)

Son yapılan 7 commit (`afb92f0` → `577575d`) ile birlikte hem Python çıkarıcı (`workers/ifc/ifc_extract.py`, IfcOpenShell C++ geometri çekirdeğini kullanır), hem yedek TS ayrıştırıcı (`src/ifc/parser/legacy-parser.ts`), hem İcmal motoru (`src/ifc/calm-icmal.ts`) hem de kullanıcı arayüzü (`src/components/smartcheck/IfcCoverageCard.tsx` ve `src/components/smartcheck/CalmIfcWorkspace.tsx`) üzerinde **"IFC Kapsam, Veri Tutarlılığı ve Metraj Bütünlüğü Kapısı"** devreye alınmıştır:

1. **Mevcut Metraj Toplamları %100 Korundu:**
   - Referans 3 IFC modelinde (`2026_45_...duzenlenmis.ifc`, `01_BIMcollab_Example_ARC.ifc`, `02_BIMcollab_Example_STR_optimized.ifc`) `elementCount`, `totalVolumeM3`, `coveringAreaM2` ve `totalFormworkM2` değerleri `main` (`2a5c865`) dalı ile virgülden sonraki hanesine kadar birebir aynı kalmıştır.
2. **Sahte / Varsayılan Poz Atamaları Temizlendi:**
   - Hiçbir kurala uymayan kaplamaları sessizce `15.390.1001` pozuna atan catch-all fallback kaldırıldı; artık eşleşmeyen kalemler uydurma poza girmek yerine şeffaf biçimde **"Açıkta Kalan (`uncoveredElements`)"** olarak raporlanmaktadır.
3. **Kapsam İçi Açıkta Kalan (`in_takeoff`) vs. Kapsam Dışı (`out_of_scope`) Ayrımı Yapıldı (`10bbbda`):**
   - `IfcStair`, `IfcStairFlight`, `IfcCurtainWall` ve `IfcBuildingElementProxy` gibi otomatik metraj kapsamı dışındaki sınıflar toplam eleman sayısını şişirmeden `outOfScopeElementCount` altında ayrı sayılmaktadır.
4. **Test ve Fikstür Kanıtları:**
   - `workers/ifc/fixtures/` altında 5 adet amaca özel STEP/IFC4 test fikstürü oluşturuldu; **60 Python (`pytest`)** ve tam TypeScript paketi (Rev. 36 merge anında 1.079 test, 1.074 geçti, 5 atlandı, 0 başarısız) ile doğrulandı.

---

## 2. Bahsi Geçen Açık Kaynak Repolardan Şu Ana Kadar Hangi Konularda Yararlandık?

`Rev. 36` geliştirmesinde özellikle **#1 `aec-platform/qto`** (https://github.com/aec-platform/qto) ve **#2 `bcirilor/ifcqt`** (https://github.com/bcirilor/ifcqt) repolarının en kritik mühendislik desenleri BIMMetraj mimarisine uyarlanmıştır.

> **Lisans notu:** `bcirilor/ifcqt` reposunun lisansı yoktur; ondan kod alınmamıştır. Aşağıdaki kurallar yalnız fikir olarak alınıp kendi kodumuzla yeniden yazılmıştır. `aec-platform/qto` MIT lisanslıdır; ondan da kod kopyalanmamıştır.


| Kaynak Repo | Repodaki Orijinal Özellik | BIMMetraj’da Nereye ve Nasıl Uyarlandı? | Durum |
| :--- | :--- | :--- | :---: |
| **`bcirilor/ifcqt`** | **`itens` vs. `medidos`** (Toplam eleman ile geçerli miktarı ölçülebilen elemanı ayrı gösterme; sıfır metrajlı elemanı sessizce yutmama) | `src/ifc/types.ts` içinde `totalElementCount`, `measuredElementCount`, `unmeasuredElementCount` ve eleman bazında `measured: boolean`, `measurementStatus: "ölçüldü" \| "ölçülemedi"` eklendi; `src/components/smartcheck/IfcCoverageCard.tsx` üzerinde gösteriliyor. | ✅ **Tamamlandı** |
| **`bcirilor/ifcqt`** | **Check #1 & #2: `sem quantidade` & `quantidade nao positiva`** (Miktarı olmayan, sıfır veya negatif net hacimli/alanlı elemanları yakalama) | `workers/ifc/ifc_extract.py` içine `MISSING_NET_QUANTITY`, `ZERO_NET_QUANTITY` ve `NEGATIVE_NET_QUANTITY` (`severity: "high"`) kuralları eklendi; negatif veya sıfır miktarlar toplamı bozmadan reddediliyor. | ✅ **Tamamlandı** |
| **`bcirilor/ifcqt`** | **Check #3: `duplicate GUID`** (Aynı `GlobalId`’ye sahip mükerrer elemanları yakalama) | `DUPLICATE_GLOBAL_ID` (`severity: "high"`) kuralı eklendi; her iki eleman da silinmeden korunup yüksek öncelikli bulgu olarak işaretleniyor. | ✅ **Tamamlandı** |
| **`bcirilor/ifcqt`** | **Check #4: `abertura sem hospedeiro`** (`IfcRelVoidsElement` ilişkisi olmayan sahipsiz `IfcOpeningElement` boşluklarını yakalama) | `ORPHAN_OPENING_ELEMENT` (`severity: "high"`) kuralı eklendi; duvara/döşemeye bağlanmamış sahipsiz boşluklar minha hesabına karıştırılmadan raporlanıyor. | ✅ **Tamamlandı** |
| **`bcirilor/ifcqt`** | **Check #5: `element outside any storey`** (Hiçbir `IfcBuildingStorey`’e bağlı olmayan elemanları yakalama) | `MISSING_SPATIAL_STOREY` (`severity: "medium"`) kuralı eklendi; katı olmayan elemana uydurma kat atanmıyor, `"Kat atanmamış"` olarak raporlanıyor. | ✅ **Tamamlandı** |
| **`bcirilor/ifcqt`** | **Sentetik Kusurlu IFC Test Fikstürleri (`conftest.py`)** (Dış dosyaya bağımlı olmadan bilerek kusur eklenmiş küçük IFC modelleriyle deterministik test) | `workers/ifc/fixtures/` altında 5 adet amaca özel STEP/IFC4 fikstürü (`duplicate_guid_and_orphan_opening.ifc`, `invalid_quantities_and_unassigned_storey.ifc`, `proxy_and_unmapped_poz.ifc`, `type_pset_inheritance.ifc`, `assembly_double_count.ifc`) üretildi. | ✅ **Tamamlandı** |
| **`aec-platform/qto`** | **Coverage Summary & Unclassified Gaps** (Modelin yüzde kaçının bir poza yerleştiğini ve açıkta kalan `IfcBuildingElementProxy` vb. elemanları raporlama) | `src/ifc/calm-icmal.ts` ve `src/components/smartcheck/IfcCoverageCard.tsx` içinde `pozMatchedElementCount`, `pozMatchedRatio`, `uncoveredElements` (`in_takeoff` vs. `out_of_scope`) ve tıklanabilir `GlobalId` filtrelemesi kuruldu. | ✅ **Tamamlandı** |
| **`aec-platform/qto`** | **Type Property Inheritance (`IfcTypeProduct` → `Occurrence`)** (Elemanın kendisinde olmayan `IsExternal`, `LoadBearing` gibi özellikleri tip nesnesinden miras alma, `instance > type`) | `workers/ifc/ifc_extract.py` içinde `IfcRelDefinesByType` → `IfcTypeObject.HasPropertySets` üzerinden yalnızca üstveriler (`pozNo`, `loadBearing`, `exposure`, `exposureClass`, `coverMm`, `discipline`, `materialLayers`) miras alınıyor (`inheritedFromType: true`), geometrik miktarlar tipten kopyalanmıyor. | ✅ **Tamamlandı** |
| **`aec-platform/qto`** | **Assembly Double-Count Suppression (`parts suppressed`)** (Montaj ve alt parçalarının çift sayılmasını önleme) | `IfcRelAggregates` hiyerarşisinde üst montaj kendi pozitif açık miktarına sahipse alt parçalar bastırılıp `suppressedAssemblyParts` listesinde şeffafça gösteriliyor. | ✅ **Tamamlandı** |

---

## 3. Bu Repolardan Başka Hangi Noktalarda Fayda Sağlayabiliriz? (Sıradaki 5 Somut Fırsat)

Mevcut kod tabanımızı ve **Global Konumlandırma (`docs/agent-memory/gelecekteki-global-konumlandırma.md`)** hedeflerimizi birlikte değerlendirdiğimizde, bu repolardan henüz almadığımız ancak BIMMetraj’a çok yüksek katma değer sağlayacak **5 somut fırsat** şunlardır:

### 🎯 Fırsat 1: `aec-platform/qto` → Çoklu Ülke / Standart Deklaratif Poz Sınıflandırma Motoru (`Classification Packs`)
- **Neden Şimdi Çok Kritik?**
  - Şirket ayarlarımızda (`src/pages/Settings.tsx` ve `companies` tablosu) `classificationSystem` alanı (`CSB_TR`, `CSI_MASTERFORMAT`, `DIN_276`, `NRM2_UK`) zaten mevcuttur.
  - Ayrıca `Rev. 36` ile birlikte `01_BIMcollab_Example_ARC.ifc` gibi **İngilizce katman isimlerine sahip uluslararası IFC modellerinde** kaplama katmanlarının sahte ÇŞB pozuna atılması engellenmiş ve bu 86 eleman `"açıkta kalan"` olarak görünür hale gelmiştir.
- **Nasıl Fayda Sağlarız?**
  - `aec-platform/qto`’daki deklaratif kural yapısını örnek alarak `src/ifc/classification-packs/` altında hem **Türkiye ÇŞB (`CSB_TR` — Türkçe + İngilizce BIM katman sözlüğü)** hem de **ABD (`CSI_MASTERFORMAT` & `UNIFORMAT_II`)**, **Almanya (`DIN_276`)** ve **İngiltere (`NRM2_UK`)** kural paketlerini bağlayabiliriz.
  - Böylece hem İngilizce katmanlı IFC dosyaları (`Acoustic ceiling`, `Ceramic tile`, `Gypsum board`, `Screed`) doğru sınıflandırılır hem de ABD/Avrupa profili seçildiğinde İcmal tablosu uluslararası kodlarla (ve `measurementSystem === "imperial"` ise `sq. ft.` / `cu. yd.` birimleriyle) üretilir.

### 🎯 Fırsat 2: `aec-platform/qto` → Kapsam Dışı (`out_of_scope`) Sınıfların (`IfcStair`, `IfcCurtainWall`, `IfcRailing`) Kontrollü Metrajı ve `2026_45` Astar/Macun Katmanları
- **Neden Önemli?**
  - `Rev. 36`’da `IfcStair` (merdiven), `IfcCurtainWall` (giydirme cephe) ve `IfcBuildingElementProxy` elemanları, betonarme/kalıp toplamlarını bozmaması için haklı olarak `out_of_scope` (kapsam dışı) olarak işaretlendi (ör. `2026_45` modelinde 6 merdiven elemanı, `BIMcollab ARC` modelinde 681 cephe/merdiven elemanı).
  - Ayrıca `2026_45` modelindeki `Astar_2mm` ve `Macun_c` katmanları (2 × `641,98 m²`), boya ve saten alçı miktarını ikiye katlamamak için `uncoveredElements` altında bırakıldı.
- **Nasıl Fayda Sağlarız?**
  - `aec-platform/qto`’da olduğu gibi `IfcStair` / `IfcRailing` / `IfcCurtainWall` elemanlarını kaba yapı beton/kalıp toplamına **karıştırmadan**, İcmal içinde kendi özel imalat gruplarında (**Merdiven İmalatları / Korkuluk (`mtül`) / Giydirme Cephe (`m²`)**) ayrı kalem olarak raporlayabiliriz.
  - `Astar_2mm` ve `Macun_c` katmanlarını ise boya pozuna eklemek yerine kendi bağımsız analiz/poz satırlarına yönlendirerek `2026_45` modelindeki açıkta kalan 2 katmanı da çift sayım olmadan kapatabiliriz.

### 🎯 Fırsat 3: `simondilhas/qto_buccaneer` & `bcirilor/ifcqt` → İki IFC Revizyonu Arasında Metraj ve Maliyet Farkı (`IFC Revision Diff: v1 vs. v2`)
- **Neden Önemli?**
  - Hem `qto_buccaneer` (`Compare Projects`) hem de `bcirilor/ifcqt`’nin şantiye deneyiminde vurguladığı en büyük acı noktası şudur: *"Proje revize edildiğinde metrajı baştan yapmak zorunda kalıyoruz; şantiyenin asıl sorduğu soru 'Bir önceki IFC’ye göre hangi katta ve hangi pozda ne değişti?' sorusudur."*
- **Nasıl Fayda Sağlarız?**
  - Artık her elemanın `GlobalId`, `storey`, `matchedPozCode`, `volumeM3`, `areaM2`, `formworkM2` ve `consistencyReport` verisi deterministik olarak tutuluyor.
  - İki IFC analizini (`Revizyon A` vs. `Revizyon B`) `GlobalId` ve `PozNo / Kat` üzerinden kıyaslayıp:
    - **Yeni Eklenen Elemanlar (`+`)**
    - **Silinen Elemanlar (`-`)**
    - **Boyutu/Miktarı Değişen Elemanlar (`Δ m³ / Δ m² / Δ TL`)**
    tablosunu tek tıkla **Mukayeseli Keşif / Revizyon Fark Raporu** olarak üretebiliriz.

### 🎯 Fırsat 4: `bcirilor/ifcqt` → Kalan 2 Tutarlılık Kuralı (`MISSING_MATERIAL` & `REPEATED_NAME_ON_STOREY`)
- **Neden Önemli?**
  - `bcirilor/ifcqt`’deki 8 kuralın 6’sını (`DUPLICATE_GLOBAL_ID`, `ORPHAN_OPENING_ELEMENT`, `NEGATIVE_NET_QUANTITY`, `ZERO_NET_QUANTITY`, `MISSING_NET_QUANTITY`, `MISSING_SPATIAL_STOREY`) aldık.
  - Kalan 2 kural şunlardır:
    1. **Malzemesi Olmayan Yapı Elemanı (`element with no material`):** Taşıyıcı veya mimari elemanda malzeme (`IfcRelAssociatesMaterial`) hiç tanımlanmamışsa beton sınıfı (`C30/37` vs. `C25/30`) veya duvar cinsi bilinemez.
    2. **İsimsiz veya Aynı Katta Tekrarlanan Eleman İsmi (`element with no name` / `repeated name on floor`):** Yeşil Defter’de satırdan projeye geri izlenebilirliği (traceability) güçlendirmek için bilgi/uyarı seviyesinde eklenebilir.

### 🎯 Fırsat 5: `infra-plan/ifc-material-qto` → Çok Katmanlı Duvar/Döşemelerde Kalınlık-Oranı (`LayerThickness / TotalThickness`) Hacim Bölme Yedeği
- **Neden Önemli?**
  - Bazı üçüncü parti IFC modellerinde çok katmanlı bir duvarın (`IfcMaterialLayerSetUsage`) katman kalınlıkları (`LayerThickness`: 20 mm sıva + 200 mm tuğla + 50 mm taşyünü) tanımlıdır ancak katman bazlı yüzey alanı (`NetSideArea`) export edilmemiştir; sadece toplam duvar hacmi (`NetVolume`) vardır.
- **Nasıl Fayda Sağlarız?**
  - `infra-plan/ifc-material-qto`’daki $\text{Katman Hacmi} = \text{Toplam Hacim} \times \frac{t_{\text{katman}}}{t_{\text{toplam}}}$ ve $\text{Katman Alanı} = \frac{\text{Katman Hacmi}}{t_{\text{katman}}}$ formülünü, yalnızca açık katman alanı bulunmayan modellerde **kontrollü yedek (fallback)** olarak kullanabiliriz.

---

## 4. Özet Öncelik Matrisi

| Öncelik | Aşama | Kaynak İlham | Beklenen Etki | Durum |
| :---: | :--- | :--- | :--- | :---: |
| **Tamamlandı** | **IFC Tutarlılık Kapısı, Tip Mirası, Montaj Çift Sayım Koruması ve `IfcCoverageCard`** | `bcirilor/ifcqt` + `aec-platform/qto` | Sıfır/negatif metraj, host’suz boşluk, mükerrer GUID ve açıkta kalan elemanların şeffaf denetimi | ✅ **`Rev. 36` Hazır** |
| **1. Öncelik** | **`2026_45` Astar/Macun Katmanları + İngilizce IFC Katman Sözlüğü + `IfcStair`/`IfcCurtainWall` Ayrı İcmal Grupları** | `aec-platform/qto` + `Rev. 36` Bulguları | `2026_45` ve `BIMcollab ARC` modellerinde açıkta kalan kaplama ve merdiven/cephe kalemlerinin çift sayımsız icmale kazandırılması | 🔜 **Kısa Vadeli En Yüksek Etki** |
| **2. Öncelik** | **Çoklu Ülke / Standart Poz Sınıflandırma (`CSB_TR` + `CSI_MASTERFORMAT` + `UNIFORMAT_II`) & Imperial Gösterim** | `aec-platform/qto` + `9ad2a15` Altyapısı | Şirket ayarlarındaki `US / DE / GB` seçiminin İcmal tablosunu ve birimleri (`sq. ft.`, `cu. yd.`) gerçek zamanlı dönüştürmesi | 🔜 **Global / ABD Stratejik Etki** |
| **3. Öncelik** | **İki IFC Revizyonu Arasında Metraj & Maliyet Farkı (`IFC v1 vs v2 Diff`)** | `simondilhas/qto_buccaneer` + `bcirilor/ifcqt` | Mimari/Statik revizyon geldiğinde kat ve poz bazında `Δ m² / Δ m³ / Δ TL` fark tablosu | 🔜 **Şantiye & Hakediş Fark Analizi** |


---

## 5. Rev. 37 Durumu (19 Ekim 2026) — Hangi Fırsatlar Uygulandı, Hangileri Bilinçli Olarak Bekletildi

İnceleme sırasında rapordaki fırsatlardan daha önemli bir sorun bulundu: icmal döşeme, kiriş ve kolonu **malzemeye bakmadan** "C30/37 Betonarme" sayıyor, duvarları **eleman adına** göre ayırıyordu. ARC ve STR örneklerinde taş, ahşap, çelik ve bakır boru malzemeli elemanlar betonarme olarak fiyatlanıyordu.

| Fırsat | Karar | Rev. 37'de ne yapıldı |
| :--- | :--- | :--- |
| **4 — Malzemesiz eleman (`ifcqt`)** | ✅ Uygulandı (genişletildi) | Yapısal sınıflandırma malzemeye bağlandı (`src/ifc/structural-material.ts`); `MISSING_MATERIAL` ve `CONCRETE_CLASS_DIFFERS` bulguları. |
| **2 — Kapsam dışı sınıfların metrajı** | ✅ Dürüst biçimde kısmen | Merdiven, giydirme cephe, proxy ve açıkta kalan elemanların modelde yazan miktarı "fiyatlandırılmadı" notuyla gösterilir. Yeni poz/birim fiyat kalemi **eklenmedi**: mühendis doğrulaması gerekir. |
| **4 — İsimsiz / tekrarlanan isim** | ⏸ Bekletildi | Örnek modellerde isimsiz eleman yok; tekrarlanan isim ("Duvar") çok yaygın, kartı gürültüyle doldurur. |
| **1 — İngilizce katman sözlüğü / çok ülkeli sınıflandırma** | ⏸ Bekletildi | ARC'deki 86 kaplamanın 56'sı "Gypsum" (alçıpan asma tavan); mevcut "saten alçı" kuralına eşlemek yanlış olur. Çok ülkeli paketler lansman ve anket sonrasına. |
| **3 — Revizyon farkı** | ⏸ Sonraki aşama | Önce `src/smartcheck/import/processor.ts` içindeki mevcut fark hesabı netleştirilmeli. |
| **5 — Katman kalınlığı oranıyla hacim bölme** | ⏸ Sonraki aşama | Karma katmanlı yapısal elemanlar şimdilik açıkta kalıyor; bu yöntem onları kalemlere ayırmanın adayı. |

Etki ve doğrulama ayrıntısı: `docs/agent-memory/HANDOFF_2026-10-19_IFC_TUTARLILIK.md` §7.
