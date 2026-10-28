# Açık IFC örnekleri — karşılaştırma çalışma cetveli (28 Ekim 2026)

## Kapsam ve kaynak

Bu çalışma, buildingSMART International'ın [Certification-datasets](https://github.com/buildingSMART/Certification-datasets/tree/80d976a9b193a26a8e928c3e79bff67af1de68a8) deposunun `80d976a9b193a26a8e928c3e79bff67af1de68a8` sürümündeki, [CC BY 4.0 lisanslı](https://github.com/buildingSMART/Certification-datasets/blob/80d976a9b193a26a8e928c3e79bff67af1de68a8/LICENSE) üç açık IFC örneği üzerindedir. Atıf: © buildingSMART International Ltd., CC BY 4.0. Depodaki [atıf kaydı](../../../fixtures/phase-0/open-source/ATTRIBUTION.md) ve [fixture kayıt defteri](../phase-0/open-source-fixture-register.json) her örneğin upstream yolunu, sürümünü, kullanım sınırını ve SHA-256 değerini içerir.

28 Ekim'de hem depodaki dosyalar hem de yukarıdaki sabitlenmiş upstream dosyaları ayrı okunup SHA-256 ile karşılaştırıldı; üçü de kayıt defteriyle eşleşti. Bu eşleşme kaynak bütünlüğünü gösterir; bağımsız mühendislik doğruluğu göstermez. Özel e-proje ve müşteri dosyaları açılmadı.

| Örnek | SHA-256 | Kaynak |
|---|---|---|
| IFC2X3 mimari | `c4db65ba847f6b369a95d6c54fa11f4750cbe6d59f021934e8923d8d578e5885` | `fixtures/phase-0/open-source/buildingsmart/ifc2x3-building-architecture.ifc` |
| IFC4 duvar/boşluk/pencere | `73b0e45d931d5dc13bfee5fdc7bd80f796526445458b2de74c4168d209097832` | `fixtures/phase-0/open-source/buildingsmart/ifc4-wall-opening-window.ifc` |
| IFC4X3 taşıyıcı | `db64895488aad4eab082c8292f5632145b0fc864c0642d4fe667404882bacf27` | `fixtures/phase-0/open-source/buildingsmart/ifc4x3-building-structural.ifc` |

## Yöntem ve ölçülen çıktı

Her açık dosya geçici bir yerel klasöre worker CLI ile işlendi; veritabanı, üretim servisi, özel dosya veya ağ depolaması kullanılmadı. Python 3.12.13, IfcOpenShell 0.8.4.post1 ve `workers/ifc/ifc_extract.py` SHA-256 `7d107780aa54d254372f682f85062cfa136dceda82f9d79866b6d8f381d22b04` kullanıldı. Çıktılar otomatik run ID içerir ve çıktı hashleri her çalışmada değişebilir. Aşağıdaki rakamlar **motor gözlemleridir**, bağımsız referans miktar değildir.

| Gözlem | IFC2X3 | IFC4 duvar | IFC4X3 |
|---|---:|---:|---:|
| Worker eleman sayısı | 7 | 1 | 10 |
| Eleman miktar kaynağı | 7 QTO | 1 estimate / ölçülmemiş | 10 QTO |
| Özellik kaynağı (`property`) | 0 | 0 | 0 |
| Gözlenen toplam hacim (m³) | 29,97 | 0 (ölçüm yok) | 11,50 |
| Gözlenen toplam kalıp (m²; türetilmiş) | 165,95 | 0 (ölçüm yok) | 110,09 |
| Poz numarası olmayan worker elemanı | 7 | 1 | 10 |
| Worker inceleme durumlu eleman | 7 | 1 | 10 |
| Medium tutarlılık bulgusu | 7 | 1 | 8 |
| `qualityGate.passed` | true | false | true |

Model birimleri üçünde de uzunluk için `MILLI/METRE`, alan için `SQUARE_METRE`, hacim için `CUBIC_METRE` olarak bildirildi. Bu değerler yalnız IFC birim beyanıdır; bunlardan tek başına işleyicinin tüm dönüşümlerinin doğru olduğu çıkarılmaz. IFC2X3 bulguları iki `MISSING_SPATIAL_STOREY` ve beş `UNCOVERED_PROXY_ELEMENT`; IFC4X3 altı ve iki olarak aynı sınıflardadır. Proxy bulguları consistency raporundaki kapsam dışı elemanlara ilişkindir; worker eleman satırı sayısına doğrudan eklenmemelidir.

**IFC4 önce/sonra:** Önceki worker aynı dosyada geometri kaynaklı 1.500.000.000 m³ ve 10.000.000 m² türetilmiş kalıp yazmış, bulgusuz `qualityGate.passed=true` üretmişti. Son worker, birden çok `IfcContext` nedeniyle geometri motorunun birim dönüşümünü güvenilir saymıyor ve bu geometri fallback'ini kullanmıyor: `GEOMETRY_CONTEXT_UNVERIFIED` (medium), `MISSING_NET_QUANTITY` (high), ölçülmemiş eleman ve `qualityGate.passed=false` üretiyor. Yukarıdaki sıfırlar **sıfır gerçek miktar değil, hesaplanmamış miktardır**. Açık QTO/özellik kanıtları bu geometri sınırlamasından ayrı değerlendirilir; ancak IfcCovering için doğrudan QTO uzunluk okuması mevcut destek kapsamında değildir. Ayrı ölçeklenen eğri yolu geometri iterator yolundan farklıdır.

Kontrollü sentetik testte aynı açık dosyanın geçici bir kopyasından `IfcProjectLibrary` kaldırıldığında geometri hacmi 1,5 m³ bulunmuştur. Bu değiştirilmiş kopya orijinal kaynak dosya değildir; bu rakam bağımsız uzman metrajı veya mühendislik kabulü değildir. Guard, çoklu bağlamda güvensiz geometriyi engelleyen dar bir önlemdir; bütün IFC geometri ve birim durumlarının doğruluğunu kanıtlamaz.

## Test kanıtı ve eksikler

- `python -m pytest -q workers/ifc/test_ifc_extract.py -k 'not authoring_software_raw_is_extracted_from_real_header'`: **36 geçti, 1 dışlandı**. Dışlanan test harici Revit dosyasını açmamak için çalıştırılmadı. Testler ağırlıkla sentetik/depodaki worker fixture'larıdır; yukarıdaki üç dosyaya bağımsız golden değer sağlamaz.
- Önceki worker sürümünde `PYTHON_BIN=<yerel-ifcopenshell-python> pnpm exec tsx --test src/ifc/parser/units.test.ts src/ifc/server-path.e2e.test.ts src/ifc/calm-icmal.test.ts src/ifc/evidence-policy.test.ts`: **41 geçti, 2 atlandı**. İki atlama harici örnek IFC bulunmadığı için gerçekleşti; test kapsamını genişlettiği varsayılmamalıdır.
- Yukarıdaki üç dosyanın her biri ayrıca CLI ile işlendi; sonuçlar kaynak türü ve kalite kapısı açısından okunmuştur. Bunlar bir üretim iş akışı veya gerçek müşteri dosyası kabul testi değildir.

Bir sonraki karşılaştırma için her eleman/satırın bağımsız hazırlanmış miktarı, birimi, hesap yöntemi, boşluk/minha varsayımları ve önceden belirlenmiş toleransı; dosya ve referans cetveli hashleri; yetkin ve bağımsız uzman kimliği, kapsamı ve imzalı kararı gerekir. Lisanslı açık örnekler müşteri izniyle verilmiş vendor IFC/Excel çeşitliliğinin yerini tutmaz. Bu çalışma L3 uzman kabulü, L4 gerçek müşteri pilotu, vendor uyumluluğu veya üretim doğruluğu iddiası oluşturmaz.
