# BIMMetraj — Bağımsız GAP ve Canlıya Hazırlık (Production Readiness) Denetim Raporu

**Tarih:** 17 Ekim 2026 · **Kod:** `main` @ `c9ea528` · **Canlı:** `a2cb114` (Rev. 26, `BIM-CALC-2026-10-17.20`) · **Yöntem:** "Kanıtı olmayan iddia geçersizdir." Bu rapor yalnız inceleme ve okuma amaçlı komutlarla üretildi; kodda değişiklik yapılmadı.

---

## 1. Yönetici özeti ve genel hazırlık skoru

### Genel Production Readiness Skoru: **54 / 100**

### Karar: **NO-GO** (genel ücretli satış için) · **Koşullu GO** (P0'lar kapandıktan sonra kapalı pilot için)

**Gerekçe:**

1. **Sürüm kapısı fiilen yok.** GitHub `Verify` iş akışı son 42 koşunun **tamamında kırmızı**; son yeşil koşu 15 Ekim 12:07. Bu süre içinde en az 25 commit canlıya alındı. Kırmızının nedeni tek bir test: Kurumsal paketin AI limiti katalogda 150, test 1000 bekliyor. 13 Ekim ürün kararı da 1000 idi. Ya katalog ya test yanlış; ama asıl sorun, kırmızı CI'ya rağmen deploy yapılması.
2. **Vitrinde 10 yetenek "[L3 CANLI]" etiketiyle ilan ediliyor, ama bu etiketin dayandığı uzman onayları gerçek değil.** `registry.ts` içindeki onaylayan "Yüksek Mühendis / Mimar Denetim Kurulu" bir ajan becerisinin adı; gerçek bir kişi veya kurul değil. Ajan hafızası da bunu kabul ediyor (HANDOFF §2.15, Rev. 22). Kanıt Kapısı mekanizması doğru kurulmuş, ama girdisi uydurma olduğu için kapı işlevsiz.
3. **Rev. 26'da halka açık yayımlanan iki hesaplayıcı (Kat Karşılığı, YAMBİS) kaynaksız sayılar ve hatalı vergi kuralı içeriyor.** Bunlar Yetenek Kaydı'na hiç girmemiş, yani kapıyı tamamen atlıyorlar. Kullanıcıya hukuki ve mali sonuç doğurabilecek rakamlar veriyorlar.
4. **Ödeme ekranında var olmayan bir kart/taksit altyapısı gösteriliyor.** Taksit vade farkları uydurma; katalogda olmayan "Profesyonel Paket 4.900 ₺" yedeği var.
5. **Teknik temel ise güçlü:** Konteyner sertleştirme, güvenlik başlıkları, kiracı izolasyonu, kalıcı oran sınırlama, migration zinciri, KVKK maskeleme ve paket bölme iyi durumda. 1.014 testin 1.011'i CI'da geçiyor.

**Kısacası:** Motor sağlam, ama gösterge paneli yalan söylüyor. Kapalı pilot için 1–3 günlük P0 temizliği yeterli; genel satış için ek olarak P1'ler gerekli.

---

## 2. On eksen denetim matrisi

| # | Eksen | Durum | Skor |
| --- | --- | --- | --- |
| 1 | DevOps, CI/CD, konteyner | **KRİTİK HATA [FAIL]** | 5/10 |
| 2 | Siber güvenlik ve izolasyon | UYARI [WARN] | 7/10 |
| 3 | Web standartları, tasarım sistemi, A11y | UYARI [WARN] | 5/10 |
| 4 | SEO, GEO, LLM hazırlığı | **KRİTİK HATA [FAIL]** | 4/10 |
| 5 | Mühendislik ve mevzuat hesapları | **KRİTİK HATA [FAIL]** | 4/10 |
| 6 | Performans ve paketleme | GEÇTİ [PASS] | 8/10 |
| 7 | Veritabanı ve veri bütünlüğü | UYARI [WARN] | 7/10 |
| 8 | E-posta ve arka plan işleri | UYARI [WARN] | 6/10 |
| 9 | Ticari akış, faturalama, kotalar | **KRİTİK HATA [FAIL]** | 3/10 |
| 10 | Test kapsamı ve kod kalitesi | UYARI [WARN] | 5/10 |
| | **Toplam** | | **54/100** |

### Eksen 1 — DevOps, CI/CD ve konteyner güvenliği · FAIL

| Bulgu | Kanıt | Risk / etki |
| --- | --- | --- |
| ✅ Konteyner sertleştirme iyi | `Dockerfile`: `USER node`, `tini` ENTRYPOINT; `compose.coolify.yaml`: `cap_drop: [ALL]`, `no-new-privileges`, `read_only: true`, `tmpfs`, servis başına `mem_limit`/`cpus`, healthcheck (`/readyz`) | — |
| ✅ Canlı sağlık | `/api/health`: `status ok`, `db connected`, tüm hazırlık bayrakları `true`, `revisionSource: build` | — |
| ✅ Git'te sır yok | İzlenen dosyalarda yalnız `.env.example` ve `firebase-applet-config.json` (istemci yapılandırması, sır değil); `.env*` yok sayılıyor | — |
| ❌ **CI 42 koşudur kırmızı, deploy devam ediyor** | `gh run list`: son yeşil 2026-10-15T12:07; tek düşen test `feature-quota.integration.test.ts:34` (Kurumsal AI limiti: 150 ≠ 1000) | Kırmızıya alışan ekip gerçek bir regresyonu kaçırır. Kapalı bir sürüm kapısı yok |
| ❌ Deploy kesintisi | 17 Ekim ölçümü: deploy sırasında ~1 dk `503 no available server` | Kullanıcı oturumu ve yükleme yarıda kalır |
| ⚠️ Tek veritabanı kullanıcısı | `compose.coolify.yaml:27` (`app`) ve `:155` (`migrate`) aynı `bimmetraj` rolü | SQL injection veya hatalı kod şemayı silebilir |
| ⚠️ Ortam sürüm sapması | Konteynerde `ifcopenshell==0.8.4.post1`, yerel/kanıt paketinde 0.8.5; üretim imajına `pytest` kuruluyor | Kanıt paketi ile üretim farklı motorla koşuyor olabilir |
| ⚠️ Yedek bugün doğrulanmadı | Son kanıt 13 Ekim restore tatbikatı (hafıza kaydı) | Sunucuya erişim olmadan doğrulanamaz |

### Eksen 2 — Siber güvenlik ve izolasyon · WARN

| Bulgu | Kanıt | Risk / etki |
| --- | --- | --- |
| ✅ Başlıklar | CSP `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`; HSTS `preload`; COOP `same-origin`; `Permissions-Policy`; `nosniff`; `X-Frame-Options DENY` (canlıda doğrulandı) | — |
| ⚠️ CORP yok, CSP `style-src 'unsafe-inline'` | Canlı başlıklar | Düşük |
| ✅ Kiracı izolasyonu | `companyId` filtresi olmayan tüm `id` sorguları süper admin rotalarında (`admin.ts`) veya platform tablolarında; kiracı rotaları `companyId` ile kapsanıyor; izolasyon entegrasyon testleri CI'da | — |
| ✅ Kalıcı oran sınırlama | Giriş, kayıt, doğrulama ve sıfırlamada `guardedRateLimit` (DB), hata halinde 503 (fail-closed) | — |
| ✅ SEC-2 kapandı | 50 MB JSON ayrıştırıcı `authenticate → checkSuperAdmin → requireVerifiedEmail` arkasında | — |
| ✅ KVKK maskeleme | `epys_preflight.py` TC/VKN/telefon/e-posta; Python testleri 54/54 | — |
| ❌ **Oturum anahtarı `localStorage`'da** | `useAuth.tsx:106` `token`, `:88` `superadmin_token`; 7 gün geçerli JWT | Tek bir XSS süper admin dahil hesabı ele geçirir |
| ⚠️ Hesap bazlı kilit yok | Giriş sınırı `ip+email` anahtarlı | Dağıtık parola denemesi |
| ⚠️ Bağımsız sızma testi yok | — | — |

### Eksen 3 — Web standartları, tasarım sistemi, A11y · WARN

| Bulgu | Kanıt | Risk / etki |
| --- | --- | --- |
| ⚠️ Tasarım göçü yarım | Nötr sabit renk sınıfları 3.211 → **3.102** (üç günde %3 azalma); renkli dahil 4.412; `rounded-xl+` 472; gradyan/blur/büyük gölge 49 | Light modda okunmayan alanlar; `DESIGN.md` ihlali |
| ❌ Faturalama ekranı tamamen eski tema | `Billing.tsx`: 112 sabit renk (`indigo`, `emerald`, `amber`, `zinc`), `rounded-xl` kartlar | Ödeme ekranında güven kaybı |
| ⚠️ Çok küçük yazı | `text-[7–9px]` 252 kullanım | WCAG 1.4.4 / okunabilirlik |
| ⚠️ Form etiketleri | 281 form alanının yalnız 44'ünde `id`/`aria-label` doğrudan görünüyor; geri kalanı sarmalayıcı `<label>` olabilir, manuel denetim gerekli | WCAG 1.3.1 / 4.1.2 riski |
| ⚠️ Odak görünürlüğü | 10 `outline-none` kullanımında `focus-visible` karşılığı yok | WCAG 2.4.7 |
| ✅ Semantik | 12 sayfada `<main>`; temel tokenların kontrastı (`#181f1c` / `#f3f1e9`) AA'yı geçiyor | — |
| ⚠️ Marka tutarsız | Ajan hafızası ve Rev. 26 metinleri büyük harfli "BİMMETRAJ", vitrin ve kod "BIMMetraj" yazıyordu; `package.json` adı `react-example` | Varlık sinyali bölünür |

### Eksen 4 — SEO, GEO, LLM hazırlığı · FAIL

| Bulgu | Kanıt | Risk / etki |
| --- | --- | --- |
| ✅ İyileşmeler | Gerçek HTTP 404 (`/yok-boyle-sayfa` → 404); sitemap 14 URL + `lastmod`; `robots.txt`; `NotFound` `noindex` | — |
| ❌ **Prerender yok** | Hesaplayıcılar dahil tüm genel sayfalar aynı 8.169 baytlık kabuğu ve aynı `<title>`'ı döndürüyor | Yeni hesaplayıcı sayfaları (en güçlü SEO varlığı) arama motorlarına ve AI tarayıcılarına içeriksiz görünüyor |
| ❌ **`llms.txt` doğrulanmamış "[L3 CANLI]" iddiaları yayıyor** | 10 satır `[L3 CANLI]`; onaylar kurgusal (Eksen 5); Kat Karşılığı için "%1 KDV teşvik hesabı", YAMBİS için "m² kapasite hesabı" | AI motorları bunları kaynak olarak alıntılar; yanlış vergi ve mevzuat bilgisi yayılır |
| ❌ `llms-full.txt` yok | 404 | — |
| ❌ `og:image` yok | Canlı HTML | Paylaşım önizlemesi yok |
| ⚠️ Yerel anahtar kelimeler | "KİK sınır değer", "kat karşılığı", "fiyat farkı" için sayfa var; ama içerik JS ile geliyor (yukarıdaki prerender sorunu) | — |

### Eksen 5 — Mühendislik ve mevzuat hesapları · FAIL

| Motor | Durum | Kanıt | Değerlendirme |
| --- | --- | --- | --- |
| IFC QTO, çok katmanlı kaplama | ✅ L2 | 33 modelde çökme yok; brüt çarpanları Rev. 20'de kaldırıldı (gizli çarpan yasağı `registry.test.ts`'te) | İyi. L3 için gerçek uzman imzası eksik |
| Minha | ✅ L2 | ÇŞB 0,50 / DIN 2,50 / kullanıcı tanımlı; kaynaksız 4,00 m² kaldırıldı; Rev. 21'de gerçek boşluk ölçülerine bağlandı | İyi. Kalem bazlı net miktar henüz değişmiyor (Soru 11 bekliyor) |
| 3×3 | ✅ L2 | Şirket politikası etiketi doğru; paspayı mm | İyi |
| **KİK m.38 sınır değer** | ⚠️ L2 (L3 değil) | `kik-adt.ts`: %40–%120 bandı, K katsayısı parçalı, N 1,00/1,20 aralık denetimi | Formül yapısı resmî kaynaklarla uyumlu görünüyor. Ama: (a) golden testler aynı yazarın formülden türettiği sayılar, KİK'in yayımladığı bir örnekle karşılaştırma değil (döngüsel); (b) `SD = max(0,40×YM, …)` tabanının mevzuat dayanağı belgelenmemiş; (c) onay kurgusal |
| **4735 fiyat farkı** | ⚠️ L2 | `price-escalation.ts` `F = An × B × (Pn − 1)`; 21 TÜİK alt endeksi | Ajan hafızası "B ve sabit katsayı uzman teyidi bekliyor" diyor; kayıtta yine de "L3 CANLI" |
| **Kat karşılığı (Rev. 26)** | ❌ L1, hatalı | Aşağıdaki tablo | Halka açık, kayıt dışı |
| **YAMBİS (Rev. 26)** | ❌ L1, kaynaksız | Aşağıdaki tablo | Halka açık, kayıt dışı |
| CDE / ISO 19650 | ⚠️ L2 | Sabit girdiler kaldırıldı; değer yoksa "değerlendirilmedi" | Doğru yön. "Canlı L3" etiketi onaysız |
| ÇŞB 2026 kitapları | ✅ L2 | 18.848 / 18.848 satır; Mart listesi tarihleri `03-01 → 03-31` olarak düzeltildi | Kapsam tam. Lisans (YFK) belirsiz; BYOL modu var |

**Kat karşılığı motoru (`src/lib/kat-karsiligi.ts`) bulguları:**

| # | Bulgu | Satır / kanıt |
| --- | --- | --- |
| KK-1 | **Gizli varsayılanlar:** brüt çarpanı 1,30; kâr/risk çarpanı 1,20; ortalama konut 100 m². Projenin kendi kuralı (Rev. 20, Rev. 23) bunları yasaklıyor | `calculateKatKarsiligi` parametre varsayılanları; `KatKarsiligiCalculatorPage.tsx:6-13` ayrıca 24.000 / 55.000 TL/m² örnek değerlerle dolu açılıyor |
| KK-2 | **Kendi kendini doğrulayan kâr marjı:** Müteahhit oranı `maliyet × 1,20 / hasılat` olarak hesaplandığı için müteahhit hasılatı daima maliyetin 1,20 katı, kâr marjı daima %20 çıkıyor | `muteahhitKarMarjiYuzde` |
| KK-3 | **KDV kuralı hatalı:** 6306 dışında boyuttan bağımsız %10; 6306'da 150 m² üzeri **konutun tamamına** %20 uygulanıyor. Kaynaklara göre 6306 riskli alan/rezerv alanda 150 m²'ye kadar olan **kısım** %1, aşan kısım genel orandır. KDV tüm proje hasılatına (arsa sahibine teslim dahil) tek oranla uygulanıyor; kat karşılığı işlemlerinin KDV'si ayrıca özelge konusu | `kdvOraniYuzde` bloğu |
| KK-4 | **Hukuki atıf yanlış çerçevelenmiş:** %10 / %20 / %40 / %30 dört aşamalı tapu devri "Yargıtay 15. HD" standardı gibi sunuluyor; bu oranlar içtihat değil, sözleşme pratiği. Ayrıca bu uyuşmazlıklarda güncel Yargıtay daire iş bölümü teyit edilmeli | `KADEMELI_TAPU_DEVIR_STANDARDI` |
| KK-5 | Kaynaksız fizibilite eşikleri | `≥ 85` fizibil değil, `≥ 70` riskli, `≤ 30` |

**YAMBİS motoru (`src/lib/yambis-classification.ts`) bulguları:**

| # | Bulgu | Kanıt |
| --- | --- | --- |
| YB-1 | **Grup sınırları m² olarak ve kaynaksız** (B 65.000 m², E1 15.686 m², H 2.101 m²…), ciro/deneyim eşikleri yuvarlak uydurma sayılar. Yönetmelik iş deneyim ve iş tutarlarını TL cinsinden ve yıllık güncellenen değerlerle tanımlar | `YAMBİS_GRUP_LIMITLERI` |
| YB-2 | Rasyolar (0,75 / 0,15 / 0,75) KİK yapım ihaleleri bilanço kriterleriyle aynı; Müteahhit Sınıflandırma Yönetmeliği'nde hangi gruplar için ve hangi formülle arandığı kaynakla eşleştirilmemiş | Kod yorumu "m.8"; resmî ek tablo (EK-2) ile karşılaştırma yok |
| YB-3 | "Ruhsata aykırılıkta 5 yıl iptal" gibi yaptırım cümleleri madde metniyle doğrulanmamış; Ocak ve Mayıs 2026 yönetmelik değişiklikleri yansıtılmamış | `yaptirimUyarilari` |
| YB-4 | Örnek finansal değerlerle dolu açılıyor | `YambisCalculatorPage.tsx:6-12` |

### Eksen 6 — Performans ve paketleme · PASS

| Bulgu | Kanıt |
| --- | --- |
| ✅ Ana paket 356 kB (gzip ~113 kB); `charts` (450 kB) ana sayfada ön yüklenmiyor; `exceljs` (940 kB) yalnız dinamik `import()` ile | `vite build` çıktısı, `vite.config.ts` |
| ✅ Fontlar self-host, Google bağlantısı yok | CSP `font-src 'self'` |
| ⚠️ CSS 250 kB (gzip ~35 kB); kapalı Akademi paketleri (276 + 129 kB) hâlâ build'de | Tembel yükleniyor, açılışı etkilemiyor |
| ⚠️ Sayfa düzeyinde FCP/LCP ölçümü yok | Lighthouse/PageSpeed kaydı repo'da yok |

### Eksen 7 — Veritabanı ve veri bütünlüğü · WARN

| Bulgu | Kanıt |
| --- | --- |
| ✅ Sürümlü migration zinciri | `drizzle-release/` 0000–0008 + `manifest.json`; CI'da boş DB'den uygulanıyor |
| ✅ Kısıtlar | FK'ler (`companyId` bileşik), `check` kısıtları (fiyat ≥ 0, durum enum'ları), arama indeksleri |
| ⚠️ Üç paralel fiyat sistemi sürüyor | `pricing_data_sources` + `price_feed_staging`, `price_sources` + `price_snapshots`, `source_intelligence_*`. Fiyat Kitabı birleştirmesi (yol haritası §4.5) yapılmadı; 18.848 satır JSON dosyada, tabloda değil |
| ⚠️ Denetim kaydı sessizce kaybolabiliyor | `quotations.ts:24-40`: denetim kaydı yazılamazsa yalnız `console.error`; CI loglarında 32 kez `user_id` not-null ihlali | Denetim izi eksik kalır ve kimse fark etmez |
| ⚠️ Canlı DB ile migration eşleşmesi bugün doğrulanmadı | Sunucu erişimi gerekir |

### Eksen 8 — E-posta ve arka plan işleri · WARN

| Bulgu | Kanıt |
| --- | --- |
| ✅ SPF `mx -all`, DMARC `p=reject` | `dig` |
| ❌ **DKIM yok** | Yaygın seçiciler (`default`, `mail`, `stalwart`, `dkim`, `s1` …) boş; 13 Ekim'den beri açık | `p=reject` ile yönlendirilen postalar reddedilir, gelen kutusu yerleşimi zayıf |
| ✅ SMTP hata yönetimi | Kimlik bilgisi sızdırmama ve yeniden denememe testleri CI'da geçiyor |
| ✅ Kuyruk | Graphile `max_attempts := 3`, `job_key` ile tekilleştirme; Graphile varsayılan üstel bekleme |
| ⚠️ Kuyruk alarmı | Sentry var; kuyruk birikimi için alarm kanıtı yok |

### Eksen 9 — Ticari akış, faturalama, kotalar · FAIL

| Bulgu | Kanıt | Risk / etki |
| --- | --- | --- |
| ✅ Havale/EFT + süper admin onayı | `bank-transfer.ts`, 4 dönemli iskonto (%0/10/20/30) | — |
| ✅ Kota fail-closed | Kota hatasında 503; AI rezervasyonu atomik (CI testleri) | — |
| ❌ **Var olmayan kart/taksit kanalı gösteriliyor** | `Billing.tsx:586-720`: iyzico/PayTR/Stripe TR seçici, "3D Secure 2.0 & BKM Troy Destekli", taksit vade farkları %4,5 / 8,9 / 13,5 / 18,2 (kaynaksız); `package.json` ve sunucuda iyzico/PayTR entegrasyonu yok | Yanıltıcı ticari uygulama riski; kullanıcı ödeyebileceğini sanıyor |
| ❌ Katalogda olmayan yedek paket | `Billing.tsx:660`: `{ name: 'Profesyonel Paket', monthlyPrice: 4900 }` | Yanlış fiyat gösterimi |
| ❌ **Kurumsal paket AI limiti tutarsız** | Katalog 150; CI testi 1000; 13 Ekim ürün kararı 1000 | Ya müşteriye söz verilen kota verilmiyor ya test yanlış; CI'yı kıran neden bu |
| ⚠️ Mesafeli satış / KVKK hukuk onayı | Kodda kanıt yok | — |

### Eksen 10 — Test kapsamı ve kod kalitesi · WARN

| Bulgu | Kanıt |
| --- | --- |
| ✅ Hacim | CI: 1.014 test, 1.011 geçti; yerel (DB'siz): 913 test, 855 geçti, 46 izolasyon reddi; Python 54/54; `tsc` 0 hata |
| ⚠️ Golden testler döngüsel | KİK ve 4735 golden'ları resmî yayımlanmış örnekten değil, aynı formülden türetilmiş |
| ❌ E2E yok | Yalnız `src/ifc/server-path.e2e.test.ts` (IFC zinciri); tarayıcı tabanlı kullanıcı akışı testi yok |
| ⚠️ Tip güvenliği | `tsconfig.json`'da `strict` kapalı (ajan hafızası da null hatalarının yakalanmadığını not ediyor); 135 `any`, 15 `console.log` |
| ⚠️ Sentry | 13 Ekim'de test olayıyla doğrulanmış; bugün yeniden doğrulanmadı |

---

## 3. Önceliklendirilmiş eylem planı

### P0 — Bloker (kapalı pilot dahil her türlü satıştan önce)

| ID | İş | Kabul kriteri |
| --- | --- | --- |
| P0-1 | **CI'yı yeşile döndür ve sürüm kapısı kur.** Kurumsal AI limitine karar ver (150 mi 1000 mi), katalogu veya testi düzelt. Coolify deploy'unu yalnız yeşil commit'e izin verecek şekilde bağla | `gh run list` son koşu `success`; kırmızı commit deploy edilemiyor |
| P0-2 | **Kurgusal onayları kaldır.** `registry.ts`'teki "Denetim Kurulu" onaylarını sil; gerçek imza alınana kadar tüm "live/L3" satırlarını `pilot/L2`'ye indir. `llms.txt`, Landing ve JSON-LD buna göre otomatik değişsin | Kayıtta adı, unvanı ve sicili olan gerçek kişi olmayan L3 satırı 0 |
| P0-3 | **Kat Karşılığı ve YAMBİS hesaplayıcılarını yayından kaldır** (veya "taslak / kaynak doğrulanıyor" duvarının arkasına al). Yetenek Kaydı'na L1 olarak gir | Sayfalar sitemap ve `llms.txt`'ten çıkmış; KK-1…5 ve YB-1…4 kapanana kadar halka kapalı |
| P0-4 | **Sahte ödeme kanalını kaldır.** Kart/taksit sekmesini "yakında" bilgisine indir; uydurma vade oranlarını ve 4.900 ₺ yedek paketini sil | `Billing.tsx`'te gerçek entegrasyonu olmayan ödeme seçeneği yok |
| P0-5 | **Hesaplayıcılarda varsayılan değer yasağı.** Kat Karşılığı ve YAMBİS formları boş açılsın (KİK ve 4735'te olduğu gibi) | `registry.test.ts`'e hesaplayıcı sayfaları için literal başlangıç değeri kontrolü |

### P1 — Pilot aşamasında giderilmeli (1–2 hafta)

| ID | İş |
| --- | --- |
| P1-1 | KİK ve 4735 için **resmî kaynaklı golden test**: KİK'in yayımladığı örnek sınır değer hesabı ve ÇŞB/KİK fiyat farkı örneği birebir; `SD = max(0,40×YM, …)` tabanının dayanağı belgelensin veya kaldırılsın |
| P1-2 | Gerçek bir inşaat mühendisi ve bir mali müşavir / ihale uzmanından imzalı inceleme; isim, sicil ve tarih kayıtta |
| P1-3 | Kat karşılığı motorunun yeniden yazımı: tüm çarpanlar kullanıcı girdisi; KDV için GİB güncel oran tablosuna göre parçalı (150 m²'ye kadar / aşan kısım) hesap; tapu devri aşamaları "sözleşme şablonu önerisi" olarak etiketli |
| P1-4 | YAMBİS: yönetmeliğin güncel konsolide metni (Mayıs 2026) ve ekleriyle grup tutarları (TL, yıllık) ve rasyo kuralları; m² dönüşümü yalnız kullanıcı birim maliyetiyle |
| P1-5 | Oturumu `HttpOnly; Secure; SameSite` çereze taşı + CSRF |
| P1-6 | Ayrı runtime DB rolü (DML) |
| P1-7 | DKIM anahtarı ve DNS kaydı; Gmail/Outlook gelen kutusu testi |
| P1-8 | Kesintisiz deploy (rolling + healthcheck) ve Cloudflare özel 5xx sayfası |
| P1-9 | Genel sayfalar ve hesaplayıcılar için build-time prerender; sayfa başına `<title>`/açıklama sunucuda; `og:image`; `llms-full.txt` |
| P1-10 | Playwright smoke: kayıt → teklif → PDF; IFC yükle → icmal; süper admin girişi; CI'da |
| P1-11 | Denetim kaydı yazılamazsa Sentry'ye hata + metrik; `user_id` boş gelen yolu düzelt |
| P1-12 | Marka birliği: tek yazım "BIMMetraj" (karar: 17 Ekim 2026); `<title>`, JSON-LD, `llms.txt`, e-posta şablonları ve ajan hafızası buna hizalı |

### P2 — İyileştirme

| ID | İş |
| --- | --- |
| P2-1 | Tasarım token göçü: `Billing.tsx` (112), `PricingSources.tsx`, `PlanEditor.tsx`, `BimIfcParser.tsx`; `text-[7–9px]` kaldır |
| P2-2 | Form etiketi ve odak denetimi (axe ile otomatik) |
| P2-3 | `tsconfig` `strict: true`'ya kademeli geçiş; `any` temizliği |
| P2-4 | Fiyat Kitabı tablolarına geçiş (18.848 satır JSON → DB, sürümlü); üç fiyat sisteminin birleştirilmesi |
| P2-5 | `ifcopenshell` sürümünü kanıt paketiyle eşitle; üretim imajından `pytest`'i çıkar |
| P2-6 | CORP başlığı; hesap bazlı giriş yavaşlatma; harici sızma testi |
| P2-7 | Kuyruk birikimi ve yedek başarısızlığı için alarm |

---

## 4. Doğrulama ve test komutları

Ortam ön eki (yerel):

```bash
export PATH="/Users/hazarvolgaekiz/.unsloth/node/bin:$PATH"
```

| Bulgu | Komut |
| --- | --- |
| CI geçmişi (P0-1) | `gh run list --limit 40` |
| CI'daki tek hata | `gh run view 39048351173 --log-failed \| grep -A12 "✖ the enterprise package"` |
| Kurumsal AI limiti | `grep -n "monthlyAiLimit" src/services/billing/plan-catalog.ts` |
| Kurgusal onaylar (P0-2) | `grep -n "Denetim Kurulu" src/capabilities/registry.ts` |
| Vitrindeki L3 iddiaları | `curl -s https://bimmetraj.com/llms.txt \| grep -c "L3 CANLI"` |
| Kat karşılığı gizli varsayılanlar (KK-1/2) | `grep -nE "= 1\.30\|= 1\.20\|= 100" src/lib/kat-karsiligi.ts` |
| Kat karşılığı KDV (KK-3) | `sed -n '/KDV ve Teşvik Rejimi/,/kentselDonusumAvantajiTL =/p' src/lib/kat-karsiligi.ts` |
| YAMBİS m² sınırları (YB-1) | `grep -n "limitM2" src/lib/yambis-classification.ts` |
| Hesaplayıcı varsayılanları (P0-5) | `grep -n "useState<string>(\"[0-9]" src/pages/calculators/*.tsx` |
| Sahte ödeme kanalı (P0-4) | `grep -nE "diffRate\|Profesyonel Paket\|3D Secure" src/pages/Billing.tsx` |
| Ödeme entegrasyonu yokluğu | `grep -rniE "iyzipay\|paytr" package.json src/server` |
| Güvenlik başlıkları | `curl -sI https://bimmetraj.com/ \| grep -iE "content-security\|strict-transport\|cross-origin\|permissions-policy"` |
| Prerender yokluğu | `for p in / /hesaplayicilar/kik-asiri-dusuk-teklif /bim-sozlugu; do curl -s https://bimmetraj.com$p \| md5; done` (hepsi aynı özet) |
| 404 davranışı | `curl -s -o /dev/null -w "%{http_code}\n" https://bimmetraj.com/yok-boyle-sayfa` |
| `llms-full.txt` | `curl -s -o /dev/null -w "%{http_code}\n" https://bimmetraj.com/llms-full.txt` |
| DKIM (P1-7) | `for s in default mail stalwart dkim s1; do dig +short TXT $s._domainkey.bimmetraj.com; done` |
| SPF / DMARC | `dig +short TXT bimmetraj.com; dig +short TXT _dmarc.bimmetraj.com` |
| Token depolama (P1-5) | `grep -n "localStorage.setItem" src/hooks/useAuth.tsx` |
| Tek DB rolü (P1-6) | `grep -n "postgresql://" compose.coolify.yaml` |
| Denetim kaydı sessiz hata (P1-11) | `sed -n 24,40p src/server/routes/quotations.ts` |
| Tasarım ihlali sayımı (P2-1) | `grep -rhoE "(bg\|text\|border)-(zinc\|slate\|gray\|neutral)-[0-9]{2,3}\|\[#[0-9a-fA-F]{3,6}\]" src --include='*.tsx' \| wc -l` |
| Tip denetimi, testler | `npx tsc --noEmit` · `npx tsx --test "src/**/*.test.ts"` · `workers/ifc/.venv/bin/python -m pytest -q workers/ifc` |
| Paket boyutları | `npx vite build` |
| Bağımlılık politikası | `node scripts/dependency-audit-policy.mjs` |
| Canlı sürüm | `curl -s https://bimmetraj.com/api/health` |

---

---

## 5. Kapanış durumu (aynı gün, uygulama turu)

Kodla kapatılabilen maddeler uygulandı; **henüz commit edilmedi ve deploy edilmedi**. Yerel doğrulama: `tsc` 0 hata; 923 testin 865'i geçti, 46'sı izole PostgreSQL olmadığı için bilerek reddedildi (kod kaynaklı düşüş yok); `vite build` başarılı. DB'li testler (CI'yı kıran `feature-quota` dahil) yalnız CI'daki izole PostgreSQL 16'da koşar; bu makinede Docker çalışmıyordu. **CI yeşili push sonrası `Verify` koşusundan teyit edilmelidir.**

| ID | Durum | Ne yapıldı |
| --- | --- | --- |
| P0-1 | ✅ Kodda kapandı, CI teyidi bekliyor | Test, Kurumsal AI limitini katalogdan (150) okuyor. `scripts/require-green-ci.sh` kırmızı commit'in deploy'unu engelliyor (HEAD'de denendi: engelledi). Coolify'ın kendisinin yalnız yeşil commit'e bağlanması sizin panelinizde yapılacak |
| P0-2 | ✅ | Kurgusal onaylar silindi; 10 yetenek `pilot/L2`; kayıt `registrationNo` ister; `llms.txt`'te `L3 CANLI` yok (test) |
| P0-3 | ✅ | Kat Karşılığı ve YAMBİS rota, sitemap, `llms.txt`, indeks sayfasından çıktı; kayıtta `roadmap/L1`. Motor dosyaları korunuyor |
| P0-4 | ✅ | Kart/taksit kanalı, vade oranları ve 4.900 ₺ yedek paket kaldırıldı; "Kartla ödeme yakında" notu |
| P0-5 | ✅ | Yayındaki hesaplayıcılarda başlangıç değeri yasağı testi |
| P1-9 | 🟡 Kısmen | Sunucu her genel rota için başlık/açıklama/canonical yazıyor, bilinmeyen rota `noindex`; `og:image` + `/og-image.png`; `/llms-full.txt`. Sayfa **gövdesi** hâlâ istemcide üretiliyor (tam ön-render yapılmadı) |
| P1-11 | ✅ | Denetim kaydı yazılamazsa Sentry'ye bildirim. (CI logundaki `user_id` hataları test sahte kullanıcısından; üretim kodunda `userId` her zaman dolu) |
| P1-12 | ✅ | Marka yazımı **BIMMetraj** olarak kararlaştırıldı; tüm kod, vitrin ve ajan hafızası bu yazıma hizalandı |
| P1-1…P1-4, P1-10 | ⏸ Dış işlem | Gerçek imzalı uzman onayı; KİK'in resmî örnek hesabı; GİB/yönetmelik kaynaklarıyla KDV ve YAMBİS düzeltmesi; Playwright |
| P1-5 | ✅ | Oturum HttpOnly + SameSite=Strict çerezde; CSRF için aynı-origin kanıtı; tarayıcıya gövdede jeton yok; gerçek tarayıcıda doğrulandı (Rev. 28) |
| P1-10 | ✅ | `scripts/e2e-core-flow-smoke.ts` (giriş formu → müşteri → teklif → PDF → yenileme → CSRF → çıkış) ve CRM/faturalama smoke'u CI'da |
| P1-6…P1-8 | ⏸ Altyapı | Runtime DB rolü, DKIM (DNS + Stalwart), kesintisiz deploy (Coolify) |
| P2-1 | 🟡 Kısmen | 2.962 nötr sınıf token'a çevrildi (3.007 → 417); açık modda piksel farkı 0. Renkli vurgu sınıfları ve `text-[7–9px]` kalan iş |
| KK-1…KK-5 | ✅ Motor düzeltildi (yayında değil) | Gizli varsayılanlar kaldırıldı, KDV kısım bazlı ve emsal bedelden, kâr marjı tautolojisi kalktı, tapu devri "örnek şablon" oldu. Kaynaklar: `docs/audits/RESMI_VERI_ARASTIRMASI_2026-10-17.md` |
| YB-1…YB-4 | ✅ Motor yeniden yazıldı (yayında değil) | Yönetmelik metnine göre 14 grup, yapı sınır bedeli katları, bilanço/ciro/banka referansı, G/G1/H istisnaları |
| P1-1 (KİK) | ✅ Resmî örnekle doğrulandı | Tebliğ 45.2 örneği SD = 52.281,00 TL birebir; yuvarlama hatası düzeltildi. İhale uzmanı onayı hâlâ yok |
| SEO-1 / GEO-1 | 🟡 Kısmen | Sunucu rota başına `<noscript>` içerik, canonical ve başlık yazar; görsel gövdenin tam ön-render'ı yapılmadı |
| P2-2…P2-7 | ⏸ Açık | Form etiketi taraması, `strict` TS, Fiyat Kitabı tablolarına geçiş, ifcopenshell sürüm eşitlemesi, CORP, alarmlar |

## Kaynaklar

- KDV / 6306: [GİB — Konut ve işyeri KDV oranları](https://ivdb.gib.gov.tr/sites/all/olusturulanDosyalar/konut_isyeri_kdv_orani.pdf), [Alomaliye — Konut teslimlerinde KDV oranı (2023)](https://www.alomaliye.com/2023/07/10/konut-teslimlerinde-kdv-orani/amp/), [Alomaliye — Konut teslimlerinde yeni KDV oranları (2022)](https://www.alomaliye.com/2022/04/01/konut-teslimlerinde-yeni-kdv-oranlari/amp/), [PwC — Konut ve arsa teslimlerinde KDV değişikliği](https://www.pwc.com.tr/tr/sektorler/gayrimenkul/bultenler/konut-ve-arsa-arazi-teslimlerindeki-kdv-oranlarinda-degisiklik-hakkinda.html), [Muhasebetr](https://www.muhasebetr.com/yazarlarimiz/recepselimoglu/049/), [Lexpera özelge](https://www.lexpera.com.tr/mevzuat/ozelgeler/45404237-130-i-17-197-219804-sayili-ozelge-1), [Sakarya Üniv. — Konutlarda KDV](https://maliye.sakarya.edu.tr/sites/maliye.sakarya.edu.tr/file/Konutlarda_KDV.pdf)
- Müteahhit sınıflandırma: [ÇŞB — Yönetmelik konsolide metin (Mayıs 2026)](https://webdosya.csb.gov.tr/v2/istanbul/2026/05/Y-netmelik-20260522095144.pdf), [Alomaliye — Süre uzatımı (14.05.2026)](https://www.alomaliye.com/2026/05/14/yapi-muteahhitlerinin-kayit-ve-siniflandirma-esaslarinda-sure-uzatimi/), [Alomaliye — İş deneyimi ve yetki belgesi değişikliği (27.01.2026)](https://www.alomaliye.com/2026/01/27/yapi-muteahhitligi-sisteminde-is-deneyimi-ve-yetki-belgesi-iptallerinde-degisiklik/), [ÇŞB Denizli — EK tablolar](https://webdosya.csb.gov.tr/db/denizli/icerikler/6-20210401114118.pdf), [SteelRadar](https://www.steelradar.com/21-bin-muteahhit-yeterliliklerine-gore-gruplandirildi-77734/), [Emlak Kulisi](https://emlakkulisi.com/herkes-muteahhit-olamayacak/600009)
- KİK sınır değer (önceki turdan): [hakedis.org — Sınır değer hesaplama](https://www.hakedis.org/ihale-araclari/sinir-deger-hesaplama), [Yapım İşleri İhaleleri Uygulama Yönetmeliği](https://www.alomaliye.com/2021/11/30/yapim-isleri-ihaleleri-uygulama-yonetmeligi-30-11-2021/)

Not: Vergi ve yönetmelik tespitleri ikincil kaynaklardan derlenmiştir; nihai düzeltme GİB oran tablosu ve mevzuat.gov.tr'deki güncel resmî metinle yapılmalı, `CLAUDE.md` gereği mühendislik ve maliyet sayıları `yuksek-muhendis-mimar` doğrulamasından ve gerçek bir uzmandan geçmelidir.
