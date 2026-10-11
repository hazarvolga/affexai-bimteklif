# Faz 0: Güvenlik Ağı ve UI Envanteri

**Tarih:** 11 Ekim 2026  
**Dal (Branch):** `ui/redesign-v2`  
**Amaç:** Mevcut çalışan sistemin tüm rotalarını, kullanıcı akışlarını, sözleşmelerini, test sonuçlarını ve ekran görüntüsü tabanını belgeleyerek yeniden tasarım sürecini güvenli bir temele oturtmak.

---

## 1. Rota ve Sayfa Envanteri

Uygulamadaki tüm rotalar (`src/App.tsx` ve `src/constants/navigation.tsx`) 3 ana grupta sınıflandırılmıştır:

### A. Herkese Açık Yüzeyler (Public Routes)
| Rota | Bileşen | Amaç | Korunacak Sözleşmeler |
|---|---|---|---|
| `/` | `LandingPage` | Ana ürün tanıtımı, CTA, 14 günlük deneme ve pilot başvurusu | `onGetStarted`, `onPilotRequest` navigasyon akışları |
| `/about`, `/pricing`, `/features` | `LandingPage` | Ürün detayları ve fiyatlandırma sekmesi | URL rotaları ve sayfa içi hedefleme |
| `/academy` | `PublicAcademy` | Açık akademi kataloğu ve eğitim önizlemeleri | `/academy/:slug` parametrik geçişi |
| `/academy/complete` | `CompleteAcademyContent` | Tam akademi modül listesi | Modül kimlikleri |
| `/academy/allplan/*` | `AllplanAccessGate` | Allplan eğitimleri kapı ekranı | `pathSlug`, `lessonSlug` parametreleri |
| `/academy/:slug` | `PublicAcademyDetail` | Ders detay ve önizleme | Dinamik `:slug` |
| `/pilot` | `PilotApplication` | Pilot başvuru formu | Form alan adları (`fullName`, `companyName`, `email`, `phone`, `role`) |
| `/login` | `Login` | Giriş formu | `email`, `password`, demo/test yönlendirmeleri |
| `/register` | `Register` | Kayıt formu | Şirket adı, ad-soyad, e-posta, parola alanları |
| `/terms`, `/privacy` | `LegalPage` | Hukuki metinler (KVKK, Hizmet Sözleşmesi) | Statik içerik metinleri |
| `/forgot-password`, `/reset-password/:token` | `PasswordRecovery` | Parola kurtarma ve sıfırlama | `:token` parametresi |
| `/accept-invite/:token` | `AcceptInvite` | Şirket davet kabulü | `:token` parametresi |
| `/verify-email/:token` | `VerifyEmail` | E-posta doğrulama | `:token` parametresi |

### B. Tenant Çalışma Alanı (Korumalı `/app/*` Rotaları)
| Rota | Bileşen | Görev ve Kritik Kullanıcı İşi | Veri ve Etkileşim Sözleşmeleri |
|---|---|---|---|
| `/app` | `Dashboard` | Teklif metrikleri, son teklifler, bekleyen işler | Hızlı teklif butonu, KPI kartları |
| `/app/quotes` | `Quotes` | Teklif arşivi, arama, filtreleme, durum takibi | Durum rozetleri (`draft`, `sent`, `approved`, `rejected`), sayfalama |
| `/app/quotes/new` | `CreateQuote` | Yeni teklif oluşturma, metraj cetveli, kalem ekleme, marj hesabı | Poz kodu, miktar, birim fiyat, zayiat %, KDV %, kar marjı %, rayiç drawer'ı |
| `/app/quotes/:id` | `QuoteDetail` | Teklif inceleme, revizyon geçmişi, PDF önizleme/indirme | PDF indirme tetikleyicisi, onay butonu |
| `/app/quotes/:id/edit` | `CreateQuote` | Mevcut teklifi düzenleme | `:id` parametresi, satır içi düzenleme state'i |
| `/app/smartcheck` | `SmartCheck` | IFC/Excel yükleme, kural denetimi, kanıt inceleme, teklife aktarım | Dosya yükleme dropzone'u, bulgu listesi, onay kapısı |
| `/app/smartcheck/checks/demo` | `SmartCheckDemo` | Örnek model ve kural denetim vitrini | Kural kartları, tolerans göstergeleri |
| `/app/ifc-parser` | `BimIfcParserPage` | Tarayıcı içi IFC ayrıştırma ve geometri/hacim önizleme | 3D/2D önizleme alanı, IFC kat tablosu |
| `/app/clients` | `Clients` | Müşteri firmalar ve yetkili rehberi | Müşteri ekleme/düzenleme modalı |
| `/app/crm` | `CRM` | Teklif aşamaları (Kanban / Liste) | Fırsat kartları, aşama sürükleme |
| `/app/crm/deals/:id` | `DealDetail` | Fırsat detay ve teklif ilişkisi | Teklif bağlama akışı |
| `/app/regulations` | `Regulations` | Mevzuat arşivi, e-PYS maddeleri, resmi gazete taraması | Mevzuat arama ve uyarı filtreleri |
| `/app/market-intelligence` | `MarketIntelligence` | ÇŞB rayiçleri ve piyasa emtia fiyat endeksleri | Emtia grafikleri ve fiyat listeleri |
| `/app/profitability` | `Profitability` | Karlılık, maliyet analizi, sapma grafikleri | Kar marjı metrikleri |
| `/app/settings` | `Settings` | Şirket profili, vergi bilgisi, bölge & uluslararası standartlar | TR/DE/GB/US/AE presetleri, birim sistemi seçimi |
| `/app/academy` | `Academy` | Entegre eğitim ve kılavuzlar | Modül ve ders kartları |
| `/app/academy/content/:slug` | `LessonViewerPage` | Ders okuma ve interaktif kontrol | `:slug` parametresi, ders tamamlama butonu |

### C. Süper Admin Platform Yönetimi (`/admin/*`)
| Rota | Bileşen | Görev |
|---|---|---|
| `/admin` | `AdminDashboard` | Platform geneli kiracı, kuyruk, MRR ve sistem sağlık metrikleri |
| `/admin/tenants` | `TenantsList` | Kayıtlı tüm inşaat firmaları listesi, arama ve filtreleme |
| `/admin/tenants/:companyId` | `TenantDetail` | Firma detayı, lisans, kota, impersonation (firmaya giriş) butonu |
| `/admin/queue` | `AdminQueue` | Arka plan IFC ve Excel ayrıştırma iş kuyruğu takibi |
| `/admin/pricing-sources` | `PricingSources` | ÇŞB ve piyasa fiyat kaynakları, tarama zamanlayıcısı |
| `/admin/plans` | `PlansList` | 5 standart abonelik paketi ve limit yönetimi |
| `/admin/reports` | `AdminReports` | Platform gelir ve kullanım raporları |
| `/admin/logs` | `AdminLogs` | Süper admin ve kiracı denetim logları |

---

## 2. Temel Kullanıcı Akışları (User Journeys)

1. **Akış 1: Hızlı Teklif Oluşturma & Marj Koruma:**
   - Panel (`/app`) $\rightarrow$ "Yeni Teklif" butonu $\rightarrow$ Müşteri seçimi $\rightarrow$ Kalem ekleme (Poz no, açıklama, miktar, birim fiyat) $\rightarrow$ Canlı rayiç drawer'ından piyasa fiyatı çekme $\rightarrow$ Kar marjı ve KDV hesaplama $\rightarrow$ Kaydet $\rightarrow$ PDF indir / Paylaş.
2. **Akış 2: BIM / IFC Metrajı ve SmartCheck Kalite Denetimi:**
   - SmartCheck (`/app/smartcheck`) $\rightarrow$ IFC dosyası yükle $\rightarrow$ Arka plan ayrıştırma $\rightarrow$ buildingSMART formwork & TS 708 donatı bulgularını incele $\rightarrow$ Kanıtı gör $\rightarrow$ İnsan onayı / İstisna onayı ver $\rightarrow$ Doğrulanmış metrajı teklif kalemlerine aktar.
3. **Akış 3: Bölgesel Standart & Veritabanı Yönetimi:**
   - Ayarlar (`/app/settings`) $\rightarrow$ Bölge seçimi (Örn: Türkiye ÇŞB + TBDY 2018 veya Almanya DIN 276 + Eurocode 2) $\rightarrow$ Kaydet $\rightarrow$ Veritabanı güncellenir $\rightarrow$ Hesap motoruna yansır.

---

## 3. Güvenlik Ağı: Mevcut Test ve Derleme Kanıtları

Yeni tasarıma geçmeden önceki mevcut kod tabanının sağlamlık kanıtları:

- **TypeScript / Linter:** `pnpm lint` $\rightarrow$ **0 hata** (Temiz).
- **Node.js Test Paketi:** `pnpm test` $\rightarrow$ **792 geçen**, 0 kalan (5 harici servis mock atlaması).
- **Python IfcOpenShell Worker:** `pytest workers/ifc` $\rightarrow$ **11 / 11 geçen** (1.27s).
- **Üretim Derlemesi:** `pnpm run build` $\rightarrow$ Vite SPA 3.79s + `dist/server.cjs` (802 KB) + `dist/spreadsheet-worker.cjs` (143 KB).
- **Doğrulama Komutu:** `pnpm run verify` $\rightarrow$ **Exit Code 0 (Başarılı)**.

---

## 4. Ekran Görüntüsü Tabanı (Baseline Screenshots)

`scripts/ui-baseline-capture.ts` çalıştırılarak 8 ana yüzeyde ve 4 farklı viewport'ta (`360px`, `768px`, `1280px`, `1920px`) toplam **32 adet temel ekran görüntüsü** `./output/ui-baseline/` dizinine kaydedilmiştir:

- `landing-*` (360px, 768px, 1280px, 1920px)
- `login-*` (360px, 768px, 1280px, 1920px)
- `public-academy-*` (360px, 768px, 1280px, 1920px)
- `app-dashboard-*` (360px, 768px, 1280px, 1920px)
- `app-quotes-list-*` (360px, 768px, 1280px, 1920px)
- `app-quotes-new-*` (360px, 768px, 1280px, 1920px)
- `app-settings-*` (360px, 768px, 1280px, 1920px)
- `app-smartcheck-*` (360px, 768px, 1280px, 1920px)
