# BIMMetraj (TeklifPro) GAP Raporu — 17 Ekim 2026

**Karar:** Canlı sistem sağlıklı ve 13–14 Ekim raporlarındaki teknik P0'ların büyük kısmı kapanmış durumda. Ancak Rev. 7–8 ile **iki yeni kritik risk** geldi: (1) IFC icmal motoru, dosya adında `2026_45` geçen her modelde gerçek veri yerine koda gömülü referans metrajı gösterebiliyor; (2) commit edilmemiş pilot başvuru değişikliği, kimlik doğrulaması olmadan başkasının kaydını değiştirmeye ve kişisel verisini okumaya izin veriyor. Ticari tarafta kartla tahsilat, AI ve DB rol ayrımı hâlâ açık.

Bu rapor yalnız analizdir; kodda değişiklik yapılmamıştır.

---

## 1. Kapsam ve yöntem

| Alan | Yapılan |
| --- | --- |
| Kaynak | `main` @ `a78e6f9` (Rev. 8) + çalışma ağacındaki commit edilmemiş 7 dosya |
| Önceki raporlar | `guncel-gap.md` (13 Ekim), `GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md`, `docs/agent-memory/HANDOFF_2026-10-15.md` maddeleri kodla tek tek karşılaştırıldı |
| Statik kontrol | `tsc --noEmit` |
| Testler | `tsx --test "src/**/*.test.ts"` (yerel, izole DB yok) ve `workers/ifc` Python testleri (`.venv` ile) |
| Canlı | Anonim `GET` istekleri: `/api/health`, `/`, `/sitemap.xml`, `www` yönlendirmesi |

---

## 2. Canlı durum (17 Ekim 2026)

| Kontrol | Sonuç | Yorum |
| --- | --- | --- |
| `/api/health` | `ok`, DB bağlı, tüm hazırlık bayrakları `true` | `smartcheckStorageConfigured: true` (13 Ekim'de `null` idi) |
| Canlı revizyon | `a78e6f9…` (`revisionSource: "build"`) | Yerel `HEAD` ile aynı; Rev. 8 canlıda |
| Güvenlik başlıkları | HSTS, X-Frame-Options DENY, **CSP var** | CSP'de Firebase alan adları açık (bkz. Y-8) |
| `sitemap.xml` | 200 | Kapandı |
| `www.bimmetraj.com` | 301 → `https://bimmetraj.com/` | Kapandı |

---

## 3. Önceki raporlardan kapananlar (kodla doğrulandı)

| Önceki ID | Konu | Kanıt |
| --- | --- | --- |
| P0-4 | Gözlemlenebilirlik | `Sentry.init` var ([error-tracking.ts:39](src/server/observability/error-tracking.ts:39)); revizyon build damgasından okunuyor |
| P0-5 (kısmen) / P1-4 | CSP, sitemap, `www` → apex | [app.ts:80-92](src/server/app.ts:80), [app.ts:212](src/server/app.ts:212); canlıda doğrulandı |
| P0-6 / L-6 | Limitlerin DB planına bağlanması | [feature-limits.ts:46](src/services/billing/feature-limits.ts:46) önce plan kolonunu okuyor; `PLAN_LIMITS` yalnız `planId` olmayan eski abonelikler için yedek |
| L-3 | Kullanılmayan `QuoteEditor.tsx` | Dosya silinmiş |
| L-4 | Ekran / sunucu marj farkı | `CreateQuote.tsx:325` artık sunucuyla aynı `calculateQuotationFinancials` fonksiyonunu kullanıyor |
| L-5 | Eskalasyon 1,9 kat fazla | Bileşik orta nokta formülü uygulanmış ([financial-calculations.ts:38-43](src/lib/financial-calculations.ts:38)) |
| L-7 | Deneme paketinin belirsiz seçimi | `isTrial` bayrağı eklendi ([trial-plan.ts:13](src/services/billing/trial-plan.ts:13)) |
| L-9 | Tarayıcı IFC ön analizi kotaya sayılmıyor | Uç nokta ve entegrasyon testi var (`ifc-browser-analysis.integration.test.ts`) |
| P0-11 | `extract-zip` audit istisnası | Puppeteer 25 ile kalktı (`scripts/dependency-audit-policy.mjs:5`) |
| E-1 / GAP-08 | 3x3 kuralları gerçek IFC'de çalışmıyordu | IFC çıkarıcı `loadBearing`, `coverMm`, `discipline`, `expectedQuantity` üretiyor; kural koşusuna bağlı |
| BUG-01…10 (14 Ekim) | KVKK maskeleme, EK-9 paneli, ön kontrol kilidi vb. | 14 Ekim raporunun §8 kapanış tablosu; Python testleri 53/53 geçiyor |

---

## 4. Yeni bulgular (17 Ekim)

### P0 — üretimde yanlış sonuç veya veri ifşası

| ID | Bulgu | Kanıt | Etki | Çıkış kriteri |
| --- | --- | --- | --- | --- |
| **Y-1** | **IFC icmali dosya adına göre gömülü referans veriye dönüyor** | [calm-icmal.ts:1119-1126](src/ifc/calm-icmal.ts:1119): `/2026_45/i.test(fileName)` ve modelde çok katmanlı kaplama yoksa `buildCalibrated202645Dataset()` döner. Aynı mantık [calm-icmal.ts:1250](src/ifc/calm-icmal.ts:1250) (daire cetveli) ve [calm-icmal.ts:1300](src/ifc/calm-icmal.ts:1300) (artefakttan icmal) içinde de var. Veri seti tek bir Allplan modelinden sabitlenmiş metrajlar içeriyor (ör. 840,22 m², 416,71 m², 16 daire) | Adında `2026_45` geçen **herhangi** bir müşteri dosyası (desen başa bağlı değil; ör. `Proje_2026_450_…`) kendi modelinin değil, referans projenin metrajını ve daire cetvelini görür. Kullanıcıya bu sayıların gerçek olmadığı söylenmiyor; teklife aktarılırsa yanlış teklif çıkar | Referans veri yalnız açık `sampleId` ile (örnek proje kartı) açılsın; dosya adı eşleşmesi kaldırılsın; gerçek modelde katman yoksa "katman bilgisi yok" uyarısı gösterilsin; regresyon testi |
| **Y-2** | **Pilot başvurusunda kimlik doğrulamasız kayıt değiştirme ve kişisel veri dönüşü** (commit edilmemiş) | `src/server/routes/pilot.ts` çalışma ağacı farkı: `POST /api/pilot-applications` herkese açık; e-posta zaten kayıtlıysa gelen `fullName`, `phone`, `currentWorkflow` ile kaydı günceller ve `{ ...updated }` ile **tüm kaydı** (telefon, iş akışı notu, durum) yanıtta döndürür | Bir e-posta adresini bilen herkes başkasının başvurusunu değiştirebilir, telefonunu ve notlarını okuyabilir, e-postanın kayıtlı olup olmadığını öğrenebilir (KVKK ihlali). Ayrıca `resource-limits.test.ts` hata mesajı beklentisi (`/Eksik veya geçersiz/`) bu değişiklikle kırılır | Mevcut kayıt için 200 + yalnız `{ alreadyRegistered: true }` dönsün, alanlar üzerine yazılmasın (veya yalnız boş alanlar doldurulsun); `payload: any` yerine zod şeması; test güncellensin. **Bu hâliyle commit edilmemeli** |

### P1 — güven, süreç ve test kapsamı

| ID | Bulgu | Kanıt | Çıkış kriteri |
| --- | --- | --- | --- |
| Y-3 | Çalışma ağacı analiz sırasında değişiyordu | Başta 5 dosya değişikti; analiz sırasında `LandingPage.tsx` ve `AdminShell.tsx` de eklendi (başka bir oturum/ajan aynı klasörde çalışıyor). 7 dosya, ~400 satır commit edilmemiş | Aynı checkout'ta tek yazar; paralel işler worktree'de |
| Y-4 | "Birim" auth testleri gizlice gerçek DB'ye bağlı | [auth.ts:44](src/server/middleware/auth.ts:44) impersonation iptal sorgusu, enjekte edilen adaptörü atlayıp global `db` kullanıyor. DB yokken `auth.tenant.test.ts` içindeki 4 test ve `admin-features.test.ts` içindeki 2 test düşüyor | İptal kontrolü de adaptör üzerinden; birim testler DB'siz geçsin |
| Y-5 | Repo hijyeni: müşteri verisi ve büyük dosyalar gitignore'da değil | İzlenmeyen ama yok sayılmayan: `melihdinekli/` (müşteri metraj Excel'leri), `TeklifPro_Melih_Bey_*.pdf`, 31 MB IFC, 328 MB `IfcSampleFiles-main/`. Kökte izlenen artıklar: `4708.pdf`, `01-ifc-worker-prompt.md`, `02-super-admin-prompt.md`, `test-tenants.ts`, `seed-superadmin.*`, `walkthrough.md`, `summary.md` | Müşteri dosyaları repo dışına veya `.gitignore`'a; kök dizin temizliği; örnek IFC'ler için Git LFS veya ayrı depo |
| Y-6 | Kartla tahsilat yok, `stripe` bağımlılığı ölü | `stripe` paketi `package.json`'da, `src/` içinde hiç kullanılmıyor. Canlıda yalnız Havale/EFT + Superadmin onayı var | Ya Stripe/iyzico akışı (webhook imza + idempotency testleri) ya da bağımlılık kaldırılsın |
| Y-7 | Uçtan uca (E2E) test yok | `*.spec.ts` sayısı 0; CI yalnız `verify.yml` (lint + test + build). Kayıt → teklif → PDF → SmartCheck yolculuğu otomatik doğrulanmıyor | Kritik 3 akış için Playwright smoke testi CI'da |

### P2 — bakım ve kod kalitesi

| ID | Bulgu | Kanıt |
| --- | --- | --- |
| Y-8 | Gereksiz saldırı yüzeyi | CSP'de 5 Firebase alan adı açık; Firebase yalnız kapalı Akademi modülünde kullanılıyor (`ACADEMY_ENABLED = false`) |
| Y-9 | Dosya boyutu sınırı (800 satır) aşımı: 18 dosya | En büyükleri: `schema.ts` 1894, `PricingSources.tsx` 1842, `ifc_extract.py` 1813, `routes/admin.ts` 1658, `PlanEditor.tsx` 1395, `calm-icmal.ts` 1309 (yarısı gömülü veri), `sample-projects.ts` 1212, `SmartCheckImportWorkspace.tsx` 1062 |
| Y-10 | Tip güvenliği | Test dışı kodda 134 `any` / `as any`, 15 `console.log` |
| Y-11 | Büyük yanıt | `GET /api/smartcheck/documents/:id/rows` varsayılan 5.000, en çok 10.000 satırı tek yanıtta, sayfalama meta verisi olmadan dönüyor ([smartcheck.ts:411](src/server/routes/smartcheck.ts:411)) |
| Y-12 | Python testleri sistem Python'unda çalışmıyor | `python3` (3.9) ile `ifcopenshell`/`pytest` yok; yalnız `workers/ifc/.venv` ile 53/53 geçiyor. Handoff'taki komut bu ayrıntıyı vermiyor |

---

## 5. Önceki raporlardan hâlâ açık olanlar

| Önceki ID | GAP | Bugünkü durum |
| --- | --- | --- |
| P0-2 | Tahsilat | Açık (bkz. Y-6). Mesafeli satış sözleşmesi ve KVKK metinlerinin hukuk onayı kodda görülemiyor |
| P0-3 / P0-12 | Gerçek pilot kanıtı | Kodda doğrulanamadı. Örnek projeler ve kabul kanıt paketi var, ama ücretli müşteride ölçülmüş metrik (ilk teklif süresi, hata oranı) kaydı yok |
| P0-5 | Bağımsız güvenlik incelemesi | Kanıt yok |
| P1-1 | Uygulama DB'ye şema sahibi rolüyle bağlanıyor | Açık: `compose.coolify.yaml:27` (`app`) ve `:155` (`migrate`) aynı `bimmetraj` kullanıcısı |
| P1-2 | Resmî birim fiyat lisansı | Kod dışı; örnek projeler 2 ÇŞB pozunu tenant'a ekliyor, lisanslı tam katalog yok |
| P1-6 | AI sağlayıcı anahtarları | Handoff'a göre üretimde yok; AI akışları kapalı |
| E-10 / RG 33331 | EK-6 / EK-3 tam doğrulama | Kısmen: 8 IFC sınıfı ve EK-9 Tablo 9.1/9.2 eşitlendi; kalan EK-6 Pset tabloları ve EK-3 mahal kısaltmaları satır satır doğrulanmadı |
| Bakanlık | Teknik görüş (6 soru) | Yanıt bekleniyor (`BAKANLIK_TEKNIK_GORUS_VE_TOPLANTI_DOSYASI.md`) |

---

## 6. Doğrulama sonuçları

| Kontrol | Sonuç |
| --- | --- |
| `tsc --noEmit` | 0 hata |
| Node test suite (yerel) | 803 test: **739 geçti**, 52 düştü, 6 iptal, 6 atlandı. Düşenlerin 46'sı izole DB olmadığı için bilerek reddedildi, 4'ü Postgres bağlantısı yok. Kalan 6 düşüş Y-4 (DB'ye bağlı auth testleri) ve pilot oran sınırlayıcısının DB'ye ihtiyacı. Tam doğrulama için CI'daki izole PostgreSQL 16 gerekir; burada koşulmadı |
| Python worker testleri (`.venv`) | 53/53 geçti |
| Canlı HTTP | Bkz. §2 |

---

## 7. Önerilen sıra

1. **Y-2:** Pilot değişikliğini bu hâliyle commit etme; yanıtı ve güncelleme davranışını düzelt.
2. **Y-1:** Dosya adına bağlı referans veri dönüşünü kaldır; örnek veriyi yalnız örnek proje kartına bağla, regresyon testi ekle. Ardından canlıya al (Coolify'da elle deploy).
3. **Y-3, Y-5:** Çalışma ağacını tek yazara indir, müşteri dosyalarını repodan çıkar/yok say.
4. **P1-1:** Ayrı runtime DML rolü.
5. **P0-2 / Y-6:** Tahsilat kararı (kart sağlayıcısı veya bağımlılığın kaldırılması).
6. **Y-4, Y-7:** DB'siz geçen auth birim testleri + Playwright smoke testleri.
7. P2 maddeleri (dosya bölme, `any` temizliği, `/rows` sayfalama, CSP daraltma).
