# Faz 0 — Bağımsız Uzman İnceleme Dosyası

**Dosya tarihi:** 23 Ekim 2026
**Kod baseline:** `e748481684b296cc6a1cd5de0365136b47384d2b`
**Bağlayıcı kayıtlar:** `PHASE_0_KANIT_SOZLESMESI.md`, `source-register.json`, `reference-register.json`, `expert-assignment-register.json`
**Durum:** İncelemeye hazır taslak; hiçbir disiplin için bağımsız uzman onayı verilmiş değildir.

## 1. Amaç ve karar sınırı

Bu dosya STR, ARC, MEP, COST, vergi ve ihale uzmanlarının kodu baştan keşfetmeden kendi mesleki kararlarını verebilmesi için hazırlanmıştır. Depodaki testler, sentetik örnekler ve makine çıktıları ön inceleme kanıtıdır; uzman imzasının, yetkili standart nüshasının, resmî kurum kabulünün veya gerçek müşteri saha kabulünün yerine geçmez.

Uzmandan beklenen iş; kendisine ayrılan motorlar için kullanılan kaynak sürümünü sabitlemek, normal/sınır/eksik-hatalı örneklerde sonucu bağımsız yöntemle hesaplamak, kod sonucuyla farkları sınıflandırmak ve açık bir kabul/şartlı kabul/ret kararı vermektir. Uzman, yazılımın ürettiği sonucu kendi hesabının girdisi veya doğruluk ölçütü olarak kullanmamalıdır.

## 2. İnceleme paketi ve değişmezlik kontrolü

İncelemeye başlamadan önce koordinatör aşağıdaki paketi uzmana salt okunur olarak teslim eder:

1. Bu dosya ve `docs/audits/phase-0/` altındaki kayıtlar; açık lisanslı
   teknik örnekler için ayrıca `open-source-fixture-register.json`.
2. İlgili motor kaynak kodu ve test dosyaları.
3. Her girdi için dosya adı, SHA-256, kaynağı, üretici/sürüm bilgisi, yazılı kullanım izni ve PII kararı.
4. Kullanılacak standart/mevzuatın kurum, başlık, baskı veya konsolide sürüm, madde/tablo, yayım ve yürürlük tarihi bilgisi.
5. Yazılım çalıştırma sonucu; sürüm/commit, çalışma zamanı, komut, tarih-saat ve çıktı SHA-256 bilgisiyle birlikte.

Uzman teslim aldığı her girdi hashini doğrular. Hash veya sürüm değişirse önceki karar yeni dosyaya taşınmaz. ALLPLAN, Revit, Archicad ve Tekla pilot IFC'leri ile gerçek imzalı PDF ancak yazılı kullanım izni ve PII kararı varsa incelemeye alınır. Sentetik veya açık kaynak fixture, belirli bir vendor ihracının ya da müşteri saha kabulünün kanıtı olarak imzalanmaz.

### 2.1 Her motor için zorunlu üç senaryo

| Senaryo | Asgari içerik | Uzmanın üretmesi gereken çıktı |
|---|---|---|
| Normal | Desteklenen birim, dolu zorunlu alanlar ve geçerli kapsam | Kalem bazlı bağımsız hesap, toplam, yuvarlama ve kabul kararı |
| Sınır | Eşikle eşit, eşikten hemen düşük/yüksek, dönem başlangıç/bitiş ve sıfır/değer sınırları | Eşiğin hangi tarafında hangi kararın verildiği ve madde/dayanak |
| Eksik/hatalı | Eksik alan, geçersiz birim, çelişkili veri, kapsam dışı tarih/statü | Sistemin hesap üretmemesi veya açık uyarı vermesi gereken durumlar |

Her bağımsız beklenen çıktı; girdi SHA-256, çıktı SHA-256, uzman adı, en az üç parçalı yetkinlik açıklaması, disiplin, bağımsızlık/çıkar çatışması beyanı ve ISO tarih-saat taşır. Karar manifesti `caseId`, motor, senaryo, girdi/çıktı hashleri, uzman kimliği, disiplin ve kararı içerir; uzmanın kayıtlı açık anahtarıyla üretilmiş detached imza validator tarafından kriptografik olarak doğrulanır. Yetkinlik manifestindeki açık anahtar hash'i aynı anahtara bağlanır. Hesap tablosu kullanıldıysa hücre formülleri görünür bırakılır; yalnız ekran görüntüsü kabul edilmez.

Uzman anahtarı kendinden menkul olamaz. `expert-trust-store.json`, ürün sahibi
tarafından kabul edilmiş dış yetkinlik doğrulayıcısının pinned anahtarını,
uzman anahtarını, disiplin/scope yetkisini, geçerlilik ve iptal durumunu taşır.
Trust store `unconfigured` iken hiçbir isim veya self-signed anahtar Faz 0
kapanışını sağlayamaz.

## 3. Ortak karar ve imza formu

Her uzman aşağıdaki alanları eksiksiz doldurur. Kimlik/yetkinlik belgeleri herkese açık repoya konulmaz; koordinatör erişim kontrollü kanıt kaydının kimliğini ve hashini kaydeder.

| Alan | Zorunlu içerik |
|---|---|
| Uzman | Ad soyad, disiplin, meslek/unvan, oda veya yetkinlik kaydı, deneyim kapsamı |
| Kimlik kanıtı | Erişim kontrollü kayıt ID'si ve SHA-256; kişisel belge kopyası repo dışında tutulur |
| Bağımsızlık | Projeyle mali/istihdam/tedarik ilişkisi, kod yazarlığı, kullanılan vendor ile ilişkisi ve sonucu etkileyebilecek diğer menfaatler |
| İnceleme kapsamı | İncelenen motor, kaynak dosyalar, commit, test ve örnek girdi kimlikleri |
| Normatif temel | Kurum, belge, baskı/konsolide tarih, madde/tablo, yürürlük ve proje/tarih kapsamı |
| Karar | `kabul`, `şartlı kabul` veya `ret`; şartlar ve kapsam dışı kalan konular |
| Fark kaydı | Beklenen/gerçek değer, mutlak ve yüzde fark, birim, yuvarlama, önem seviyesi ve düzeltme önerisi |
| İmza | Islak veya doğrulanabilir elektronik imza, imza tarihi ve kayıt ID'si; PDF içinde imza görünmesi tek başına sertifika geçerliliği kanıtı değildir |

## 4. STR — Statik ve betonarme

### İncelenecek motorlar ve kod kanıtı

- `minha-3x3`: `src/smartcheck/rules/three-by-three.ts`, `src/smartcheck/rules/three-by-three.test.ts`, `src/smartcheck/rules/minha.ts`, `src/smartcheck/rules/minha.test.ts`.
- IFC yapısal QTO: `workers/ifc/ifc_extract.py`, `src/ifc/smartcheck-evidence.ts`, `src/ifc/calm-icmal.ts`, `src/ifc/calm-icmal.test.ts`.
- Mevcut ön kanıt: `docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md`. Buradaki MM/ST/PDF örnekleri sistem tarafından üretilmiş ön kanıttır; bağımsız uzman beklenen çıktısı değildir.

### Kaynaklar

- TS 500 ve TS 708: `source-register.json` içinde `access_required`; kullanılacak lisanslı baskı ve tadiller henüz sabit değildir.
- TBDY 2018: `TBDY2018`, kamuya açık resmî metin; ekler ve yürürlükteki değişiklikler madde bazında yeniden kontrol edilir.
- `≤ %3` miktar sapması şirket politikasıdır; TS 500/TBDY hükmü gibi onaylanamaz.

### Örnek girdiler

- Sentetik normal: `workers/ifc/fixtures/type_pset_inheritance.ifc`.
- Sentetik sınır: `workers/ifc/fixtures/duplicate_guid_and_orphan_opening.ifc`.
- Sentetik eksik/hatalı: `workers/ifc/fixtures/invalid_quantities_and_unassigned_storey.ifc`.
- Gerçek vendor normal örnekleri: ALLPLAN, Revit, Archicad ve Tekla için izinli IFC'ler henüz yoktur.

### Uzman karar alanları

1. Kolon, kiriş, döşeme, perde ve temel için paspayı eşiğinin eleman, maruziyet ve proje koşuluna göre doğru madde/birimle izlenmesi.
2. Bütün temellere veya bütün betonarme elemanlara tek eşik uygulanmaması; istisna ve kapsam dışı durumların belirlenmesi.
3. Donatı çapı, nominal kütle, bindirme/kenetlenme, fire ve birim dönüşümlerinde TS 708 ve proje şartnamesi ayrımı.
4. Brüt/net miktar, açıklık ve kesişim düşümlerinde mükerrer sayım olmaması; `GlobalId`, QTO/pset ve geometri önceliğinin uygunluğu.
5. Aktif standart seçimi değiştiğinde TS 500, Eurocode 2 ve desteklenmeyen ACI davranışının açık sınırları.

### Kalan minimum insan işi

- Lisanslı TS 500 ve TS 708 baskısını/tadillerini kayda bağla.
- Üç senaryo için bağımsız hesap tablosu üret; `eng_calc.py` çıktısını yalnız karşılaştırma olarak kullan.
- En az bir yapısal gerçek vendor IFC'sinde eleman bazlı elle/bağımsız QTO örneklemesi yap.
- Şirket `%3` politikasını normatif kurallardan ayrı kabul et veya reddet.
- Karar formunu imzala; açık farkları kalem/madde bazında yaz.

## 5. ARC — Mimari, imar, mahal ve açıklıklar

### İncelenecek motorlar ve kod kanıtı

- Ön BIM fizibilite: `src/lib/pre-bim-feasibility.ts`, `src/lib/pre-bim-feasibility.test.ts`.
- Mimari IFC/QTO ve katmanlı icmal: `workers/ifc/ifc_extract.py`, `src/ifc/calm-icmal.ts`, `src/ifc/calm-icmal.test.ts`.
- Açıklık minha: `src/ifc/openings-minha.ts`, `src/smartcheck/rules/minha.ts`, `src/smartcheck/rules/minha.test.ts`.
- e-PYS/isimlendirme ön kontrolü: `src/smartcheck/rules/epys.ts`, `src/smartcheck/rules/epys.test.ts`, `src/smartcheck/rules/iso19650.ts`, `src/smartcheck/rules/iso19650.test.ts`.

### Kaynaklar

- Planlı Alanlar İmar Yönetmeliği: `PAIY`, kapsam ve konsolide sürüm bekliyor; yerel plan notları ve belediye kararları ayrıca gerekir.
- e-PYS: `EPYS_RG33331`; repo PDF dosya adı “Taslağı” içerir, nihai resmî metinle kimlik/hash eşleşmeden esas alınmaz.
- ISO 19650/EN 17412-1: lisanslı metin erişimi bekliyor.
- ÇŞB ölçü tarifleri ve proje özel şartnamesi: hangi imalatta hangi boşluk/minha profilinin geçerli olduğu açıkça seçilir.

### Örnek girdiler

- Pre-BIM testlerinde tek/çoklu parsel, TAKS/KAKS, emsal harici alan, net/brüt oranı, kat karşılığı, kapasite aşımı ve eksik girdi örnekleri vardır.
- Mimari sentetik IFC'ler STR bölümündeki üç fixture'dır; gerçek vendor/müşteri normal örneği henüz yoktur.
- Normal/sınır/eksik-hatalı `pre-bim` ve `minha-3x3` bağımsız beklenen çıktı dosyaları henüz yoktur.

### Uzman karar alanları

1. TAKS/KAKS, emsal alanı, emsal harici alan ve yaklaşık kat sayısının ulusal düzenleme ile yerel plan kararları arasındaki sınırı.
2. Mahal, daire net/brüt alanı, `IfcSpace`, kapı/pencere açıklığı ve kaplama katmanlarının doğru sınıflandırılması.
3. Sıva/boya, duvar, lento, denizlik ve birleşim minha kurallarının imalat/şartname bazında uygulanması.
4. Eksik imar durumu, yerel plan notu veya proje onayı olmadan sistemin uygunluk kararı vermemesi.
5. e-PYS dosya adı/LOIN/özellik seti kontrollerinin “ön kontrol” sınırında kalması.

### Kalan minimum insan işi

- Seçilen belediye/proje için imar durumu ve plan notlarını anonimleştirilmiş, izinli örnek olarak sağla.
- Üç pre-BIM ve üç minha senaryosunun bağımsız beklenen sonucunu hesapla.
- En az bir mimari gerçek vendor IFC'sinde mahal, açıklık ve katman QTO'sunu örnekle.
- e-PYS taslak/nihai metin kimliğini çöz; yalnız doğrulanan sürüm için karar ver.
- Karar formunu imzala ve yerel idareye özgü kapsamı açıkça sınırla.

## 6. MEP — Mekanik ve elektrik metrajı

### İncelenecek motorlar ve kod kanıtı

- IFC çıkarım ve QTO: `workers/ifc/ifc_extract.py`.
- Çok katmanlı icmal ve açıkta kalan/ölçülemeyen öğe kapıları: `src/ifc/calm-icmal.ts`, `src/ifc/calm-icmal.test.ts`.
- Üretici teşhisi: `src/ifc/authoring-software-diagnostics.ts`, `src/ifc/authoring-software-diagnostics.test.ts`.
- Fiyat eşleştirmesinde mekanik/elektrik katalogları: `src/server/crawler/csb-pdf-parser.ts`, `src/server/crawler/csb-pdf-parser.test.ts`.

### Kaynaklar ve örnek girdiler

- `CSB2026` içindeki mekanik ve elektrik birim fiyat listeleri yerel hashli referanstır; ticari yeniden kullanım yetkisi hâlen `pending` durumundadır.
- Sentetik IFC'ler genel parser davranışını sınar; gerçek MEP kapsamını temsil ettikleri varsayılmaz.
- ALLPLAN/Revit/ArchiCAD/Tekla izinli gerçek IFC'leri ve bağımsız MEP beklenen çıktıları henüz yoktur.

### Uzman karar alanları

1. Kanal, boru, fitting, vana, kablo, tava ve ekipman için sınıf/tip, ölçü, uzunluk/alan/adet ve birim dönüşümü.
2. Fitting ve aksesuarların ana hatla birlikte iki kez sayılmaması; bağlantı ve sistem ilişkileri.
3. İzolasyon, kaplama, çap/ebat ve malzeme bilgilerinin eksikliğinde tahmin üretilmemesi.
4. Mekanik ve elektrik poz eşleştirmesinin açıklama benzerliğiyle değil, açık veri ve uzman kararıyla sınırlandırılması.
5. Vendor ihracı sürüm/ayarlarının QTO kaybına etkisi ve destek matrisi.

### Kalan minimum insan işi

- Bir mekanik ve bir elektrik modelinden izinli, anonim gerçek örnek sağla; mümkünse iki farklı authoring vendor kapsa.
- Her modelde en az bir hat, bağlantı elemanı ve ekipman grubunu bağımsız sayım/ölçümle doğrula.
- Eksik property/quantity ve birim uyuşmazlığı senaryosunda beklenen blokajı yaz.
- CSB poz eşleştirmelerinden örneklem seçerek poz, birim ve ölçü tarifini doğrula.
- Karar formunu imzala; desteklenmeyen MEP sınıflarını açık listele.

## 7. COST — Metraj, poz, fiyat, eskalasyon ve hakediş

### İncelenecek motorlar ve kod kanıtı

- ÇŞB katalog ayrıştırma: `src/server/crawler/csb-pdf-parser.ts`, `src/server/crawler/csb-pdf-parser.test.ts`.
- 4735 fiyat farkı/endeks: `src/lib/price-escalation.ts`, `src/lib/price-escalation.test.ts`.
- IFC icmal ve pozlama: `src/ifc/calm-icmal.ts`, `src/ifc/calm-icmal.test.ts`.
- Ön BIM maliyet/fizibilite: `src/lib/pre-bim-feasibility.ts`, `src/lib/pre-bim-feasibility.test.ts`.
- Minha/kesişim etkisi: `src/smartcheck/rules/minha.ts`, `src/smartcheck/rules/minha.test.ts`.

### Kaynaklar ve örnek girdiler

- `CSB2026`: altı hashli katalog; dönemleri ve satır sayıları kayıtlıdır. Mart 2026 fiyatı Ekim 2026 güncel fiyatı olarak kabul edilmez.
- `pricing-reference`: normal senaryoda inşaat birim fiyat PDF'si mevcut; sınır ve eksik/hatalı fiyat senaryoları yoktur.
- `KIK4735`: sözleşme tarihine göre rejim, gecikme, avans ve endeks kapsamı sabitlenmemiştir.
- Fiyat farkı, pre-BIM ve minha-3x3 için bağımsız üçlü senaryo çıktıları beklenmektedir.

### Uzman karar alanları

1. Poz no, tarif, birim, ölçü kuralı ve katalog sürümünün aynı kayıtta izlenmesi.
2. Net/brüt, fire, minha, kesişim ve yuvarlamanın kalem ve toplam üzerindeki etkisi.
3. `F = A_n × B × (P_n − 1)` hesabında sözleşme/tarih rejimi, ağırlıklar, sabit terim, 21 endeks kimliği, uygulama ayı, avans/mahsup, gecikme ve negatif fark.
4. Endekslenmiş değerin “resmî güncel birim fiyat” değil, açıkça etiketlenmiş tahmin olması.
5. Ön BIM maliyet dağılımı ve saha benchmarklarının resmî piyasa ortalaması veya doğrulanmış teklif gibi sunulmaması.

### Kalan minimum insan işi

- Altı katalogdan risk bazlı örneklem seç; satır/poz/birim/fiyat ve ayrıştırma toplamlarını kaynak PDF ile karşılaştır.
- Ticari katalog kullanım yetkisi kaydını ürün sahibinden iste; yetki yoksa dağıtım/kullanım sınırını yaz.
- Normal, gecikmeli, avanslı, negatif fark ve eksik endeks örneklerini bağımsız teknik ofis tablosuyla hesapla.
- IFC QTO → poz → fiyat → icmal zincirinden en az bir mimari, bir statik ve bir MEP kalemini uçtan uca izle.
- Karar formunu imzala; hakediş/kesin hesapta kapsam dışı kalan sözleşmesel kararları listele.

## 8. Vergi — KDV ve kat karşılığı

### İncelenecek motorlar ve kod kanıtı

- `src/lib/kat-karsiligi.ts`, `src/lib/kat-karsiligi.test.ts`.
- Ön fizibilite bağlantısı: `src/lib/pre-bim-feasibility.ts`, `src/lib/pre-bim-feasibility.test.ts`.
- Araştırma notu: `docs/audits/RESMI_VERI_ARASTIRMASI_2026-10-17.md`; bu not nihai vergi görüşü değildir.

### Kaynaklar ve örnek girdiler

- `KDV`: GİB/Resmî Gazete kaynak alanı `expert_review_required` durumundadır.
- Mevcut testler; 150 m² sınırı, genel/6306 rejimi, 1 Nisan 2022 öncesi ruhsat reddi, maliyet esaslı emsal bedel, toptan/perakende ekleri ve Tebliğ I/B-8'in 2018 örneklerini kapsar.
- Testlerdeki 2018 `%18` örneği tarihsel örnektir; güncel genel oran olarak uygulanamaz.

### Uzman karar alanları

1. Ruhsat ve teslim tarihi, konut/işyeri niteliği, net alan, 6306 statüsü ve işlemin taraf/süreklilik niteliğine göre rejim seçimi.
2. İlk 150 m²/fazla kısım oranlaması, bedel bölüştürme yöntemi ve yuvarlama.
3. Müteahhidin arsa sahibine teslimi, arsa sahibinin arsa payı teslimi ve üçüncü kişiye satışın ayrı vergiyi doğuran olay/matrah olarak ele alınması.
4. VUK m.267/2 ve KDV Genel Uygulama Tebliği I/B-8 örneklerinin yürürlük/tarih kapsamı.
5. Eksik statü veya tarih varken sistemin oran/uygunluk üretmemesi.

### Kalan minimum insan işi

- GİB'in güncel konsolide KDV Genel Uygulama Tebliği ile oran kararlarını tarih bazında sabitle.
- Normal, 150 m² sınırı, karma konut/işyeri, 6306 ve eksik statü senaryolarını bağımsız hesapla.
- 2018 resmî örneklerini tarihsel oranla; güncel senaryoları işlem tarihindeki oranla ayrı doğrula.
- Vergi mükellefiyeti/süreklilik ve arsa teslimi koşullarını karar ağacında kontrol et.
- SMMM/YMM veya yetkili vergi uzmanı kimliğiyle karar formunu imzala; görüşün tarih ve işlem kapsamını yaz.

## 9. İhale — 4734/4735, ADT ve EKAP

### İncelenecek motorlar ve kod kanıtı

- ADT sınır değer ve `%80` sıralı iş kalemleri: `src/lib/kik-adt.ts`, `src/lib/kik-adt.golden.test.ts`.
- Fiyat farkı: `src/lib/price-escalation.ts`, `src/lib/price-escalation.test.ts`.
- Halka açık hesaplayıcı adaptörü: `src/lib/calculators/kik-form.ts`, `src/lib/calculators/calculators-forms.test.ts`.
- EKAP ihale açılış tutanağı içe aktarımı ve ADT açıklama dosyası üretimi capability kayıtlarında yol haritasındadır; mevcut motor tamamlanmış ürün olarak onaylanmaz.

### Kaynaklar ve örnek girdiler

- `KIK4734`: m.38 ve Kamu İhale Genel Tebliği 45.1 kapsamı `scope_pending`.
- `KIK4735`: sözleşme tarihine bağlı fiyat farkı rejimi `scope_pending`.
- ADT golden testlerinde Tebliğ 45.2 örneği, N katsayıları, C aralıkları, tek teklif, `%40` taban ve `%80` Pareto örnekleri vardır.
- Gerçek anonim ihale açılış tutanağı, idare kalem bazlı yaklaşık maliyeti ve bağımsız üçlü beklenen çıktı seti henüz yoktur.

### Uzman karar alanları

1. İhale tarihi/usulü/yapım türüne göre N, C, K ve sınır değer formüllerinin geçerli sürümü.
2. Yaklaşık maliyet, geçerli teklifler ve idarenin kalem bazlı yaklaşık maliyetinin birbirinden ayrılması.
3. Eşitlik, yuvarlama, tek teklif, geçersiz teklif, `%40` taban ve sıralı iş kalemlerinde `%80` kümülatif sınır davranışı.
4. ADT açıklama istenen kalemlerin teklif dağılımından türetilmemesi; idare verisi eksikken resmî liste üretilmemesi.
5. 4735 fiyat farkında sözleşme/tarih rejimi, gecikme nedeni, avans/mahsup ve endeks seçimi.

### Kalan minimum insan işi

- İhale tarihine göre konsolide 4734/4735 ve Tebliğ sürümünü kilitle; madde ve değişiklikleri kaydet.
- Resmî örnek ile kod golden sonucunu bağımsız yeniden hesapla.
- Anonim, izinli bir ihale açılış tutanağı ve idare kalem bazlı yaklaşık maliyet setinde normal/sınır/eksik veri senaryolarını değerlendir.
- `%80` listenin teklif fiyatı değişiminden bağımsız kalması gereken veri kaynağını açıkça doğrula.
- İhale mevzuatı uzmanı kimliğiyle karar formunu imzala; EKAP içe aktarımı/ADT dosyası capability'sini uygulanmış gibi onaylama.

## 10. Disiplinler arası ortak örneklem

Altı uzman ayrı karar verir; aşağıdaki zincirlerde sonuçlar birlikte karşılaştırılır:

| Zincir | Birincil uzman | Çapraz kontrol | Ortak karar konusu |
|---|---|---|---|
| Yapısal IFC → QTO → minha/kesişim → poz/fiyat | STR | COST | Eleman miktarı, düşüm, birim ve fiyat izi |
| Mimari IFC → mahal/açıklık/kaplama → poz/fiyat | ARC | COST | Net/brüt, boşluk, katman ve ölçü tarifi |
| MEP IFC → sistem elemanı → mekanik/elektrik pozu | MEP | COST | Fitting/aksesuar mükerrerliği, birim ve poz |
| Ön BIM → kat karşılığı paylaşımı → KDV | ARC/COST | vergi | İmar girdisi, maliyet/pay ve vergi rejimi ayrımı |
| ADT → sözleşme → fiyat farkı/hakediş | ihale | COST | Tarihli mevzuat rejimi, endeks, avans/mahsup |

Çapraz uzmanlar uyuşmazlığı çoğunluk oylamasıyla kapatmaz. Her görüş ayrı kaydedilir; normatif veya hesap farkı çözülene kadar ilgili motor “şartlı” ya da “ret” durumunda kalır.

## 11. Koordinatörün uzmanlara bırakmadan tamamlayacağı işler

Uzman zamanını belge aramaya ve repo keşfine harcamamak için koordinatör şunları önceden tamamlar:

1. Kod/test yollarını, çalıştırma komutlarını ve makine çıktısını paketler; commit ve hashleri sabitler.
2. Her senaryonun girdi formunu boş değil, kaynak/provenans ve birim alanları doldurulmuş olarak hazırlar.
3. İzinli dosyalarda PII taraması/anonymization kaydını ve kullanım izni kanıtını ekler.
4. Kamu kaynaklarının URL, yayım/yürürlük ve erişim tarihini; ücretli standartların yetkili erişim kaydını hazırlar.
5. Yazılım sonucunu ayrı sütunda önceden üretir; uzmanın bağımsız hesabını görmeden beklenen sonuç alanını doldurmaz.
6. Fark tablosunu otomatik hesaplanabilir biçimde hazırlar; uzmanın yalnız mesleki sınıflandırma ve karar vermesini sağlar.

## 12. Kapanış kontrol listesi

Faz 0 uzman kanıt kapısı ancak aşağıdakilerin tamamı gerçekleşirse kapanabilir:

- [ ] STR, ARC, MEP, COST, vergi ve ihale için isimli bağımsız insan uzman atanmış; kimlik/yetkinlik, kapsam kabulü, tarih ve çıkar çatışması beyanı kayıtlı.
- [ ] Her motor için normal, sınır ve eksik/hatalı bağımsız beklenen çıktı mevcut; dosya ve girdi hashleri eşleşiyor.
- [ ] TS 500, TS 708 ve ISO 19650 için yetkili erişim/lisans ve kullanılan sürüm kaydı mevcut.
- [ ] ALLPLAN, Revit, Archicad ve Tekla IFC'leri ile gerçek imzalı PDF için yazılı kullanım izni, vendor sürümü ve PII kararı mevcut.
- [ ] ÇŞB kataloglarının ticari kullanım yetkisi veya kullanımı sınırlayan açık hukuk/ürün kararı kayıtlı.
- [ ] Her uzman farkları kapatmış veya ürün sınırını açık “şartlı/ret” kararıyla daraltmış.
- [ ] AI/agent çıktısı uzman adı veya imzası yerine kullanılmamış.
- [ ] Sentetik/açık kaynak fixture gerçek müşteri L4 saha kabulü olarak sunulmamış.

Bu liste tamamlanmadan `expert-assignment-register.json` içindeki `unassigned` durumları, `reference-register.json` içindeki blocker'lar veya Faz 0 `closureEligible=false` kararı yalnız belge düzenlemesiyle değiştirilemez.
