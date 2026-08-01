# TeklifPro IFC Veri Doğruluğu ve Ürün GAP Raporu

**Tarih:** 1 Ağustos 2026  
**İncelenen commit:** `4f8dea439c1387019d1dc4b654e47a4768bd249b`  
**Örnek dosya:** `ifc-document-sample/e-proje_4x3.ifc`  
**Dosya SHA-256:** `61d21ccdb2531f755b32758d6ebc476ea3ab7e87651a22d0c1bec93b9944e25b`  
**Yaklaşım:** AI BIM Director + BIM Software Architect + BIM Knowledge Engineer + Frontend Design + Codex-Fable5 kanıt-önce inceleme  
**Kapsam sınırı:** Bu çalışma salt-okunur kod/veri analizidir. Uygulama kodu, veritabanı ve servisler değiştirilmemiştir.

## 1. Yönetici kararı

**Mevcut IFC ekranı gerçek metraj motoru değildir; demo/prototip seviyesinde, STEP satırlarını tanıyıp geometrik değerleri sentetik katsayılarla tahmin eden bir arayüzdür. Bu sonuçlar teklif, maliyet, mühendislik doğrulaması veya “kesin metraj” olarak kullanılmamalıdır.**

En kritik risk, tahmini değerlerin sistem içinde açıkça tahmin olarak kalmamasıdır. Mevcut akış:

1. IFC elemanını regex ile buluyor.
2. Hacmi IFC geometrisi veya quantity/property verisinden okumak yerine STEP kimliğinin moduna göre üretiyor.
3. Kalıp ve donatıyı sabit katsayılarla hacimden türetiyor.
4. Sonucu `%100 kesin`, `milimetrik hassasiyet` ve `verified` olarak gösteriyor.
5. Sabit fiyatlarla doğrudan teklife aktarabiliyor.

Bu zincir ticari karar riski oluşturur. Örnek dosyada doğrudan karşılaştırılabilen 160 döşemede parserın toplam hacmi `1.000,000 m³`, dosyadaki dışa aktarılmış `Hacim` değerlerinin toplamı `322,374717 m³` çıktı. Aynı eleman kümesindeki toplam fark `+%210,2` seviyesindedir.

**Go / no-go kararı:**

- IFC ekranı demo olarak gösterilebilir; “gerçek”, “kesin”, “doğrulanmış” iddiası taşımamalıdır.
- Mevcut IFC çıktısının teklife `verified` olarak aktarılması kapatılmadan gerçek kullanıcıya açılmamalıdır.
- SmartCheck’in mevcut evidence-first XLSX/CSV hattı iyi bir temel sunuyor; IFC bu kanıt zincirine yeni ve ayrı bir istemci yolu olarak değil, aynı yönetişim modeliyle eklenmelidir.

## 2. Örnek IFC dosyasının doğrulanmış profili

| Özellik | Doğrulanan değer |
|---|---:|
| Dosya boyutu | yaklaşık 37 MB |
| Dosya biçimi | ASCII STEP, CRLF |
| IFC şeması | `IFC4X3_ADD2` |
| ViewDefinition | `Ifc4X3NotAssigned` |
| Uzunluk / alan / hacim / kütle | metre / m² / m³ / kilogram |
| IfcBuildingStorey | 5 |
| IfcBeam | 293 |
| IfcColumn | 177 |
| IfcSlab | 173 |
| IfcWall | 537 |
| Tanınan ana taşıyıcı eleman toplamı | 1.180 |
| IfcReinforcingBar | 0 |
| IfcElementQuantity | 0 |
| IfcQuantityVolume / Area / Length | 0 / 0 / 0 |
| `Hacim` / `Net Hacim` property değeri | 165 adet; 160 adedi tanınan IfcSlab ile eşleşiyor |

Dosya, standart `IfcElementQuantity` üretmemiştir; ancak bazı nesnelerde Allplan property setleri altında gerçek `Hacim` değerleri vardır. Bu nedenle doğru parserın yalnızca QTO entity araması yetmez; onaylı property-set eşlemesi ve geometri fallback’i birlikte gerekir.

### Mevcut parserın aynı dosyadaki sonucu

| Çıktı | Mevcut parser sonucu | Kaynak durumu |
|---|---:|---|
| Eleman | 1.180 | Entity sayısı gerçek |
| Toplam hacim | 3.439,11 m³ | STEP ID tabanlı tahmin |
| Kalıp alanı | 20.277,84 m² | Hacim × sabit katsayı |
| Donatı | 329,76 ton | Hacim × sabit kg/m³ |
| Rebar entity | 0 | Dosyada gerçekten yok |
| Kat bilgisi | Modulo ile Kat 1/2/3 | IFC containment ilişkisi okunmuyor |
| SmartCheck | Çoğunlukla `pass` | Tahmin edilen girdinin kendi katsayısına karşı kontrolü |

### Karşılaştırılabilir hacim kanıtı

160 IfcSlab nesnesinde dosyanın `AllplanAttributes/Hacim` değeri ile mevcut parser çıktısı eşleştirildi:

| Ölçüm | Sonuç |
|---|---:|
| Dosyadaki hacim toplamı | 322,374717 m³ |
| Parser hacim toplamı | 1.000,000000 m³ |
| Toplam mutlak hata | 737,828117 m³ |
| Toplam göreli fark | +%210,2 |

Örnekler:

| STEP ID | Dosyadaki hacim | Parser hacmi |
|---:|---:|---:|
| `#2250` | 0,017403 m³ | 5,10 m³ |
| `#2296` | 0,334733 m³ | 3,50 m³ |
| `#2342` | 5,489999 m³ | 8,30 m³ |
| `#2499` | 0,842675 m³ | 5,90 m³ |

Bu karşılaştırma bütün model için bağımsız “ground truth” değildir; yalnızca aynı elemanlarda dosyanın açıkça verdiği hacim ile parser tahminini karşılaştırır. Buna rağmen mevcut yaklaşımın kesin metraj üretmediğini doğrudan kanıtlar.

## 3. Kök neden analizi

### GAP-IFC-01 — Gerçek STEP/IFC ayrıştırma yok — P0

`src/components/bimplan/BimIfcParser.tsx:79-195` yalnızca satır bazlı regex kullanıyor. IFC entity ilişkileri, referans grafiği, şema, property set, placement, geometry representation ve unit assignment çözülmüyor.

Sonuçlar:

- Çok satırlı veya farklı yazım biçimli entity’ler kaçabilir.
- IFC escaped metinleri güvenilir biçimde çözülmez.
- Nesne → kat ilişkisi (`IfcRelContainedInSpatialStructure`) kurulmaz.
- Nesne → property set ilişkisi (`IfcRelDefinesByProperties`) kurulmaz.
- QTO, malzeme, sınıflandırma, type/object ayrımı ve geometry representation kullanılmaz.

### GAP-IFC-02 — Hacim, kalıp ve donatı STEP ID’den üretiliyor — P0

`BimIfcParser.tsx:116-159` içinde hacim `parseInt(stepId) % n` formülleriyle; kalıp ve donatı ise sabit katsayılarla hesaplanıyor. STEP ID geometrik veya mühendislik anlamı taşımaz.

Bu nedenle:

- Aynı model farklı export sırasıyla tamamen farklı metraj verebilir.
- Aynı geometriye sahip iki dosya farklı STEP ID’leri nedeniyle farklı sonuç üretebilir.
- Dosyada hiç donatı entity’si olmasa bile donatı tonajı üretilir.
- Açıklık, boşluk, kesişim, layer, covering, net/brüt ayrımı ve minha kuralları uygulanmaz.

### GAP-IFC-03 — Kural kontrolü dairesel ve kanıtsız — P0

`BimIfcParser.tsx:162-173` donatı oranını önce sabit `kg/m³` ile üretip sonra yine bu oranı eşiklere karşı kontrol ediyor. Örneğin kiriş için her hacim doğrudan `115 kg/m³` ile çarpıldığı için kontrolün girdisi gerçek model donatısı değildir.

Ayrıca kod eşiği `70–180`, kullanıcı mesajı `80–160` diyor. Kural kaynağı, madde numarası, sürüm, yürürlük tarihi, kapsam, reviewer ve istisna kaydı yoktur. “Eurocode 2 & TS 708 %100 uyumlu” sonucu bu kanıttan üretilemez.

### GAP-IFC-04 — Sentetik fallback gerçek dosya hatasını gizliyor — P0

`BimIfcParser.tsx:190-193` gerçek dosyada hiçbir tanınan eleman bulunmazsa hata vermek yerine sentetik veri döndürüyor. Bozuk, desteklenmeyen veya yanlış export edilmiş bir dosya başarılı ayrıştırılmış gibi görünebilir.

Doğru davranış fail-closed olmalıdır: “0 desteklenen eleman”, “schema desteklenmiyor”, “quantity bulunamadı” veya “geometri çözülemedi” ayrı ve görünür sonuçlardır.

### GAP-IFC-05 — Dosya kanıt izi yok — P0

IFC yolu yalnız browser belleği ve `sessionStorage` kullanıyor (`src/pages/BimIfcParserPage.tsx:10-14`). Şunlar kaydedilmiyor:

- dosya SHA-256;
- şirket, kullanıcı ve izin kaydı;
- parser/pipeline sürümü;
- kaynak STEP ID + GlobalId + property/geometry yolu;
- quantity source ve confidence;
- ham değer, normalize değer, unit conversion;
- reviewer kararı ve audit log;
- idempotency ve tekrar işleme sonucu.

SmartCheck XLSX/CSV hattında bunların önemli kısmı zaten vardır. IFC’nin ayrı, kanıtsız bir kanal olarak kalması mimari tutarsızlıktır.

### GAP-IFC-06 — Tahmin doğrudan “verified” teklif kalemi oluyor — P0

`src/pages/CreateQuote.tsx:86-194` parser özetini altı toplu kaleme çeviriyor, sabit birim fiyat/maliyet atıyor ve her kalemi `verificationStatus: 'verified'` yapıyor. Kaynak referansı yalnız genel bir “openBIM IFC 4.0 Model” metnidir; dosya hash’i, GUID, quantity kaynağı veya reviewer yoktur.

Bu, mevcut sistemin en ciddi ticari veri bütünlüğü açığıdır.

### GAP-IFC-07 — SmartCheck kanıt hattı IFC kabul etmiyor — P0

`src/server/routes/smartcheck.ts:57-64` ve `src/smartcheck/import/file-security.ts:5-27` yalnız XLSX/CSV kabul ediyor. Örnek IFC yaklaşık 37 MB; mevcut SmartCheck sınırı `25 MB` (`src/smartcheck/import/config.ts:3`).

IFC için:

- ayrı MIME/signature politikası;
- gerçekçi dosya boyutu ve streaming/worker stratejisi;
- checksum;
- tenant-scoped object storage;
- parse queue/timeout/memory sınırları;
- zararlı/bozuk STEP girdisi kontrolleri

tasarlanmalıdır.

### GAP-IFC-08 — IFC için otomatik doğruluk testi yok — P0

Kod tabanında `parseIfcText`, `BimIfcParser` veya `teklifpro_ifc_extracted` akışına ait test bulunmadı. Demo veri, gerçek IFC’nin ground-truth fixture’ı değildir.

Örnek dosya ilk golden fixture olabilir; fakat beklenen sonuçların bağımsız BIM yazılımı/quantity takeoff ve teknik reviewer tarafından imzalanması gerekir.

## 4. Doğru hedef mimari

### Bugünkü akış

```text
IFC file
  -> Browser FileReader (tüm dosya metin olarak)
  -> satır regex'i
  -> STEP ID tabanlı tahmin
  -> sabit hacim/kalıp/donatı katsayıları
  -> sessionStorage
  -> sabit fiyatlı, verified teklif kalemi
```

### Hedef evidence-first akış

```text
Tenant-scoped upload
  -> signature + size + SHA-256 + consent/retention
  -> object storage
  -> queued IFC parser worker
  -> schema/unit/entity/relationship graph
  -> QTO/property/geometry quantity resolver
  -> per-element provenance record
  -> deterministic validation + confidence
  -> human technical review / exception
  -> approved rows only
  -> quotation item evidence + revision + PDF
```

### Quantity kaynak önceliği

Her quantity tek bir `sourceType` ile kaydedilmelidir:

1. **Standart QTO:** `IfcElementQuantity` / `IfcQuantity*`.
2. **Onaylı exporter property’si:** örneğin `AllplanAttributes/Hacim`; exporter + property mapping sürümlü olmalı.
3. **Geometri hesabı:** representation, placement, boolean/opening ve unit dönüşümüyle hesaplanan değer.
4. **İnsan düzeltmesi:** önceki değer, yeni değer, kişi, gerekçe ve tarih ile.
5. **Tahmin:** yalnız açıkça `estimate` etiketiyle; hiçbir zaman otomatik `verified` olmamalı.

Birden fazla kaynak varsa sistem farkı göstermeli; sessizce birini seçmemelidir.

### Önerilen bounded context

Yeni bir framework rewrite gerekmez. Mevcut pilot mimarisinde aşağıdaki sınır yeterlidir:

```text
src/ifc/
  contracts/       upload, parse result, element quantity, provenance
  parser/          STEP/IFC adapter
  quantities/      QTO, property ve geometry resolver
  rules/           deterministic checks; source/reviewer metadata
  evaluation/      golden fixtures ve metrics
  worker/          queue task ve resource limits
```

Veri sahipliği, mevcut `documents`, `documentProcessingRuns`, artifact, review, audit ve quotation evidence yapılarını genişletmelidir. Paralel ve kanıtsız ikinci doküman sistemi kurulmamalıdır.

## 5. Veri sözleşmesi için minimum alanlar

Her IFC elemanı için en az:

- `documentId`, `documentHash`, `processingRunId`, `parserVersion`;
- `ifcSchema`, `viewDefinition`, exporter/application bilgisi;
- `stepId`, `globalId`, `entityType`, `predefinedType`, `name`, `objectType`;
- `spatialPath`: site/building/storey/space;
- `material`, `typeId`, classification/poz adayları;
- `quantityName`, `normalizedValue`, `normalizedUnit`;
- `sourceType`: `qto | property | geometry | manual | estimate`;
- `sourcePath`: QTO/property/representation referansı;
- `confidence`, `warnings`, `unsupportedReasons`;
- `reviewStatus`, `reviewerUserId`, `reviewedAt`, `notes`.

Toplu teklif kalemi eleman GUID listesini veya değişmez bir element-set hash’ini taşımalıdır. Böylece revizyonda hangi model elemanlarının değiştiği izlenebilir.

## 6. Doğruluk kabul kapıları

Aşağıdaki eşikler önerilen ürün kabul kriterleridir; teknik reviewer tarafından onaylanmadan mevzuat veya sözleşme şartı sayılmamalıdır.

| Kapı | Önerilen kabul kriteri |
|---|---|
| G1 Dosya bütünlüğü | SHA-256, schema, unit assignment ve exporter okunuyor; bozuk dosya fail-closed |
| G2 Kimlik | Desteklenen elemanlarda STEP ID, GlobalId, entity type ve storey birebir doğru |
| G3 Property quantity | Kaynaktaki sayısal değere dönüşüm farkı en fazla %0,1 |
| G4 Geometry quantity | Bağımsız ground truth’a göre eleman bazında tanımlı tolerans; sonucu `geometry` kaynaklı gösterme |
| G5 Rebar | Rebar/QTO/approved property yoksa tonaj `unavailable`; varsayımsal tonaj üretmeme |
| G6 Formwork | Açıklık, kesişim ve temas yüzeyi kuralı uygulanmadan `net formwork` iddiası yapmama |
| G7 Provenance | Her quantity dosya hash’i, element, kaynak yolu ve parser sürümüyle izlenebilir |
| G8 Human review | Bulgulu/estimate değer reviewer onayı olmadan verified/quote transfer olamaz |
| G9 Revision | Aynı dosya idempotent; yeni dosyada GUID/quantity değişimi diff olarak görünür |
| G10 Commercial | Quantity kanıtı ile fiyat kanıtı ayrı; sabit demo fiyat verified sayılmaz |

Örnek `e-proje_4x3.ifc` için ilk beklenen davranış:

- 1.180 desteklenen ana elemanı doğru saymak;
- 5 gerçek storey’yi containment ilişkisiyle bağlamak;
- 160 slab hacmini Allplan property kaynağıyla okumak;
- kalan elemanlarda quantity kaynağını açıkça `geometry` veya `unavailable` göstermek;
- `IfcReinforcingBar = 0` olduğu için donatı tonajı üretmemek;
- QTO entity’lerinin bulunmadığını kullanıcıya görünür uyarı yapmak.

## 7. BIM bilgi ve kural yönetişimi GAP’leri

### ISO 19650 / EIR / BEP sınırı

Repo bilgi gereksinimi, naming, suitability/status, LOIN ve teslim kabul sözleşmesini henüz bir proje bazında modellemiyor. Bu nedenle ürün “ISO 19650 uyumlu” veya sertifikalı ilan edilmemelidir. Ürün, EIR/BEP kaynaklı gereksinimleri daha sonra sürümlü bir validation profile olarak uygulayabilir.

### IFC schema ve MVD

Örnek dosya `IFC4X3_ADD2`, ancak `ViewDefinition [Ifc4X3NotAssigned]`. Parser, yalnız dosya uzantısına bakmak yerine schema ve beklenen bilgi teslim görünümünü kontrol etmelidir. “IFC4” etiketi tek başına quantity completeness garantisi değildir.

### TS 500 / TS 708 / Eurocode 2

Mevcut kural metinleri resmi madde, sürüm ve kapsam kanıtına bağlı değildir. Kural promotion kapısı şu alanları zorunlu tutmalıdır:

- official/advisory kaynak;
- doküman adı, sürüm, madde ve yürürlük;
- uygulanabilir eleman/discipline/condition;
- algoritma ve tolerans;
- teknik reviewer, karar ve tarih;
- istisna ve supersession kaydı.

Mühendislik kuralı ile ticari company policy ayrı tutulmalıdır.

## 8. Frontend ve ürün güveni GAP’i

### Tasarım yönü

**Önerilen estetik:** Industrial Evidence Console.  
**Amaç:** Kullanıcıyı etkileyici bir 3D/AI gösterisiyle ikna etmek değil, her sayının nereden geldiğini ve ne kadar güvenilir olduğunu hızlıca kanıtlamak.  
**Farklılaşma ankrajı:** GUID + kat + quantity source + confidence + reviewer kararını aynı “kanıt şeridi” içinde gösteren element ledger.

### Mevcut DFII

| Boyut | Puan | Gerekçe |
|---|---:|---|
| Aesthetic Impact | 3/5 | Koyu zemin + turuncu teknik kontrol odası dili akılda kalıyor |
| Context Fit | 4/5 | B2B inşaat/metraj bağlamına uygun |
| Implementation Feasibility | 4/5 | Mevcut React/Tailwind sistemiyle sürdürülebilir |
| Performance Safety | 3/5 | 37 MB dosya ana thread’de tam okunuyor; tablo sanallaştırılmıyor |
| Consistency Risk | 4/5 | Yoğun kart/pill/gradient dili mevcut `DESIGN.md` ile kısmen çelişiyor |
| **DFII** | **10/15** | Güçlü; kanıt mimarisiyle disipline edilmeli |

### Kritik UX yanlışları

- `%100 Kesin`, `milimetrik hassasiyet`, `TS 708 / Eurocode 2` rozetleri kanıt düzeyini aşmaktadır (`BimIfcParser.tsx:484-507`).
- “%100 Kesin 3D Hacim Hesabı” tahmini metrikte gösteriliyor (`BimIfcParser.tsx:609-625`).
- Dosyada rebar yokken donatı tonajı ana KPI olarak sunuluyor.
- Hard-coded “2 adet kiriş uyarısı” gerçek finding sayısından gelmiyor (`BimIfcParser.tsx:730-756`).
- Kaynak, confidence, unsupported, warning ve reviewer state’leri ana tabloda yok.
- 1.180 satır tek seferde render ediliyor; filtre vardır ama pagination/virtualization yok.
- Drag/drop alanı klavye ile tam eşdeğer bir etkileşim yüzeyi olarak tanımlanmamış.

**Bu tasarım generic UI’dan, kart sayısını artırarak değil her sayıya görünür kanıt izi bağlayarak ayrışmalıdır.**

## 9. Repo genelinde ikincil release GAP’leri

IFC doğruluğu ana blokerdır. İnceleme sırasında ayrıca:

1. `pnpm lint` başarısız oldu: 10 TypeScript module-resolution hatası. BIMPlan componentlerinde yanlış `../types` yolları ve Firebase import/dependency eksikleri var.
2. Tam `pnpm test` yeşil değil. PostgreSQL erişimi olmayan ortamda integration testleri `ECONNREFUSED`; CLI process testleri `npm ENOENT` ile başarısız. Bu turda hiçbir TeklifPro veritabanı başlatılmadı veya değiştirilmedi.
3. IFC parser/transfer için hiç otomatik test yok.
4. `AuthService` varsayılan tahmin edilebilir JWT secret içeriyor. Coolify `startServer()` üretim preflight’ı bunu engelliyor; ancak `api/index.ts` yalnız `createApiApp()` çağırdığı için Vercel serverless yolu aynı preflight’ı çalıştırmıyor. Her production entrypoint fail-closed olmalıdır.
5. Graphify raporu `ef07ad54` commitini gösteriyor; mevcut HEAD dört commit ileride. Mimari karar öncesi graph metadata güncelliği doğrulanmalıdır.

## 10. Önceliklendirilmiş yol haritası

### P0 — Gerçek veri güvenliği

1. Mevcut IFC çıktısını `demo_estimate` olarak sınıflandır; `verified` transferi durdur.
2. Sentetik fallback’i gerçek dosya akışından kaldır; fail-closed sonuç sözleşmesi tanımla.
3. `e-proje_4x3.ifc` için bağımsız ground-truth manifest oluştur.
4. Gerçek IFC parser adapterını seç ve worker sınırını kur.
5. QTO → approved property → geometry kaynak önceliğini uygula.
6. IFC sonuçlarını SmartCheck document/run/review/evidence zincirine bağla.
7. Element ve toplam quantity acceptance testlerini CI kapısı yap.

### P1 — Mühendislik ve ticari güven

1. Storey, material, classification, type/object ve opening ilişkilerini çıkar.
2. Net/brüt quantity ve formwork kural paketlerini sürümlendir.
3. Rebar için gerçek IfcReinforcingBar/QTO/property desteği; veri yoksa `unavailable`.
4. Teknik reviewer cockpit ve rule governance promotion akışı.
5. IFC revision diff ve GUID bazlı değişiklik raporu.
6. Quantity evidence ile price evidence’i ayrı onay kapılarında göster.

### P2 — Ölçek ve ürün deneyimi

1. Web Worker veya server worker, streaming parser ve resource limits.
2. Büyük model tablosunda virtualization/pagination.
3. 3D seçim ↔ element ledger ↔ teklif kalemi çapraz vurgulama.
4. Exporter bazlı mapping profilleri ve kalite telemetrisi.
5. Beş izinli gerçek müşteri modeliyle pilot KPI ve go/no-go.

## 11. Uygulama sırası için önerilen ilk dikey dilim

İlk kodlama fazı bütün IFC standardını çözmeye çalışmamalıdır. En yüksek güvenli dikey dilim:

1. Dosya upload + SHA-256 + schema/unit doğrulama.
2. Beam/column/slab/wall kimliği, GlobalId ve storey ilişkisi.
3. `IfcElementQuantity` ve onaylı Allplan `Hacim` property extraction.
4. Quantity source/provenance modeli.
5. `e-proje_4x3.ifc` golden tests.
6. İnsan review sonrası yalnız approved slab quantity transferi.

Geometri fallback, formwork ve rebar bu temel kanıtlanmadan aynı faza eklenmemelidir.

## 12. Verification günlüğü

Bu raporda kullanılan başlıca kontroller:

```text
git status --short --branch
git rev-parse HEAD
graphify query/path incelemeleri
file, du, shasum -a 256
IFC header, unit, entity ve property sayımları
mevcut parseIfcText fonksiyonunun örnek dosya üzerinde doğrudan çalıştırılması
Allplan Hacim property ↔ IfcSlab ↔ mevcut parser eşleştirmesi
pnpm lint
pnpm test
```

Doğrulanan durum:

- Örnek IFC dosyası yalnız okunmuştur.
- Uygulama kodu ve veritabanı değiştirilmemiştir.
- `pnpm lint` başarısızdır.
- `pnpm test` tam yeşil değildir; çevresel DB/PATH bağımlılıkları ayrıştırılmadan release kanıtı sayılamaz.
- IFC için mevcut test kanıtı yoktur.
- Raporun sayısal IFC bulguları aynı SHA-256 dosyaya bağlıdır.

## 13. Sonuç

TeklifPro’nun en değerli mevcut varlığı, SmartCheck tarafındaki evidence-first doküman → normalize satır → insan kararı → teklif kanıtı mimarisidir. En riskli parçası ise IFC tarafının bu disiplinin dışında kalması ve tahmini değerleri kesin/doğrulanmış olarak sunmasıdır.

Doğru ürün stratejisi “daha gösterişli IFC demo” değil, **her quantity için kaynak, yöntem, güven ve reviewer kararı gösteren IFC Evidence Engine** olmalıdır. Bu P0 kapısı kapanmadan IFC metrajı satış, teklif veya mühendislik doğruluğu iddiasına dönüştürülmemelidir.
