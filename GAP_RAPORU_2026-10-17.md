# BIMMetraj (TeklifPro) GAP Raporu — 17 Ekim 2026 (Rev. 2)

**Karar:** `f7aa3d5` ile ilk revizyondaki iki P0 (sahte IFC metrajı, pilot formunda kişisel veri ifşası) **kapandı** ve canlıya çıktı. Auth testlerinin gizli DB bağımlılığı ve müşteri dosyalarının repoya girme riski de giderildi. Kalan en önemli konular artık kod hatası değil, **vitrinde kodda karşılığı olmayan iddialar** (KİK aşırı düşük teklif analizi, PDF/A-1b rapor, ISO 19650 uyumu, 4,00 m² minha eşiği), **arama motorlarına ve AI tarayıcılarına görünmeyen SPA içeriği**, **deploy sırasında yaşanan kesinti** ve **yarım kalmış tasarım sistemi göçü**.

Bu rapor yalnız analizdir; kodda değişiklik yapılmamıştır.

| Revizyon | Tarih | Kapsam |
| --- | --- | --- |
| Rev. 1 | 17 Ekim 2026 | `a78e6f9` üzerinde ilk analiz, bulgular Y-1…Y-12 |
| Rev. 2 | 17 Ekim 2026 | `f7aa3d5` düzeltmelerinin doğrulanması; BUG, UI, UX, Güvenlik, SEO ve GEO başlıklarıyla genişletme |

---

## 1. Kapsam ve yöntem

| Alan | Yapılan |
| --- | --- |
| Kaynak | `main` @ `f7aa3d5`; çalışma ağacı temiz (commit edilmemiş kod yok) |
| Statik kontrol | `tsc --noEmit`, `vite build` |
| Testler | `tsx --test "src/**/*.test.ts"` (yerel, izole DB yok), `workers/ifc` Python testleri (`.venv`) |
| Canlı | Anonim `GET`/`HEAD`: `/`, `/api/health`, `robots.txt`, `sitemap.xml`, `llms.txt`, genel sayfalar, olmayan sayfa |
| Vitrin iddiaları | `index.html` JSON-LD, `llms.txt`, Landing metinleri kodla karşılaştırıldı |

---

## 2. Rev. 1 bulgularının kapanış durumu

| ID | Bulgu | Durum | Kanıt / kalan |
| --- | --- | --- | --- |
| **Y-1** | IFC icmali dosya adına göre gömülü veriye dönüyordu | ✅ **Kapandı** | `calm-icmal.ts` içindeki üç `/2026_45/` dalı kaldırıldı; katman yoksa alt başlık "Modelde Çoklu Katman Bilgisi Yok" diyor; `Proje_2026_450_Musteri.ifc` regresyon testi eklendi. Kalan: `buildCalibrated202645Dataset()` (~540 satır gömülü veri) artık yalnız testlerde kullanılıyor, üretim kodunda ölü duruyor (bkz. BUG-4) |
| **Y-2** | Pilot formunda kayıt değiştirme ve kişisel veri dönüşü | ✅ **Kapandı** | Mevcut e-postada yalnız `{ ok, alreadyRegistered: true }` dönüyor, alan üzerine yazılmıyor; yeni kayıtta yalnız `id`. Kalan: 200/201 farkı e-postanın kayıtlı olup olmadığını ele veriyor (SEC-6); ön yüz mesajı hâlâ "bilgileriniz güncellendi" diyor (BUG-1) |
| **Y-3** | Çalışma ağacında başka oturumun commit edilmemiş işleri | ✅ **Kapandı** | Ağaç temiz; değişiklikler `f7aa3d5` içinde |
| **Y-4** | Auth birim testleri gizlice DB'ye bağlı | ✅ **Kapandı** | Abonelik kontrolü `findSubscription` adaptörüne taşındı; DB'siz koşuda auth testleri artık geçiyor. Not: iptal adaptörü verilmezse eskiden reddediyordu, şimdi kabul ediyor (SEC-7) |
| **Y-5** | Müşteri verisi / büyük dosyalar gitignore'da değil | 🟡 **Kısmen** | `melihdinekli/`, `IfcSampleFiles-main/`, `2026_45_*.ifc`, `TeklifPro_*.pdf` yok sayılıyor. Kökte hâlâ izlenen artıklar: `4708.pdf`, `01-ifc-worker-prompt.md`, `02-super-admin-prompt.md`, `admindashboard.MD`, `implementation_plan.md`, `seed-superadmin.*`, `sondurum-eklenenler.md`, `summary.md`, `test-tenants.ts`, `walkthrough.md` |
| Y-6 | Kartla tahsilat yok, `stripe` ölü bağımlılık | 🔴 Açık | `package.json:79`, `src/` içinde kullanım yok |
| Y-7 | E2E test yok | 🔴 Açık | `*.spec.ts` sayısı 0 |
| Y-8 | CSP'de gereksiz Firebase alan adları | 🔴 Açık, genişledi | Firebase hâlâ açık; ayrıca Google Fonts eklendi (bkz. SEC-3) |
| Y-9 | 800 satırı aşan 18 dosya | 🔴 Açık | Değişmedi |
| Y-10 | `any` / `console.log` | 🔴 Açık | 135 `any`, 15 `console.log` |
| Y-11 | `/rows` büyük yanıt | 🟡 Kısmen | `offset` var, ama toplam satır sayısı (meta) dönmüyor; varsayılan 5.000 satır |
| Y-12 | Python testleri sistem Python'unda çalışmıyor | 🔴 Açık | Dokümantasyon güncellenmedi; `.venv` ile 53/53 geçiyor |

**Özet:** 12 maddenin 4'ü tamamen, 2'si kısmen kapandı; 6'sı açık (hepsi P1/P2).

---

## 3. Doğrulama sonuçları (Rev. 2)

| Kontrol | Rev. 1 | Rev. 2 |
| --- | --- | --- |
| `tsc --noEmit` | 0 hata | 0 hata |
| Node test suite | 739 geçti / 52 düştü | **746 geçti / 46 düştü** (804 test). Düşenlerin tamamı izole PostgreSQL olmadığı için bilerek reddedilen entegrasyon testleri; kod kaynaklı düşüş kalmadı |
| Python worker testleri | 53/53 | 53/53 |
| `vite build` | — | Başarılı. Ana paket 462 kB (gzip 139 kB), CSS 242 kB, `charts` 450 kB |
| Canlı revizyon | `a78e6f9` | `f7aa3d5` (`revisionSource: build`) |

Tam doğrulama için CI'daki izole PostgreSQL 16 gerekiyor; burada koşulmadı.

---

## 4. BUG — kod ve davranış hataları

| ID | Önem | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- | --- |
| BUG-1 | P1 | Ön kayıt formu kullanıcıya yanlış bilgi veriyor | [LandingPage.tsx:99-101](src/pages/LandingPage.tsx:99): `alreadyRegistered` iken "bilgileriniz güncellendi" yazıyor; sunucu Y-2 düzeltmesinden sonra hiçbir alanı güncellemiyor | Mesajı "Bu e-posta zaten ön kayıt listesinde" olarak değiştir (veya SEC-6 kapsamında iki durumu aynı mesajla karşıla) |
| BUG-2 | P1 | Deploy sırasında site tamamen kapanıyor | 17 Ekim analizinde `f7aa3d5` deploy'u sırasında `/` ve `/api/health` en az ~1 dakika `503 no available server` döndü | Coolify'da rolling update / healthcheck sonrası trafik geçişi; en azından bakım sayfası |
| BUG-3 | P2 | Olmayan sayfalar 200 dönüyor (soft 404) | `GET /olmayan-sayfa-xyz` → 200, 5,4 kB SPA kabuğu; `NotFound.tsx` `noindex` da koymuyor | Sunucu bilinen genel rotalar dışında 404 dönsün; `NotFound` sayfası `noindex` |
| BUG-4 | P2 | Üretim kodunda ölü referans veri | `buildCalibrated202645Dataset()` yalnız testten çağrılıyor ama `calm-icmal.ts`'in ~540 satırını kaplıyor | Test fixture'ına taşı; örnek proje akışına gerekiyorsa açık `sampleId` ile bağla |
| BUG-5 | P2 | Yönetim panelinde aynı sayfaya iki rota | `App.tsx`: `/admin/leads` ve `/admin/pilot-applications` aynı `PilotApplications` bileşeni | Birini yönlendirmeye çevir |
| BUG-6 | P2 | 4 adet tarayıcı `alert`/`confirm` | `window.alert/confirm` çağrıları; tasarım sistemiyle uyumsuz ve erişilebilirliği zayıf | `sonner` / `AlertDialog` |

---

## 5. UI — tasarım sistemi ve görsel tutarlılık

Rev. 8'deki "Pafta" tasarım sistemi doğru bir yön; ancak göç yarım kalmış ve eski sınıflar CSS ile maskelenmiş durumda.

| ID | Önem | Bulgu | Ölçüm / kanıt | Öneri |
| --- | --- | --- | --- | --- |
| UI-1 | P1 | Tasarım sistemi göçü yarım | 71 dosyada **3.211** sabit renk sınıfı (`bg-zinc-950`, `text-slate-400`, `[#0c0c0e]` …) vs 1.269 token sınıfı. `DESIGN.md` §2 "hiçbir bileşende sabit `bg-zinc-950` kullanılmaz" diyor | Sayfa sayfa token'a göç; en çok ihlal: `PricingSources.tsx` (127), `PlanEditor.tsx` (115), `BimIfcParser.tsx` (86), `QuoteDetail.tsx` (83), `Settings.tsx` (80) |
| UI-2 | P1 | Eski renkler global CSS ile yeniden tanımlanıyor | [index.css:387+](src/index.css:387): `:root .bg-zinc-950 { … }` gibi seçicilerle Tailwind yardımcı sınıfları ezilip pafta rengine çevriliyor | Geçici çözüm olarak işaretle ve UI-1 bitince kaldır; aksi hâlde `zinc-950`'nin "açık kâğıt" anlamına gelmesi yeni geliştiricileri yanıltır |
| UI-3 | P1 | Çok küçük yazı boyutları | `text-[10px]` 518, `text-[9px]` 158, `text-[8px]` 89, `text-[7px]` 7 kullanım | Tipografi ölçeğine en az 11–12 px taban; mono antet şeritleri dahil |
| UI-4 | P2 | Çift font yükü | `index.css` Geist + Geist Mono (`@fontsource`) yüklüyor; `main.tsx` ayrıca Google'dan Manrope + Instrument Serif + IBM Plex Mono çekiyor. `DESIGN.md` yalnız üçünü tanımlıyor | Geist'i kaldır; üç fontu `@fontsource` ile self-host et (SEC-3 ve PERF ile birlikte çözülür) |
| UI-5 | P2 | Akademi sayfaları tamamen eski koyu tema | `PublicAcademyDetail.tsx`, `CompleteAcademyContent.tsx` sabit `bg-[#0c0c0e]`, `zinc-*` | Akademi kapalıyken düşük öncelik; açılmadan önce göç |

---

## 6. UX — kullanıcı yolculuğu ve güven

| ID | Önem | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- | --- |
| UX-1 | P1 | Vitrin, ürünün yapmadığı işleri vaat ediyor | Bkz. GEO-2 tablosu (KİK aşırı düşük teklif analizi, PDF/A-1b rapor üretimi, ISO 19650 uyumu, 4,00 m² minha eşiği) | `PRODUCT.md` "kanıttan önce iddia yok" ilkesine göre metinleri kodla eşitle |
| UX-2 | P1 | Ön kayıt geri bildirimi yanlış | BUG-1 | — |
| UX-3 | P2 | `/about`, `/pricing`, `/features` ayrı sayfa değil | Hepsi aynı `LandingPage`'i render edip ilgili bölüme kaydırıyor | Ya gerçek alt sayfalar ya da tek sayfa + çapa linkleri (`/#pricing`); sitemap buna göre |
| UX-4 | P2 | Kesinti anında kullanıcı düz metin görüyor | BUG-2: Cloudflare arkasında `no available server` | Cloudflare'de özel 5xx sayfası |
| UX-5 | P2 | Yoğun bilgi ve küçük yazı | UI-3; SmartCheck ve admin ekranlarında 8–10 px mono etiketler | Kritik sayılar (metraj, tutar) için en az 13–14 px |

---

## 7. Güvenlik

Temel sertleştirme iyi durumda: HSTS, `X-Frame-Options: DENY`, `nosniff`, CSP (`script-src 'self'`), Referrer-Policy; giriş, kayıt, doğrulama ve parola sıfırlamada kalıcı oran sınırlama; parola sıfırlamada e-posta varlığını sızdırmayan mesaj; SSRF korumalı `safe-fetch` (özel IP'ler, `file://`, kimlikli URL reddi testli); bcrypt; 15 dakikalık salt-okunur impersonation.

| ID | Önem | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- | --- |
| SEC-1 | P1 | Oturum anahtarları `localStorage`'da | [useAuth.tsx:106](src/hooks/useAuth.tsx:106) `token`, [useAuth.tsx:88](src/hooks/useAuth.tsx:88) `superadmin_token`; 7 gün geçerli JWT | Tek bir XSS tüm hesabı (süper admin dahil) ele geçirir. `HttpOnly; Secure; SameSite=Strict` çerez + CSRF koruması; süper admin için kısa ömür |
| SEC-2 | P1 | Kimlik doğrulamadan önce 50 MB JSON gövdesi ayrıştırılıyor | [app.ts:99](src/server/app.ts:99): `/api/admin/pricing-sources/:id/import-pdf` için `express.json({ limit: "50mb" })` uygulama seviyesinde, `authenticate`'ten önce | Anonim istekler sunucuya 50 MB'lık parse yükü bindirebilir (bellek/CPU DoS). Gövde ayrıştırıcıyı `authenticate` + `checkSuperAdmin`'den sonra rota içine taşı veya dosyayı `raw`/stream ile al |
| SEC-3 | P1 | Google Fonts üçüncü taraf yüklemesi (KVKK) | `main.tsx` her ziyaretçide `fonts.googleapis.com`'a istek atıyor; CSP buna göre genişletildi | Ziyaretçi IP'si yurt dışına aktarılıyor ve aydınlatma metninde yok. `@fontsource` ile self-host et, CSP'den Google alan adlarını çıkar |
| SEC-4 | P2 | Giriş oran sınırı IP + e-posta anahtarlı | `login:${ip}:${email}` 15 dk'da 10; hesap bazlı (IP'den bağımsız) kilit yok | Dağıtık parola denemesine karşı hesap bazlı yavaşlatma |
| SEC-5 | P2 | Parola politikası yalnız uzunluk | 8–128 karakter | Sızmış parola listesi kontrolü (k-anonymity) veya en az 10 karakter |
| SEC-6 | P2 | E-posta varlık tespiti | Kayıt `409 "Bu e-posta adresiyle bir hesap zaten mevcut"`; pilot formu 200/201 ile ayrışıyor | Pilot için tek yanıt; kayıt için yaygın kabul görür ama oran sınırı korunmalı |
| SEC-7 | P2 | Impersonation iptal kontrolü eksik adaptörde açık kalıyor | [auth.ts](src/server/middleware/auth.ts) `isImpersonationRevoked` verilmezse `revoked = false`; önceki sürüm reddediyordu | Varsayılan adaptörde var, üretimde etkisi yok; ama güvenli varsayılan (fail-closed) geri getirilmeli |
| SEC-8 | P2 | Eksik başlıklar | `Permissions-Policy`, `Cross-Origin-Opener-Policy` yok; HSTS `preload` yok | Ekle |
| SEC-9 | P2 | Gereksiz CSP izinleri | Firebase (5 alan adı) ve Google Fonts; Firebase yalnız kapalı Akademi için | Akademi kapalıyken çıkar |
| SEC-10 | P2 | `dangerouslySetInnerHTML` | `PublicAcademyDetail.tsx:525`, `CompleteAcademyContent.tsx:127` statik içerik | Akademi açılmadan önce DOMPurify |
| SEC-11 | P2 | Testte global DB mock'u | `admin-features.test.ts` `db.select`'i tüm suite için boş sonuca sabitliyor | Gerçek yetkilendirme yolunu gizleyebilir; adaptör enjeksiyonuyla değiştir |
| P1-1 (eski) | P1 | Uygulama DB'ye şema sahibi rolüyle bağlanıyor | `compose.coolify.yaml:27` ve `:155` aynı `bimmetraj` kullanıcısı | Ayrı runtime DML rolü |
| P0-5 (eski) | P1 | Bağımsız güvenlik incelemesi | Kanıt yok | Harici sızma testi |

---

## 8. SEO

| ID | Önem | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- | --- |
| SEO-1 | P0 (görünürlük) | Tüm sayfalar aynı HTML ile sunuluyor (SPA, SSR/prerender yok) | `/`, `/bim-sozlugu`, `/pilot`, `/terms`, `/privacy` hepsi aynı 5.464 baytlık kabuğu döndürüyor; başlık, açıklama ve canonical yalnız JS çalışınca (`PublicMetadata`) değişiyor | Google render eder ama gecikmeli; Bing, sosyal önizlemeler ve AI tarayıcıları çoğunlukla etmez. Genel rotalar için build-time prerender (ör. `vite-plugin-prerender` / Puppeteer ile statik HTML) |
| SEO-2 | P1 | Soft 404 | BUG-3 | — |
| SEO-3 | P1 | `og:image` yok | `twitter:card = summary_large_image` ama görsel tanımlı değil; `public/` içinde yalnız `favicon.svg` | 1200×630 paylaşım görseli, `apple-touch-icon`, `manifest.webmanifest` |
| SEO-4 | P1 | Yinelenen içerik | `/about`, `/pricing`, `/features` aynı içerik (UX-3) ve hepsi sitemap'te | Ya ayrı içerik ya sitemap'ten çıkar + canonical `/` |
| SEO-5 | P2 | Sitemap zayıf | `lastmod` yok; `/smartcheck` demo sayfası listede; sözlük terimleri ayrı URL değil | `lastmod`; sözlük terimleri için `/bim-sozlugu/<terim>` sayfaları (uzun kuyruk aramalar) |
| SEO-6 | P2 | `meta keywords` | Arama motorları kullanmıyor | Kaldırılabilir (zararsız) |
| PERF-1 | P1 | Ana sayfa gereksiz ağır | Landing artık ana pakete gömülü (`App.tsx` eager import) ve `charts` (450 kB, Recharts) ana sayfada `modulepreload` ediliyor; CSS 242 kB | Grafik paketini yalnız uygulama içi rotalarda yükle; Landing'i ayrı ve hafif tut (LCP / Core Web Vitals) |
| PERF-2 | P2 | Fontlar JS ile ekleniyor | Google Fonts `main.tsx` çalışınca ekleniyor → metin önce yedek fontla çizilip sonra değişiyor (FOUT / CLS) | Self-host + `<link rel="preload">` |

---

## 9. GEO (Üretken arama motorları / AI yanıt motorları)

ChatGPT, Claude, Perplexity ve Google AI Overviews'un BIMMetraj'ı doğru tanıması ve kaynak göstermesi için üç şart var: içeriğin JS'siz okunabilmesi, iddiaların tutarlı ve doğru olması, kuruluşun güçlü varlık sinyalleri.

| ID | Önem | Bulgu | Kanıt | Öneri |
| --- | --- | --- | --- | --- |
| GEO-1 | P0 | AI tarayıcıları içeriği göremiyor | SEO-1: GPTBot, ClaudeBot, PerplexityBot genelde JS çalıştırmaz; sözlük, özellikler ve paket bilgisi yalnız JS ile geliyor. Tek okunabilir kaynak `llms.txt` ve `index.html` JSON-LD | Prerender (SEO-1); sözlük ve paketler için statik HTML |
| GEO-2 | **P0** | `llms.txt` ve JSON-LD'de kodla çelişen iddialar | Aşağıdaki tablo | AI motorları bu metni olduğu gibi alıntılar; yanlış vaat hem güven hem hukuki risk. Metinleri kodla eşitle |
| GEO-3 | P1 | Paket bilgisi tutarsız | `llms.txt`: "Trial, Starter, Pro, Enterprise" (4 paket); JSON-LD `offerCount: 4`; gerçek v6 katalog 5 paket (Deneme, e-PYS Denetçi, Teklif & Şantiye, 5D BIM & SmartCheck, Kurumsal) | `llms.txt` ve JSON-LD'yi `/api/public/plans`'tan üret |
| GEO-4 | P1 | Kuruluş varlık sinyalleri zayıf | `Organization` şemasında `logo`, `sameAs` (LinkedIn vb.), `address`, `founder` yok | Ekle; aynı bilgiler sitede görünür olsun |
| GEO-5 | P2 | Soru-cevap içeriği az | JSON-LD FAQ yalnız 2 soru | Gerçek müşteri sorularından 8–12 SSS; sayfada da görünür olsun |
| GEO-6 | P2 | `llms-full.txt` yok | — | Sözlük ve mevzuat özetinin düz metin sürümü |
| GEO-7 | P2 | `robots.txt` AI botlarına açık ama niyet belirtilmemiş | Yalnız `User-agent: *` | Bilinçli karar: eğitim botları (GPTBot) ile arama botlarını (OAI-SearchBot, PerplexityBot) ayrı yönet |

### GEO-2 / UX-1: Vitrin iddiaları ve kod karşılığı

| İddia (nerede) | Kodda gerçek durum | Değerlendirme |
| --- | --- | --- |
| "4734 KİK aşırı düşük teklif analizi" (`llms.txt`, `meta keywords`, Footer) | `src/` içinde aşırı düşük teklif hesabı yok; yalnız Footer metni | **Desteksiz** |
| "PDF/A-1b arşiv uyumlu resmi teklif ve metraj raporu üretimi" (JSON-LD `featureList`, FAQ) | Teklif PDF'i Puppeteer ile düz PDF; `pdf_preflight.py` yalnız yüklenen PDF'in PDF/A **beyanını** okuyor ve "tam doğrulama veraPDF gerektirir" diyor | **Desteksiz** — "PDF/A beyan ön kontrolü" olarak düzelt |
| "TS 500, TBDY 2018, TS 708, **ISO 19650** … ile uyumludur" (JSON-LD FAQ, Landing satır 808) | ISO 19650 runtime'da yok (13 Ekim raporu E-10 "uyumlu denmesin" diyordu) | **Desteksiz** |
| "Minha kuralları (0.50 m² ve **4.00 m²** eşikleri)" (`llms.txt`, JSON-LD FAQ) | [minha.ts:95](src/smartcheck/rules/minha.ts:95): ÇŞB 0,50 m², DIN 18350 **2,50 m²** | **Yanlış sayı** |
| "IfcReinforcingBar … metraj çıkarımı" (`llms.txt`) | Donatı ve kalıp yalnız `model_estimate` / `needs_review` olarak aktarılıyor | Abartılı — "tahmini, onay gerektirir" eklenmeli |
| "%3 sapma toleransı" (FAQ) | Kodda var | Doğru; ama `CLAUDE.md`'ye göre "şirket politikası" olduğu belirtilmeli, normatif değil |
| "IFC 2x3 / IFC4 / IFC4.3" | Çıkarıcıda IFC4X3 yolları var | Doğru |

---

## 10. Önceki raporlardan hâlâ açık (değişmedi)

| ID | GAP | Durum |
| --- | --- | --- |
| P0-2 | Tahsilat (kart) | Açık; Havale/EFT + manuel onay canlıda |
| P0-3 / P0-12 | Ücretli pilot kanıtı | Kodda doğrulanamıyor |
| P1-2 | Resmî birim fiyat lisansı | Kod dışı |
| P1-6 | AI sağlayıcı anahtarları | Üretimde yok |
| RG 33331 | EK-6 / EK-3 tam satır doğrulaması | Kısmen |
| Bakanlık | 6 soruluk teknik görüş | Yanıt bekleniyor |

---

## 11. Önerilen sıra

1. **GEO-2 / UX-1:** Desteksiz iddiaları `llms.txt` (`web-hardening.ts:76`), `index.html` JSON-LD, Landing ve Footer'dan çıkar veya düzelt. Küçük iş, büyük güven/hukuk etkisi.
2. **BUG-1:** Ön kayıt mesajını düzelt (tek satır).
3. **SEC-2:** 50 MB JSON ayrıştırıcıyı yetkilendirmenin arkasına al.
4. **SEC-3 + UI-4 + PERF-2:** Fontları self-host et, Geist'i kaldır, CSP'yi daralt.
5. **BUG-2:** Kesintisiz deploy (rolling update) veya en azından bakım sayfası.
6. **SEO-1 / GEO-1:** Genel rotalar için prerender; ardından BUG-3 (gerçek 404), SEO-3 (`og:image`), GEO-3/4.
7. **PERF-1:** Grafik paketini Landing'den ayır.
8. **SEC-1:** Token'ları HttpOnly çereze taşı (daha büyük iş; planlı yapılmalı).
9. **UI-1/UI-2/UI-3:** Sayfa sayfa token göçü ve tipografi tabanı.
10. Kalan P1/P2'ler: P1-1 DB rolü, Y-6 tahsilat, Y-7 E2E, Y-9/Y-10 kod kalitesi.
