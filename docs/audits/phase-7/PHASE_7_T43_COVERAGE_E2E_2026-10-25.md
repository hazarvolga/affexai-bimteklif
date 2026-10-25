# Faz 7 / T43 — kapsam ölçümü, kritik alan takibi ve gerçek tarayıcı E2E

**Tarih:** 25 Ekim 2026
**Kod baseline:** `0399ac7` (main) + bu dalın commit'leri
**Karar:** **PARTIAL — ölçüm, ratchet kapısı ve Playwright E2E CI'da; proje %80 eşiği sağlanmıyor (bugün %46,80 satır)**

## 1. Ne ölçülüyor

- `pnpm run test:coverage` = c8 (`.c8rc.json`, `"all": true`) altında tam `tsx --test "src/**/*.test.ts"` + `scripts/ci/coverage-gate.ts`.
- `"all": true` bilinçli: Node'un yerleşik `--experimental-test-coverage` yalnız testin yüklediği dosyaları sayar (aynı koşuda 441 dosyanın 138'i). Bu, sayıyı şişirir; c8 hiç yüklenmeyen dosyaları %0 olarak paydaya ekler.
- Kapsam: `src/**/*.ts(x)`; `*.test.ts`, `*.pgtest.ts`, `*.d.ts` hariç. Veri ağırlıklı dosyalar (ör. `roadmap-content.ts`, `sample-projects.ts`) **hariç tutulmadı**.
- CI: `verify` işinde `pnpm run verify` üçe bölündü (lint → test:coverage → build) ki tam suite bir kez, c8 altında koşsun. Rapor `coverage-report` artifact'ı (lcov + json-summary) ve GitHub step summary tablosu olarak yayımlanır.
- `REQUIRE_TEST_DATABASE=true` CI'da DB-bağımlı integration testlerinin "DB yok → skip" yolunu hataya çevirir (`src/server/routes/test-db-reachability.ts`). Zorunlu senaryo sessizce atlanamaz.

## 2. Bugünkü ölçüm (yerel, izole PostgreSQL 16, IfcOpenShell 0.8.4 venv)

Tam suite: 1381 test — 1371 pass, 0 fail, 10 skip.

| Kapsam | Dosya | Satır | Dal | Fonksiyon | Floor (satır/dal/fn) |
|---|---:|---:|---:|---:|---|
| Proje (`src/**`) | 440 | **46,80%** | 77,98% | 82,91% | 46 / 77 / 82 |
| Auth, oturum, CSRF, güvenlik | 14 | 96,45% | 91,44% | 96,42% | 96 / 91 / 96 |
| Billing, plan, kota | 17 | 94,18% | 81,69% | 98,52% | 94 / 81 / 98 |
| Teklif, fiyat, hakediş matematiği | 21 | 96,78% | 81,55% | 98,79% | 96 / 81 / 98 |
| SmartCheck kuralları, IFC import ve metraj | 40 | 89,07% | 81,22% | 96,17% | 87 / 81 / 94 |
| DB şema ve tenant context | 6 | 99,01% | 94,18% | 66,66% | 99 / 94 / 66 |
| HTTP API route'ları | 25 | 54,26% | 62,05% | 92,10% | 54 / 62 / 92 |
| UI (pages/components/hooks) | 164 | 11,42% | 46,80% | 22,39% | 11 / 46 / 22 |

Floor'lar `coverage-thresholds.json` içindedir ve ölçülen değerin tam sayıya aşağı yuvarlanmışıdır. CI ilk koşusu farklı çıkarsa floor yalnız yukarı çekilir.

## 3. Açık: %80 proje eşiği

**Gap: 33,20 satır puanı.** Eşik sahte değerle karşılanmadı; kapı bugünkü değerde. Açığın kaynağı:

- UI katmanı (164 dosya, ~41.000 satır) birim testiyle değil gerçek tarayıcıyla doğrulanıyor; c8 Playwright koşusunu ölçmüyor. Tek başına bu katman proje sayısını ~%47'de tutuyor.
- HTTP route'ları %54: yalnız route-level integration testi olan uç noktalar sayılıyor.

**Ratchet planı (her release adayında floor yeniden ölçülür, düşemez):**

1. R+1: route integration testleri (admin, pricing, smartcheck yazma uçları) → route kapsamı ≥ %70; proje ≥ %52.
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
