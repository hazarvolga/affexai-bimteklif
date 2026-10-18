# BIMMetraj — Son Production Readiness Raporu

**Tarih:** 18 Ekim 2026 · **Kod:** `main` @ `464a76d` · **Canlı:** `57d288d` (Rev. 34) · **Önceki denetim:** `DENETIM_RAPORU_2026-10-17.md` (54/100, NO-GO)

**Yöntem:** Kanıtı olmayan iddia geçersizdir. Bu rapor yalnız okuma ve ölçüm ile üretildi; kodda değişiklik yapılmadı.
- **Canlı site:** HTTP başlıkları, rotalar, TLS, DNS ve `llms.txt` kontrol edildi. Gerçek Chrome ile mobil kısıtlamalı (Moto G4, 4× CPU, 1,6 Mbps) Core Web Vitals ölçüldü ve axe-core 4.14 (WCAG 2.0/2.1/2.2 A–AA) koşuldu.
- **Yerel:** İzole PostgreSQL 16 ile tüm CI adımları çalıştırıldı: migration, `tsc`, test, Python, build, Prisma, bağımlılık denetimi ve 4 tarayıcı smoke testi.
- **Kod:** Son 20 commit (Rev. 30–34) incelendi: güvenlik dosyaları, hesap motorları, sabitler ve paket boyutu.

> `/ultrareview` (yeni adıyla `/code-review ultra`) kullanıcının başlattığı, ücretli ve bulutta çalışan çok-ajanlı bir incelemedir; bu rapor onun yerine geçmez. İsterseniz bu rapordan sonra terminalden ayrıca çalıştırabilirsiniz.

---

## 1. Yönetici özeti

### Skor: **69 / 100** (17 Ekim: 54)

### Karar

| Hedef | Karar |
| --- | --- |
| Erken erişim / kapalı pilot (şu anki durum) | **GO** |
| Genel ücretli lansman | **Koşullu GO**: aşağıdaki **4 P0** kapanınca. Hepsi küçük iş: 1–2 gün + DNS/Cloudflare ayarı |

### Ne değişti?

Temel risklerin çoğu kapandı:
- CI 42 koşudur kırmızıydı; artık her commit'te **yeşil**.
- Sahte "L3 / uzman onaylı" iddiaları kaldırıldı; hiçbir yetenek L3 değil ve bu dürüstçe yazılıyor.
- Oturum HttpOnly çerezde ve CSRF korumalı.
- KİK hesabı resmî Tebliğ örneğiyle birebir doğrulandı.
- Yayındaki iddialar kodla uyumlu; sahte ödeme kanalı yok.
- Sayfa başına SEO/GEO meta verisi ve JavaScript'siz okunabilir içerik var.
- **1.068/1.068 test** ve **4 gerçek tarayıcı smoke testi** geçiyor.

### Lansmanı bekleten 4 P0

1. **Kontrast hatası (BUG):** Birincil (`bg-primary`) butonlarda metin rengi `text-foreground`. Açık ve koyu modun ikisinde de kontrast yetersiz. Koyu modda ölçülen oran **2,38:1**; WCAG AA için gereken **4,5:1**. **16 yerde** var (Kayıt, Dashboard, SmartCheck demo, iş akışı kartları).
2. **`/smartcheck` sayfasında kritik ARIA hatası** (`aria-required-children`): ekran okuyucuyla kullanılamayan bir liste/sekme yapısı.
3. **TLS 1.0 ve 1.1 kabul ediliyor:** Cloudflare'de minimum TLS sürümü düşük. Bu sürümler RFC 8996 ile kullanımdan kaldırıldı; asgari 1.2 olmalı.
4. **DKIM yok:** DMARC `p=reject` varken yalnız SPF'e dayanılıyor. Doğrulama ve parola sıfırlama e-postaları, yönlendirilen kutularda reddedilebilir veya spama düşebilir. Bu sorun 13 Ekim'den beri açık.

---

## 2. Eksen matrisi

| # | Eksen | Durum | Skor | 17 Ekim |
| --- | --- | --- | --- | --- |
| 1 | DevOps, CI/CD, altyapı | UYARI | 7/10 | 5 |
| 2 | Güvenlik | UYARI | 8/10 | 7 |
| 3 | Web standartları ve erişilebilirlik (WCAG 2.2 AA) | **KRİTİK** | 5/10 | 5 |
| 4 | UI / UX ve tasarım sistemi | UYARI | 6/10 | — |
| 5 | SEO | GEÇTİ | 8/10 | 4 (SEO + GEO) |
| 6 | GEO (yapay zekâ / LLM görünürlüğü) | GEÇTİ | 8/10 | — |
| 7 | Performans | GEÇTİ | 8/10 | 8 |
| 8 | Mühendislik ve mevzuat hesapları | UYARI | 7/10 | 4 |
| 9 | Veri, e-posta, ticari akış | UYARI | 6/10 | 3–6 |
| 10 | Test ve kod kalitesi | UYARI | 6/10 | 5 |
| | **Toplam (ağırlıklı)** | | **69/100** | 54 |

---

## 3. Bulgular

### 3.1 DevOps, CI/CD, altyapı — UYARI (7/10)

| Durum | Bulgu | Kanıt |
| --- | --- | --- |
| ✅ | CI her commit'te yeşil (`Verify`: migration, tsc, test, build, Prisma, audit, 3 tarayıcı smoke) | `gh run list`: son 11 koşu `success` |
| ✅ | Deploy kapısı betiği var | `scripts/require-green-ci.sh` |
| ✅ | Konteyner sertleştirme korunuyor: root olmayan kullanıcı, `tini`, `cap_drop`, salt-okunur dosya sistemi, bellek sınırları, healthcheck | `Dockerfile`, `compose.coolify.yaml` |
| ✅ | Canlı sağlık uç noktası ve build revizyonu doğru | `/api/health` → `57d288d…`, `revisionSource: build`, 0,43 sn |
| ❌ **P0** | **TLS 1.0 / 1.1 kabul ediliyor** | `curl --tls-max 1.0` → `SSL connection using TLSv1 … http=200`; aynısı TLS 1.1 için |
| ⚠️ P1 | Uygulama ve migration aynı DB kullanıcısıyla bağlanıyor (DDL yetkili) | `compose.coolify.yaml:27` ve `:155` |
| ⚠️ P1 | Kesintisiz deploy doğrulanmadı (17 Ekim'de ~1 dk 503 ölçülmüştü) | `stop_grace_period: 90s` var; rolling update kanıtı yok |
| ⚠️ P2 | `security.txt` yok, DNS'te CAA kaydı yok | `/.well-known/security.txt` 404; `dig CAA` boş |
| ⚠️ P2 | HTTP → HTTPS yönlendirmesi 302 (kalıcı değil) | `http://bimmetraj.com/` → 302 |
| ⚠️ P2 | Yedek ve restore tatbikatının güncelliği bu incelemede doğrulanmadı | Sunucu erişimi gerekir |

### 3.2 Güvenlik — UYARI (8/10)

| Durum | Bulgu | Kanıt |
| --- | --- | --- |
| ✅ | HttpOnly + SameSite=Strict çerez, aynı-origin CSRF kanıtı, tarayıcıya jeton gövdede verilmiyor, `logout` sunucuda çerezi siliyor | `session-cookie.ts`; E2E smoke: `csrfRejected: true`, `noTokenInStorage: true` |
| ✅ | Başlıklar: CSP (`script-src 'self'`), HSTS `preload`, COOP, Permissions-Policy, `X-Frame-Options DENY`, `nosniff` | Canlı başlıklar |
| ✅ | Sunucu artefaktları ve kaynak haritaları dışarı verilmiyor | `/.env`, `/dist/server.cjs`, `*.map` → 404 |
| ✅ | 17 Ekim'den bu yana auth/middleware dosyalarında değişiklik yok | `git diff 53681be..HEAD -- src/server/auth src/server/middleware` boş |
| ✅ | Bağımlılık denetimi: engellenen açık yok | `dependency-audit-policy.mjs` → `blocked: []` |
| ⚠️ P1 | TLS 1.0/1.1 | Bkz. 3.1 |
| ⚠️ P2 | Kimlikli API yanıtlarında genel `Cache-Control: no-store` yok (yalnız 3 uç noktada var) | `grep no-store src/server` |
| ⚠️ P2 | Hesap bazlı giriş yavaşlatma yok (anahtar: IP + e-posta) | `auth.ts` |
| ⚠️ P2 | CSP, Cloudflare Web Analytics betiğini her sayfada engelliyor (konsol hatası) | Tüm ölçülen sayfalarda `static.cloudflareinsights.com` engellendi |
| ⏸ | Bağımsız sızma testi yok | — |

### 3.3 Web standartları ve erişilebilirlik — KRİTİK (5/10)

Canlı sitede gerçek tarayıcıyla axe-core ölçümü (mobil, açık mod):

| Sayfa | İhlaller (etki · öğe sayısı) |
| --- | --- |
| `/` | color-contrast (ciddi · 4), label-content-name-mismatch (ciddi · 1), scrollable-region-focusable (ciddi · 1) |
| `/pricing` | aynı üç ihlal |
| `/bim-sozlugu` | **color-contrast (ciddi · 23)**; sayfada 2 adet `<h1>` |
| `/register` | color-contrast (7), label-content-name-mismatch (1), **link-in-text-block** (2) |
| `/smartcheck` | **aria-required-children (KRİTİK · 1)**, color-contrast (6), label-content-name-mismatch (1) |
| `/pilot`, `/login` | 1'er ihlal |
| `/hesaplayicilar/kik-asiri-dusuk-teklif` | **0 ihlal** ✅ |
| `/` **koyu mod** | **color-contrast (ciddi · 64)** |

**Kök neden (BUG, P0):** 16 yerde `bg-primary` ile birlikte `text-foreground` kullanılmış. Doğrusu `text-primary-foreground`'dır (`button.tsx` varyantı da öyle tanımlı).
- Açık modda koyu mürekkep kiremit zemin üzerinde kalıyor.
- Koyu modda `#f3f1e9` metin `#e8825a` zemin üzerinde: **2,38:1**.
- Örnekler: `ContractorWorkflowHub.tsx:139,193,251,309`, `SmartCheckDemo.tsx:116,266`, `Dashboard.tsx:214`, `PublicPricingSection.tsx:52`.
- Koyu modda metin içi bağlantılar çevre metinle 1,29:1 kontrastta (`/register`'deki "Koşullar" ve "Gizlilik" bağlantıları).

**Diğer standart bulguları:**
- **Ana içerik işareti (`<main>`):** `/login`, `/register`, `/pilot` ve `/smartcheck`'te yok (WCAG 1.3.1, 2.4.1). Ana sayfada var.
- **`text-[10px]` yazılar:** 856 kullanım. `text-[7–9px]` tamamen temizlenmiş, ama 10 px (≈7,5 pt) yoğun tabloda okunabilirlik sınırında.
- **Test kapsamı (önemli):** `src/lib/a11y-audit.test.ts` jsdom'da elle yazılmış statik bir HTML parçasını denetliyor; CSS olmadığı için **kontrastı ölçemiyor** ve gerçek sayfaları kapsamıyor. Commit mesajındaki "enforce WCAG 2.2 AA with axe-core" ifadesi kanıtla desteklenmiyor. Vitrinde WCAG uyumu iddiası yok; bu doğru.
- **PWA / tema:** `manifest.webmanifest`, `apple-touch-icon` ve `theme-color` yok (P2).

### 3.4 UI / UX ve tasarım sistemi — UYARI (6/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | Nötr sabit renk sınıfları 3.007 → **78**. `text-[7–9px]` 0. Pafta token'ları yaygın kullanılıyor |
| ✅ | Hızlı Tur (Rev. 32), 3 aşamalı iş akışı merkezi (Rev. 31), Revit ön-yükleme kontrol listesi (Rev. 34): onboarding ve bilgilendirme güçlendi |
| ✅ | Kişisel ad otorite olarak ürün metinlerinde kullanılmıyor (test korumalı) |
| ❌ P0 | Birincil buton kontrastı (bkz. 3.3) — görsel olarak da "okunmayan buton" hissi veriyor |
| ⚠️ P1 | Koyu modda 64 kontrast ihlali: koyu mod henüz üretim kalitesinde değil. Kısa vadede düzeltilmeli veya koyu mod "beta" olarak işaretlenmeli |
| ⚠️ P2 | 19 dosya 800 satırın üstünde (en büyükleri: `PricingSources.tsx` 2.115, `CalmIfcWorkspace.tsx` 1.619 satır) — bakım ve kullanıcı akışı karmaşıklığı |

### 3.5 SEO — GEÇTİ (8/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | Her genel sayfa kendine özgü `<title>`, açıklama, canonical, `og:*` ve `og:image` (1200×630) sunuyor; JSON-LD geçerli (Organization + SoftwareApplication + FAQPage) |
| ✅ | Gerçek 404 + `noindex`; `sitemap.xml` 12 URL; `robots.txt`; `www` → apex 301 |
| ✅ | Yayında olmayan hesaplayıcılar 404 ve sitemap/llms.txt dışında |
| ⚠️ P2 | `/login` ve `/register` aynı genel başlığı taşıyor ve canonical'ları `/` (çift başlık, yanlış canonical). Ya kendi meta verisi ya `noindex` |
| ⚠️ P2 | Ana sayfa başlığı 72 karakter; arama sonucunda kesilir (≈60) |
| ⚠️ P2 | FAQPage JSON-LD her sayfada tekrar ediyor (Google, SSS zengin sonuçlarını 2023'ten beri büyük ölçüde kısıtladı; yalnız ana sayfada kalması yeterli) |
| ⚠️ P2 | Organization logosu SVG favicon (Google en az 112 px raster logo bekler); `sameAs` boş |

### 3.6 GEO — yapay zekâ ve LLM görünürlüğü — GEÇTİ (8/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | `llms.txt` (12 KB) ve `llms-full.txt` (33 KB) kayıttan üretiliyor; "CANLI" iddiası 0, L3 iddiası yok, dürüst durum etiketleri var |
| ✅ | JavaScript çalıştırmayan tarayıcılar için `<noscript>` içerik: ana sayfa 513 kelime, KİK hesaplayıcısı 256 kelime (resmî formül ve Tebliğ 45.2 örneğiyle) |
| ⚠️ P1 | **En değerli GEO varlığı olan sözlük (`/bim-sozlugu`) JS'siz yalnız 36 kelime** sunuyor; terimler ham HTML'de yok. Sözlük sayfaları, yapay zekâ yanıtlarında kaynak gösterilmek için en uygun içerik |
| ⚠️ P2 | Diğer sayfalarda noscript içeriği 30–70 kelimede kalıyor; tam ön-render yapılmadı |

### 3.7 Performans — GEÇTİ (8/10)

Canlı ölçüm, mobil kısıtlamalı (Moto G4, 4× CPU, 1,6 Mbps):

| Sayfa | FCP | LCP | CLS | TBT (yaklaşık) |
| --- | ---: | ---: | ---: | ---: |
| `/` (soğuk önbellek) | 2,37 sn | 3,27 sn | 0,001 | 17 ms |
| `/pricing` | 0,39 sn | 0,86 sn | 0 | 18 ms |
| `/hesaplayicilar/kik-…` | 0,42 sn | 0,93 sn | 0,049 | 17 ms |
| `/bim-sozlugu` | 0,37 sn | 1,04 sn | 0,03 | 22 ms |
| `/login`, `/register`, `/pilot`, `/smartcheck` | 0,34–0,46 sn | 0,67–0,94 sn | 0 | 16–19 ms |

- ✅ Sıcak önbellekte bütün sayfalar "iyi" eşiğin (LCP ≤ 2,5 sn, CLS ≤ 0,1) içinde.
- ⚠️ P2: Ana sayfanın soğuk açılışı 3,27 sn ile "iyileştirilmeli" bandında.
- ⚠️ P2: Ana JS paketi **356 kB → 570 kB** (gzip 113 → 171 kB) büyüdü ve Vite'ın 500 kB uyarısını tetikliyor. Kaynak haritası analizi: büyümenin çoğu `react-dom` ve `react-router`'ın ana pakete geçmesinden geliyor. Ayrı `react` paketi (131 kB) hâlâ var.

### 3.8 Mühendislik ve mevzuat hesapları — UYARI (7/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | KİK sınır değer motoru Tebliğ 45.2 resmî örneğini birebir üretiyor (SD 52.281,00 TL); yuvarlama kuralı uygulanıyor |
| ✅ | Müteahhit sınıflandırma (yönetmelik m.4/11/12/14) ve kat karşılığı (KDV Tebliği I/B-8) motorları resmî metne göre yeniden yazıldı ve **yayında değil** |
| ✅ | Rev. 30 saha verileri (`SITE_SCREED_BENCHMARK`, `VILLA_MARKET_COST_BENCHMARK_2026`) hesaba **otomatik uygulanmıyor**; yalnız referans. `%30 emsal harici` kontrolü uyarı veriyor, değer dayatmıyor |
| ✅ | Kayıtta hiçbir yetenek L3 değil; vitrinde uzman onayı iddiası yok |
| ⏸ | Bağımsız mühendis, ihale uzmanı ve mali müşavir imzası yok. 4735 için resmî sayısal örnek yok. Konut KDV oranları için GİB'in güncel konsolide metniyle karşılaştırma yapılmadı |
| ⚠️ P2 | `VILLA_MARKET_COST_BENCHMARK_2026` arayüzde kullanılmıyor (ölü sabit); %30 kuralının yönetmelikteki istisnaları (sığınak, otopark vb.) uzmanca teyit edilmeli |

### 3.9 Veri, e-posta, ticari akış — UYARI (6/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | Migration zinciri boş veritabanına sorunsuz uygulanıyor; Prisma doğrulaması geçiyor |
| ✅ | Faturalama dürüst: yalnız Havale/EFT; kart/taksit kanalı yok, "yakında" notu var |
| ❌ **P0** | **DKIM yok** (yaygın seçicilerin hepsi boş); DMARC `p=reject` |
| ⚠️ P1 | Kart ile tahsilat yok; ücretli self-servis lansman için ödeme sağlayıcısı kararı gerekiyor |
| ⚠️ P2 | 18.848 satırlık ÇŞB kataloğu hâlâ JSON dosyasında (sürümlü "Fiyat Kitabı" tablolarına taşınmadı) |

### 3.10 Test ve kod kalitesi — UYARI (6/10)

| Durum | Bulgu |
| --- | --- |
| ✅ | 1.068 test (0 hata, 0 atlanan), Python 54, 4 tarayıcı smoke (`gap-invitation`, `e2e-core-flow`, `gap-crm-billing`, `gap-admin`) yerelde geçiyor; üçü CI'da |
| ⚠️ P1 | Erişilebilirlik testi gerçek sayfaları ve kontrastı kapsamıyor (bkz. 3.3); gerçek tarayıcıda axe smoke testi yok |
| ⚠️ P2 | `tsconfig` `strict` kapalı; test dışında 135 `any`, 15 `console.log`; 19 dosya 800 satırın üstünde |

---

## 4. Önceliklendirilmiş eylem planı

### P0 — genel ücretli lansmandan önce (1–2 gün + ayar)

| # | İş | Kabul kriteri |
| --- | --- | --- |
| P0-1 | 16 yerde `bg-primary … text-foreground` → `text-primary-foreground`; tercihen bu butonları `<Button>` varyantına taşıyın. Koyu modda metin içi bağlantılara alt çizgi veya yeterli kontrast | Canlı axe: `color-contrast` 0 (açık ve koyu); bkz. §5 komutu |
| P0-2 | `/smartcheck` `aria-required-children` düzeltmesi (rolü olan kapsayıcının gerekli alt rolleri) | axe kritik ihlal 0 |
| P0-3 | Cloudflare → SSL/TLS → **Minimum TLS Version = 1.2** | `curl --tls-max 1.1 https://bimmetraj.com` bağlantı reddi |
| P0-4 | Stalwart'ta `bimmetraj.com` için DKIM anahtarı + DNS `TXT <seçici>._domainkey` | `dig TXT <seçici>._domainkey.bimmetraj.com` dolu; Gmail'de "DKIM: PASS" |

### P1 — ilk 2 hafta

| # | İş |
| --- | --- |
| P1-1 | Gerçek tarayıcıda axe smoke testi CI'a (genel sayfalar + giriş arkası 3 ekran, açık/koyu mod); `a11y-audit.test.ts`'i bunun yerine veya yanına koyun |
| P1-2 | Koyu mod kontrastını düzeltin (64 öğe) veya koyu modu "beta" olarak etiketleyin |
| P1-3 | `<main>` ve sayfa iskeleti: `/login`, `/register`, `/pilot`, `/smartcheck`; `label-content-name-mismatch` (görünen metin, aria-label'ın başında olmalı); `/bim-sozlugu` tek `<h1>` |
| P1-4 | Sözlük terimlerini ham HTML'de sunun (noscript veya sunucu tarafı liste; terim başına alt sayfa uzun vadede) |
| P1-5 | Ayrı runtime DB rolü (yalnız DML) |
| P1-6 | Kesintisiz deploy doğrulaması (deploy sırasında 30 sn aralıklı `/api/health` ölçümü) |
| P1-7 | Ödeme sağlayıcısı kararı ve entegrasyonu (ücretli self-servis için) |
| P1-8 | Uzman imzaları (KİK, 4735, kat karşılığı, müteahhit sınıflandırma) → Yetenek Kaydı L3; GİB konsolide KDV tebliği ile karşılaştırma |

### P2 — iyileştirme

- **Güvenlik ve ağ:** `/api/*` için genel `Cache-Control: no-store`; hesap bazlı giriş yavaşlatma; CSP'ye Cloudflare Insights izni veya Cloudflare'de Web Analytics/RUM kapatma; `security.txt` ve CAA kaydı; HTTP → HTTPS 301.
- **SEO:** `/login` ve `/register` için kendi meta verisi veya `noindex`; ana sayfa başlığını ≤ 60 karakter; FAQ JSON-LD yalnız ana sayfada; raster logo ve `sameAs`; `manifest.webmanifest`, `theme-color`, `apple-touch-icon`.
- **Performans:** ana paketi 500 kB altına indirin (`react-dom`/`react-router` vendor ayrımı); ana sayfanın soğuk LCP'si.
- **Kod kalitesi:** `strict` TS, `any` temizliği, büyük dosyaları bölme; `text-[10px]` yoğunluğunu kritik sayılarda 12–13 px'e çıkarma.
- **Veri:** ÇŞB kataloğunun DB'ye taşınması; ölü `VILLA_MARKET_COST_BENCHMARK_2026` sabitinin arayüze bağlanması veya kaldırılması.
- **Ağ ve kurtarma:** yedek/restore tatbikatını aylık takvime bağlama.

---

## 5. Doğrulama komutları

```bash
# TLS (P0-3): 1.0/1.1 reddedilmeli
curl -sv --tlsv1.0 --tls-max 1.0 -o /dev/null https://bimmetraj.com/ 2>&1 | grep "SSL connection"
curl -sv --tlsv1.1 --tls-max 1.1 -o /dev/null https://bimmetraj.com/ 2>&1 | grep "SSL connection"

# DKIM (P0-4)
dig +short TXT default._domainkey.bimmetraj.com   # Stalwart'ın kullandığı seçiciyle değiştirin

# Kontrast kök nedeni (P0-1): 0 olmalı
grep -rnE "bg-primary[^/-][^\"'\`]*text-foreground|text-foreground[^\"'\`]*bg-primary[^/-]" src --include='*.tsx' | grep -v primary-foreground | wc -l

# Başlıklar, rotalar, sağlık
curl -sI https://bimmetraj.com/ | grep -iE "content-security|strict-transport|cross-origin|permissions-policy"
curl -s https://bimmetraj.com/api/health
for p in / /bim-sozlugu /hesaplayicilar/kik-asiri-dusuk-teklif /yok-boyle; do curl -s -o /dev/null -w "$p %{http_code}\n" https://bimmetraj.com$p; done

# CI
gh run list --workflow Verify --limit 5
scripts/require-green-ci.sh

# Yerel tam doğrulama (izole PostgreSQL; komutlar HANDOFF_2026-10-17.md §4'te)
npx tsc --noEmit && npx tsx --test "src/**/*.test.ts" && npx vite build && node scripts/dependency-audit-policy.mjs
```

Canlı axe ve Core Web Vitals ölçümü için kullanılan betik (puppeteer + axe-core, mobil kısıtlama), bu oturumun geçici çalışma alanında; istenirse `scripts/live-a11y-cwv-audit.mjs` olarak repoya eklenebilir.

---

## 6. Bu incelemenin kapsamadıkları

- Sunucu içi durum: yedeklerin güncelliği, Coolify ayarları, Sentry alarmlarının bugünkü durumu ve canlı DB ile migration eşleşmesi.
- Giriş arkasındaki uygulama ekranlarının canlıdaki axe ve performans ölçümü (yalnız genel sayfalar ölçüldü; giriş arkası ekranlar yerel smoke testlerle kapsandı).
- Gerçek kullanıcıyla kullanılabilirlik testi ve ekran okuyucuyla manuel test.
- Harici sızma testi ve yük testi.
- Hukuki metinlerin (KVKK, mesafeli satış) hukukçu onayı.
