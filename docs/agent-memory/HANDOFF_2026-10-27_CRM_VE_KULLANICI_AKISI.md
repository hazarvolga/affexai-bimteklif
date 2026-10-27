# Handoff & Uygulama Planı: Canlı Sürüm (`Rev. 105`), CRM / Müşteriler Yeniden Kurgusu ve Son Kullanıcı Deneyimi Notları

**Tarih:** 2026-10-27  
**Canlı Sürüm (Production):** `2cd6fc57ed1822a28eaa91d4c0ee3feaab4ec56a` (`Rev. 105` / `BIM-CALC-2026-10-27.99`)  
**Canlı Ortam:** `https://bimmetraj.com` (Coolify `ibjv2zbpecdcbd71lxo1vqd7` / `affexai-prod`)  
**GitHub Actions `Verify` CI:** Run `40507902186` — `%100 PASS` (`verify` + `e2e`)  
**Restore Point Etiketi (Git Tag):** `restore-point-2026-10-27-rev105-crm-plan`

---

## 1. Tamamlanan ve Canlıya Alınan Paketler (`Rev. 102` → `Rev. 105`)

1. **Rev. 102 (`BIM-CALC-2026-10-27.96`) — 4 Katmanlı Türkiye Müteahhit Excel Çoklu Arketip Adaptörü:**
   - `flat_table`, `multi_header_pivot`, `repeating_block_boq` ve `hybrid_summary_and_blocks` arketiplerini otomatik tanıyan motor (`src/smartcheck/import/spreadsheet-parser.ts` ve `src/lib/quote-excel-import.ts`).
   - `ignoreNodes: ['mergeCells']` + span genişletme ile 46.588 birleşik hücreli dosyalarda 90 saniyeden 468 ms'ye inen ayrıştırma hızı.
   - Firma Şablon Hafızalı Görsel Eşleştirme Stüdyosu (`src/components/smartcheck/SmartCheckImportWorkspace.tsx`) ve sentetik test korpusu (`src/smartcheck/import/contractor-excel-corpus.test.ts`). *(Not: `/Users/hazarvolgaekiz/dev/lab/ALLPLAN-Eklentiler` repo dışında tutulur, asla commit edilmez).*
2. **Rev. 103 (`BIM-CALC-2026-10-27.97`) — `/admin/pricing-sources`, Crawler Yetki Kanıt Zinciri ve TÜİK SDMX 2.1 Entegrasyonu:**
   - Kanonik fiyat kaynaklarının otomatik tohumlanması ve `/api/admin/pricing-sources/sync-catalog` rotası.
   - `authorizationStatus = 'authorized'` ve 64-hex SHA-256 `authorizationEvidenceHash` kanıt zinciri.
   - TÜİK Veri Portalı SDMX 2.1 adaptörü (`src/server/crawler/tuik-sdmx-adapter.ts` — `DF_IME`, `DF_YI_UFE`, `DF_TUFE`).
3. **Rev. 104 (`BIM-CALC-2026-10-27.98`) — 6 Aşamalı Güvenlik Denetimi Bulgularının Kapatılması:**
   - Academy admin yetki kontrolü, Hakediş (`ProgressPaymentService`) ve Fiyat/Piyasa İstihbaratı maker-checker (dört göz) ilkesi, CDE rol sınırları, impersonation salt-okunur kilidi, IFC/PDF/AI girdi sınırları ve `bimmetraj_worker` ACL sıkılaştırması (`src/server/security/security-audit-remediation.test.ts`).
4. **Rev. 105 (`BIM-CALC-2026-10-27.99`) — `CalmIfcWorkspace` Modüler Ayrıştırması (`PR #31`) & `T43` Kapsam Kapısı:**
   - `src/components/smartcheck/CalmIfcWorkspace.tsx` dosyasının `2.004` satırdan `795` satıra (12 alt modüle) bölünmesi ve `T43` kapsam eşiklerinin (`83.13%` satır kapsamı) doğrulanması.

---

## 2. Aktif Sıradaki Paket (Paket A): Müşteriler (`/app/clients`) & Müşteriler ve Fırsatlar (`/app/crm`) Birleşik Akışı + 3 Katmanlı Akıllı Müşteri Excel Adaptörü

### 2.1. Tespit Edilen Mevcut UI/UX ve Mimari Sorunlar
1. **Menü ve Sayfa Kopukluğu:** Sol menüdeki *"Müşteriler (CRM)"* yalnızca `/app/crm` (`src/pages/CRM.tsx`) sayfasına gidiyor; asıl müşteri yönetimi olan `/app/clients` (`src/pages/Clients.tsx`) sol menüde yer almıyor.
2. **Birbiriyle Konuşmayan 3 Tablo (`clients`, `leads`, `deals`):**
   - `/app/clients` sayfasında *"Yeni Potansiyel (`lead`)"* olarak kaydedilen müşteri `clients` tablosuna yazılıyor; `/app/crm` altındaki *"Lead Havuzu"* sekmesi ise sadece `leads` tablosunu okuduğu için eklenen potansiyel müşteriler orada görünmüyor.
   - `/app/crm` üzerinde *"Lead Havuzu"* sekmesinde yeni aday ekleme veya fırsata/teklife dönüştürme aksiyonu bulunmuyor.
   - `/app/crm` açılışında `Promise.all` içinde tek bir uç nokta hata verdiğinde tüm ekran *"CRM verileri yüklenemedi"* uyarısıyla kapanıyor.
3. **Salt-Okunur Müşteri Satırları ve Aşama Notu Eksikliği:**
   - `/app/clients` tablosunda kaydedilen bir müşterinin bilgilerini düzenleme (`PATCH /api/clients/:id`), aşamasını (*Potansiyel → Görüşüldü → Teklifli → Pazarlık → Kazanıldı / Kaybedildi*) değiştirme ve her aşama için tarihçeli görüşme/pazarlık notu alma imkânı yok.

### 2.2. Mutabık Kalınan Çözüm ve Uygulama Planı
1. **Sol Menü (`src/constants/navigation.ts`) ve Üst Geçiş Barı:**
   - Sol menüden teknik *"CRM"* kısaltması kaldırılarak:
     - **`Müşteriler`** → `/app/clients` (Ana müşteri portföyü, aşama kartları, Excel/CSV içe-dışa aktarma, hızlı düzenleme çekmecesi).
     - **`Müşteriler & Fırsatlar`** → `/app/crm` (Proje/ihale fırsat panosu ve potansiyel aday havuzu).
   - Her iki sayfanın üst başlığında diğer görünüme tek tıkla geçiş butonu bulunur.
2. **Mantıksal Veri Senkronizasyonu (`clients` ↔ `leads` ↔ `deals`) ve Dayanıklı Yükleme:**
   - `/app/clients` üzerinde **Potansiyel (`lead`)** aşamasındaki müşteriler ile `/app/crm` **Lead Havuzu** birleştirilir/senkronize edilir; böylece `/app/clients` üzerinden eklenen her potansiyel müşteri **Lead Havuzu**'nda da otomatik görünür ve tek tıkla **"Fırsat Aç"** veya **"Teklif Hazırla"** aksiyonuna bağlanır.
   - `/app/crm` üzerindeki **"Yeni Fırsat"** penceresinde henüz müşteri yoksa başka sayfaya yönlendirmek yerine aynı pencere içinde **"+ Hızlı Müşteri Oluştur"** seçeneği sunulur.
   - `CRM.tsx` veri yüklemesi `Promise.allSettled` ile dayanıklı hale getirilir; boş veya kısmi veri durumunda anlamlı boş durum (Empty State) ve aksiyon butonları gösterilir.
3. **Hızlı Düzenleme Çekmecesi (Slide-over Drawer) & Müşteri Detay Sayfası (`/app/clients/:id`):**
   - **Arka Uç (`src/server/routes/clients.ts`):**
     - `GET /api/clients/:id` (müşteri detayı + aşama notları tarihçesi + bağlı fırsatlar ve teklifler)
     - `PATCH /api/clients/:id` (iletişim bilgileri, tip, aşama ve not güncelleme)
     - `POST /api/clients/:id/notes` (`Potansiyel`, `Görüşüldü`, `Teklifli`, `Pazarlık`, `Kazanıldı`, `Kaybedildi` aşama etiketli tarihçeli süreç notu ekleme)
     - `POST /api/clients/bulk-import` (çoklu müşteri içe aktarma ve mükerrer kayıt güncelleme/atlama)
   - **Ön Yüz (`src/pages/Clients.tsx` & `src/pages/ClientDetail.tsx`):**
     - Tablo satırına tıklandığında sağdan açılan **Hızlı Düzenleme Çekmecesi (Slide-over Drawer)** ile anında iletişim bilgisi ve aşama güncelleme + hızlı aşama notu ekleme.
     - **"Detaylı Müşteri Kartı (`/app/clients/:id`)"** sayfasında:
       - Sol panel: Düzenlenebilir iletişim/cari bilgileri + **"Bu Müşteriye Teklif Hazırla (`/app/quotes/new?clientId=...`)"** ve **"+ Yeni Fırsat Aç"** butonları.
       - Orta panel: 6 aşama (*Potansiyel, Görüşüldü, Teklifli, Pazarlık, Kazanıldı, Kaybedildi*) seçerek tarihçeli **Süreç & Görüşme Notları (Timeline)** alma ve filtreleme.
       - Sağ/Alt panel: Bu müşteriye bağlı **Fırsatlar** ve **Verilen Teklifler** listesi.
4. **3 Katmanlı Akıllı Müşteri Excel / CSV Adaptörü (`src/lib/client-excel-import.ts`):**
   - **Katman 1 (Akıllı Başlık Tarama & Eşanlamlılar Sözlüğü):** İlk 30 satırda başlık tarama, birleşik hücre (`mergeCells`) çözme; muhasebe/cari çıktıları (`Cari Ünvan`, `Vergi No`, `Tel-1`, `GSM`, `E-Mail`), şantiye/ihale takip listeleri (`İşveren`, `İdare`, `İlgili Kişi`, `Son Durum`), dış CRM/rehber çıktıları (`First Name` + `Last Name`, `Company`, `Work Email`, `Mobile Phone`) için otomatik başlık ve aşama (`Potansiyel / Görüşüldü / Teklifli / Pazarlık / Kazanıldı / Kaybedildi`) eşleştirme; ünvandan otomatik `Şirket` (`Ltd`, `A.Ş.`, `İnşaat`, `Yapı`, `Belediyesi` vb.) / `Bireysel` algılama.
   - **Katman 2 (Hücre Desen Tanıma & Sıfır Veri Kaybı):** Başlık belirsiz olsa bile `@` deseninden e-posta, `+90 / 05xx / 02xx` deseninden telefon sütununu bulma; standart dışı ekstra sütunları (`Proje Adı`, `İlgili Kişi`, `Vergi Dairesi`, `Referans` vb.) kaybetmeyip müşterinin ilk süreç notuna etiketli olarak ekleme.
   - **Katman 3 (Görsel Sütun Eşleştirme Önizlemesi + Hazır Şablon İndirme + Dışa Aktarma):**
     - `/app/clients` üzerinde **`Örnek Şablon İndir (.xlsx / .csv)`**, **`Excel / CSV Yükle`** (Önizleme & Sütun Eşleştirme modalı + mükerrer e-posta/isim kontrolü) ve **`Dışa Aktar (.xlsx)`** özellikleri.

---

## 3. Tamamlanan Takip Paketi (Paket B — `Rev. 107` / `BIM-CALC-2026-10-28.101`): `CreateQuote.tsx` AI Teklif Sihirbazı, Excel-Öncelikli Akış Koruması ve 3 Adımlı Tamamlama Rehberi

Son kullanıcı testi sırasında tespit edilen kayıtlar `Rev. 107` kapsamında uçtan uca kapatıldı:

1. **Kök Neden (`src/pages/CreateQuote.tsx` satır 381–420):**
   - `generateWithAi` fonksiyonu `/api/ai/generate-quotation` çağrısında `if (!res.ok)` kontrolü yapmıyordu.
   - Sunucuda AI API anahtarı (`GEMINI_API_KEY` / `OPENAI_API_KEY`) tanımlı olmadığında dönen `500` yanıtı hata bloğuna düşmüyor; `data.lineItems` tanımsız olduğu için `setItems([])` çalışarak **kullanıcının az önce Excel'den yüklediği iş kalemlerini siliyor** ve yanlışlıkla `toast.success('AI Zekası ile kalemler ve risk analizi oluşturuldu!')` mesajı gösteriyordu.
2. **Uygulanan Çözüm (`Rev. 107`):**
   - `generateWithAi` içinde `!res.ok || !Array.isArray(data?.lineItems) || data.lineItems.length === 0` durumunda hata mesajı gösterilerek mevcut `items` listesinin **asla ezilmemesi** sağlandı; gerçek AI yanıtı geldiğinde ise mevcut dolu satırlar korunarak yeni satırlar listeye eklenir.
   - Kullanıcı sayfaya `?kaynak=excel` ile geldiğinde veya Excel/Demo kalemleri yüklendiğinde `QuoteAiWizard` varsayılan olarak daraltılmış (`collapsedByDefault`) açılır.
   - `AIService.isConfigured()`, `GET /api/ai/status` ve `GET /api/ai/industries` (`X-AI-Configured` başlığı) ile sunucuda AI sağlayıcısı yapılandırılmamışsa `QuoteAiWizard` üzerinde dürüst bilgilendirme rozeti gösterilir ve buton devre dışı bırakılır.
   - `handleLoadDemoTemplate` içindeki geçersiz `'demo-client-id'` kaldırıldı; `QuoteSidebar.tsx` içine sayfadan ayrılmadan **`+ Hızlı Müşteri Ekle`** mini-formu ve `QuoteNextStepsBanner.tsx` içine **3 Adımlı Tamamlama Rehberi (`1. Müşteri & Proje Adı → 2. Birim Fiyat & Maliyet → 3. Kaydet & PDF / Hakediş`)** eklendi.
