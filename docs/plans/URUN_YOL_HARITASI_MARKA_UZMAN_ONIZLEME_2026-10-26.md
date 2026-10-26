# BIMMetraj — Uzman Önizlemesi Öncesi Ürün Yol Haritası (26 Ekim 2026)

**Dayanak:**
- `marka.md`: Codex inceleme raporu, 25 bölüm.
- Claude kod incelemesi, 26 Ekim 2026.
- `docs/operations/UZMAN_ONIZLEME_DEPLOY_VE_GERI_BILDIRIM_2026-10-26.md`.

**Bu belge ne değildir:** Uygulanmış özellik listesi veya uzman onayı değildir. Her madde, ilgili PR'da kodla ve testle kapanır.

## 0. Kararlar (Hazar, 26 Ekim 2026)

1. **Uzmana tamamlanmış arayüz sunulur.** Aşağıdaki Faz 0–4'ün tamamı yerelde bitirilir ve doğrulanır, ardından tek bir deploy penceresiyle uzman önizlemesi başlar.
2. **Başlık, mesaj ve konumlandırma kararı ekibindir.** Uzmanlara başlık testi yaptırılmaz. Uzmanlardan yalnız hesap doğruluğu ve iş akışı geri bildirimi istenir. Gerekirse başlıklar sonra değiştirilir.
3. **Excel önce gelir.** Kullanıcı Excel'den girer, BIMMetraj'da kontrol eder, Excel'e geri çıkar. CSV ikincil seçenek olarak kalır.
4. **Üç katmanlı dil:**
   - Patron: sonuç.
   - Teknik ofis: iş akışı.
   - Uzman: yöntem, standart, kaynak.
   Teknik ayrıntı silinmez; detay panellerine, "Nasıl hesaplıyoruz" sayfasına ve uzman görünümüne taşınır.
5. **Refactor yalnız dokunulan dosyada yapılır.** Kendi başına refactor işi açılmaz. Sunucu RLS dosyalarına deploy'dan önce yalnız hata düzeltmesi için dokunulur.
6. **İddia kapısı korunur.** Uzman onayı (T50) gelmeden "hatasız", "resmî", "doğrulandı" dili kullanılmaz.

## 1. Çalışma kuralları

- **Sıra:**
  - PR #21 (uzman geri bildirimi ve önizleme) önce birleşir.
  - Faz 0, kod üzerinde en riskli ve en çok dosyaya dokunan iş olduğu için ikinci sıradadır.
- **Aynı dosyada tek ajan çalışır.** Claude, Codex ve Antigravity aynı anda aynı dosyaya dokunmaz. Her faz kendi dalında ve kendi PR'ında ilerler.
- **Her madde için kabul ölçütü vardır:** bir test veya tarayıcı kanıtı ve gerekiyorsa ekran görüntüsü.
- **Ortak terim sözlüğü:** Bütün metin değişiklikleri tek bir sözlüğe (`src/i18n/ui-terms.ts`, Faz 0'da oluşturulacak) bağlanır. Aynı kavram her ekranda aynı kelimeyle söylenir.
- **Kod konumu:** "Konum" sütununda dosya varsa doğrulanmıştır. "tespit" yazanlar, ilgili fazın ilk işinde bulunur.

## 2. Faz 0 — Güven: sonuç ekranı doğru konuşsun (en yüksek öncelik)

Gerekçe: Uzman bu hataları görürse asıl hesap doğruluğu yerine bunları raporlar ve geri bildirim gürültüye boğulur.

| Kimlik | Madde (marka.md) | Yapılacak | Konum |
|---|---|---|---|
| M-14.1 | Fiyatı olmayan kalem 0 TL görünüyor | "Eksik / Hesaplanmadı / 2 kalem fiyat bekliyor"; kısmi toplam açıkça etiketlenir | `CalmIfcWorkspace.tsx` maliyet sekmesi |
| M-13.6 | "Katmanlar ve minha doğrulandı" ile "uygulanamadı" çelişkisi | Her kontrolün durumu ayrı üretilir: bulundu / uygulanamadı / veri eksik / inceleme bekliyor | tespit (CalmIfcWorkspace sonuç başlığı) |
| M-13.7 | "Boşluk yok" ile "boşluk bilgisi yok" | İki ayrı durum ve metin; "belirlenemedi" | tespit |
| M-13.8 | %100 eşleşme, %100 doğrulama gibi algılanıyor | Ayrı göstergeler: miktar kapsamı, poz eşleşmesi, fiyat kapsamı, inceleme | `IfcCoverageCard.tsx` |
| M-13.9 | "0 daire / — m²" | "Daire/mahal cetveli için yeterli bilgi bulunamadı"; sıfır yalnız gerçekten sıfırsa gösterilir | tespit |
| M-20.2 | Durum modeli | Ortak durum sözlüğü: kaynak okundu, miktar bulundu, kontrol uygulanamadı, inceleme bekliyor, kapsam dışı, fiyat eksik, fiyat eşleşti, teklife aktarılabilir | yeni: `src/domain/review-status.ts` |
| M-20.3 | Sonuç özeti | Sonuç ekranı başında 4–5 satırlık durum özeti ve "sonraki adım" | CalmIfcWorkspace |
| M-14.2 | "Birim fiyat kutuları düzenlenebilir" ile "yalnız onaylı fiyattan" çelişkisi | Gerçek davranış tek cümleyle anlatılır; düzenleme yoksa "Fiyat kaynağı seç / Kataloğa ekle" | `CalmIfcWorkspace.tsx:1279` |
| M-12.2 | AI fiyat mesajı kaynak politikasıyla çelişiyor | "AI kalem ve açıklama taslağı hazırlar; miktar ve fiyatlar kaynaklarıyla incelenir." AI'ın gerçek fiyat davranışı kodda doğrulanır | `CreateQuote.tsx:652` |
| M-12.7 | %5–8 pazarlık payı ipucu | "Kendi maliyet ve marj hedefinize göre belirleyin" | tespit (AI ipucu metni) |
| M-7.6, 7.7, 18.3 | PDF sayacı: yeniden üretim kota tüketiyor; teklif PDF'i ile PDF/A ön kontrolü ayrı sayaçlar | Karar (§9 madde 1): aynı teklif sürümünün yeniden PDF'i kotayı düşürmez. Teklif PDF'i ve PDF/A ön kontrolü ayrı etiketlenir | `src/services/billing/feature-quota.ts`, kullanım ekranı |
| M-18.4 | IFC sayacı 0/1, mevcut tamamlanmış dosya | Örnek dosyaların sayaç dışı olduğu yazılır; sayaç tutarlılığı testle kanıtlanır | `src/smartcheck/import/upload-quota.ts` |
| M-12.3 | `residential`, `none`, `standard` görünüyor | Bütün kullanıcıya görünen enum değerleri Türkçe etiketlenir (sözlük) | `CreateQuote.tsx:84` ve diğerleri |
| M-14.4, 17.2, 5.3, 9.3 | Tenant, snapshot, Calm, hash, reviewer, `supplier_quote` gibi terimler | Sözlükle değiştirilir; teknik karşılık yalnız "Teknik ayrıntılar" açılırında kalır | tüm uygulama (grep listesi Faz 0 ilk işi) |
| M-10.5 | `ERROR / CRITICAL / WARNING` | Hata / Kritik / Uyarı; kod ayrı satırda | SmartCheck bulgu bileşenleri |
| M-5.6, 13.2 | "Resmî icmal paftası", "resmî denetim izi", "resmî ihale masası" | "Kaynak bağlantılı metraj icmali", "teklifin kaynak ve inceleme kaydı", "teknik ofis ihale çalışma alanı" | `SmartCheckImportWorkspace.tsx:912`, landing |
| M-11.6 | "Kanıtlı fiyat kataloğu" şeridi veri yokken görünüyor | Şerit gerçek durumu söyler: "Firma fiyat kataloğu henüz eklenmedi" | Shell / panel şeritleri |
| M-7.11 | Plan API'si düşerse eski ve iddialı sabit açıklamalar | Sessiz geri dönüş kaldırılır; hata ve yeniden dene gösterilir | `Register.tsx` |

**Faz 0 kabul ölçütü:**
- Her durum için birim testi.
- Örnek IFC'lerle (3 örnek proje ve boş fiyat kataloğu) gerçek tarayıcıda sonuç ekranı kanıtı.

### Faz 0 durumu (26 Ekim 2026, dal `feat/faz0-guven`)

- **Kapandı:**
  - M-14.1, M-14.2, M-13.6, M-13.7, M-13.8, M-13.9, M-20.2 ve M-20.3 (sonuç özeti).
  - M-12.2, M-12.3, M-12.7, M-10.5, M-5.6, M-13.2, M-11.6 ve M-7.11.
  - M-7.7, M-18.2 ve M-18.3 (etiketler).
  - M-14.4, M-17.2 ve M-5.3/9.3, müşteriye görünen ekranlarda (yönetim ekranları hariç).
- **Kanıt:**
  - Tam test paketi: 1476 testten 1466 geçti, 0 hata, 10 atlandı. Kapsam eşiği geçti (proje satır kapsamı %82,61).
  - Gerçek tarayıcı: `scripts/faz0-trust-ui-smoke.ts`.
- **Kapandı (Hazar onayıyla, 26 Ekim 2026):** M-7.6. Release 0028 (`usage_logs.quotation_id` ve `quotation_version_key`) ile aynı teklif sürümünün PDF'i ayda bir kez sayılıyor.
  - Doğrulama: boş PG16'da sabitlenmiş imzalı uygulama ve inspect; RLS ve rol sözleşme testleri; tam paket.
  - **Deploy notu:** canlı geçişte 0022–0027'ye ek olarak 0028 de uygulanır.
- **Ek düzeltme:** Varsayılan PDF şablonunda eski "TeklifPro AI" markası ve sabit "7 gün geçerli" metni vardı; düzeltildi.
- **Faz 1'e kalan:** "Aktarım için önce mevcut bir teklif oluşturulmalıdır" (M-14.3) ve fiyat kataloğu boş durum akışı (M-17.3, kısmen yapıldı).

## 3. Faz 1 — Excel önce ve ana iş akışı

| Kimlik | Madde | Yapılacak | Konum |
|---|---|---|---|
| C-1 | Teklif şablonu yalnız CSV | **"Excel şablonu indir (.xlsx)"** birincil, CSV ikincil. Şablonda "Nasıl doldurulur" sayfası, birim açılır listesi, sayı ve para biçimi, örnek satırlar | `src/lib/quote-excel-import.ts`, `CreateQuote.tsx:947` |
| C-2 | `.xls` (eski Excel) seçilebiliyor ama ExcelJS okuyamıyor | Dosya imzası tanınır ve şu mesaj gösterilir: "Bu eski Excel biçimi; Excel'de Farklı Kaydet → .xlsx yapıp yükleyin" | `CreateQuote.tsx:327`, `src/lib/quote-xlsx.ts` |
| C-3 | SmartCheck fiyat kataloğu yalnız CSV | `.xlsx` desteği ve aynı biçimde katalog şablonu | `SmartCheckImportWorkspace.tsx:813` |
| C-4 | Excel'e geri çıkış | Teklif ve icmal için `.xlsx` dışa aktarımın varlığı ve kalitesi kontrol edilir; yoksa eklenir. Patronun açtığı dosya olduğu için sütunlar ve biçim sade tutulur | tespit (`quote-xlsx.ts`, `pre-bim-xlsx.ts`) |
| M-17.3 | Fiyat kataloğu boş durumu | 5 adımlı ilk görev: şablon indir, dosya seç, alanları eşleştir, birim ve geçerlilik incele, kaydet | `MarketIntelligence.tsx` |
| M-12.1 | "Excel / Cetvelden Teklif Al", AI sihirbazının altında kalıyor | Bağlantı doğrudan Excel aktarım bölümünü açar (`?kaynak=excel`) | Panel ve `CreateQuote.tsx` |
| M-11.4 | "Hangi aşamada?" yerine "Nereden başlayacaksınız?" | Dört seçenek: Excel metrajım var / IFC modelim var / kendim gireceğim / örnek projeyi inceleyeceğim. Her biri doğrudan akışı açar | `ContractorWorkflowHub.tsx` |
| M-15.1, 15.2 | IFC için 5 ayrı başlangıç | Tek giriş: "Dosyadan teklif". Hızlı ön inceleme, açık adla tek ikincil yol olur. `dosyadan-teklif-demo` ile SmartCheck yolu birleştirilir veya ayrımı açıkça yazılır | Shell, panel, Quotes, CreateQuote |
| M-14.3 | "Fiyatlandır & Teklif Oluştur" önce mevcut teklif istiyor | İki açık eylem: "Yeni teklif oluştur" ve "Mevcut teklife revizyon ekle". Bağlam kaybolmadan yeni teklif açılır | `CalmIfcWorkspace.tsx:1449` |
| M-17.4, 12.6 | Fiyat eksikken çıkış yolu yok; "Onaylı rayiçler (0)" | Doğrudan eylemler: "Firma fiyatı ekle / Mevcut fiyatı eşleştir / İnceleme iste" | CalmIfcWorkspace, CreateQuote |
| M-12.4 | İlk teklifte karbon, volatilite, bilgi teslimi gibi alanlar | Temel görünüm ve "Gelişmiş" açılırı | `CreateQuote.tsx` (bölünür; refactor burada yapılır) |
| M-12.5 | Tablo çok geniş | Temel sütunlar, satır detayı, odak görünümü | `CreateQuote.tsx` |
| M-14.5 | Maliyet alanında KİK, Pareto, CDE, LOIN, TÜİK araçları | Proje türüne göre açılan "Araçlar" bölümü; ilk görev tamamlanınca önerilir | `CalmIfcWorkspace.tsx` (bölünür) |
| M-13.3, 13.4 | Arsa fizibilitesi yükleme ekranında; boş formda hata mesajları | Ayrı sekme veya rota. Doğrulama yalnız etkileşimden sonra çalışır | `PreBimFeasibilityPanel.tsx` |
| M-10.2, 10.3, 10.4, 10.6 | Kamuya açık SmartCheck demosu "yeniden kontrol" ile başlıyor; m²→m³ örneği; geri dönüş yolu `/app`'e gidiyor | Sıra: problem, kaynak satırı, bulgu, öneri, teklife etkisi. Birim örneği miktarın neden değiştiğini anlatır. Sonda "Kendi dosyanızla deneyin" kayıt adımı | `SmartCheckDemo.tsx` |

**Faz 1 kabul ölçütü:** Üç persona için gerçek tarayıcı akışı (Puppeteer):
- Excel → teklif önizleme.
- IFC → icmal → fiyat eksik → kataloğa ekle → teklif.
- Elle → teklif.

Süreler (`marka.md` §23.2) yerelde ölçülür ve kaydedilir.

### Faz 1 durumu (26 Ekim 2026, dal `feat/faz1-excel-akis`, ilk dilim)

- **Kapandı:**
  - C-1: teklif, fiyat kataloğu ve parsel için `.xlsx` şablonları (`src/lib/spreadsheet-templates.ts`). Veri sayfası boş açılır; "Nasıl Doldurulur" ve "Örnek" ayrı sayfalardadır. Birim sütununda açılır liste vardır. CSV ikincil bağlantı olarak kalır.
  - C-2: `.xls` uzantısı veya OLE imzası tanınır, kullanıcıya "Farklı Kaydet → .xlsx" talimatı verilir (`src/lib/spreadsheet-format.ts`). Kapsanan ekranlar: teklif, katalog, SmartCheck ana yükleyici ve parsel.
  - C-3: SmartCheck fiyat kataloğu `.xlsx` okur (`src/lib/price-catalog-import.ts`, CSV kuralları aynı).
  - M-11.4 ve M-12.1: "Nereden başlayacaksınız?" dört seçenek sunar; Excel seçeneği Yeni Teklif'i doğrudan Excel alanında (`?kaynak=excel`) açar. Örnek proje seçeneği SmartCheck örneğini (`?ornek=`) açar.
  - M-15.1 (kısmen): Teklifler ve Yeni Teklif ekranlarındaki IFC girişleri tek "IFC Modelinden …" girişinde birleşti (SmartCheck); tarayıcı ön incelemesi "Diğer araçlar"a taşındı.
  - M-14.3: icmal maliyet adımında iki açık seçenek var: "Yeni teklif oluştur" (müşteri ve proje adı) ve "Mevcut teklife revizyon ekle".
    - Yeni teklif: sunucuda tek işlemde boş bir Rev. 1 açılır, icmal Rev. 2'ye aktarılır (`transferCalmRowsToNewQuotation`, `POST /api/smartcheck/documents/:id/transfer-calm-to-new-quotation`).
    - Kaynak satır, fiyat snapshot'ı ve ledger güvenceleri revizyon yoluyla aynıdır. Şema değişikliği yoktur.
    - Bir teklif kotası düşer. Tekrar deneme ikinci teklif açmaz. Hata olursa müşteri, teklif ve kota geri alınır.
- **Kanıt:**
  - Tam test paketi (boş PG16): 1491 testten 1476 geçti, 0 hata, 15 atlandı. Kapsam eşiği geçti (proje satır kapsamı %82,63, HTTP rotaları fonksiyon kapsamı %95,09).
  - Entegrasyon: `calm-transfer.integration.test.ts`, `smartcheck-calm-transfer-route.integration.test.ts`.
  - Gerçek tarayıcı: `scripts/faz1-excel-flow-smoke.ts`.
- **Ek düzeltme:** Tek giriş akışına geçerken paneldeki KİK sınır değer ve 4735 fiyat farkı bağlantıları ile `public-procurement` tur hedefi kaybolmuştu; "Diğer araçlar" satırına geri eklendi.
- **Faz 1'de kalan:** C-4, M-17.3, M-17.4/12.6, M-12.4, M-12.5, M-14.5, M-13.3/13.4, M-10.x ve M-15.2 (`dosyadan-teklif-demo` rotasının kaderi). Üç persona kabul akışı da bu maddelerden sonra yürütülecek. IFC → teklif uçtan uca tarayıcı akışı için onaylı fiyat kaydı gerekir (M-17.4 ile birlikte).

### Faz 1 durumu — fiyat eksikliği dilimi (26 Ekim 2026, dal `feat/faz1-fiyat-eksik`)

- **Bulgu:** Firma kataloğundan içe aktarılan fiyatlar "advisory" durumunda kalıyordu; arayüzde onaylayan bir ekran yoktu. KDV durumu da "bilinmiyor" geliyordu. İcmal aktarımı ise onaylı ve "KDV hariç, oran belirtilmiş" fiyat istiyor. Bu yüzden katalog yükleyen kullanıcı IFC icmalini hiçbir zaman fiyatlandıramıyordu. "Kataloğa fiyat ekle" bağlantıları da tedarikçi teklifleri ekranına gidiyordu.
- **Kapandı:**
  - M-17.3: yeni `/app/fiyat-katalogu` sayfası ve 5 adımlı ilk görev: şablon, dosya, sütun eşleştirme, birim/geçerlilik/KDV incelemesi, onaylayıp kaydetme.
    - Sunucu firma fiyatını içe aktarımda onaylar (`reviewDecision: "approved"`). Koşullar: yalnız `company_actual`, sahiplik beyanı ve KDV hariç oranı.
    - Tedarikçi ve manuel fiyat kuralları değişmedi.
    - Panel şeridi, sonuç özeti ve icmal bağlantıları bu sayfaya yönlendirildi; menüye ve tura eklendi.
  - M-17.4: icmalde fiyatı eksik her kalemde doğrudan eylemler var:
    - "Firma fiyatı ekle": satır içinde, KDV oranıyla, onaylı olarak kaydeder.
    - "Katalogdaki fiyatı eşleştir": yalnız aynı poz, aynı birim ve TL'de, açıklama farkı uyarısıyla sunulur. Kullanıcının bağladığı fiyat yeniden çözümde korunur.
    - "Uzman incelemesine al": poz çözülemediyse uzman doğrulama modunu o kalemle açar.
  - Örnek projeler IFC kanıtı taşımadığından aktarım seçeneği yerine "Örnek projeden teklif oluşturulmaz" notu gösterilir.
- **Kanıt:** `scripts/faz1-price-gap-smoke.ts` gerçek tarayıcıda katalog sihirbazı, otomatik eşleşme, elle eşleştirme, satır içi fiyat ve yeni teklif adımlarını sınar. Sonuç: Rev. 2 teklifte üç kalemin her biri onaylı ve KDV oranı belirtilmiş fiyat kaydına bağlı.
- **Doğrulama:** Tam paket boş PG16 üzerinde ve üretim derlemesiyle çalıştı: 1503 testten 1488 geçti, 0 hata, 15 atlandı. Kapsam eşiği geçti (proje satır kapsamı %82,73, arayüz %74,69). Giriş paketi 107,6 KB, sınır 120 KB.
- **PR #23 notu:** `feat/faz1-excel-akis` dalının üretim derlemesinde SmartCheck rota paketi exceljs parçasını doğrudan referanslıyor (T45-2 ihlali). Sebebi, katalog okuyucunun yalnız SmartCheck tarafından içe aktarılıp rota paketine gömülmesi. Bu dalda katalog sayfası aynı modülü paylaştığı için okuyucu ayrı parçaya ayrıldı ve ihlal kalktı. #23 tek başına birleştirilmemeli.
- **M-12.6 kalan:** Yeni Teklif ekranındaki "Onaylı Rayiçler" platformun ortak rayiç havuzunu okur, firma kataloğunu değil. Oraya katalog bağlantısı koymak yanıltıcı olacağı için eklenmedi. Elle teklif satırlarının firma kataloğundan fiyat alması (fiyat kaydına bağlama dahil) ayrı dilimdir.
- **Gözlem (karar gerekiyor):** İcmal özet kartındaki "Genel toplam (KDV hariç)" müteahhitlik kârı ve genel gider yüzdesini (%15 varsayılan) içerir. Aktarılan teklif ise katalog birim fiyatlarıyla oluşur, bu yüzdeyi içermez. Kullanıcı iki farklı toplam görür.

### Faz 1 kalan dilimler — kararlar (26 Ekim 2026)

Kaynak: NotebookLM araştırma defteri, bağımsız web araştırmasıyla karşılaştırıldı. Doğrulanamayan iddialar karar gerekçesi olarak kullanılmadı.

1. **Sıra: önce fiyat eksikliği dilimi (M-17.3, M-17.4/12.6).** IFC → teklif kabul akışını açan tek eksik budur. Togal'ın Excel çıktısı yalnız miktar, birim ve kırılım sütunları içerir; birim fiyat ve maliyet içermez (Togal yardım merkezi). Miktarı fiyata bağlayan akış bizim ayrıştığımız yerdir. Boş katalogda yeni `.xlsx` katalog şablonu ilk adım olur. Uydurma veya varsayılan fiyat gösterilmez; eksik kalem "fiyat bekliyor" olarak kalır.
2. **C-4 Excel'e dışa aktarım: yapılacak, fiyat diliminden hemen sonra.** Teklif ve icmal sade sütunlarla çıkar: poz, açıklama, birim, miktar, birim fiyat, tutar ve kaynak. Togal'ın da Excel çıktısını temel özellik sunması destekler. "Türk müteahhitleri Excel'e geri dönüyor" iddiası anketle doğrulanamadı. Karar ürün sahibinin saha gözlemine dayanır.
3. **M-12.4 ve M-14.5 temel/gelişmiş görünüm: proje türüne bağlı.**
   - KİK aşırı düşük teklif sınır değeri (4734 m.38) ve 4735 fiyat farkı yalnız 4734'e tabi kamu ihalelerinde ve sözleşmelerinde geçerlidir (Kanun kapsam maddeleri).
   - Bu araçlar yalnız "Kamu ihalesi" seçilen projede maliyet adımında görünür. Özel sektörde varsayılan olarak gizlidir.
   - Karbon, volatilite ve bilgi teslimi alanları ilk teklifte "Gelişmiş" bölümüne alınır.
4. **M-15.2 `dosyadan-teklif-demo`: kaldırılacak, `/app/smartcheck`'e yönlendirilecek.**
   - Faz 1'den sonra hiçbir menü bu rotaya bağlanmıyor.
   - Sayfada sabit birim fiyatlar var (beton 2.450, donatı 24.500, kalıp 1.250 TL). Bu, "uydurma fiyat yok" ilkesiyle çelişir.
   - Herkese açık demo (M-10.x) kota düşmeyen örnek projeyle sürer. Togal gibi rakipler "demo talep et" modeliyle çalışıyor. Ücretsiz deneme bilgisi kaynaklar arasında çelişkili.

Doğrulanamayan iddialar (karar gerekçesi değil):
- Opwire'ın ücretsiz demosu: ürün bulunamadı.
- AMP'nin ücretsiz fiyat farkı motoru: yalnız ücretli programın deneme sürümü bulundu.
- EKAP'ın birim fiyat cetvelini Excel ile alıp vermesi: resmi kılavuzda bulunamadı.
- Defterdeki "Strategic Research Report" bağımsız bir kaynak değildir.

## 4. Faz 2 — Panel, gezinme, yardım, okunabilirlik

| Kimlik | Madde | Yapılacak | Konum |
|---|---|---|---|
| M-11.1, 11.5 | Panel tanıtım gibi davranıyor | Yeni kullanıcıya rehber kartları. Deneyimli kullanıcıya son dosyalar, inceleme bekleyenler, fiyatı eksikler, son teklifler, başarısız işlemler, kalan kullanım | `Dashboard.tsx`, `ContractorWorkflowHub.tsx` |
| M-20.4 | Yeni ve deneyimli kullanıcı ayrımı | İlk değer görülene kadar rehber; sonra iş paneli | Dashboard |
| M-11.2 | Aynı eylem 6 yerde | Ekran başına bir birincil eylem | Shell, Dashboard |
| M-11.3 | Hızlı tur 4 yerde | Tek yardım noktası; ilk kullanımda kısa görev rehberi | Shell, `GuidedTour` |
| M-11.7 | Deneme durumu dar alanda kesiliyor | Bitiş tarihi, kalan analiz hakkı, paket bağlantısı | Shell kenar çubuğu |
| M-15.3 | Gezinme görev adlarıyla | Genel Bakış / Dosyalar / Metraj ve Kontroller / Teklifler / Firma Fiyatları / Müşteriler / Raporlar / Araçlar / Ayarlar. Önce kavram eşlemesi, sonra menü | `src/constants/navigation.tsx` |
| M-16.2, 16.3 | CRM boş veya oturumsuz durumda hata gösteriyor; sayfa fırsatlarla açılıyor | Boş ve oturumsuz durumlar ayrılır (bkz. §9.1). Müşteri kaydı ile satış fırsatı ayrılır; menü adı sayfayla uyumlu olur | `Clients.tsx`, `CRM.tsx` |
| M-19.2 | Kârlılık adı ile hacim özeti | "Teklif sonuçları" (hacim) ile "Kârlılık" (maliyet tam teklifler) ayrılır | `Profitability.tsx` |
| M-19.4 | Başlangıç rehberi ile yöntem belgesi | Üç yardım türü: "İlk teklifiniz", "Hesaplama yöntemleri", "Sık sorunlar" | `HowItWorks.tsx` |
| M-19.5 | Sayfa başlığı güncellenmiyor | Rota başına `document.title` ("Yeni Teklif — BIMMetraj") | router katmanı |
| M-19.6 | "İçeriğe geç" eski rotayı tutuyor | Rota değişiminde hedef güncellenir; tarayıcı testi | Shell |
| M-6.8 | Şifremi unuttum bağlantısı `tabIndex={-1}` | Tab sırasına alınır | `Login.tsx:100` |
| M-6.7 | Mobil üst çubuk 390 px'te taşıyor | Mobilde logo, tek eylem ve menü kalır | `LandingPage.tsx` üst çubuk |
| M-20.5 | Mobil öncelikli görevler | Durum, hata nedeni, inceleme bekleyen, teklif önizleme mobilde okunur; geniş tablo masaüstünde kalır | ilgili ekranlar |
| M-6.3 | 10–11 px, büyük harf ve monospace yoğunluğu | Gövde ve uyarı metinleri normal sans, en az 13–14 px. Monospace yalnız kod, birim ve kimlik için | `src/index.css`, tasarım belirteçleri |
| M-6.4 | Çerçeve ve rozet yoğunluğu | Ana sonuç tek güçlü katmanda; teknik açıklama açılırda | ortak bileşenler |
| M-6.5 | Turuncu hem eylem hem uyarı rengi | Durum için ayrı renk ve ikon; turuncu yalnız eylem | tasarım belirteçleri |
| M-6.2 | Pafta estetiği ile çalışma verimliliği | Çalışma ekranlarında öncelik: seçili satır, eksik, durum, kaynak, miktar, fiyat, sonraki adım | çalışma ekranları |
| M-18.2 | Son kullanıcıya USD "tahmini işlem maliyeti" | Yönetim ekranına taşınır. Kullanıcıya dahil kullanım, kalan, yenilenme ve aşım davranışı gösterilir | `Billing.tsx` |
| M-18.5 | Havale/EFT açıklığı | Aynı açıklık kayıt ve paket yüzeyinde de olur | `Register.tsx`, fiyat bölümü |

**Faz 2 kabul ölçütü:**
- `scripts/e2e-a11y-smoke.ts` uygulama rotalarını da kapsar (açık ve gece teması, 0 ihlal).
- 390 px'te taşma testi.
- Sayfa başlığı testi.

## 5. Faz 3 — Konumlandırma, landing, paketler, kayıt

Başlık ve mesaj kararları ekibindir (Karar 2). Önerilen yön `marka.md` §3.3–3.4'tür. Son metin Faz 3'ün ilk işinde, sözlükle birlikte yazılır.

| Kimlik | Madde | Yapılacak |
|---|---|---|
| M-3.1–3.4 | Dağınık tanımlar | Tek kategori ve tek ana mesaj. Öneri: "Metrajdan teklife, her kalemin kaynağı görünür." Alt metin Excel önce: "Excel veya IFC metrajınızı yükleyin; eksik fiyatı ve şüpheli miktarı görün, kaynağıyla teklife taşıyın." |
| M-3.5 | Vaadin sınırı | "Kaynağı görünür" ile "doğrulanmış" ayrımı landing'de ve SSS'de |
| M-3.6 | Marka mimarisi | Ana ürün BIMMetraj. SmartCheck bir işlev; e-PYS bir uzmanlık kapsamı; hesaplayıcılar yardımcı araç; Academy ayrı. ALLPLAN, Revit ve Archicad yalnız "desteklenen kaynaklar" olarak geçer |
| M-3.7 | İlk müşteri odağı | Landing ve paketler teknik ofis ile metraj/maliyet danışmanlığına göre yazılır |
| M-3.8 | Rekabet | "Benzersiz" iddiası yok; "Türkiye'deki teknik ofis akışını bir araya getirir" dili |
| M-5.1 | "Hata payı bırakmayın" başlığı | Değiştirilir (M-3.4) |
| M-5.2 | İlk ekranda 10 teknik kavram | İlk ekran: kim için, ne sonuç, tek eylem. Standartlar 3. katmana taşınır |
| M-5.4, 21.1 | Satın alma gerekçesi fiyatın arkasında | Sıra: sorun → tamamlanan iş → bir kalemin yolculuğu → kaynak, inceleme ve fiyat → desteklenen dosyalar → sınırlar → (pilot sonucu) → paket → SSS |
| M-13.5, 6.6 | "Bu sayı nasıl oluştu?" en güçlü kanıt | Landing'de gerçek arayüz parçasıyla gösterilir (izometrik çizim destek olarak kalır) |
| M-5.5 | Sentetik demo etiketi | Korunur; müşteri başarısı gibi sunulmaz |
| M-4.1, 4.3 | Geliştirme aşaması, ön kayıt, deneme ve yıllık abonelik aynı sayfada | Tek birincil giriş. Uzman önizlemesi döneminde ürünün durumu tek cümleyle açıklanır. Karar gerekli (bkz. §9) |
| M-7.2, 7.3, 8.1 | Paket isimleri farklı eksenlerde; kart sırası karışık | Üç kademe (Teklif / Teknik Ofis / Kurumsal), fiyata göre sıralı. e-PYS eklenti veya ayrı kapsam (M-8.3). Karar gerekli |
| M-7.4 | 5 kart ve 4 ödeme dönemi | Aylık ve yıllık. 2 yıllık ve 6 aylık kaldırılır veya gizlenir. Karar gerekli |
| M-7.5 | Kartlar altyapı kapasitesini öne çıkarıyor | Kullanıcı, inceleme rolü, katalog, revizyon, çıktı türü, destek ve kapsam dışı. Yalnız gerçekten desteklenenler yazılır |
| M-7.8 | Diğer limitler görünmüyor | Satın alma öncesi karşılaştırma tablosu (AI, CRM, depolama, belge) |
| M-7.9 | "En çok tercih edilen" rozeti | "Teknik ofis ekipleri için önerilen" (`plan-catalog.ts`, `Register.tsx`, `PlanEditor.tsx`) |
| M-7.10 | KDV ve peşin açıklaması | Her yüzeyde: "Aylık eşdeğer X TL + KDV · Yıllık peşin Y TL + KDV" |
| M-8.2 | Deneme bir edinim yolu | Deneme kartı yerine "Ne deneyebilirsiniz, ne kadar süre, dosya sınırı, destek, sonrası" bloğu |
| M-9.1 | "Ücretsiz başla" yeniden paket seçtiriyor | Akış: deneme → kısa hesap formu → kaynak seçimi → ilk sonuç. Paket değişimi ikincil bağlantı olur |
| M-9.2 | "Paketi Seç & Başla" anında aktivasyon beklentisi yaratıyor | Havale/EFT adımları ve tahmini onay süresi satın almadan önce gösterilir |
| M-9.4 | Güven SSS'i | Deneme sonu, otomatik tahsilat, veri erişimi, çıktı indirme, kota yenilenmesi, başarısız işlemin kotaya etkisi ve destek. Her cevap koddaki gerçek davranıştan yazılır |
| M-4.4 | Pilot çerçevesi | Landing'de "Projem için pilot görüşmesi" ikincil eylemi ve pilot kapsam sayfası. Ticari koşullar için karar gerekli |
| M-21.2, 21.3 | 7 slaytlık sunum ve tek işlik demo | Sunum dosyası ve demo senaryosu ("bu kalemin miktarını kaynağından bulduk…") yazılır |

**Faz 3 kabul ölçütü:**
- Landing, kayıt ve paket bölümleri için tarayıcı ekran görüntüleri.
- `registry.test.ts` ve iddia kapısı testleri yeşil.
- "resmî", "hatasız", "en çok tercih" ifadeleri için kaynak taraması temiz.

## 6. Faz 4 — Doğrulama, ölçüm altyapısı ve deploy

1. CI dürüst biçimde yeşil olur. Kapsam eşiği düşürülmez.
   - Faz 0–3'te yazılan davranış testleri gerçek kapsamı artırır.
   - `t43-ui-pages-and-components.test.ts` dosyasındaki "HTML uzunluğu" kontrolleri, dokunulan sayfalarda davranış kontrolleriyle değiştirilir.
2. Tam regresyon:
   - Yerel PostgreSQL 16 ile tüm test paketi.
   - `expert-feedback-ui-smoke`, `e2e-core-flow-smoke` ve `e2e-a11y-smoke`.
   - Üç persona akışı.
3. Ölçüm altyapısı (`marka.md` §23): olay kayıtları.
   - Kayıt → örnek proje.
   - Dosya → ilk icmal.
   - İcmal → fiyatlanmış kalem.
   - İlk teklif önizlemesi.
   - Başarısız işlem.
   - Fiyatı eksik kalem sayısı.
4. Performans: T45 bütçeleri ve ilk açılış paket boyutu tekrar ölçülür. Bugünkü ölçüm: ana giriş 33 KB gzip; ağır parçalar gerektiğinde yükleniyor.
5. Deploy: `UZMAN_ONIZLEME_DEPLOY_VE_GERI_BILDIRIM_2026-10-26.md` kontrol listesi. Sıra yedek → worker drain → migrasyon → smoke → geri dönüş hazır.

## 7. Faz 5 — Uzman önizlemesi ve ticari doğrulama (deploy sonrası)

- 5–8 uzman ve 2 hafta. Yalnız hesap doğruluğu ve iş akışı geri bildirimi alınır (Karar 2).
- Haftalık triyaj: her "tutmuyor" kaydı ya hata kaydı ve regresyon testi olur ya da "uzman yorumu farklı" notu.
- T50 imzaları ve uzman onayı alan motorların durum güncellemesi (M-22 P2.7).
- Ticari ölçümler (M-8.4, 23.5): işleme maliyeti, destek süresi, tekrar kullanım ve ödeme isteği. Paket fiyatları bu verilerle gözden geçirilir.

## 8. Ertelenenler (M-22 P3)

Hakediş, gelişmiş e-PYS, CDE, gelişmiş ihale araçları, entegrasyonlar ve eğitim ekosistemi. Çekirdek müşteriden tekrarlayan ve ücretlendirilebilir talep gelene kadar genişletilmez. Mevcut kodları korunur, menüde öne çıkarılmaz.

## 9. Kararlar (Hazar, 26 Ekim 2026)

1. **PDF kotası (M-7.6):** Aynı teklifin yeniden üretilen PDF'i kotadan **düşmez**. Kota benzersiz teklif sürümü (teklif + revizyon) üzerinden sayılır. **Faz 0.**
2. **Ödeme dönemleri (M-7.4):** Yalnız **2 yıllık seçenek kaldırılır.** Aylık, 6 aylık ve yıllık kalır. **Faz 3.**
3. **Paket mimarisi (M-8.1, 8.3):** **Üç kademe:** Teklif / Teknik Ofis / Kurumsal. **e-PYS ayrı eklenti olur.** Mevcut aboneliklerin yeni kademelere eşlenmesi Faz 3'ün ilk işidir. Eski plan kimlikleri silinmez; yeni kademelere bağlanır. **Faz 3.**
4. **Birincil giriş (M-4.3):** Karar Claude'a bırakıldı.
   - **Birincil:** "Örnek projeyi inceleyin". Hesap açmadan, gerçek arayüzde bir kalemin kaynaktan teklife yolculuğu gösterilir.
   - **İkincil:** "Projem için pilot görüşmesi".
   - **Üçüncül:** "14 gün ücretsiz deneyin" metin bağlantısı (fiyat bölümünde ve üst çubukta "Giriş" yanında).
   - **Gerekçe:**
     - Kayıtta hiçbir yetenek L3 değil.
     - Kendi dosyasını yükleyen ziyaretçi kesinlik bekler.
     - Örnek proje ise ürünün en güçlü kanıtını ("Bu sayı nasıl oluştu?") taahhütsüz ve abartısız gösterir (`marka.md` §4.3, §5.1, §13.5).
   - **Faz 3.**
5. **Pilot ticari koşulları (M-4.4):** Taslak Claude tarafından hazırlandı, **Hazar kontrol edecek.**
   - **Süre ve kapsam:**
     - 30 gün.
     - Müşterinin bir geçmiş gerçek projesi; bir metrajdan teklife iş akışı.
     - En fazla 3 kullanıcı.
   - **Çalışma takvimi:** Başlangıç toplantısı (60 dk), iki çalışma oturumu (60'ar dk) ve sonuç değerlendirmesi. Ölçülen süreler ve bulgular yazılı rapor olarak teslim edilir.
   - **Ücret:**
     - Teknik Ofis kademesinin 1 aylık bedeli + KDV.
     - Pilot sonrası 30 gün içinde yıllık aboneliğe geçilirse ilk faturadan düşülür.
     - Otomatik yenileme yoktur.
   - **Yazılı koşullar:** Dosya kullanım izni, KVKK açık rızası, saklama süresi ve pilot sonu veri iadesi veya silme.
   - **Faz 3:** pilot kapsam sayfası ve iletişim formu.
6. **Paket kartlarında kullanıcı sayısı ve inceleme rolleri (M-7.5):** Hazar "evet" dedi.
   - **Kod bulgusu:** Bugün plan bazında kullanıcı (koltuk) veya inceleme rolü sınırı **yok**. `feature-limits.ts` yalnız AI, PDF, CRM, mevzuat ve kârlılık kotalarını, IFC ve teklif limitlerini sınırlıyor.
   - Bu yüzden kartlara yazmadan önce **koltuk sınırı özelliği uygulanır.** Davet sırasında kontrol edilir; aşımda anlaşılır mesaj gösterilir.
   - **Önerilen varsayılanlar (Hazar onaylayacak):**
     - Teklif: 2 kullanıcı.
     - Teknik Ofis: 5 kullanıcı; inceleme ve onay rolü dahil.
     - Kurumsal: sözleşmeye göre.
   - İnceleme ve onay rolünün (reviewer) paketlere göre açılıp kapanması da aynı işte ele alınır. **Faz 3.**

### 9.1. CRM (M-16.1) için düzeltme

Hazar'ın açıklaması: CRM senkronizasyonu yok; müşteriler elle girilir. Gözlenen "CRM verileri yüklenemedi" mesajı oturum açılmamış istek nedeniyle oluşuyor; bir veri hatası değil.

- Kök neden incelemesi plandan çıkarıldı.
- Kalan iş (Faz 2, M-16.2–16.3):
  - Oturum yoksa veya liste boşsa hata yerine doğru durum gösterilir: "Henüz müşteri yok — elle ekleyin" ya da oturum süresi dolduysa giriş yönlendirmesi.
  - Menü adı ile sayfa odağı uyumlu hale getirilir.
- Oturum açmış ve kaydı olmayan kullanıcının boş durumu gördüğü bir tarayıcı testiyle güvenceye alınır.

## 10. Korunacaklar (regresyon testiyle güvenceye alınır)

M-6.1 pafta kimliği · M-10.1 demo bulgu yapısı · M-13.1 dosya seçimi ve örnek projeler · M-13.5 "Bu sayı nasıl oluştu?" · M-17.1 fiyat kaynak koşulları · M-18.1 kullanım kartları · M-19.1 kârlılık boş durumu · M-19.3 "Nasıl Çalışır?" yöntem içeriği · M-5.5 sentetik demo etiketi.

## 11. Claude incelemesinden ek maddeler

| Kimlik | Madde | Faz |
|---|---|---|
| C-1 … C-4 | Excel önce şablon, okuma ve yazma | 1 |
| C-5 | 800 satırı aşan 19 dosya. Dokunulduğunda bölünenler: `CalmIfcWorkspace.tsx` (Faz 0–1), `CreateQuote.tsx` (Faz 1), `SmartCheckImportWorkspace.tsx` (Faz 1), `Dashboard.tsx` ve `ContractorWorkflowHub.tsx` (Faz 2), `LandingPage.tsx` (Faz 3). Sunucu `routes/admin.ts` ve `routes/smartcheck.ts` deploy sonrasına kalır | ilgili faz |
| C-6 | Kapsam kalitesi: `t43-ui-pages-and-components.test.ts` HTML uzunluğu kontrolleri | 4 |
| C-7 | PR #21: uzman geri bildirimi ve YAMBİS / kat karşılığı önizlemesi | Faz 0'dan önce birleşir |
| C-8 | Canlı ile main farkı: 6 RLS migrasyonu (0022–0027) canlıda değil | Faz 4 deploy |

## 12. İzlenebilirlik: marka.md'nin tamamı

| marka.md bölümü | Kimlikler | Faz |
|---|---|---|
| §1–2 | Bağlam (madde değil) | — |
| §3 Konumlandırma | M-3.1–3.8 | 3 |
| §4 Olgunluk ve sunum | M-4.1–4.4 | 3 (4.2 bilgi) |
| §5 Ana sayfa | M-5.1–5.6 | 3 (5.6 → 0) |
| §6 Görsel kimlik | M-6.1–6.8 | 2 (6.1 koru) |
| §7 Paketler | M-7.1–7.11 | 3 (7.6, 7.7, 7.11 → 0; 7.1 bilgi) |
| §8 Paket mimarisi | M-8.1–8.4 | 3 ve 5 (8.4 → 5) |
| §9 Kayıt ve ödeme | M-9.1–9.4 | 3 (9.3 → 0) |
| §10 Kamuya açık demo | M-10.1–10.6 | 1 (10.5 → 0; 10.1 koru) |
| §11 Panel | M-11.1–11.7 | 2 (11.4 → 1; 11.6 → 0) |
| §12 Yeni teklif | M-12.1–12.7 | 1 (12.2, 12.3, 12.7 → 0) |
| §13 SmartCheck sonucu | M-13.1–13.9 | 0 ve 1 (13.1, 13.5 koru) |
| §14 Maliyet ve aktarım | M-14.1–14.5 | 0 ve 1 |
| §15 Aynı işe farklı yollar | M-15.1–15.3 | 1 ve 2 |
| §16 CRM | M-16.1–16.3 | 2 (16.1 hata değil, §9.1) |
| §17 Piyasa verisi | M-17.1–17.4 | 0 ve 1 (17.1 koru) |
| §18 Kullanım ekranı | M-18.1–18.5 | 0 ve 2 (18.1 koru) |
| §19 Kârlılık ve yardım | M-19.1–19.6 | 2 (19.1, 19.3 koru) |
| §20 Ana deneyim | M-20.1–20.5 | 0, 1, 2 (20.1 = Faz 1 akışı) |
| §21 Sunum | M-21.1–21.3 | 3 |
| §22 Öncelik planı | Bu belgeye eşlendi | — |
| §23 Ölçüm | M-23.1–23.5 | 4 ve 5 |
| §24–25 | Kaynak ve karar özeti | — |
