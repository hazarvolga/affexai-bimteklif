# BIMMetraj — mevcut kod ve GAP raporu bağımsız doğrulaması

**İnceleme tarihi:** 23 Ekim 2026 (Europe/Istanbul)
**Yerel/uzak main:** `e748481684b296cc6a1cd5de0365136b47384d2b`
**İncelenen rapor:** kökteki `proje_analiz_gap_bug_seo_geo_rakip_raporu.md`; kendi tarihi **21 Ekim 2026**, baseline `fd32f8b` / Rev.39.
**Yöntem:** kaynak kodu, çağıran bileşenler, mevcut testler, bellekte karşı örnekler, depodaki kaynak PDF, Git/CI ve herkese açık health yanıtı. Ürün kodu, testler, ayarlar, DB ve canlı sistem değiştirilmedi. Bu dosya denetim çıktısıdır.

## 1. Karar

**Rapor kısmen yararlı, fakat mevcut geliştirme sırasını doğrudan belirleyecek kadar güvenilir değil.** Gazbeton sınıflandırması, parser farkı, bazı örnek veri sorunları, PDF tarama sınırı ve eksik hakediş yaşam döngüsü gerçek. Buna karşılık katalog kapsamı, otomatik poz sayısı, CDE doğrulayıcısının varlığı ve güncel dağıtım durumu yanlış/eskimiş değerlendirilmiş. “Hesap motorları %100 mevzuata uyumlu” ve “Türkiye'de tek platform” sonuçları kanıtlanmıyor.

Öncelikli sorun katalog büyüklüğü değil: **icmalde poz–imalat–ölçü birimi–fiyat bağlantısı bozuk ve fiyat kaynağı seçimi hesaba bağlı değil.** Bu kapanmadan yeni otomatik eşlemeler eklemek hatanın kapsamını büyütebilir.

Ürün, çalışan ve dağıtılmış bir pilot SaaS temeline sahip. Ancak incelenen maliyet, yeterlik ve CDE çıktılarının tamamı bağımsız mühendislik doğrulamasından geçmiş ticari sonuç olarak sunulamaz. Registry'de 19 yeteneğin 15'i `L2/pilot`, 4'ü `L1/roadmap`; adlandırılmış reviewer veya `L3` kayıt yok.

## 2. Mevcut durum: kod, Git ve canlı ayrımı

| Katman | Bu incelemede doğrulanan durum |
|---|---|
| Aktif mimari | React/Vite + Express + Drizzle/PostgreSQL; Graphile Worker, Python IfcOpenShell/pypdf; Docker Compose/Coolify. Next.js/Prisma ana uygulama dönüşümü hâlâ hedef mimari. |
| Yerel HEAD | `main @ e748481`; ürün kaynaklarında başlangıçta unstaged değişiklik yok. Graphify dosyaları önceden değişmiş; kökteki rapor ve global konumlandırma belgesi untracked. Bunlar korundu. |
| Uzak main | `git ls-remote origin refs/heads/main` aynı `e748481` SHA'sını döndürdü. |
| Canlı HTTP | `GET https://bimmetraj.com/api/health`: `status=ok`, DB connected, `revision=d9d80df12d9b4a00d36e89b12f68a9982b21ba8e`, `revisionSource=build`. Readiness alanları true. |
| Canlı–HEAD farkı | `git diff d9d80df..HEAD --name-only`: yalnız `docs/agent-memory/WORKING_STATE.md`. Dolayısıyla rapordaki “Rev.36–39 canlıya çıkmadı” bugünkü durum için yanlış. |
| CI | [Canlı commit Verify](https://github.com/hazarvolga/affexai-bimteklif/actions/runs/39788106614) ve [HEAD Verify](https://github.com/hazarvolga/affexai-bimteklif/actions/runs/39792099960) success. Canlı commit iş adımlarında DB migration, verify, E2E, image build ve runtime smoke success. Bunlar 22 Ekim CI kayıtlarıdır; bugün yerelde yeniden çalıştırılmış tam E2E değildir. |
| Ayrı dal | `b9153eb` / `fix/ifc-browser-quota-alert`, HEAD atası değil; uzak aynı adlı ref bulunmadı. Kalıcı ve eylemli 403 paneli bu dalda; main'de yalnız toast/genel mesaj var. |
| Runtime sınırı | Dockerfile/CI 24.22.1 hedefli; yerel test Node sürümü 24.18.0. Health yanıtı tek başına çalışan container'ın Node sürümünü veya ayrı worker imajlarını kanıtlamaz. |

Auth/tenant üyeliğinin DB'den yenilenmesi, HttpOnly/SameSite çerezleri, CSRF denetimi, işlem öncesi kota rezervasyonu, crawler kilidi ve kaynak sınırları için mevcut kod ve odaklı testler olumlu. Bu değerlendirme tam penetrasyon testi veya canlı DB rol denetimi değildir.

## 3. Raporda kaçırılan öncelikli bulgular

### KOD-01 — P1: İcmal pozları katalogdaki imalat ve birimle uyuşmuyor

| Poz | Calm icmal tanımı | Depodaki ÇŞB Mart 2026 kaynağı |
|---|---|---|
| `15.225.1004` | Ytong/Bims duvar; **m³**, 2.950 TL | 10 cm gazbeton duvar; **m²**, 743,59 TL |
| `15.315.1004` | XPS 5 cm / yalıtım; **m²**, 240 TL | Ø100 mm PVC yağmur oluğu; **m**, 380,71 TL |
| `15.365.1102` | Parke süpürgeliği; **mtül**, 145 TL | PVC spor zemin kaplaması; **m²**, 2.670,45 TL |
| `15.365.1001` | Laminat parke; m², 640 TL | PVC zemin kaplaması; m², 1.071 TL |

**Kod:** `src/ifc/calm-icmal.ts:133–141,156–166,194–204,220–230`. **Katalog:** `src/server/crawler/data/csb-2026-official-catalogs.json:1897,4027,5017,5131`. İlk üç satır ayrıca depodaki `docs/fiyatlandirma-kaynaklari/2026-Mart-n-aat-B-F-20260303131312.pdf` dosyasının sırasıyla **11, 24 ve 32. sayfalarından pypdf ile bağımsız okunarak** doğrulandı. Buradaki fiyatlar tarihli karşılaştırma kanıtıdır; Ekim 2026 güncel fiyat önerisi değildir.

14 sabit eşleme kodunun 8'i bu gömülü listede bulunmuyor. Bu, söz konusu kodların hiçbir kurum veya dönemde var olmadığını değil, kullanılan referansla eşleşmediğini gösterir.

**Etki:** icmal UI maliyeti ve CSV yanlış imalat/birim taşıyabilir. Kalıcı teklif API'sine aynı yanlışlığın doğrudan yazıldığı kanıtlanmadı: mevcut iki Calm çağıranı `onTransferToQuote` vermiyor; düğme bu durumda CSV indiriyor (`CalmIfcWorkspace.tsx:473–490`). Teknik panelin ayrı reviewed-row transferi farklı akış.

**Düzeltme yönü:** poz kodu, imalat tarifi, ölçü birimi, kalınlık/sınıf, fiyat dönemi ve kaynak onayını tek doğrulanmış katalog kaydı üzerinden seçmek; uyumsuz eşlemeyi `needs_review`/kapsam dışına almak.

### KOD-02 — P1: BYOL / ÇŞB fiyat kaynağı seçimi hesaplamaya bağlı değil

`CalmIfcWorkspace.tsx:89–94` fiyatları `defaultUnitPriceTry` ile başlatıyor. `:165–167,1143–1158` içindeki `priceLicenseMode`, yalnız seçim state'i; katalog sorgusuna veya fiyat çözümlemeye aktarılmıyor. UI `:1139` kullanıcıya BYOL veya 18.848 satırlık referansı kullandığını düşündürüyor. Toplam ve CSV ise sabit/manüel fiyatları kullanıyor (`:108–112,408–427`).

Yaklaşık maliyet etiketi bulunması, kaynağın fiilen seçilmediği sorununu çözmüyor. Kaynak seçimi bağlanana kadar bu seçeneklerin çalışır katalog modu gibi sunulmaması gerekir.

### KOD-03 — P1: YAMBİS eksik kanıtı uygunluk sayıyor; tarihli istisnayı uygulamıyor

1. `yambis-classification.ts:215–225`: banka referansı yoksa `not_evaluated`; `eligible` yalnız fail olup olmadığına bakıyor. UI `YambisCalculatorPage.tsx:95,117` “Tüm kriterleri sağlayan” / “Sağlanıyor” gösteriyor. İş deneyimi 90 milyon TL, usta/teknik personel 1/1, ilgili mali oranları sağlayan girdide banka referansı boşken **G**, banka tutarı 0 olduğunda **H** çıkıyor. Eksik veri kesin uygunluk olmamalı. Mevcut test (`yambis-classification.test.ts:134–141`) bu davranışı özellikle geçerli sayıyor: yeşil test yanlış iş kuralını da koruyabiliyor.
2. `yambis-classification.ts:190–196` iş gücü eşiklerini tarihsiz ve her zaman uyguluyor. G için yeterli deneyim/banka girdisiyle personel 0/0 verilince H üretiyor. Bakanlığın yayımladığı yeterlilik sayfası **31.12.2026 dahil iş gücü yeterliğinin aranmadığını**, beyanın sürdüğünü belirtiyor. [Osmaniye ÇŞİDB yeterlilik sistemi](https://osmaniye.csb.gov.tr/yeterlilik-sistemi-i-100536). Bu, erişilen Bakanlık yayınıyla kod arasındaki açık uyuşmazlıktır; bütün mevzuat değişikliklerinin eksiksiz konsolidasyonu ayrıca uzman tarafından teyit edilmelidir.

G/G1 için banka referans gerekliliği ayrıca [Bolu ÇŞİDB 2026 başvuru belgesinde](https://webdosya.csb.gov.tr/v2/bolu/2026/02/G1-G-GRUBU-M-TEAHH-TL-K-N-STEN-LEN-EVRAKLAR-20260204104018.pdf) yer alıyor. Bilanço/ciro muafiyeti tüm mali kanıtların muafiyeti gibi özetlenmemeli.

### KOD-04 — P1: KİK %80 açıklama kapsamı yanlış veri kaynağından türetiliyor

`CalmIfcWorkspace.tsx:394–403` Pareto girdisini kullanıcının miktar × fiyatından üretiyor. `kik-adt.ts:133–169` bunun %80'ini açıklama istenen kalemler olarak sunuyor. Oysa Tebliğ 45.1.2–45.1.2.1 idarenin yaklaşık maliyet dağılımını esas alır. [KİK kararında aktarılan resmi hüküm](https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=26178bd78b9730925abbf20cecee0c1b9668cd30333cd4f9b4e9dde116a58a53).

Karşı örnek: idarenin dağılımı A=90/B=10, teklif dağılımı A=10/B=90 ise mevcut arayüz B'yi seçer; idarenin sorgulama listesi A üzerinden oluşur. Bu ekran ya idarenin kalem bazlı yaklaşık maliyetini almalı ya da “teklif içi ticari Pareto” olarak adlandırılmalı.

### KOD-05 — P1: CDE geçmiş sırası geçerli ilerlemeyi engelliyor

`CalmIfcWorkspace.tsx:314` yeni kayıtları başa ekliyor; `:307` diziyi ters çevirerek **en eski** başarılı kaydı seçiyor. Bellekte aynı çağrı dizisi:

```text
null → WIP       allowed=true
WIP → SHARED     allowed=true
WIP → PUBLISHED  allowed=false
```

Üçüncü geçişin kaynağı SHARED olmalı. Ayrıca `iso19650.ts:598` yalnız `startsWith("S")` kontrol ettiği için SHARED/S0 da kabul ediliyor; aynı fonksiyonun mesajı S1..S7 şartı söylüyor. Yorumdaki tam geçiş tablosu whitelist olarak uygulanmıyor.

**Kurumsal kapsam farkı:** registry `:295–306` çok kullanıcılı yetkili onay akışı anlatıyor; bulunan akış localStorage (`CalmIfcWorkspace.tsx:264–280`) ve varsayılan actor (`iso19650.ts:567`) ile çalışıyor. Doğrulanmış kimlik/rol, kalıcı sunucu onayı ve çok kullanıcılı geçiş kaydı gösterilmedi. Yerel kontrol fonksiyonu böyle bir iş akışını kanıtlamaz.

### KOD-06 — P1/P2: İcmal kapsamı bazı verileri sessiz kaybediyor veya yanlış eşliyor

- `calm-icmal.ts:610–639`: pozlu, ölçülü 100 kg `IfcReinforcingBar` “matched” sayılıyor; ardından `continue` ile kalem oluşturmadan geçiliyor. Karşı örnek **items=[], uncovered=[], findings=[]**, matched=1. İcmal/CSV kapsamı eksik; ayrı teknik transfer için aynı sonuç ileri sürülmüyor.
- `calm-icmal.ts:220–230`: “Su yalıtımı bitümlü membran” 10 m² girdisi, uyarısız XPS 5 cm olarak yerleşiyor. “Yalıtım eşlemesi yok” teşhisi yerine aşırı geniş eşleme düzeltilmeli.
- `pdf_preflight.py:101–122`: ilk 20 sayfa sınırına ek olarak AcroForm `/Kids` alt ağacı taranmıyor. Nested imza alanı false, boş `/Sig` alanı true üretiyor. Bu kontrol imza alanı ön kontrolüdür; geçerli elektronik imza doğrulaması değildir.

### KOD-07 — P2: Minha açıklaması ve gerçek hesap kapsamı ayrışıyor

`minha.ts:14,110–115` üç profil içeriyor: CSB_2026, DIN_18350, CUSTOM_CONTRACT. Buna karşılık uzman inceleme ekranı `calculation-content.ts:293` kodda olmayan `CSB_2026_V1` ile 2 m² sıva / 1 m² kalıp eşikleri sunuyor. Üstelik `openings-minha.ts:4–6` seçimin kalem bazlı net miktarı değiştirmediğini açıkça söylüyor: boşluk–imalat eşlemesi olmadığı için yalnız özet hesaplanıyor.

Skill içeriğindeki “ÇŞB'de tüm boşluklar düşülür” bilgisi de kodun 0,50 m² eşiğiyle çelişiyor. Hiçbiri yalnız skill veya yorum var diye genel norm kabul edilmemeli; uygulanacak poz/sözleşmenin ölçü tarifi doğrulanmalı.

### KOD-08 — P2: CSV'de hücre/formül enjeksiyonu ve sütun bozulması

`CalmIfcWorkspace.tsx:450–459` IFC kaynaklı oda kodu/adını doğrudan `join(";")` ile dışa aktarıyor. Gerçek `buildApartmentScheduleFromElements()` fonksiyonuna `spaceCode="=1+1"`, `spaceName="Salon;extra"`, `zoneName="D01"` verildiğinde aşağıdaki satır üretildi:

```text
2_DAIRE_ODA_DETAY;Daire D01;=1+1;Salon;extra (Floor);12,00;0,00;12,00;m²;;
```

Beklenen 10 yerine 11 sütun ve korunmuş formül başlangıcı var. Kaynak zinciri `ifc_extract.py:1883–1894` → `calm-icmal.ts:558–560,375–406,418–423`. Etki, dış IFC verisini CSV'ye aktarıp formül çalıştıran spreadsheet uygulamasında açan kullanıcıyla sınırlı; bu incelemede spreadsheet çalıştırılmadı, RCE/veri sızdırma iddia edilmiyor. Ortak CSV serializer ile ayraç/tırnak/CR-LF kaçışı ve ayrıca formül nötrleştirme gerekir; yalnız tırnaklamak yeterli değildir.

### KOD-09 — P2: Compose varsayılanında runtime ve bootstrap DB hesabı aynı

`compose.coolify.yaml:27,155–159,203–213`: app/worker, migration ve `POSTGRES_USER` aynı `bimmetraj` hesabını kullanıyor. Resmî PostgreSQL image bu değişkendeki kullanıcıyı **boş volume başlangıcında superuser** olarak oluşturur. [Resmî Docker PostgreSQL image belgesi](https://hub.docker.com/_/postgres).

Bu, yeni kurulum için fazla yetki riski; **canlı rol yetkileri incelenmedi**, sonradan daraltılmış olabilir. SQL injection veya tenant izolasyonu aşımı bulunduğu anlamına gelmez. Runtime/migration/backup rolleri gerekli tablo/şema/queue grant'leriyle ayrılmalı. Depodaki migration/schema incelemesinde DB RLS politikası da görülmedi; uygulama katmanı tenant filtreleri ve testleri, DB seviyesinde ikinci savunma katmanı yerine geçmez.

## 4. Eski raporun 22 maddesi: tek tek karar

### BUG maddeleri

| Madde | Karar | Doğrulama / düzeltme |
|---|---|---|
| BUG-01 | **Doğru; maliyet sonucu hatalı genellenmiş** | Gazbeton/Gaz beton önce beton regexine yakalanıyor (`structural-material.ts:21–23,54–58`). C30, 3450, uyarı yok. “%16,9 fazla” resmî maliyet farkı değil; iki sabit fiyatın oranı ve birimleri de tutarsız. |
| BUG-02 | **Kısmen doğru** | Statik örnekte 4,80 m³ perde dışlanıyor; 32,50 m² koruma betonu 450 generic fiyat alıyor (`sample-projects.ts:1098–1114`; `calm-icmal.ts:312–321,530–556`). Rapordaki `findCoveringRule` mevcut değil; 980 olması gerektiği doğrulanamadı. |
| BUG-03 | **Kısmen doğru** | Grobeton ve “Beton C 25/30” sessiz C30; fakat “Beton C16/20” uyarı verir, “C 25/30” tek başına unplaced olur (`structural-material.ts:23,30–40`; `calm-icmal.ts:784–793`). |
| BUG-04 | **Parser farkı doğru; 403 anlatımı eksik** | Legacy sınıfları/materialLayers kapsamı dar (`legacy-parser.ts:108,268`). Ana tarayıcı akışı gerçekten bunu Calm'a verir. 403 için main'de toast var; kalıcı eylem paneli ayrı dalda. |
| BUG-05 | **Doğru; koşullu** | Sonradan eklenen uncovered/findings yalnız GUID ile tekilleşiyor (`calm-icmal.ts:838–854`). Farklı STEP ID'li aynı GUID iki ahşap eleman → yalnız ilk kayıt. Önceden baseReport'ta bulunan her duplicate evrensel olarak silinmiyor. |
| BUG-06 | **Doğru; rapor sorunu eksik anlatmış** | Sayfa 20 imzası true, 21 false. AcroForm tam ağaç taraması da yok; nested `/Kids` kaçıyor (`pdf_preflight.py:101–122`). |

### GAP maddeleri

| Madde | Karar | Doğrulama / düzeltme |
|---|---|---|
| GAP-01 | **Ana sayılar ve kapsam genellemesi yanlış** | Gömülü 6 kitap/18.848 satır var; 103 örnek verisi toplam katalog değil. Calm'da 14 sabit poz + explicit fallback var. IfcFooting/IfcRoof worker'da slab'a eşlenebiliyor (`ifc_extract.py:323,1611–1615`), yalıtım kuralı da var. Asıl açık doğru imalat/birim/provenance eşlemesi. |
| GAP-02 | **Doğru** | C25/30 vb. sınıf okunuyor fakat tek C30 spec kullanılıyor; fark yalnız uyarı (`calm-icmal.ts:122–130,784–792`). |
| GAP-03 | **Özü doğru** | CSV/metraj/mahal özeti var; çok dönemli hakediş no, önceki/kümülatif miktar, mukayeseli keşif ve kesin hesap DB/API yaşam döngüsü bulunmadı. “Hiç icmal yok” denmemeli. |
| GAP-04 | **Doğru** | Fiyat farkı input'unda iş programı/gecikme/avans yok (`price-escalation.ts:222–234`). Temel formül tüm sözleşme rejimini kapsamaz; mevzuat madde atıfları ayrıca düzeltilecek. |
| GAP-05 | **Özü doğru** | Adlandırılmış bağımsız reviewer/L3 yok. “Kurumsal şartnamede şerh hukuken zorunlu” genellemesine raporda dayanak yok. |
| GAP-06 | **Doğru** | EKAP tutanak içe aktarımı/savunma dosyası registry'de roadmap (`registry.ts:427–445`). |
| GAP-07 | **Özü doğru** | Gerçek PDF/A dönüşüm/veraPDF ve 3D görüntüleyici entegrasyonu yok. Mevcut preflight yalnız üstveriden ibaret değil; sayfa boyutu/tarama/pafta kontrolleri de var. |
| GAP-08 | **Canlı sürüm iddiası artık yanlış** | Health Rev40 build SHA; main farkı belge. Ayrı quota alert dalı hâlâ ayrı. Healthcheck kodda var; otomatik rollback'in gerçek operasyonel çalışması bu denetimde doğrulanmadı. |

### SEO/GEO maddeleri

| Madde | Karar | Doğrulama / düzeltme |
|---|---|---|
| SEO-01 | **Yanlış teşhis** | CDE validator hem bugünkü kodda hem raporun `fd32f8b` baseline'ında var. Gerçek sorun yerel/kurumsal kapsamın karışması ve `web-hardening.ts:153` eski Faz 2 metni. |
| SEO-02 | **Yanlış** | 18.848 kayıt gerçek gömülü veri; registry ve parser baseline'da da var. JSON-LD'yi 103'e düşürmek yanlış olur. Kayıt sayısı lisans/onay/güncel fiyat kanıtı değildir. |
| SEO-03 | **Tespit doğru; öneri eksik** | `web-hardening.ts:112` sabit lastmod kullanıyor. Tüm URL'lere build tarihi basmak yerine sayfa bazlı anlamlı değişim tarihi kullanılmalı veya doğrulanamayan tarih kaldırılmalı. |
| SEO-04 | **Üretim arızası olarak yanıltıcı** | URL yokluğu production startup validation ile reddediliyor (`production.ts:30,43–45`; `app.ts:76`); Compose URL'yi veriyor. Sessiz domain fallback gerekli değil. |
| SEO-05 | **Eksiklik var; büyüme etkisi kanıtsız** | Rota bazlı Breadcrumb/terim şeması yok. “En yüksek trafik” verisiz; schema varlığı rich result/arama trafiği garantisi değil. |
| GEO-01 | **Engel iddiası yanlış** | `User-agent:*` kamu sayfalarını zaten engellemiyor (`web-hardening.ts:117–120`). Her AI bota özel Allow veya llms alternate etiketi zorunlu değil. |
| GEO-02 | **Teknik risk doğru; etki büyüklüğü kanıtsız** | `<noscript>` bazı içerik çıkarıcılarda kaldırılıyor; semantik prerender değerlendirilebilir (`route-meta.ts:159–169`). “Alıntılanma ciddi artar” ölçülmemiş. |
| GEO-03 | **Opsiyonel iyileştirme** | Tek dil sayfasında hreflang yokluğu bug değildir; gerçek çeviri URL'leriyle anlamlıdır. areaServed/sameAs yalnız doğrulanmış kurum bilgileriyle eklenmeli. |

## 5. Hesap motorlarının doğruluk sınırı

| Motor | Kanıtlanan | Raporda düzeltilmesi gereken |
|---|---|---|
| KİK ADT | Altın örnek 52.281,00 TL üretiyor; mevcut test geçiyor. | Örnekte 12 girdi / 10 bant içi teklif ayrımı var. Pareto kodu büyükten küçüğe; rapor ters yazmış. Pareto'nun veri kaynağı yanlış. |
| 4735 fiyat farkı | Ana formül, endeks oranları, ağırlık kontrolü var. | Kod toleransı 0.0001; rapor 0.001. B varsayılan 0.9, değiştirilebilir. Rapordaki 21 kod listesi gerçek enumla birebir uyuşmuyor. Gecikme/avans yok. |
| Kat karşılığı/KDV | Dilimli konut KDV'si ve emsal maliyet marjı aritmetiği testlerden geçiyor. | Konut/işyeri ayrımlı tam model yok; ruhsat tarihi ve kapsam sınırı var. Tek test grubu %100 hukuki uyum kanıtı değil. |
| YAMBİS | Temel oran/sınıf aritmetiği var. | Eksik banka verisi ve tarihli iş gücü muafiyeti açık. Rapordaki 2 Ekim 2020 / RG31301 atfı da erişilen konsolide metindeki 3.10.2020 / 31263 ile uyuşmuyor. |
| Pre-BIM | Alan ve maliyet ön fizibilite hesabı var. | Tam imar uygunluk motoru değil. %30 aşımı uyarı; tamamen muaf alanlar ayrı. Rapordaki `MAX_EMSAL_EXEMPT_RATIO` isimli sabit bulunmuyor. |
| Minha / 3×3 | Sayısal hesap ve şirket tolerans kuralları mevcut. | Poz bazlı ölçü esası ve uzman ekranı hizası eksik. %3 şirket politikasıdır. 25 mm'yi bütün temellere doğrulanmış asgari paspayı gibi genellemek kod/kapsamla desteklenmiyor. |

İki BIM skill sürümü de proje hakkında eskimiş bilgiler içeriyor: katalog yokluğu ve yalnız tarayıcı e-PYS iddiaları mevcut kodla uyuşmuyor. Skill, arama ve hesap disiplini için kullanıldı; mevcut ürünün kanıtı olarak kabul edilmedi.

## 6. SEO/GEO ve rakip önerilerinin düzeltilmesi

Google, 2026 açıklamasında llms.txt'nin Google Search görünürlüğü/rankingini artırmadığını veya azaltmadığını belirtiyor; FAQ rich results desteği 7 Mayıs 2026'da kaldırılmış. Bu nedenle llms/FAQ eklemelerini kanıtlanmış trafik kazanımı olarak önceliklendirmemek gerekir. [Google resmi değişiklik günlüğü](https://developers.google.com/search/updates). Sitemap tarihleri sayfanın esaslı güncellemesini göstermeli. [Google sitemap rehberi](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

“Türkiye'de tek”, “tartışmasız pazar lideri”, “kara kutu”, “mevzuattan tamamen habersiz” ve “aylık on binlerce arama” ifadeleri kaynaklı pazar araştırması değildir. Rakipte özellik görülmemesi, özelliğin olmadığı kanıtı sayılmamalı. RIB CostX için yalnız desktop/server yazılması eksik: resmi ürün sayfası CostX Cloud'u açıkça tanımlıyor. [RIB CostX](https://www.rib-software.com/en/rib-costx). OSKABULUT'un web ürünü de ayrı karşılaştırılmalı. [OSKA ürün sayfası](https://www.oska.com.tr/menu/oskabulut/).

**Ticari yorum (çıkarım):** Önce doğrulanmış IFC → metraj/CSV → teknik ofis aktarımı akışında güvenilirlik kurmak, sonra hakediş entegrasyonunu pilot müşteriyle doğrulamak daha savunulabilir. Rakiplerin tam hakediş sistemini bir anda yeniden üretmek veya doğrulanmamış hesaplayıcılarla trafik büyütmek bu aşamada öncelik olmamalı.

## 7. Doğrulama kayıtları ve sınırlar

| Kontrol | Sonuç |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | Exit 0 |
| 26 seçili dosyada birleştirilmiş TS testi | **181 geçti, 0 fail, 0 skipped**, exit 0 |
| `workers/ifc/.venv/bin/python -m pytest workers/ifc -q` | **60 geçti**, 9 IfcOpenShell datetime deprecation uyarısı, exit 0 |
| `pnpm run build` | Exit 0; büyük chunk uyarısı var, en büyük ExcelJS chunk yaklaşık 940 kB / gzip 271 kB |
| `node scripts/dependency-audit-policy.mjs` | Exit 0, `blocked: []`; politika kapsamında high/critical engel yok. Bu bütün güvenlik açıklarının yokluğu anlamına gelmez. |
| Bellekte karşı örnekler | Gazbeton, sınıfsız beton, statik örnek, duplicate GUID, pozlu donatı, yalıtım, PDF sayfa sınırı/nested alan, YAMBİS, KİK Pareto ve CDE davranışları kontrol edildi. |
| PDF çapraz kontrol | Mart 2026 kaynak PDF'si sayfa 11/24/32, üç poz/birim uyuşmazlığını doğruladı. |

Birleştirilmiş komut:

```bash
DATABASE_URL=postgresql://audit:unused@127.0.0.1:1/teklifpro_audit_no_connection NODE_ENV=test \
./node_modules/.bin/tsx --test \
 src/server/auth/session-cookie.test.ts src/server/auth/security.test.ts \
 src/server/middleware/auth.tenant.test.ts src/server/middleware/impersonation-security.test.ts \
 src/server/middleware/usage.test.ts src/server/config/production.test.ts \
 src/server/config/ifc-limits.test.ts src/server/config/dependency-audit.test.ts \
 src/server/crawler/crawler-hardening.test.ts src/server/crawler/source-crawl-boundary.test.ts \
 src/server/crawler/scheduler-lock.test.ts src/pages/admin/roadmap/content.test.ts \
 src/ifc/calm-icmal.test.ts src/ifc/browser-quota.test.ts src/smartcheck/sample-projects.test.ts \
 src/lib/kik-adt.test.ts src/lib/kik-adt.golden.test.ts src/lib/price-escalation.test.ts \
 src/lib/kat-karsiligi.test.ts src/lib/yambis-classification.test.ts src/lib/pre-bim-feasibility.test.ts \
 src/smartcheck/rules/minha.test.ts src/capabilities/registry.test.ts \
 src/smartcheck/rules/iso19650.test.ts src/server/security/route-meta.test.ts \
 src/server/security/web-hardening.test.ts
```

DB'ye erişmeyen odaklı testler seçildi; yanlışlıkla yerel/paylaşımlı DB kullanımını engellemek için işlevsiz test bağlantısı verildi. Orijinal raporun “27 dosya / 245 test” komutu dosya listesini vermediğinden aynı seçkinin birebir tekrarı iddia edilmiyor. Bugünkü 181 test farklı ve açıkça listelenmiş kapsamdır.

**Bugün yapılmayan doğrulamalar:** tüm test paketinin yerel DB entegrasyonu, tam tarayıcı E2E, canlı tenant/RLS/DB rolü, worker container SHA/runtime incelemesi, gerçek müşteri dosyası ve mühendis imzalı kabul, güncel lisans/approved fiyat satırlarının canlı DB sorgusu, yedekten geri dönüş ve rollback tatbikatı. Eski belgelerdeki başarılı kayıtlar bunların bugünkü tekrarı sayılmadı. Test kapsam yüzdesi ölçülmedi; %80 coverage veya tam production readiness sonucu verilmiyor.

## 8. Önerilen düzeltme sırası ve kabul ölçütleri

1. **Poz–imalat–birim–fiyat/provenance:** KOD-01/02; tek kaynak çözümleyici, tarih/lisans/onay kontrolü, birim uyuşmazlığında kapalı davranış. Kabul: farklı katalog modu gerçekten farklı doğrulanmış kaynağı kullanır; yanlış birim sessiz fiyatlanmaz.
2. **IFC kapsam bütünlüğü:** Gazbeton/sınıf, genel yalıtım, donatı kaybı, parser farkı ve duplicate kayıtlar. Kabul: her girdi ya doğru kaleme ya gerekçeli kapsam dışı satırına gider; aynı eleman kaybolmaz/çift sayılmaz.
3. **Mevzuat ve workflow doğruluğu:** YAMBİS eksik veri/tarih, KİK idare maliyeti ayrımı, CDE son durum ve gerçek onay kapsamı, minha kod–uzman ekranı hizası. CSV güvenli dışa aktarımı ve ayrı DB runtime rolü bu stabilizasyon paketinde ele alınmalı.
4. **Bağımsız kabul:** temsilî gerçek IFC/PDF ve sözleşme örnekleri; yetkili uzman imzası. Testleri geçen ama yanlış beklenti içeren örnekler yeniden düzenlenmeli.
5. **Ürün metinleri ve keşfedilebilirlik:** registry/llms/landing/admin aynı kapsamı anlatmalı; pilot ile kurumsal onay ayrılmalı. Ardından ölçülebilir prerender/SEO çalışması.
6. **Sonraki ürün geliştirme:** çok dönemli hakediş/OSKA–AMP aktarımı, EKAP savunma paketi, 3D inceleme ve gerçek PDF/A doğrulaması; pilot talebi ve kaynak bütçesine göre.

Bu görev analizdir: düzeltme, commit, push veya deploy yapılmadı. Ürün davranışı değişmediği için roadmap revizyonu/CALC versiyonu artırılmadı; kaynak kod değişmediği ve graph dosyaları kullanıcıya ait değişiklikler içerdiği için Graphify yeniden üretilmedi.

Teknik ön değerlendirmedir; yetkili mühendis ve ilgili vergi/mevzuat uzmanı onayı gerekir.
