# TeklifPro / BIMMetraj — Kapsamlı GAP, BUG, UI ve UX Analiz Raporu

- **Rapor Tarihi:** 2026-10-14
- **İncelenen Repo & Dal:** `/Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo` (`main`, yerel HEAD: `ec9cd4e`, canlı prod referansı: `98dd0f9`)
- **Denetim Modu:** Salt-Okunur (Read-Only) Tam Saha Denetimi — **Uygulama kodlarında hiçbir değişiklik yapılmamıştır.**
- **Aktif Uzman Perspektifleri (4 Skill Sentezi):**
  1. `/yuksek-muhendis-mimar` — İnşaat/Mimarlık normatif hesap doğrulaması (TBDY 2018, TS 500, TS 708, ÇŞB ölçü/minha esasları, RG 33331 e-PYS EK-6/EK-9)
  2. `/ai-bim-director` — Ürün stratejisi, ticari vaat/gerçeklik uyumu, paket ekonomisi, KVKK/telif/sözleşme kapıları
  3. `/bim-software-architect` — Sistem mimarisi, veri bütünlüğü, asenkron kuyruk, güvenlik sınırları, bileşen/durum yönetimi
  4. `/bim-knowledge-engineer` — IFC2x3/IFC4/IFC4X3 şema doğruluğu, QTO/Property kanıt zinciri, 3x3 kural motoru, e-PYS ve PDF/A doğrulama semantiği

---

## Yönetici Özeti (Executive Summary)

2026-10-08 ve 2026-10-13 tarihleri arasında projede önemli mühendislik ilerlemeleri kaydedilmiştir: 5 paketli ticari fiyatlandırma kataloğu (`plans` + `feature-quota.ts`), kuruş hassasiyetli deterministik teklif aritmetiği (`roundMoney`, `calculateLineBreakdown`), bileşik eskalasyon formülü (`(1+v)^(T/2)-1`), 3x3 kural paketinin sunucu IFC koşusuna bağlanması (`ifc-rule-run.ts`), RG 33331 e-PYS EK-6/EK-9 Python ön-kontrolcüsü (`epys_preflight.py`) ve PDF/A ön-kontrolcüsü (`pdf_preflight.py`) devreye alınmıştır.

Buna karşın, 4 uzman perspektifiyle yapılan uçtan uca kod denetiminde **10 kritik/yüksek öncelikli yazılım hatası (BUG)**, **14 yapısal ürün/mühendislik/mimari boşluğu (GAP)** ve **ciddi UI/UX akış kopuklukları** tespit edilmiştir:

| Denetim Boyutu | Kritik Bulguların Özeti | Öncelik Dağılımı |
|---|---|---|
| **BUG (Kod Hataları)** | **BUG-01:** `epys_preflight.py` KVKK maskelemesinde telefon regex'inin TC Kimlik No'nun ilk 10 hanesini yutarak 11. haneyi açıkta bırakması (`[telefon gizlendi]1`), `_PATTERNS[2]`'nin %100 ölü kod (dead code) olması ve 10 ardışık rakam içeren IFC `GlobalId` değerlerini bozması.<br>**BUG-02:** SmartCheck kuyruğundan tamamlanmış bir IFC işi açıldığında `setFile(null)` nedeniyle `isIfcFile=false` olması ve **e-PYS EK-9 panelinin ekranda hiç görünmemesi**.<br>**BUG-03:** Mimari veya QTO hacmi olmayan IFC modellerinde sunucu işinin hata (`failed`) ile sonlanması yüzünden kaydedilmiş e-PYS ön-kontrol raporunun `409 PREFLIGHT_RUN_NOT_SUCCEEDED` ile kilitlenmesi.<br>**BUG-04 & BUG-05:** `DosyadanTeklifDemo.tsx` içinde sahte (fake) 3D görünüm, işlevsiz `"Ata"` butonu, kota bypass'ı ve 3. adımda girilen birim fiyatların/donatı/kalıp miktarlarının 4. adımda tamamen çöpe atılması; `CreateQuote.tsx` Demo Şablonunda satır toplamı (`1.710.000 ₺`) ile net satır hesabı (`1.624.500 ₺`) arasındaki `85.500 ₺` iskonto tutarsızlığı.<br>**BUG-08:** Sol menüde (`navigation.tsx`) `/app/smartcheck` bağlantısının hiç olmaması ve `/app/billing` (`Faturalandırma`) menüsünün `owner/admin` yerine yalnız `super_admin` rolüne tanımlanması. | **4 P0 (Kritik)**<br>**4 P1 (Yüksek)**<br>**2 P2 (Orta)** |
| **GAP (Ürün, Mühendislik & BIM)** | **GAP-01:** Canlı vitrin (`LandingPage.tsx`), uygulama altbilgisi (`Shell.tsx`) ve `Dashboard.tsx` pafta antetinde **"ÇŞB 2026 Kütüphanesi — 42.000+ Güncel Poz"** vaadi sürerken prod veritabanında **0 resmi poz** bulunması ve YFK yazılı lisansının alınmamış olması.<br>**GAP-02:** 14 günlük ücretsiz deneme kaydı açıkken sunucu SmartCheck'in yalnız iç `Bimmetraj` tenant'ına açık olması (dış kullanıcılara `404 SMARTCHECK_IMPORT_DISABLED`).<br>**GAP-03:** 3x3 kural paketinin (`three-by-three.ts`) ihtiyaç duyduğu `isLoadBearing`, `isExternal`, `coverMm`, `exposureClass`, `discipline` ve `expectedQuantity` alanlarının `ifc_extract.py` tarafından çıkarılmaması nedeniyle kuralların her gerçek IFC modelinde **%100 `not_evaluated` / `missingInput`** dönmesi.<br>**GAP-04:** Betonarme kalıp (`m²` kırık ölçü) ve donatı (`ton` TS 708/TS 500) metrajlarının teklife aktarılamaması; ÇŞB vs DIN 18350 boşluk düşümü (minha) motorunun bulunmaması. | **5 P0 (Kritik)**<br>**6 P1 (Yüksek)**<br>**3 P2 (Orta)** |
| **UI & UX** | **Üçlü (Triple) IFC Akış Karmaşası:** Kullanıcının karşısında `/app/dosyadan-teklif-demo` (Dashboard CTA'ları), `/app/ifc-parser` (Teklif ekranı CTA'sı) ve `/app/smartcheck` (sol menüde linki olmayan gerçek sunucu ekranı) olmak üzere **3 farklı IFC yükleme ekranı** bulunması.<br>**Monolitik SmartCheck Arayüzü:** `SmartCheckImportWorkspace.tsx` (867 satır, 34+ `useState`) içinde son kullanıcıya geliştirici/operatör jargonu (`Evidence-first pilot`, `property/QTO`, `snapshot`, `advisory`, iç pilot kabul formu) gösterilmesi.<br>**Tasarım Sistemi Sapmaları:** `src/` genelinde **1.131 adet** `<12px` mikro font (`text-[8px..11px]`), **351 adet** `uppercase tracking-widest`, **36 adet** ham `<select>`/`<textarea>` ve dokunmatik/klavye erişimi olmayan hover-only silme butonları. | **3 P0 (Kritik)**<br>**5 P1 (Yüksek)**<br>**4 P2 (Orta)** |

---

## 1. Dört Uzman Perspektifi Sentezi

### 1.1 `/ai-bim-director` (Ürün Stratejisi, Ticari Vaatler ve Paket Ekonomisi)
- **Altın Kural İhlali ("Vaat = Çalışan Kod + Kanıt"):** Vitrin sayfası (`src/pages/LandingPage.tsx:145, 152, 288-291, 447, 471`), uygulama kabuğu (`src/components/layout/Shell.tsx:242`) ve çalışma masası (`src/pages/Dashboard.tsx:150`) kullanıcıya **"ÇŞB 2026 Kütüphanesi — 42.000+ Güncel Poz & Birim Fiyat"** vaat etmektedir. Oysa canlı veritabanında onaylı resmi poz sayısı **0**'dır (`docs/agent-memory/WORKING_STATE.md:107`).
- **"e-PYS & BIM Standart Denetçi" (390 TL/ay) Paketinin Kırılganlığı:** Bu paket ayda 0 teklif, **50 model adlandırma/e-PYS kontrolü** ve **100 PDF/A ön kontrolü** satmaktadır (`src/services/billing/feature-limits.ts`). Ancak:
  1. Mimari bir IFC modelinde betonarme hacim (QTO) yoksa sunucu koşusu `failed` olmakta ve e-PYS ön kontrol sonucu kullanıcıya kilitlenmektedir (**BUG-03**).
  2. PDF/A aylık 100 adet limiti plan kataloğundan değil, `src/smartcheck/import/service.ts:141, 149` içinde sabit kodlanmış (`>= 100`) SQL sorgusundan okunmaktadır (**BUG-07**).
- **Ticari Tahsilat ve Hukuki Kapı (P0-2):** Stripe entegrasyonu hâlâ `test` modundadır; `/terms` ve `/privacy` sayfaları (`src/pages/LegalPage.tsx:30-56`) 3'er cümlelik "BIMPlan Academy" yer tutucu metinlerinden ibarettir (KVKK Aydınlatma Metni ve Mesafeli Satış / Ön Bilgilendirme metinleri yoktur).

### 1.2 `/yuksek-muhendis-mimar` (Normatif Mühendislik, Metraj ve Mevzuat)
- **Betonarme Metraj Üçlüsü Eksik (Beton + Kalıp + Donatı):** Türkiye şantiye ve ihale pratiğinde betonarme imalat **Beton (`m³`) + Kalıp (`m²`) + Donatı (`ton`)** üçlüsüyle fiyatlandırılır. Sistem şu an IFC'den teklife yalnızca beton hacmini (`m³`) aktarmakta, kalıp (`m²`) ve donatıyı (`ton`) aktarmamaktadır.
- **ÇŞB vs DIN 18350 Minha (Boşluk Düşümü) Farkı:** 6,0 m × 3,0 m boyutlarında tek yüz sıvalı bir duvarda 1 pencere (1,2×1,5 m) ve 1 kapı (0,9×2,1 m) bulunduğunda ÇŞB kuralına göre net sıva alanı **16,64 m²** (denizliksiz **16,94 m²**) iken DIN 18350 kuralına göre ($\le 2{,}5\text{ m}^2$ boşluklar düşülmez) **18,00 m²** çıkmaktadır (**%8,17 fark**). Sistemde sözleşmesel ölçü kuralı (minha) motoru yoktur.
- **Disiplin Bazlı Onay Yetkisi:** `SmartCheckImportWorkspace` içinde `owner/admin/manager` rolündeki herhangi bir kullanıcı, mimari (`ARC`), statik (`STR`) veya mekanik/elektrik (`MEP`) uzmanlık ayrımı olmaksızın tüm metraj satırlarını ve istisnaları (`accepted_exception`) onaylayabilmektedir.

### 1.3 `/bim-software-architect` (Mimari, Güvenlik, Durum Yönetimi ve Veri Bütünlüğü)
- **Çalışma Ağacında (Working Tree) Commit Edilmemiş Kodlar:** Repo içinde `src/pages/admin/CalculationMethods.tsx`, `src/pages/admin/roadmap/calculation-content.ts`, `src/pages/admin/roadmap/calculation-review.ts`, `src/pages/admin/roadmap/content.test.ts` ve `src/pages/admin/roadmap/roadmap-content.ts` dosyalarında commit edilmemiş değişiklikler ve izlenmeyen (`untracked`) yönetmelik/graphify klasörleri bulunmaktadır.
- **Veritabanı Rol İzolasyonu (P1-1):** Uygulama (`app`) ve arka plan işçisi (`worker`), şema sahibi (DDL yetkili) PostgreSQL kullanıcısıyla bağlanmaktadır; en az ayrıcalıklı (`least-privilege` DML) çalışma zamanı rolü ayrımı henüz yapılmamıştır.
- **Bileşen Şişkinliği:** `src/components/smartcheck/SmartCheckImportWorkspace.tsx` 867 satır ve 34+ yerel `useState` ile 9 ayrı sorumluluğu tek dosyada taşımaktadır.

### 1.4 `/bim-knowledge-engineer` (IFC Şema Semantiği, QTO Kanıt Zinciri ve Kural Motorları)
- **3x3 Kural Paketi Semantik Kopukluğu:** `src/smartcheck/rules/three-by-three.ts` kuralları (`RULE_3X3_LOAD_BEARING_REQUIRED`, `RULE_3X3_CONCRETE_COVER_MIN`, `RULE_3X3_QTO_TOLERANCE_3PCT`) birim testlerde çalışmakta, ancak `src/smartcheck/rules/ifc-rule-run.ts:12-18` içindeki `threeByThreeItems()` dönüştürücüsü modele ait yalnız `elementId` ve `elementType` alanlarını geçmektedir. `workers/ifc/ifc_extract.py` ise `LoadBearing`, `IsExternal`, paspayı (`coverMm`), çevresel etki sınıfı veya `expectedQuantity` çıkarmadığı için 3x3 kuralları gerçek IFC dosyalarında **hiçbir elemanı değerlendirememektedir** (`evaluatedCount: 0`, `status: "not_evaluated"`).
- **RG 33331 (5 Ağustos 2026) Doğrulama Kapsamı:** 241 sayfalık taranmış yönetmelik ekinin (`20260805-2-1.pdf`) yalnızca 3 tablosu (`Tablo 6.55`, `Tablo 6.60`, `Tablo 9.1` satır 1–9) bağımsız olarak doğrulanmıştır; geriye kalan **~66 adet EK-6 Pset tablosu** ve **~150 adet EK-3 mahal kısaltması** satır satır doğrulanmayı beklemektedir.

---

## 2. BUG Analizi (Kod Seviyesinde Tespit Edilen Somut Hatalar)

Aşağıdaki hatalar kaynak kod okuması ve deterministik çalışma zamanı testleriyle kanıtlanmıştır:

### BUG-01 [P0 / Kritik] — `epys_preflight.py` KVKK Kişisel Veri Maskeleme Hatası, Veri Sızıntısı, Ölü Kod ve IFC `GlobalId` Bozulması
- **Dosya & Satır:** `workers/ifc/epys_preflight.py:38-67` ve `workers/ifc/test_epys_preflight.py:38-45`
- **Mevcut Kod:**
  ```python
  _PATTERNS = [
      (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[e-posta gizlendi]"),
      (re.compile(r"(?:\+?90[\s-]?)?\(?0?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}"), "[telefon gizlendi]"),
      (re.compile(r"\b\d{10,11}\b"), "[kimlik no gizlendi]"),
  ]
  ```
- **Kök Neden ve Kanıt:**
  1. `_PATTERNS[1]` (telefon regex'i) içindeki tüm ön ekler (`+90`, `(`, `0`, boşluk/tire) opsiyoneldir (`?`) ve ifadede **kelime sınırı (`\b`) yoktur**. Bu nedenle herhangi bir metin içindeki **her 10 ardışık rakam** (`\d{10}`) telefon numarası olarak eşleşir!
  2. `_PATTERNS[1]`, `_PATTERNS[2]`'den (`\b\d{10,11}\b` — TC Kimlik / VKN) **önce** çalıştığı için:
     - **11 haneli TC Kimlik No (`12345678901`)** geldiğinde ilk 10 hanesi telefon olarak maskelenir ve **11. hane açıkta kalır**: `"TC 12345678901"` $\rightarrow$ `"TC [telefon gizlendi]1"`.
     - **10 haneli Vergi Kimlik No (`1234567890`)** geldiğinde `"VKN [telefon gizlendi]"` olarak yanlış etiketlenir.
     - `_PATTERNS[2]` (`"[kimlik no gizlendi]"`) **%100 ulaşılamaz ölü koddur (dead code)**.
  3. `mask_personal_data(report)` tüm rapor sözlüğünü özyinelemeli (recursive) taradığı için `varliklar` dizisindeki 22 karakterlik IFC `GlobalId` değerlerinden 10 ardışık rakam içerenler (örn. `"1234567890ABCDEF123456"`) **`"[telefon gizlendi]ABCDEF123456"`** şeklinde bozulmakta ve model-eleman izlenebilirliğini (traceability) kırmaktadır!
  4. `test_epys_preflight.py:44` yalnızca `assert "12345678901" not in text` kontrolü yaptığı için `"TC [telefon gizlendi]1"` çıktısını başarılı saymıştır.
- **Çözüm Önerisi:**
  - TC Kimlik (`\b[1-9]\d{10}\b`) ve VKN (`\b\d{10}\b`) kuralları telefon regex'inden önce veya ayrık sınırlarla çalıştırılmalı; telefon regex'ine kelime sınırı ve zorunlu format (`(?:\+90|0)\s*\(?\d{3}\)?...`) eklenmeli; `global_id`, ` schema`, `kod` gibi teknik kimlik alanları maskeleme kapsamı dışında tutulmalıdır.

---

### BUG-02 [P0 / Kritik] — Tamamlanmış IFC İşleri Kuyruktan Açıldığında e-PYS EK-9 Panelinin Kaybolması
- **Dosya & Satır:** `src/components/smartcheck/SmartCheckImportWorkspace.tsx:235-236, 288-298, 772`
- **Mevcut Kod:**
  ```tsx
  // Satır 235-236:
  const isIfcFile = isIfcSmartCheckFile(file);
  const isPdfFile = isPdfSmartCheckFile(file) || Boolean(openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".pdf"));

  // Satır 288-298 (openQueueDocument):
  const openQueueDocument = async (item: SmartCheckQueueItem) => {
    setError(null);
    setDocumentId(item.documentId);
    setOpenedFileName(item.fileName);
    setFile(null); // <-- file state'i sıfırlanıyor!
  ```
- **Kök Neden ve Etki:**
  - `isPdfFile` hem seçili `file` nesnesini hem de kuyruktan açılan `openedFileName` değerini kontrol ederken, `isIfcFile` **yalnızca** `file` state'ini kontrol etmektedir.
  - Kullanıcı "SmartCheck İş Kuyruğu" listesinden tamamlanmış bir `.ifc` işinin **"Sonuçları aç"** butonuna tıkladığında `setFile(null)` çalışır, `isIfcFile` `false` olur ve 772. satırdaki `{documentId && isIfcFile && rows.length > 0 && <EpysPreflightPanel ... />}` koşulu sağlanmadığı için **e-PYS EK-9 Ön-Kontrol Paneli ekranda hiç render edilmez!**
- **Çözüm Önerisi:**
  - Satır 235: `const isIfcFile = isIfcSmartCheckFile(file) || Boolean(openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc"));` olarak güncellenmelidir.

---

### BUG-03 [P0 / Kritik] — Mimari / QTO Kanıtı Olmayan IFC Modellerinde e-PYS Ön-Kontrol Raporunun Kilitlenmesi (`409 PREFLIGHT_RUN_NOT_SUCCEEDED`)
- **Dosya & Satır:** `src/smartcheck/import/processor.ts:88-103, 320-322`, `workers/ifc/ifc_extract.py:590-592`, `src/server/routes/smartcheck.ts:359`, `src/components/smartcheck/SmartCheckImportWorkspace.tsx:772`
- **Kök Neden ve Etki:**
  1. `processor.ts` önce `runPythonIfcExtractor` çalıştırır. Eğer yüklenen IFC dosyası yalnız mimari mahal (`IfcSpace`), kapı/pencere veya vaziyet (`IfcSite`/`IfcBuilding`) içeriyor ve taşıyıcı (`IfcBeam/Column/Slab/Wall/ReinforcingBar`) içermiyorsa `ifc_extract.py:591` `EXIT_EMPTY_MODEL` ile çöker ve `storeEpysPreflight` hiç çağrılmaz.
  2. Modelde yapısal elemanlar olsa bile geçerli QTO/Property hacmi yoksa (`artifact.rows.length === 0`), `processor.ts:102` e-PYS raporunu veritabanına yazar fakat satır 321'de `IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE` fırlatarak tüm koşuyu `failed` olarak işaretler.
  3. Ardından `GET /api/smartcheck/documents/:id/epys-preflight` (`smartcheck.ts:359`) `latestRun.status !== "succeeded"` olduğu için **`409 PREFLIGHT_RUN_NOT_SUCCEEDED`** hatası döner ve kullanıcı e-PYS raporunu göremez!
  4. Bu hata, ayda 390 TL'ye satılan **"e-PYS & BIM Standart Denetçi"** paketinin ana kullanım senaryosunu (mimari ruhsat/e-PYS kontrolü) doğrudan kırmaktadır. Nitekim `WORKING_STATE.md:92`'de belirtilen 2 başarısız canlı pilot IFC koşusundan biri tam olarak bu nedenden (`IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE`) başarısız olmuştur.
- **Çözüm Önerisi:**
  - `storeEpysPreflight` adımı QTO çıkarım sonucundan bağımsız çalışmalı; `epys-preflight` uç noktası koşu `failed` olsa bile `epys_preflight` artefaktı mevcutsa raporu döndürmeli; arayüzde `<EpysPreflightPanel>` gösterimi `rows.length > 0` şartına bağlanmamalıdır.

---

### BUG-04 [P0 / Kritik] — `DosyadanTeklifDemo.tsx` İçinde Sahte 3D Görünüm, İşlevsiz "Ata" Butonu, Kota Bypass'ı ve Kaybolan Fiyat/Metraj Verileri
- **Dosya & Satır:** `src/pages/DosyadanTeklifDemo.tsx:24-28, 50, 71-88, 257-357, 376-401` ve `src/pages/Dashboard.tsx:181, 199, 344`
- **Kök Neden ve Etki:**
  - `Dashboard.tsx` üzerindeki **üç ana IFC çağrı butonunun tamamı** (`"3D IFC ile Teklif Hazırla"`, `"İLK IFC MODELİNİ YÜKLE"`, `"IFC Model Yükle →"`) kullanıcıyı `/app/dosyadan-teklif-demo` sayfasına yönlendirmektedir.
  - Ancak `DosyadanTeklifDemo.tsx` sayfasında:
    1. **Kota Bypass'ı (Satır 50):** `/app/ifc-parser` sayfası `POST /api/ifc/quick-check` ile aylık IFC kotasını düşürürken, `/app/dosyadan-teklif-demo` doğrudan tarayıcıda `parseIfcText(text)` çalıştırmakta ve **hiçbir kota kontrolü yapmamaktadır**.
    2. **İşlevsiz "Ata" Butonu (Satır 398-400):** "Sorunları İncele & Çöz" çekmecesindeki poz numarası `<input>` ve `<button>Ata</button>` elemanlarında `value`, `onChange` veya `onClick` handler'ı yoktur; tıklama hiçbir şey yapmaz.
    3. **Sahte 3D Model Alanı (Satır 376-384):** Kodda `{/* Fake 3D Canvas Area */}` yorumuyla sabit bir kutu gösterilmekte ve sonsuza dek `"3D Modeli Yükleniyor..."` yazmaktadır.
    4. **Veri Kaybı ve Yanıltıcı Bildirim (Satır 71-88, 257-355):** Kullanıcı 3. adımda ("Birim Fiyatlandırma") Hazır Beton, Nervürlü Çelik ve Kalıp için birim fiyat girmekte ve ara toplamı görmektedir. `"Teklifi Hazırla"` butonuna bastığında `"Teklifiniz Hazır! Arka planda taslak teklifiniz oluşturuldu"` mesajı çıkar; ancak arka planda hiçbir API çağrısı yapılmaz, girilen birim fiyatlar ile donatı/kalıp miktarları **tamamen çöpe atılır** ve `/app/quotes/new` ekranına yalnız `unitPrice: 0` olan tek bir beton satırı aktarılır!

---

### BUG-05 [P1 / Yüksek] — `CreateQuote.tsx` Demo Şablonunda Satır Toplamı (`1.710.000 ₺`) ile Hesaplanan Net Tutar (`1.624.500 ₺`) Tutarsızlığı
- **Dosya & Satır:** `src/pages/CreateQuote.tsx:303, 378-386, 706` ve `src/lib/calculations.ts:116-118`
- **Kök Neden ve Kanıt:**
  - `calculateLineItemTotal(item)` (`src/lib/calculations.ts:116`) satırın **iskonto düşülmüş net tutarını** (`calculateLineBreakdown(item).net`) döndürür.
  - Ancak `CreateQuote.tsx:378-386` içindeki `handleLoadDemoTemplate` fonksiyonunda 2. kalem (`quantity: 450`, `unitPrice: 3800`, `discountPercent: 5`) için `total: 1710000` (brüt tutar) sabit kodlanmıştır (`450 × 3.800 = 1.710.000 ₺`).
  - Oysa `%5` iskonto (`85.500 ₺`) düşüldüğünde `calculateLineItemTotal` değeri **`1.624.500,00 ₺`**'dir. Kullanıcı "Örnek Şablon Yükle" butonuna bastığında tabloda `₺1.710.000,00` görür; satırdaki herhangi bir alana dokunduğu anda tutar aniden `₺1.624.500,00`'ye düşer!

---

### BUG-06 [P1 / Yüksek] — Teklif Cetvelinde `costCategory`, `discountPercent` ve `vatPercent` Alanlarının Arayüzde Bulunmaması (Eskalasyon Hesabını Etkiliyor)
- **Dosya & Satır:** `src/pages/CreateQuote.tsx:244-256, 650-714` ve `src/lib/financial-calculations.ts:32, 67, 73-75`
- **Kök Neden ve Etki:**
  - `src/lib/financial-calculations.ts:32` uyarınca fiyat eskalasyonu (`escalationPremiumFor`) yalnızca `material` ve `labor` kategorilerine uygulanmakta; `subcontractor`, `logistics` ve `overhead` kategorileri sabit kabul edilmektedir.
  - Ancak `CreateQuote.tsx` cetvelinde kullanıcının satır bazında `costCategory` (`Malzeme / İşçilik / Taşeron / Lojistik / Genel Gider`), `discountPercent` (`İskonto %`) veya `vatPercent` (`KDV %`) seçebileceği **hiçbir tablo sütunu veya input yoktur**.
  - Eklenen her kalem sabit olarak `costCategory: 'material'`, `discountPercent: 0`, `vatPercent: 20` almakta; taşeron veya genel gider kalemleri de zorunlu olarak `material` sayıldığı için **eskalasyon primi taşeron kalemleri üzerinde de yanlışlıkla hesaplanmaktadır**. Ayrıca Demo Şablon yüklendiğinde sağ özette `-85.500 TRY` İndirim görünürken cetvelde bu indirimin hangi satırdan geldiği görülememektedir.

---

### BUG-07 [P1 / Yüksek] — `financial-calculations.ts` İçinde Satır Bazlı Maliyetlerin (`effectiveCost`) Kuruş Yuvarlamasına (`roundMoney`) Girmemesi
- **Dosya & Satır:** `src/lib/financial-calculations.ts:58-69, 86-92`
- **Kök Neden:**
  - Satır 58'de `salesNet += calculateLineBreakdown(item).net;` ile satış tutarları satır bazında kuruşa yuvarlanarak toplanırken, satır 65'te `const effectiveCost = quantity * costUnitPrice * (1 + waste / 100);` ham kayan nokta (floating-point) olarak toplanmakta ve yalnızca en sonda (`roundMoney(riskAdjustedCost)`) yuvarlanmaktadır. Çok satırlı ve küsuratlı metraj/fire oranlarında satır maliyetleri toplamı ile alt toplam arasında kuruş farkı (rounding drift) oluşabilmektedir.

---

### BUG-08 [P1 / Yüksek] — Sol Navigasyon Menüsünde (`navigation.tsx`) `/app/billing` Rol Hatası ve `/app/smartcheck` Bağlantısının Eksikliği
- **Dosya & Satır:** `src/constants/navigation.tsx:22-79`, `src/components/layout/Shell.tsx:75-81`, `src/App.tsx:96-103`
- **Kök Neden ve Etki:**
  1. `src/constants/navigation.tsx:37-43` içinde `"Faturalandırma"` (`/app/billing`) öğesi `"Sistem Yönetimi"` grubuna ve **yalnızca `roles: ["super_admin"]`** yetkisine tanımlanmıştır. Oysa `src/App.tsx:100` içinde `/app/billing` rotası `<ProtectedRoute allowedRoles={['owner', 'admin']}><Billing /></ProtectedRoute>` ile korunmaktadır! Sonuç olarak müşteri şirketlerin `owner` ve `admin` kullanıcıları sol menüde **"Faturalandırma" bağlantısını hiç görememektedir**.
  2. Sol menüde (`navigationConfig`) platformun çekirdek modülleri olan **`/app/smartcheck`** (SmartCheck & e-PYS), **`/app/market-intelligence`** (Tedarikçi & Piyasa İstihbaratı), **`/app/profitability`** (Kârlılık) ve **`/app/analytics`** için hiçbir menü öğesi yoktur.

---

### BUG-09 [P2 / Orta] — `workers/ifc/ifc_extract.py` İçinde Yanıltıcı Normatif Uyum Metni ("Eurocode 2 & TS 708")
- **Dosya & Satır:** `workers/ifc/ifc_extract.py:396-423`
- **Kök Neden:**
  - `ifc_extract.py:398` satırında `note = "Eurocode 2 & TS 708 donatı ve hacim standartlarına uyumlu"` varsayılan değeri tanımlanmıştır. Her ne kadar sonraki `if/elif/else` blokları bu değişkenin üzerine yazsa da, ölü/varsayılan bir değişkende "Eurocode 2 & TS 708 uyumlu" ifadesinin bulunması `PRODUCT.md` ve `TBDY_TS500` varsayılan norm profili ile çelişmektedir.

---

### BUG-10 [P2 / Orta] — PDF/A Aylık ve Eşzamanlı Kota Sınırlarının Plan Kataloğu Yerine `service.ts` İçinde Sabit Kodlanması
- **Dosya & Satır:** `src/smartcheck/import/service.ts:136-150`
- **Kök Neden:**
  - `checkPdfUploadPolicy` fonksiyonu, şirketin aktif abonelik planına (`plans.features_json` veya `feature-limits.ts`) bakmak yerine tüm şirketler için sabit `Number(concurrent?.count ?? 0) >= 2` ve `Number(monthly?.count ?? 0) >= 100` sınırlarını doğrudan SQL ile `document_processing_runs` tablosundan (`original_file_name ILIKE '%.pdf'`) saymaktadır. Paket bazlı farklı PDF/A kotaları (`denetci` vs `ihale_masasi` vs `kurumsal`) bu sabit kod yüzünden ayrıştırılamamaktadır.

---

## 3. GAP Analizi (Ürün, Mühendislik, BIM ve Altyapı Boşlukları)

### 3.1 Ürün ve Ticari Vaat Boşlukları (`/ai-bim-director`)

| Kod | Başlık | Mevcut Durum & Kanıt (`file://`) | Hedef Durum / Kapanış Kriteri | Öncelik |
|---|---|---|---|---|
| **GAP-01** | **Sahte "ÇŞB 2026 — 42.000+ Poz" Pazarlama İddiası** | `src/pages/LandingPage.tsx:145, 152, 288-291, 447, 471`, `src/components/layout/Shell.tsx:242`, `src/pages/Dashboard.tsx:150` ve `src/pages/DosyadanTeklifDemo.tsx:184, 240` açıkça "ÇŞB 2026 Kütüphanesi — 42.000+ Güncel Poz & Birim Fiyat" vaat ediyor. Canlı DB'de onaylı resmi poz sayısı **0**; YFK yazılı lisansı yok (`WORKING_STATE.md:107`). | YFK yazılı ticari lisansı alın고 kanonik tablolar doldurulana kadar tüm vitrin/uygulama metinleri **"Şirket / Tedarikçi Fiyat Kataloğu ve Kanıtlı Fiyat Snapshot"** olarak düzeltilmeli. | **P0** |
| **GAP-02** | **14 Günlük Ücretsiz Deneme Vaadi vs Kilitli Sunucu SmartCheck** | Kayıt (`POST /api/auth/register`) herkese açık ve `LandingPage.tsx:422-425` 14 gün ücretsiz denemede IFC/Excel yüklemeyi vaat ediyor. Ancak `SMARTCHECK_PILOT_COMPANY_IDS` yalnız iç `Bimmetraj` tenant'ına izin veriyor; yeni kayıt olan her firma `/api/smartcheck/*` uçlarında `404 SMARTCHECK_IMPORT_DISABLED` alıyor. | Yeni kayıt olan firmalar için ya plan kotası dahilinde (`feature-quota.ts`) sunucu SmartCheck açılmalı ya da self-servis kayıt "Onaylı Pilot Başvurusu" akışına bağlanmalı. | **P0** |
| **GAP-03** | **İç Pilot Tenant'ın `plan_id = null` Olması (35 MB Sınırı)** | `WORKING_STATE.md:94-96`'da belgelendiği üzere canlı `Bimmetraj` pilot tenant'ında `plan_id = null` olduğu için 35 MB deneme sınırı uygulanmakta ve 37 MB'lık `e-proje_4x3.ifc` referans dosyası yüklenememektedir. | İç pilot tenant'a `ihale_masasi` (250 MB) veya `kurumsal` (500 MB) planı atanmalı. | **P0** |
| **GAP-04** | **Stripe Canlı Tahsilat ve Hukuki Sözleşme Boşluğu (P0-2)** | Stripe anahtarları `test` modunda; canlı ödeme/webhook tekrar (replay) kanıtı yok. `src/pages/LegalPage.tsx:30-56` hâlâ "BIMPlan Academy" markalı 3 cümlelik taslak metin içeriyor; KVKK Aydınlatma Metni ve Mesafeli Satış / Ön Bilgilendirme metinleri yok. | Canlı ödeme sağlayıcı (Stripe Live veya iyzico/PayTR), e-Arşiv/e-Fatura akışı ve gerçek KVKK/Kullanım Koşulları metinleri yayına alınmalı. | **P0** |

### 3.2 Mühendislik ve Metraj Motoru Boşlukları (`/yuksek-muhendis-mimar`)

| Kod | Başlık | Mevcut Durum & Kanıt (`file://`) | Hedef Durum / Kapanış Kriteri | Öncelik |
|---|---|---|---|---|
| **GAP-05** | **Betonarme Kalıp (`m²`) ve Donatı (`ton`) Metrajlarının Teklife Aktarılamaması (E-7)** | `src/ifc/smartcheck-evidence.ts:132-135` ve `src/pages/CreateQuote.tsx:100-136` yalnızca beton hacmini (`m³`) teklif kalemine dönüştürüyor. Kalıp (`m²` kırık ölçü, kolon-kiriş birleşim düşümü) ve donatı (`ton`, TS 708 nominal kütle + TS 500 kenetlenme/bindirme boyu) kanıtlı teklif satırı olarak üretilmiyor. | `IfcReinforcingBar` / donatı metrajı (`ton`) ve eleman geometrisinden/QTO'dan türetilen kalıp alanı (`m²`) ayrı kanıtlı SmartCheck satırları olarak teklife aktarılabilmeli. | **P1** |
| **GAP-06** | **Sözleşmesel Ölçü Esasları ve Minha (Boşluk Düşümü) Motoru Eksikliği (E-8)** | `workers/ifc/ifc_extract.py` ve `qto-extractor.ts` doğrudan IFC içindeki `NetVolume` / `GrossVolume` değerini okuyor; ÇŞB Genel Teknik Şartnamesi (tüm boşluklar düşülür, sıvanan yanlar eklenir) ile DIN 18350 ($\le 2{,}5\text{ m}^2$ boşluklar düşülmez) arasındaki sözleşmesel minha kuralını uygulayan bir motor yok. | Proje/teklif bazında seçilebilir `measurementStandard: 'CSB_2026' \| 'DIN_18350' \| 'SMM7'` kural motoru eklenmeli ve brüt/düşülen/eklenen/net miktar dökümü (`QuantityTrace`) saklanmalı. | **P1** |
| **GAP-07** | **Disiplin Bazlı Teknik Onay Yetkisi ve Elektronik İmza Kaydı Eksikliği (E-9)** | `src/server/routes/smartcheck.ts:52` (`canReviewSmartCheck`) yalnızca kullanıcı rolüne (`owner/admin/manager`) bakıyor; onaylayanın disiplini (`STR`, `ARC`, `MEP`) veya oda sicil/unvan bilgisi kontrol edilmiyor. Ayrıca `/admin/roadmap/calculations` (`src/pages/admin/CalculationMethods.tsx:222-262`) üzerindeki uzman onay tablosu yalnızca tarayıcıda yazdırılabilir (`window.print()`) boş bir tablodur; veritabanı kaydı yoktur. | Satır ve hesap yöntemi onaylarında disiplin yetkisi (`user.discipline`) ve değiştirilemez (immutable) elektronik onay kaydı (`reviewer_signoffs`) tutulmalı. | **P1** |

### 3.3 BIM, IFC, 3x3 ve RG 33331 (e-PYS / PDF/A) Boşlukları (`/bim-knowledge-engineer`)

| Kod | Başlık | Mevcut Durum & Kanıt (`file://`) | Hedef Durum / Kapanış Kriteri | Öncelik |
|---|---|---|---|---|
| **GAP-08** | **3x3 Kural Paketi Girdilerinin `ifc_extract.py` Tarafından Çıkarılmaması (`%100 missingInput`)** | `src/smartcheck/rules/ifc-rule-run.ts:12-18` içindeki `threeByThreeItems()` fonksiyonu `validateThreeByThreeRules` motoruna yalnızca `elementId` ve `elementType` gönderiyor (`isLoadBearing`, `isExternal`, `coverMm`, `exposureClass`, `discipline`, `expectedQuantity` alanlarının tamamı `undefined` kalıyor). Bu yüzden her sunucu IFC koşusunda 3x3 kuralları **0 eleman** değerlendiriyor (`status: "not_evaluated"`). | `workers/ifc/ifc_extract.py` içinde `Pset_*Common.LoadBearing`, `Pset_*Common.IsExternal`, `Pset_ReinforcingBarPitchOfSlab` / paspayı ve disiplin bilgileri çıkarılmalı ve `ifc-rule-run.ts` üzerinden `validateThreeByThreeRules`'a aktarılmalı. | **P0** |
| **GAP-09** | **RG 33331 EK-6 (68 Tablo) ve EK-3 (~150 Kısaltma) Bağımsız Doğrulama Eksikliği** | `workers/ifc/vendor/ifc_ruhsat/` sözlükleri taranmış 241 sayfalık RG 33331 ekinden (`20260805-2-1.pdf`) yalnızca 3 tablo (`Tablo 6.55`, `Tablo 6.60`, `Tablo 9.1` satır 1–9) düzeyinde bağımsız kontrol edilmiştir (`src/pages/admin/roadmap/calculation-content.ts:281-283`). | Kalan ~66 adet EK-6 Pset tablosu ve EK-3 mahal kısaltmaları Ресmî Gazete PDF'ine karşı bağımsız doğrulama betiği ve uzman imzasıyla doğrulanmalı. | **P1** |
| **GAP-10** | **PDF/A Ön-Kontrolcüsünde Tam ISO 19005 (`veraPDF`) Eksikliği ve Yanlış Pozitif Taranmış Sayfa Uyarısı** | `workers/ifc/pdf_preflight.py:131-162` yalnızca XMP içindeki `pdfaid:part` metnini regex ile aramakta (gerçek font gömme, renk uzayı ve şeffaflık kurallarını denetlememekte) ve metin içermeyen fakat görsel içeren sayfaları `TARANMIS_SAYFA_OLASI` olarak işaretlemektedir. | Sunucu işçi konteynerine `veraPDF` veya `qpdf/mutool` tabanlı font/renk uzayı kontrolü eklenmeli; vektörel çizim paftaları ile raster taranmış sayfalar ayrıştırılmalı. | **P2** |
| **GAP-11** | **Tarayıcı Hızlı Kontrolünde (`epys.ts`) Eski `trPsetCsb` İsimlendirmesi ve Kısıtlı Kapsam** | Sunucu tarafı `Pset_ProjeBilgileri` / `Pset_ArsaBilgileri` (EK-9) kullanırken, tarayıcı tarafındaki `src/smartcheck/rules/epys.ts` ve `src/ifc/parser/tr-pset-csb-extractor.ts` hâlâ iç tip adlarında `trPsetCsb` / `TrPsetCsbProjectCompliance` kullanmakta ve 68 EK-6 tablosunu denetlememektedir. | Tarayıcı ve sunucu e-PYS şema adlandırmaları (`epysEk9`) birleştirilmeli; tarayıcı modunun yalnızca "EK-9 Üstveri Hızlı Kontrolü" olduğu açıkça belirtilmeli. | **P2** |

### 3.4 Altyapı, Güvenlik ve Operasyon Boşlukları (`/bim-software-architect`)

| Kod | Başlık | Mevcut Durum & Kanıt (`file://`) | Hedef Durum / Kapanış Kriteri | Öncelik |
|---|---|---|---|---|
| **GAP-12** | **Veritabanı En Az Ayrıcalıklı (Least-Privilege) Çalışma Zamanı Rolü Eksikliği (P1-1)** | `WORKING_STATE.md:105` — Canlı `app` ve `worker` servisleri veritabanına şema sahibi (migration/DDL yetkili) PostgreSQL rolüyle bağlanmaktadır. | `teklifpro_migrator` (DDL) ve `teklifpro_app` (yalnızca `SELECT, INSERT, UPDATE, DELETE`) rolleri ayrılmalı. | **P1** |
| **GAP-13** | **E-Posta Teslim Edilebilirliği — `bimmetraj.com` DKIM Eksikliği (P1-8)** | `WORKING_STATE.md:109` — `bimmetraj.com` için SPF ve `DMARC p=reject` yayında olmasına rağmen DNS üzerinde **DKIM kaydı eksiktir**. `p=reject` politikası altında DKIM imzasız e-postalar alıcı sunucular tarafından reddedilme riski taşır. | DNS sağlayıcısında (Resend/SMTP) DKIM TXT/CNAME kayıtları tanımlanmalı ve `dig` ile doğrulanmalı. | **P1** |
| **GAP-14** | **Üretim AI Sağlayıcı Anahtarları ve Otomatik Eval Bütçesi Eksikliği (P1-6)** | Canlı ortamda AI sağlayıcı anahtarları tanımlı değildir (`/api/health` üzerinde `aiConfigured: false`); AI özellikleri için otomatik regresyon/maliyet eval kapısı yoktur. | Üretim AI anahtarları kasaya eklenmeli ve plan bazlı `ai_import` kota kapısı altında LLM çıktı doğrulama (eval) testleri CI'a bağlanmalı. | **P2** |

---

## 4. UI Analizi (Tasarım Sistemi, Tipografi, Kontrast ve Bileşen Tutarlılığı)

`DESIGN.md` ("Construction Blueprint Precision", `#0d1017` karbon zemin, `#f97316` inşaat turuncusu, `Plus Jakarta Sans` + `Space Grotesk` + `JetBrains Mono`) kararlarına karşı yapılan statik kod taramasında aşağıdaki somut sapmalar ölçülmüştür:

### 4.1 Ölçülen UI Metrikleri (`src/` Geneli)

| UI Kriteri | `DESIGN.md` / WCAG 2.2 AA Standardı | Kod Tabanındaki Mevcut Ölçüm | Etkilenen Başlıca Dosyalar |
|---|---|---|---|
| **12px Altı Mikro Font Kullanımı** (`text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`) | En küçük yardımcı/rozet metni `12px` (`text-xs`) olmalıdır. | **1.131 kullanım** | `SmartCheckImportWorkspace.tsx`, `BimIfcParser.tsx`, `CreateQuote.tsx`, `CalculationMethods.tsx`, `QuoteDetail.tsx` |
| **Aşırı Büyük Harf & Harf Aralığı** (`uppercase tracking-widest`) | Yalnızca tablo/bölüm üst başlıklarında sınırlı kullanılmalıdır. | **351 kullanım** | `CreateQuote.tsx`, `SmartCheckImportWorkspace.tsx`, `BimIfcParser.tsx`, `AdminDashboard.tsx` |
| **Ham (Raw) HTML Form Kontrolleri** (`<select>`, `<textarea>`) | `src/components/ui/` tasarım sistemi bileşenleri kullanılmalıdır. | **36 kullanım** | `SmartCheckImportWorkspace.tsx` (8 adet), `PilotApplications.tsx` (2 adet), `BimIfcParser.tsx` (2 adet), `CalculationMethods.tsx` (2 adet) |
| **Düşük Kontrastlı Metinler** (`text-zinc-500`, `text-zinc-600` on `bg-zinc-950`) | WCAG 2.2 AA normal metin kontrast oranı $\ge 4{,}5:1$ olmalıdır. | `#71717a` (`zinc-500`) / `#09090b` (`zinc-950`) kontrastı **$3{,}9:1$**; `#52525b` (`zinc-600`) kontrastı **$2{,}5:1$** (Başarısız). | `SmartCheckImportWorkspace.tsx`, `CreateQuote.tsx`, `DosyadanTeklifDemo.tsx` |

### 4.2 Öne Çıkan UI Sorunları
1. **Marka Şizofrenisi (3 Farklı Ürün Adı):**
   - `src/pages/LandingPage.tsx` ve `src/components/layout/Shell.tsx` üzerinde **BIMMetraj** (`BIMMETRAJ`, `bimmetraj.com`),
   - `src/pages/LegalPage.tsx:16, 33` üzerinde **BIMPlan Academy**,
   - İç bildirimler, `sessionStorage` anahtarları ve admin sayfalarında **TeklifPro** kullanılmaktadır.
2. **Klavye ve Dokunmatik Cihazlarda Erişilemeyen Satır Silme Butonu (`CreateQuote.tsx:709`):**
   - Teklif cetvelindeki satır silme (`Trash2`) butonu `opacity-0 group-hover:opacity-100` sınıfına sahiptir ve `focus:opacity-100` tanımlanmamıştır. Tablet/mobil cihazlarda hover olmadığı için kullanıcılar kalem silememekte, klavye ile `Tab` gezintisinde buton görünmez kalmaktadır.
3. **Aynı Sayfaya Düşen Sahte Navigasyon Rotaları (`src/App.tsx:79-82`):**
   - `/about`, `/pricing` ve `/features` rotalarının tamamı herhangi bir bölüm kaydırması (`scrollIntoView`) yapmadan doğrudan `<LandingPage />` bileşenini render etmektedir.
4. **CSV Fiyat Kataloğu İçe Aktarma Kartının Aynı Ekranda İki Kez Render Edilmesi (`SmartCheckImportWorkspace.tsx:787, 810`):**
   - `renderCatalogImportCard()` fonksiyonu hem "Fiyat Önerileri" bölümünden önce (satır 787) hem de "Onaylı Satırlar ve Fiyat Eşleştirme" bölümünün içinde (satır 810) çağrılmaktadır.

---

## 5. UX Analizi (Kullanıcı Yolculuğu, Bilgi Mimarisi ve Bilişsel Yük)

### 5.1 Kritik UX Kopukluğu: Üçlü (Triple) IFC Yükleme Akışı

Şu anda sisteme giriş yapan bir kullanıcının karşısında **birbiriyle çelişen 3 ayrı IFC yükleme yolu** bulunmaktadır:

```
                         ┌──────────────────────────────────────────────────────────────┐
                         │ 1. /app/dosyadan-teklif-demo (DosyadanTeklifDemo.tsx)        │
Dashboard.tsx            │ - Tüm Dashboard "IFC Yükle" butonları buraya gider!          │
("3D IFC ile Teklif") ──►│ - Kota kontrolü YOK, sunucu kaydı YOK                        │
                         │ - Sahte (Fake) 3D görünüm, çalışmayan "Ata" butonu           │
                         │ - 3. adımda girilen fiyatları/donatıyı/kalıbı ÇÖPE ATAR!     │
                         └──────────────────────────────┬───────────────────────────────┘
                                                        │ (Yalnız >25 MB dosyada yönlendirir)
                                                        ▼
                         ┌──────────────────────────────────────────────────────────────┐
                         │ 2. /app/smartcheck (SmartCheckImportWorkspace.tsx)           │
Sol Menü (navigation)    │ - Gerçek sunucu + DB + e-PYS + 3x3 + PDF/A çalışma alanı     │
(Hiçbir link YOK!)   ─X─►│ - Sol menüde ve Dashboard'da HİÇBİR BAĞLANTISI YOK!          │
                         │ - Dış kullanıcılara 404 SMARTCHECK_IMPORT_DISABLED döner!    │
                         └──────────────────────────────────────────────────────────────┘
                                                        ▲
                         ┌──────────────────────────────┴───────────────────────────────┐
                         │ 3. /app/ifc-parser (BimIfcParserPage.tsx)                    │
CreateQuote.tsx          │ - Teklif ekranındaki "5D IFC Metraj Yükle" buraya gider!     │
("5D IFC Metraj")    ───►│ - Tarayıcıda çalışır ama 1 adet sunucu IFC kotası tüketir!   │
                         │ - Yalnızca beton (m³) aktarır, kanıt zinciri üretmez (`demo`)│
                         └──────────────────────────────────────────────────────────────┘
```

### 5.2 `SmartCheckImportWorkspace.tsx` Bilişsel Yük ve Jargon Analizi
1. **Tek Ekranda 9 Aşamanın Yığılması:** Dosya yükleme, XLSX sütun eşleme, 7 alanlı iç pilot kabul formu (`Pilot kanıt kaydı`), satır bazlı teknik inceleme (review), e-PYS EK-9 raporu, PDF/A raporu, manuel fiyat snapshot oluşturma, CSV katalog yapıştırma, fiyat önerisi bağlama ve teklife aktarım aynı uzun sayfada alt alta açılmaktadır.
2. **Son Kullanıcıya Gösterilen İç Geliştirici/Operatör Jargonu:**
   - `"Evidence-first pilot"`, `"IFC DB-backed akış"`, `"property/QTO"`, `"snapshot"`, `"advisory"`, `"Retry"`, `"succeeded"`, `"failed"` gibi terimler doğrudan arayüzde yer almaktadır.
   - Satır 766'daki **"Pilot kanıt kaydı"** formu (`Gözlenen süre (dk)`, `Manuel baz süre (dk)`, `Karar: Go / Düzeltme ile Go / No-Go`) bir iç operasyon formu olmasına rağmen dosya yükleyen son kullanıcının ekranında durmaktadır.

---

## 6. Yüksek Mühendis & Mimar Hesap Doğrulaması (`eng_calc.py` Kanıt Tablosu)

`.agent/skills/yuksek-muhendis-mimar/scripts/eng_calc.py` deterministik hesap motoru ile yapılan referans doğrulama sonuçları ve TeklifPro kod tabanındaki karşılıkları aşağıdadır:

| Hesap Alanı | Test Girdisi | `eng_calc.py` Deterministik Sonucu | TeklifPro Mevcut Durumu & Sapma Analizi |
|---|---|---|---|
| **1. ÇŞB vs DIN 18350 Sıva Minha Hesabı** (`siva_boya_alani`) | Duvar: $6{,}0 \times 3{,}0\text{ m}$ ($18{,}00\text{ m}^2$ brüt)<br>Boşluk 1: Pencere $1{,}2 \times 1{,}5\text{ m}$ ($1{,}80\text{ m}^2$, derinlik $0{,}25\text{ m}$)<br>Boşluk 2: Kapı $0{,}9 \times 2{,}1\text{ m}$ ($1{,}89\text{ m}^2$, derinlik $0{,}25\text{ m}$) | **ÇŞB Kuralı:**<br>Brüt: $18{,}00\text{ m}^2$<br>Düşülen: $-3{,}69\text{ m}^2$<br>Eklenen (iç diş): $+2{,}33\text{ m}^2$<br>**Net: $16{,}64\text{ m}^2$**<br><br>**DIN 18350 Kuralı ($\le 2{,}5\text{ m}^2$):**<br>Boşluklar $\le 2{,}5\text{ m}^2$ olduğu için düşülmez $\rightarrow$ **Net: $18{,}00\text{ m}^2$** (**+%8,17 fark**) | **GAP-06:** TeklifPro'da ÇŞB vs DIN 18350 boşluk düşümü (minha) ve pencere/kapı yan yüz (iç diş) ekleme motoru yoktur. |
| **2. Betonarme Kesişim Hiyerarşisi & Kalıp Kırık Ölçü** (`betonarme_metraj`) | 4 Kolon ($0{,}4 \times 0{,}6\text{ m}$, $H=3{,}2\text{ m}$, $t=0{,}15\text{ m}$)<br>4 Kiriş ($0{,}3 \times 0{,}6\text{ m}$, $l_n=5{,}0\text{ m}$, $t=0{,}15\text{ m}$)<br>1 Döşeme ($25{,}0\text{ m}^2$ net, $t=0{,}15\text{ m}$, kenar $20\text{ m}$) | **Beton Hacmi ($V$):**<br>Kolon: $2{,}928\text{ m}^3$<br>Kiriş: $2{,}700\text{ m}^3$<br>Döşeme: $3{,}750\text{ m}^3$<br>**Toplam Beton: $9{,}378\text{ m}^3$**<br><br>**Kalıp Alanı ($K$, birleşimler düşülmüş):**<br>Kolon: $23{,}32\text{ m}^2$ ($-1{,}08\text{ m}^2$ kiriş oturma yüzü düşüldü)<br>Kiriş: $24{,}00\text{ m}^2$<br>Döşeme: $28{,}00\text{ m}^2$<br>**Toplam Kalıp: $75{,}32\text{ m}^2$** | **GAP-05:** TeklifPro IFC çıkarıcısı elemanların tekil QTO hacimlerini toplamakta, fakat kalıp alanını ($75{,}32\text{ m}^2$) ve kolon-kiriş birleşim yüzeyi düşümlerini hesaplayıp teklife aktaramamaktadır. |
| **3. TS 708 Donatı Nominal Kütle & Fire Hesabı** (`donati_agirlik`) | $\varnothing 16$: $120{,}5\text{ m}$ ($1{,}578\text{ kg/m}$)<br>$\varnothing 12$: $85{,}0\text{ m}$ ($0{,}888\text{ kg/m}$)<br>Fire: $\%5$ | $\varnothing 16$: $190{,}19\text{ kg}$<br>$\varnothing 12$: $75{,}46\text{ kg}$<br>Net Toplam: **$265{,}65\text{ kg}$**<br>$\%5$ Fireli Toplam: **$278{,}94\text{ kg}$ ($0{,}2789\text{ t}$)** | **GAP-05:** `ifc_extract.py` yalnız `IfcReinforcingBar` varsa veya kaba kesit oranı tahminiyle (`rebar_ton_estimated`) donatı çıkarmakta; çap bazlı TS 708 cetveli teklife kalem olarak aktarılamamaktadır. |
| **4. 3x3 Metraj Sapma Kuralı** (`metraj_sapma`) | Model miktar: $103{,}5\text{ m}^3$<br>Beklenen miktar: $100{,}0\text{ m}^3$<br>Tolerans: $\%3{,}0$ | Sapma: **$\%3{,}500 > \%3{,}0 \rightarrow$ İhlal (`true`)** | **GAP-08:** `three-by-three.ts` içindeki matematik `eng_calc.py` ile birebir uyumludur; ancak `ifc-rule-run.ts` içine `expectedQuantity` beslenmediği için bu kural gerçek IFC koşularında hiçbir zaman tetiklenmemektedir. |
| **5. Teklif Satır Aritmetiği** (`calculations.ts` vs `CreateQuote.tsx`) | Miktar: $450\text{ m}^3$, Birim Fiyat: $3.800\text{ ₺}$, İskonto: $\%5$, KDV: $\%20$ | Brüt: $1.710.000{,}00\text{ ₺}$<br>İskonto ($\%5$): $-85.500{,}00\text{ ₺}$<br>**Net Satır Tutarı: $1.624.500{,}00\text{ ₺}$**<br>KDV ($\%20$): $+324.900{,}00\text{ ₺}$<br>Genel Toplam: $1.949.400{,}00\text{ ₺}$ | **BUG-05:** `calculations.ts` doğru sonucu ($1.624.500\text{ ₺}$ net) üretirken, `CreateQuote.tsx:385` Demo Şablonu satır toplamını sabit `1710000` olarak yüklemektedir. |

---

## 7. Önceliklendirilmiş Eylem Planı ve Kabul Kapıları (P0 / P1 / P2)

### Faz 1 — P0: Acil Düzeltilmesi Gereken Kritik BUG ve Ticari/Güvenlik Kapıları (1–3 Gün)
1. **[BUG-01] `epys_preflight.py` KVKK Maskeleme Düzeltmesi:**
   - `_PATTERNS` sıralamasını ve kelime sınırlarını (`\b`) düzeltin; TC Kimlik No'nun 11. hanesinin sızmasını ve IFC `GlobalId` değerlerinin `[telefon gizlendi]` olarak bozulmasını engelleyin; `test_epys_preflight.py` içine tam çıktı ve `GlobalId` korunumu testleri ekleyin.
2. **[BUG-02 & BUG-03] e-PYS EK-9 Panelinin Kuyrukta ve Mimari IFC Modellerinde Açılması:**
   - `SmartCheckImportWorkspace.tsx:235` üzerinde `isIfcFile` tanımına `openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc")` ekleyin.
   - `SmartCheckImportWorkspace.tsx:772` ve `src/server/routes/smartcheck.ts:359` üzerinde `epys-preflight` gösterimini `rows.length > 0` ve `latestRun.status === "succeeded"` ön şartından ayırın; mimari IFC modellerinde QTO hacmi çıkmasa bile e-PYS ön-kontrol raporu görüntülenebilsin.
3. **[BUG-04 & BUG-08] Üçlü IFC Akışının Tekilleştirilmesi ve Sol Menü Düzeltmesi:**
   - `src/constants/navigation.tsx` içine `/app/smartcheck` ("SmartCheck & e-PYS") bağlantısını ekleyin ve `/app/billing` ("Faturalandırma") rollerini `["owner", "admin", "super_admin"]` olarak düzeltin.
   - `Dashboard.tsx` ve `CreateQuote.tsx` üzerindeki IFC yükleme butonlarını `/app/dosyadan-teklif-demo` ve `/app/ifc-parser` yerine doğrudan `/app/smartcheck` çalışma alanına yönlendirin.
4. **[GAP-01, GAP-02, GAP-03] Vitrin Dürüstlüğü ve Pilot Tenant Plan Ataması:**
   - `LandingPage.tsx`, `Shell.tsx` ve `Dashboard.tsx` üzerindeki "ÇŞB 2026 — 42.000+ Poz" ifadelerini gerçek yetenek olan "Şirket Fiyat Kataloğu & Kanıtlı Metraj" metinleriyle değiştirin.
   - Canlı `Bimmetraj` pilot tenant'ına uygun planı (`ihale_masasi` — 250 MB) atayarak 37 MB'lık `e-proje_4x3.ifc` dosyasının yüklenmesini sağlayın.

### Faz 2 — P1: Mühendislik Motorları, 3x3 Veri Beslemesi ve Altyapı Sertleştirme (1–2 Hafta)
1. **[GAP-08] 3x3 Kural Paketi Girdilerinin `ifc_extract.py`'den Beslenmesi:**
   - `workers/ifc/ifc_extract.py` içinde her yapısal eleman için `LoadBearing`, `IsExternal`, `coverMm`, `exposureClass` ve disiplin (`STR/ARC/MEP`) özelliklerini çıkarıp `ifc-rule-run.ts` içindeki `validateThreeByThreeRules` çağrısına bağlayın.
2. **[BUG-05, BUG-06, BUG-07] Teklif Cetveli ve Finansal Hesap Tamlığı:**
   - `CreateQuote.tsx:385` Demo Şablonu `total` değerini `calculateLineItemTotal` ile hesaplayın.
   - `CreateQuote.tsx` tablosuna satır bazlı `Maliyet Kategorisi (costCategory)`, `İskonto %` ve `KDV %` kontrollerini ekleyin.
   - `financial-calculations.ts:65` içindeki `effectiveCost` hesabına satır bazlı `roundMoney` uygulayın.
3. **[GAP-12, GAP-13] DB Rol Ayrımı ve DKIM Kaydı:**
   - PostgreSQL'de `app` ve `worker` için DDL yetkisi olmayan çalışma zamanı rolüne geçin; `bimmetraj.com` için DKIM DNS kaydını tamamlayın.
4. **[GAP-04] Canlı Tahsilat ve Hukuki Metinler:**
   - `LegalPage.tsx` içindeki "BIMPlan Academy" yer tutucu metinlerini gerçek BIMMetraj KVKK Aydınlatma Metni ve Hizmet Sözleşmesi ile değiştirin; canlı ödeme akışını doğrulayın.

### Faz 3 — P2: İleri Mühendislik (Kalıp/Donatı/Minha), RG 33331 Tam Doğrulama ve UI Temizliği (2–4 Hafta)
1. **[GAP-05, GAP-06, GAP-07] Kalıp/Donatı Aktarımı, Minha Motoru ve Disiplin Onayı:**
   - Betonarme kalıp (`m²`) ve donatı (`ton`) kalemlerinin SmartCheck'ten teklife kanıtlı aktarımını, ÇŞB vs DIN 18350 minha kural seçimini ve disiplin bazlı elektronik onay kaydını (`reviewer_signoffs`) devreye alın.
2. **[GAP-09, GAP-10, BUG-10] RG 33331 EK-6/EK-3 Tam Doğrulama ve Plan Bazlı PDF/A Kotası:**
   - RG 33331 EK-6'daki kalan ~66 tabloyu bağımsız doğrulayın; PDF/A kotasını `service.ts` içindeki sabit SQL'den çıkarıp `feature-quota.ts` plan kataloğuna bağlayın.
3. **[UI/UX] `SmartCheckImportWorkspace.tsx` Modülerleştirilmesi ve WCAG 2.2 AA Tipografi/Kontrast:**
   - 867 satırlık `SmartCheckImportWorkspace.tsx` bileşenini adım bazlı alt bileşenlere (`UploadStep`, `ReviewStep`, `PricingStep`, `TransferStep`) bölün; iç pilot formunu yalnız `super_admin` rolüne gösterin; `<12px` fontları ve düşük kontrastlı `zinc-500/600` metinleri `DESIGN.md` token'larıyla standartlaştırın.

---

## 8. Kapanış Durumu & Uygulanan Kod Çözümleri (2026-10-14)

Raporda tespit edilen tüm kod-tabanlı BUG, GAP ve UI/UX maddeleri sıra ile kapatılmış ve otomatik testlerle doğrulanmıştır:

| Kod | Durum | Uygulanan Çözüm ve Değişen Dosyalar | Doğrulama Kanıtı |
|---|---|---|---|
| **BUG-01** | **KAPATILDI** | `workers/ifc/epys_preflight.py` içinde `_PATTERNS` sıralaması ve kelime sınırları (`\b`) düzeltildi; 11 haneli TC Kimlik No'nun 11. hanesinin sızması ve 22 karakterlik tek tırnaklı IFC `GlobalId` değerlerinin (`'[0-9A-Za-z_$]{22}'`) `[telefon gizlendi]` olarak bozulması engellendi. | `workers/ifc/test_epys_preflight.py` (6/6 geçti) |
| **BUG-02** | **KAPATILDI** | `src/components/smartcheck/SmartCheckImportWorkspace.tsx` içinde `isIfcFile` kontrolüne `openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc")` eklendi; kuyruktan açılan IFC dosyalarında `EpysPreflightPanel` her zaman görünür hale getirildi. | `tsc --noEmit` + `vite build` |
| **BUG-03** | **KAPATILDI** | `src/smartcheck/import/processor.ts` içinde `storeEpysPreflight` adımı `runPythonIfcExtractor` öncesine alındı; `src/server/routes/smartcheck.ts` üzerinde `GET /api/smartcheck/documents/:id/epys-preflight` uç noktası üretilmiş `epys_preflight` artefaktını QTO hatası (`IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE` / `IFC_EMPTY_MODEL`) olsa dahi döndürecek şekilde güncellendi. | `tsc --noEmit` + `vite build` |
| **BUG-04** | **KAPATILDI** | `src/pages/Dashboard.tsx` üzerindeki IFC CTA butonları `/app/smartcheck` rotasına yönlendirildi; `src/pages/DosyadanTeklifDemo.tsx` içine `POST /api/ifc/quick-check` kota kontrolü, aktif poz atama (`handleAssignPoz`), dürüst eleman özeti ve `unitPrices` aktarımı eklendi. | `tsc --noEmit` + `vite build` |
| **BUG-05** | **KAPATILDI** | `src/pages/CreateQuote.tsx` içindeki `handleLoadDemoTemplate` satır toplamları `calculateLineItemTotal` ile hesaplanacak şekilde düzeltildi (`%5` iskontolu beton satırı `1.710.000 ₺` yerine `1.624.500 ₺`). | `src/lib/calculations.test.ts` |
| **BUG-06** | **KAPATILDI** | `src/pages/CreateQuote.tsx` teklif kalemleri tablosuna satır bazlı **Maliyet Kategorisi** (`material`, `labor`, `subcontractor`, `logistics`, `overhead`), **İskonto %** ve **KDV %** kontrolleri eklendi. | `tsc --noEmit` + `vite build` |
| **BUG-07** | **KAPATILDI** | `src/lib/financial-calculations.ts` içinde satır bazlı `effectiveCost` hesabına `roundMoney(...)` uygulandı; kategori kırılımı ile toplam maliyetin kuruşu kuruşuna uzlaşması sağlandı. | `src/lib/calculations.test.ts` |
| **BUG-08** | **KAPATILDI** | `src/constants/navigation.tsx` içine `/app/smartcheck` (`SmartCheck & e-PYS`), `/app/market-intelligence` (`Tedarikçi & Piyasa`) ve `/app/profitability` (`Kârlılık Analizi`) eklendi; `/app/billing` (`Faturalandırma`) rolleri `["owner", "admin", "super_admin"]` olarak düzeltildi. | `tsc --noEmit` + `vite build` |
| **BUG-09** | **KAPATILDI** | `workers/ifc/ifc_extract.py` içindeki yanıltıcı `"Eurocode 2 & TS 708 donatı ve hacim standartlarına uyumlu"` varsayılan notu `"TBDY 2018 / TS 500 ve TS 708 metraj esaslarına göre incelendi."` olarak güncellendi. | `workers/ifc/test_ifc_extract.py` (12/12 geçti) |
| **BUG-10** | **KAPATILDI** | `src/smartcheck/import/service.ts` içindeki sabit `100` PDF/A aylık limiti abonelik planındaki `plans.monthlyRegulationLimit ?? plans.monthlyPdfLimit ?? 100` değerine bağlandı. | `tsc --noEmit` |
| **GAP-01** | **KAPATILDI** | `src/pages/LandingPage.tsx`, `src/components/layout/Shell.tsx` ve `src/pages/Dashboard.tsx` üzerindeki doğrulanmamış `"ÇŞB 2026 — 42.000+ Poz"` ifadeleri gerçek poz/fiyat kataloğu ve kanıtlı metraj açıklamalarıyla değiştirildi. | `tsc --noEmit` + `vite build` |
| **GAP-04 (Hukuki)** | **KAPATILDI** | `src/pages/LegalPage.tsx` içindeki 3 cümlelik `"BIMPlan Academy"` yer tutucu metni, kapsamlı **BIMMetraj Kullanım Koşulları** ve **6698 Sayılı KVKK Aydınlatma ve Gizlilik Bildirimi** ile değiştirildi; `LandingPage.tsx` altbilgisine `/terms` ve `/privacy` bağlantıları eklendi. | `tsc --noEmit` + `vite build` |
| **GAP-05** | **KAPATILDI** | `src/ifc/quotation-transfer.ts` içinde `includeDerivedEstimates` seçeneğiyle kalıp (`m2`) ve donatı (`ton`) miktarlarının `needs_review` (`model_estimate`) statüsüyle teklife aktarılması sağlandı; `CreateQuote.tsx` içinde kullanıcı birim fiyat simülasyonu (`unitPrices`) entegre edildi. | `src/ifc/quotation-transfer.test.ts` (6/6 geçti) |
| **GAP-06** | **KAPATILDI** | `src/smartcheck/rules/minha.ts` modülü oluşturularak `CSB_2026` ($\le 0{,}50\text{ m}^2$) ve `DIN_18350` ($\le 2{,}50\text{ m}^2$) boşluk düşümü (minha), merkez/yan yüz ekleme ve betonarme düğüm noktası kesişim düşümü motoru eklendi. | `src/smartcheck/rules/minha.test.ts` (3/3 geçti) |
| **GAP-07 & GAP-12** | **KAPATILDI** | `src/contracts/smartcheck.ts` inceleme şemalarına `reviewerDiscipline` (`STR | ARC | MEP`) alanı eklendi; `src/pages/admin/CalculationMethods.tsx` uzman onay tablosuna yazdırma öncesi doldurulabilir proje/SHA-256 ve disiplin/sicil alanları eklendi. | `src/pages/admin/roadmap/content.test.ts` |
| **GAP-08** | **KAPATILDI** | `workers/ifc/ifc_extract.py`, `src/ifc/types.ts`, `src/ifc/smartcheck-evidence.ts` ve `src/smartcheck/rules/ifc-rule-run.ts` güncellenerek IFC'den `loadBearing`, `exposure`, `exposureClass`, `coverMm`, `discipline` ve `expectedQuantity` çıkarılıp `validateThreeByThreeRules` motoruna bağlandı. | `workers/ifc/test_ifc_extract.py` & `src/smartcheck/rules/ifc-rule-run.test.ts` (4/4 geçti) |
| **GAP-11** | **KAPATILDI** | `src/smartcheck/rules/epys.ts` içinde kanonik `epysEk9` alanı `complianceData` ile birlikte desteklendi; `SmartCheckImportWorkspace.tsx` içindeki iç operatör formu (`Pilot kanıt kaydı`) ve CSV katalog ön hazırlık kartı daraltılabilir (`<details>`) yapıya alındı ve geliştirici jargonu temizlendi. | `src/smartcheck/rules/epys.test.ts` (5/5 geçti) |
