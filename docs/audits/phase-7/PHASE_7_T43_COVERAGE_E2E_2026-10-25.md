# Faz 7 / T43 — kapsam ölçümü, kritik alan takibi ve gerçek tarayıcı E2E

**Tarih:** 25–26 Ekim 2026 (Rev. 87 / R+1 Ratchet Güncellemesi)
**Kod baseline:** `0399ac7` → `e1eb7f9` + Rev. 87 (`BIM-CALC-2026-10-25.81`)
**Karar:** **PARTIAL (R+1 Tamamlandı) — ölçüm, ratchet kapısı ve Playwright E2E CI'da; R+1 hedefi (route ≥ %70, proje ≥ %52) aşılarak route %81,31 ve proje %53,04 seviyesine kilitlendi (%80 nihai eşiğe kalan fark: 26,96 satır puanı)**

## 1. Ne ölçülüyor

- `pnpm run test:coverage` = c8 (`.c8rc.json`, `"all": true`) altında tam `tsx --test "src/**/*.test.ts"` + `scripts/ci/coverage-gate.ts`.
- `"all": true` bilinçli: Node'un yerleşik `--experimental-test-coverage` yalnız testin yüklediği dosyaları sayar (aynı koşuda 441 dosyanın 138'i). Bu, sayıyı şişirir; c8 hiç yüklenmeyen dosyaları %0 olarak paydaya ekler.
- Kapsam: `src/**/*.ts(x)`; `*.test.ts`, `*.pgtest.ts`, `*.d.ts` hariç. Veri ağırlıklı dosyalar (ör. `roadmap-content.ts`, `sample-projects.ts`) **hariç tutulmadı**.
- CI: `verify` işinde `pnpm run verify` üçe bölündü (lint → test:coverage → build) ki tam suite bir kez, c8 altında koşsun. Rapor `coverage-report` artifact'ı (lcov + json-summary) ve GitHub step summary tablosu olarak yayımlanır.
- `REQUIRE_TEST_DATABASE=true` CI'da DB-bağımlı integration testlerinin "DB yok → skip" yolunu hataya çevirir (`src/server/routes/test-db-reachability.ts`). Zorunlu senaryo sessizce atlanamaz.

## 2. Güncel ölçüm (Rev. 87 / R+1 — izole PostgreSQL 16, 3 rol: `bimmetraj_app` / `bimmetraj_control` / `bimmetraj_worker`, IfcOpenShell 0.8.4 venv)

Tam suite: **1416 test — 1409 pass, 0 fail, 7 skip** (`45,86 s`).

| Kapsam | Dosya | Önceki Satır (R0) | Güncel Satır (R+1) | Dal (R+1) | Fonksiyon (R+1) | Yeni Floor (`coverage-thresholds.json`) |
|---|---:|---:|---:|---:|---:|---|
| Proje (`src/**`) | 445 | 46,80% | **53,04%** | **78,05%** | **84,53%** | **52 / 78 / 84** (önceki: 46 / 77 / 82) |
| Auth, oturum, CSRF, güvenlik | 17 | 96,45% | **99,61%** | **92,67%** | **97,97%** | **99 / 92 / 97** (önceki: 96 / 91 / 96) |
| Billing, plan, kota | 17 | 94,18% | **95,53%** | **83,68%** | **100,00%** | **95 / 83 / 98** (önceki: 94 / 81 / 98) |
| Teklif, fiyat, hakediş matematiği | 21 | 96,78% | **96,81%** | **81,81%** | **98,80%** | **96 / 81 / 98** |
| SmartCheck kuralları, IFC import ve metraj | 41 | 89,07% | **89,13%** | **81,97%** | **95,77%** | **89 / 81 / 95** (önceki: 87 / 81 / 94) |
| DB şema ve tenant context | 6 | 99,01% | **99,67%** | **95,76%** | **71,42%** | **99 / 95 / 71** (önceki: 99 / 94 / 66) |
| HTTP API route'ları | 25 | 54,26% | **81,31%** | **63,66%** | **95,54%** | **80 / 63 / 95** (önceki: 54 / 62 / 92) |
| UI (pages/components/hooks) | 164 | 11,42% | **12,30%** | **46,80%** | **22,39%** | **12 / 46 / 22** (önceki: 11 / 46 / 22) |

Floor'lar `coverage-thresholds.json` içindedir ve ölçülen değerin tam sayıya aşağı yuvarlanmışıdır.

### Rev. 87 (R+1) kapsamında eklenen testler ve yakalanıp kapatılan 3 canlı üretim hatası

1. **Yeni Entegrasyon ve Birim Testleri:**
   - `src/server/routes/t43-route-ratchet.integration.test.ts`: `admin.ts` (`%25,19 → %68,59`), `pricing-file-import.ts` (`%24,03 → %77,62`), `academy.ts` (`%24,53 → %87,83`), `billing.ts` (`%36,27 → %77,94`), `company.ts` (`%52,33 → %87,53`), `quotations.ts` (`%47,16 → %79,24`), `profit.ts` (`%15,59 → %93,57`), `crm.ts` (`%49,74 → %73,36`) ve `smartcheck.ts` (`%52,25 → %75,55`) uçlarını 3 rollü gerçek PostgreSQL izolasyonunda uçtan uca doğrular.
   - `src/academy/catalog-and-templates-integrity.test.ts`: Academy alt rehberleri (`subGuidesData.ts`), kaynak veri modelleri (`sourceData.ts`), Allplan sabitleri (`allplanConstants.ts`), ders içerikleri (`lessonsContent.ts`), PDF şablonları (`services/pdf/templates.ts`) ve işlem e-postası şablonlarını (`server/auth/email-templates.ts`) XSS kaçışı ve yapısal bütünlük açısından doğrular.
2. **R+1 Entegrasyon Koşusunda Yakalanıp Kapatılan 3 Üretim Hatası:**
   - **`src/server/routes/auth.ts` (Firmasız Academy Öğrencisi `accountType` Hatası):** `POST /api/auth/login` ve `GET /api/auth/me` uçlarında `companyId === null` olan firmasız Academy öğrencileri için `withAppTenant` çağrılmadığı için `learner = null` dönüyor ve hesap tipi yanlışlıkla `'workspace'` olarak işaretleniyordu (`company-invitation.integration.test.ts` hatası). `companyId === null` durumunda `getControlDatabase().db.query.academyLearnerProfiles.findFirst` sorgusu eklendi.
   - **`src/server/routes/admin.ts` (`POST /api/admin/plans/sync-catalog` `42501` Yetki Hatası):** `sync-catalog` ucu `getControlDatabase().db.transaction` içinde `admin_audit_logs` tablosuna `INSERT` yapmaya çalışıyordu; oysa `bimmetraj_control` rolünün `admin_audit_logs` üzerinde yalnızca `SELECT` yetkisi vardır (`INSERT` yetkisi `bimmetraj_app` rolündedir). Denetim kaydı yazımı transaction sonrasına (`db.insert(adminAuditLogs)`) taşındı.
   - **`src/server/routes/admin.ts` (`GET /api/admin/reports/usage` `topConsumers` FORCE RLS Hatası):** `topConsumers` sorgusu `companies` tablosunu `db.execute` (`bimmetraj_app`, tenant GUC olmadan) ile okuyordu; `companies` üzerinde `FORCE RLS` aktif olduğundan sorgu 0 satır dönüyordu. Sorgu `getControlDatabase().db.execute` (`bimmetraj_control`) üzerinden çalıştırılacak şekilde düzeltildi.

## 3. Açık: %80 proje eşiği

**Gap: 26,96 satır puanı (R0'daki 33,20 puandan 6,24 puan düşürüldü).** Eşik sahte değerle karşılanmadı; kapı bugünkü değerde. Açığın kaynağı:

- UI katmanı (164 dosya, ~41.000 satır) birim testiyle değil gerçek tarayıcıyla doğrulanıyor; c8 Playwright koşusunu ölçmüyor. Tek başına bu katman proje sayısını ~%53'te tutuyor.
- HTTP route'ları %81,31 seviyesine çıkarıldı (`coverage-thresholds.json` floor: `80`).

**Ratchet planı (her release adayında floor yeniden ölçülür, düşemez):**

1. ~~R+1: route integration testleri (admin, pricing, smartcheck yazma uçları) → route kapsamı ≥ %70; proje ≥ %52.~~ **→ TAMAMLANDI (Rev. 87: route %81,31 ≥ %80, proje %53,04 ≥ %52).**
2. R+2: E2E koşusunu V8 coverage ile topla (Playwright `page.coverage` → istanbul merge) ve UI kapsamını raporla; proje ≥ %60.
3. R+3: kalan büyük UI dosyaları için bileşen testleri (jsdom) + kritik alanlarda dal ≥ %85; proje ≥ %70.
4. R+4: proje ≥ %80 — ancak o zaman T43 kapsam kabul kriteri kapanır.

Kritik kapsamlar (auth/billing/teklif matematiği/SmartCheck/DB) bugün %87–99 satırda; bunlar ayrı floor ile izlenir ve proje sayısından bağımsız düşemez.

## 4. Gerçek tarayıcı E2E (Playwright 1.64.0, Chrome)

`pnpm run test:e2e` → `playwright.config.ts` webServer olarak `e2e/support/server.ts`'i başlatır: gerçek Express API + Vite SPA + süreç içi Graphile IFC worker, `createTestIsolation` ile tek kullanımlık şema (paylaşılan DB reddedilir), çıkışta şema silinir. CI'da ayrı `e2e` işi `verify` ile aynı PostgreSQL 16 + rol bootstrap + release migration zincirini kurar.

| Spec | Kapsanan akış |
|---|---|
| `auth.spec.ts` | Giriş formu → HttpOnly/SameSite=Strict çerez, localStorage'da jeton yok, yenilemede oturum sürer, yabancı Origin CSRF 403, çıkış çerezi siler; hatalı kimlik oturum açmaz. `e2e-core-flow-smoke.ts` adımlarının portu. |
| `quotation.spec.ts` | Editörde müşteri seç, kalem gir, kaydet → detay sayfası; sunucuda 10 × 3.000 = 30.000 net, KDV %20 → 36.000; PDF `%PDF-` ile döner. |
| `smartcheck-ifc.spec.ts` | Repo örneği `ifc4-wall-opening-window.ifc` UI'dan yüklenir → complete → process 202 → IfcOpenShell worker işler → `succeeded`, kanıt satırları `pending_review`, UI icmal paftasına geçer. |
| `admin-roadmap.spec.ts` | Süper admin `/admin/roadmap` başlık/meta/ilk-son bölüm/kaynaklar, hesaplama sayfasına geçiş; tenant owner admin rotasından ve `/api/admin/dashboard`'dan (403) dışlanır. |

Yerel sonuç: 6/6 PASS (~17 s). Mevcut Puppeteer smoke'ları (`e2e-core-flow-smoke`, `e2e-a11y-smoke`, invitation, CRM/billing) CI'da korunuyor; a11y axe kapısı Playwright'a taşınmadı.

**Bulgu (Rev. 78 ile düzeltildi):** Teklif editörü sektörü varsayılan `residential` gönderdiğinde `industries` tablosunda bu satır yoksa kayıt 500 (FK) ile düşüyordu. Rev. 78 ile `resolveQuotationIndustryId` ve `CreateQuote.tsx` katalog senkronizasyonu devreye alındı; boş katalogda güvenli `null`'a düşer, dolu katalogda tanımsız/pasif sektöre 400 döner (`src/server/routes/t42-regression.test.ts`).

## 5. Atlanan testler ve gerekçeleri

| Test | Dosya | Neden atlanır | Zorunlu mu |
|---|---|---|---|
| e-proje_4x3 golden manifest (5 test) | `src/ifc/parser-gates.test.ts`, `parser/qto-extractor.test.ts`, `parser/quantity-extractor.test.ts`, `parser/spatial-extractor.test.ts`, `smartcheck-evidence.test.ts` | Örnek `harici-kaynaklar/…/e-proje_4x3.ifc` lisans gereği repoda değil (`.gitignore`) | Hayır; repo örnekleriyle eşdeğer kapsam `smartcheck-ifc.spec.ts` ve IFC unit testlerinde |
| Yerel IFC örneğinden kanıt artefaktı | `src/ifc/smartcheck-processing.test.ts` | Aynı yerel örnek | Hayır |
| Sunucu yolu uçtan uca — Revit IFC, kapı/pencere (2) | `src/ifc/server-path.e2e.test.ts` | `harici-kaynaklar/IfcSampleFiles-main` repoda yok | Hayır |
| Sunucu yolu consistencyReport, browser/worker parity (2) | `src/ifc/server-path.e2e.test.ts` | **Rev. 79 ile çözüldü:** `resolvePythonBin()` + `hasPythonIfcRuntime()` ile hem yerel `.venv` hem CI sistem Python'unda (`actions/setup-python`) atlanmadan koşar (4/4 yerel, 2/2 repo fixture'larıyla CI) | CI'da koşar |
| LibreOffice CSV formül nötrleme | `src/lib/tabular-data.test.ts` | `soffice` CI imajında yok | Takip |
| Gerçek veraPDF CLI | `src/smartcheck/pdf/verapdf-runner.test.ts` | `VERAPDF_CLI_PATH` yok — T32 oturumunun kapsamı | T32'de |
| Üç rollü izolasyon (yerel) | `src/server/routes/test-isolation.test.ts` | Yalnız üç rol URL'si yoksa; CI'da koşar | CI'da koşar |
| DB-bağımlı integration (15 dosya) | `skipIfDatabaseUnavailable` kullananlar | Yerelde DB yoksa; CI'da artık `REQUIRE_TEST_DATABASE=true` ile hata | CI'da atlanamaz |

## 6. Kalan sınırlar

- %80 proje eşiği sağlanmadı (bkz. §3); T43 bu nedenle PARTIAL.
- E2E tek Chrome projesi, tek viewport; mobil/dark ve a11y Playwright'a taşınmadı.
- UI kapsamı c8 sayısına girmiyor; E2E coverage birleştirmesi R+2 işi.
