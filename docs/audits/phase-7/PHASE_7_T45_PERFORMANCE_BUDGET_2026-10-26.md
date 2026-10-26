# Phase 7 — T45 Performans, Chunk İzolasyonu ve İşletim Bütçesi Kanıt Paketi

- **Tarih:** 26 Ekim 2026
- **Revizyon:** Rev. 88 (`BIM-CALC-2026-10-25.82`)
- **Bütçe Kayıt Sürümü:** `BIM-PERF-2026-10-26.1` (`src/server/config/performance-budgets.ts`)
- **İlgili GAP Maddesi:** `T45 — Performans ve işletim bütçesi`
- **Durum:** **PARTIAL (Kod, ExcelJS chunk izolasyonu, ön-kayıtlı bütçe kontratı ve yerel PG16/worker/XLSX/IFC/telemetri/AI fallback ölçümleri tamamlandı; canlı hedef VPS ve izinli gerçek büyük müşteri dosyası kabulü `T51`/`T52` penceresinde açık)**

---

## 1. Ön-Kayıtlı İşletim ve Performans Bütçeleri (`src/server/config/performance-budgets.ts`)

`T45` kabul kriteri uyarınca tüm kaynak tavanları ve p95 hedefleri çalışma zamanı ölçümlerinden önce tek doğruluk kaynağında (`PERFORMANCE_BUDGETS`) kayıt altına alınmıştır:

| Katman / Kapsam | Metrik / Kaynak Sınırı | Ön-Kayıtlı Bütçe (`PERFORMANCE_BUDGETS`) | Üretim / Kod Karşılığı |
|---|---|---:|---|
| **Frontend Ana Giriş (`index-*.js`)** | Minify edilmiş ham boyut üst sınırı | `≤ 120 KB` (`122.880 B`) | `vite.config.ts` |
| **Frontend Ön Yükleme (`modulePreload`)** | İlk HTML veya rota girişinde yasaklı ağır paketler | `charts`, `exceljs`, `ifc-viewer` (`0 B` ön yükleme) | `vite.config.ts` (`resolveDependencies`) |
| **Rota Paketi İzolasyonu** | `exceljs` referansı taşımaması gereken rota paketleri | `CreateQuote`, `SmartCheck`, `Dashboard`, `LandingPage` | `src/lib/quote-xlsx.ts` & `src/lib/pre-bim-xlsx.ts` |
| **Tarayıcı `.xlsx` Yükleme Tavanı** | Maksimum dosya boyutu | `5 MiB` (`5.242.880 B`) | `MAX_XLSX_BYTES`, `MAX_QUOTE_IMPORT_BYTES` |
| **Tarayıcı IFC Önizleme Tavanı** | Maksimum dosya boyutu | `50 MiB` (`52.428.800 B`) | `CalmIfcWorkspace.tsx` / `BimIfcParser.tsx` |
| **`app` Konteyneri** | Docker `mem_limit` / V8 `max-old-space-size` / CPU / `PG_POOL_MAX` | `1.536 MB` / `768 MB` / `1,0 CPU` / `4` | `compose.coolify.yaml` |
| **`worker` Konteyneri** | Docker `mem_limit` / V8 `max-old-space-size` / CPU / eşzamanlılık | `1.024 MB` / `768 MB` / `1,0 CPU` / `2` | `compose.coolify.yaml` |
| **`ifc-worker` Konteyneri** | Docker `mem_limit` / V8 `max-old-space-size` / CPU / zaman aşımı / dosya tavanı | `2.048 MB` / `1.024 MB` / `1,5 CPU` / `600 sn` / `100 MiB` | `compose.coolify.yaml`, `src/server/config/ifc-limits.ts` |
| **`spreadsheet-worker` Alt Süreci** | V8 `max-old-space-size` / eşzamanlı süreç / zaman aşımı / dosya / matris tavanı | `256 MB` / `2 süreç` / `30 sn` / `25 MiB` / `5.001 satır × 256 sütun (100.000 hücre)` | `src/smartcheck/import/spreadsheet-runner.ts`, `spreadsheet-parser.ts` |
| **100 MB Sentetik IFC Parse** | Süre / Peak RSS / Peak Heap | `≤ 6.000 ms` / `< 2.048 MB` / `< 1.024 MB` | `scripts/compare-ifc-parsers.ts --synthetic-100mb` |
| **1.000 Satırlık XLSX Parse** | Tarayıcı + izole worker p95 süresi | `≤ 2.500 ms` | `src/contracts/t45-performance-budget.test.ts` |
| **20 Eşzamanlı Multi-Tenant PG16 Sorgusu** | Tenant A/B çapraz işlem p95 süresi ve sızıntı sayısı | `p95 ≤ 250 ms`, `0 sızıntı` | `src/contracts/t45-performance-budget.test.ts` |
| **SmartCheck Kuyruk Claim + Lease** | Tekil iş alma ve lease token yazma süresi | `≤ 150 ms` | `src/contracts/t45-performance-budget.test.ts` |
| **Sentry PII Maskeleme (`scrubEvent`)** | Olay başına p95 maskeleme süresi | `p95 ≤ 5 ms` | `src/server/observability/error-tracking.ts` |
| **AI Sağlayıcı Yedekleme (`AIProviderRouter`)** | Birincil sağlayıcı hatasında yedek sağlayıcıya geçiş ek yükü / yanıt tavanı | `≤ 50 ms` / `256 KiB` (`AI_RESPONSE_TOO_LARGE`) | `src/services/ai/providers/providerRouter.ts`, `response-limit.ts` |

---

## 2. ExcelJS Chunk İzolasyonu ve Üretim Paketi Ölçümü (`pnpm run build`)

### Önceki Durum (Rev. 87 öncesi)
- `vite.config.ts` içinde `exceljs` için açık bir `manualChunks` kuralı yoktu (`exceljs.min-BHhyGlS6.js` olarak üretiliyordu) ve `modulePreload.resolveDependencies` yalnızca `context.hostType === 'html'` iken `charts` paketini filtreliyordu.
- `src/pages/CreateQuote.tsx` üst düzeyde `parseQuoteXlsx` fonksiyonunu `src/lib/quote-excel-import.ts` içinden statik olarak içe aktardığı için `CreateQuote-CvWvaPUZ.js` (`50,25 kB`) doğrudan `__vite__mapDeps` listesinde `assets/exceljs.min-BHhyGlS6.js` (`940,20 kB`) referansı taşıyordu.

### Yapılan Optimizasyon (Rev. 88)
1. `.xlsx` okuma motoru `src/lib/quote-xlsx.ts` dosyasına ayrıştırıldı (`src/lib/pre-bim-xlsx.ts` mimarisiyle birebir uyumlu); `src/pages/CreateQuote.tsx` artık yalnızca kullanıcı `.xlsx`/`.xls` uzantılı bir dosya seçtiğinde `await import('@/lib/quote-xlsx')` çağrısı yapar.
2. `vite.config.ts` içinde `pkg.startsWith('exceljs/')` açıkça `'exceljs'` chunk'ına bağlandı ve `modulePreload.resolveDependencies` tüm bağlamlarda (`html` ve `js`) `charts`, `exceljs` ve `ifc-viewer` paketlerini ön yükleme listesinden çıkardı.

### Ölçülen Üretim Paketi Karşılaştırması (`dist/assets/`)

| Paket / Chunk | Önceki Boyut (Ham / Gzip) | Yeni Boyut (Ham / Gzip) | İlk Açılış / Rota Girişinde Yüklenme Durumu |
|---|---:|---:|---|
| `index-*.js` (Ana giriş) | `106,60 kB` / `34,31 kB` | **`106,47 kB` / `34,28 kB`** | Yüklenir (`≤ 120 kB` bütçesi içinde) |
| `CreateQuote-*.js` | `50,25 kB` / `14,02 kB` (`exceljs` bağımlı) | **`49,67 kB` / `13,82 kB`** (`exceljs` bağımsız) | Yalnız `/app/quotes/new` rotasında yüklenir; `exceljs` yüklemez |
| `quote-xlsx-*.js` | *(Yoktu — `CreateQuote` içindeydi)* | **`1,21 kB` / `0,68 kB`** | Yalnız teklif ekranında `.xlsx` dosyası seçildiğinde yüklenir |
| `pre-bim-xlsx-*.js` | `0,96 kB` / `0,57 kB` | **`0,96 kB` / `0,57 kB`** | Yalnız ön-BIM ekranında `.xlsx` dosyası seçildiğinde yüklenir |
| `exceljs-*.js` | `940,20 kB` / `271,34 kB` | **`940,20 kB` / `271,33 kB`** | İlk açılışta, rota geçişlerinde ve CSV işlemlerinde **0 B**; yalnız `.xlsx` seçildiğinde dinamik yüklenir |
| `charts-*.js` | `445,43 kB` / `125,88 kB` | **`445,43 kB` / `125,87 kB`** | İlk HTML'de ön yüklenmez |
| `ifc-viewer-*.js` | `4.113,54 kB` / `535,00 kB` | **`4.113,54 kB` / `535,00 kB`** | İlk HTML'de ön yüklenmez; yalnız 3B IFC inceleme açıldığında yüklenir |

---

## 3. Çalışma Zamanı Ölçümleri ve Limit Aşımı Geri Kazanım Kanıtı

Doğrulama komutu:
```bash
pnpm exec tsx --test src/contracts/t45-performance-budget.test.ts src/lib/quote-excel-import.test.ts src/lib/pre-bim-xlsx.test.ts
```

| Test Senaryosu | Ölçülen Değer | Ön-Kayıtlı Bütçe | Limit Aşımı / Geri Kazanım Kanıtı | Sonuç |
|---|---:|---:|---|---|
| **T45-1: Bütçe & Compose Hizalaması** | `0,43 ms` | Deterministik | `compose.coolify.yaml` (`1536m`/`1024m`/`2048m`), `ifc-limits.ts` (`100 MiB`, `2` eşzamanlı), `5 MiB` `.xlsx` ve `256 KiB` AI yanıt sınırları birebir eşleşti | **PASS** |
| **T45-2: Bundle & Preload İzolasyonu** | `0,97 ms` | `index ≤ 120 KB`, `0` ağır preload | `index-D7FUvkHX.js = 106,47 kB`; `CreateQuote`, `SmartCheck`, `Dashboard`, `LandingPage` içinde `exceljs` referansı `0` | **PASS** |
| **T45-3: 1.000 Satır XLSX + İzole Worker (`256 MB`)** | `1.489,98 ms` (toplam) | `≤ 2.500 ms` | `> 5 MiB` tarayıcı `.xlsx` `< 5 ms` içinde `Dosya 5 MB sınırını aşıyor.` döner; `> 25 MiB` sunucu dosyası `FILE_SIZE_INVALID` fırlatır; 3. eşzamanlı worker çağrısı `SPREADSHEET_BUSY` ile reddedilir ve aktif işler bitince 4. çağrı başarıyla tamamlanır | **PASS** |
| **T45-4: Sentry PII Maskeleme & AI Router Fallback** | `3,77 ms` (100 olay + AI failover) | `p95 ≤ 5 ms` (scrub), `≤ 50 ms` (AI) | `scrubEvent` URL sorgu dizgesini, çerezleri, gövdeyi ve `Authorization` başlığını temizler; `sanitizeErrorForReporting` SQL metnini/parametrelerini dışarı sızdırmaz; birincil AI sağlayıcısı (`UPSTREAM_RATE_LIMIT_429`) hata verdiğinde ikincil sağlayıcıya (`fallback-gemini`) kesintisiz geçer; `> 256 KiB` yanıt `AI_RESPONSE_TOO_LARGE` ile durdurulur | **PASS** |
| **T45-5: 20 Eşzamanlı Tenant PG16 + Kuyruk Claim** | `p95 = 21,90 ms` (DB), `3,78 ms` (claim) | `p95 ≤ 250 ms` (DB), `≤ 150 ms` (claim) | Tenant A ve Tenant B için 20 paralel `withAppTenant` sorgusunda `0` veri sızıntısı; `document_processing_runs` üzerinde atomik `queued → running` + `workerLeaseToken` ataması `3,78 ms` | **PASS** |
| **Rev. 65: 100 MB Sentetik IFC Parser (3 Koşu)** | `3.590–3.623 ms`, Peak RSS `1.190–1.238 MB`, Heap `779–827 MB` | `≤ 6.000 ms`, RSS `< 2.048 MB`, Heap `< 1.024 MB` | `scripts/compare-ifc-parsers.ts --synthetic-100mb` ile 3 ayrı süreçte doğrulandı | **PASS** |

---

## 4. Kalan Sınır (Neden `T45` `PARTIAL` Kalır?)

- Ön-kayıtlı işletim bütçeleri (`PERFORMANCE_BUDGETS`), ExcelJS chunk izolasyonu (`quote-xlsx.ts`), limit aşımı hata/geri kazanım davranışları ve yerel PG16/worker/XLSX/IFC/telemetri/AI fallback ölçümleri tamamlanmış ve otomatik kontrat testine (`src/contracts/t45-performance-budget.test.ts` `5/5 PASS`) bağlanmıştır.
- Ancak `GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md` §4 `T45` ve §8.2 kuralları gereği **canlı hedef VPS üzerinde izinli gerçek büyük müşteri IFC/Excel/PDF dosyalarıyla (`T51`) ve canlı Sentry/alert teslimiyle (`T52`) doğrulama** tamamlanmadan `T45` tam kapanış (`[x]`) olarak işaretlenmez; `PARTIAL` statüsünde izlenir.
