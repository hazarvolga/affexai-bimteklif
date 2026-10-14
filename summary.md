# TeklifPro / BIMMetraj Ara Özet & Handoff

Tarih: 2026-10-14

## Güncel Handoff — 2026-10-14 GAP / BUG / UI-UX Kapanışı & Canlı Dağıtım

- **Rapor:** [`GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md`](./GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md)
- **Dal (Branch):** `main` (`https://github.com/hazarvolga/affexai-bimteklif.git`)
- **Uzak Dal Analizi:** `origin/feat/epys-preflight`, `origin/fix/gap-closure-2026-10-13`, `origin/feat/smartcheck-evaluation-baseline` ve `origin/ui/redesign-v2` dallarının tamamı `main` içinde birleşmiş durumdadır (`0` birleşmemiş commit).

### 1. Atomik Commit Zinciri (`origin/main`)
1. `bf844d3` — `fix(epys): prevent KVKK masking from leaking 11th TCKN digit or corrupting IFC GlobalIds (BUG-01)`
2. `079b010` — `feat(ifc): extract 3x3 structural properties and wire into validateThreeByThreeRules (GAP-08, BUG-09)`
3. `c97d7e3` — `fix(smartcheck): preserve epys_preflight on non-QTO IFC runs and bind PDF quota to plan (BUG-02, BUG-03, BUG-10, GAP-11)`
4. `9521d85` — `feat(smartcheck): add contractual opening deduction (minha) and structural intersection engine (GAP-06)`
5. `2d64619` — `feat(quotes): support derived rebar/formwork transfer, per-line cost rounding, and category/discount controls (GAP-05, BUG-05, BUG-06, BUG-07)`
6. `a12d435` — `fix(ui): add SmartCheck/Market/Profitability nav links, unify IFC CTAs, and update legal & landing pages (BUG-04, BUG-08, GAP-01, GAP-04)`
7. `dd060e4` — `feat(review): add reviewerDiscipline contract and CalculationMethods sign-off evidence metadata (GAP-07, GAP-12)`
8. `35c63ad` — `docs: add 2026-10-14 GAP/BUG/UI/UX analysis report and update agent memory & graphify`
9. `9ab9ae5` — `test(smartcheck): isolate Graphile Worker test runners from parallel schema worker:migrate notifications`

### 2. Doğrulama & Canlı Dağıtım (Coolify)
- **GitHub Actions CI (`Verify`):** Run `38570914778` (`9ab9ae5b07f2d3caeb81ea8c185794fc3595ed5e`) **yeşil (`success`)** — Python IFC motor testleri (25/25), release migration yaşam döngüsü, 879 testlik izole PostgreSQL 16 doğrulaması, Prisma shadow kontratı, bağımlılık denetimi, Docker `app` + `ifc-worker` imaj derlemeleri ve ağ-izole smoke testleri geçti.
- **Coolify Production (`https://bimmetraj.com`):**
  - Sunucu: `affexai-prod` (`https://coolify.affexai.tr/project/xxqssmrn4inb7po5nrlwrnnw/environment/egcqcs2v5hwwnpcsghsgi935`, App UUID: `ibjv2zbpecdcbd71lxo1vqd7`)
  - Deployment UUID: `pk249c4bzn7yml3gny65rlrd` (`status: "finished"`)
  - Canlı `/api/health`: `status: "ok"`, `db: "connected"`, tüm `readiness` bayrakları `true` (`persistentRateLimit`, `emailDeliveryConfigured`, `publicUrlConfigured`, `smartcheckStorageConfigured`).
- **Graphify:** `graphify update .` çalıştırıldı (`10,312` düğüm, `14,654` kenar, `885` topluluk).

### 3. Kalan Operasyonel / Ticari Maddeler (Hazar Sahipliğinde)
1. **P0-2 (Stripe Canlı Tahsilat):** Canlı Stripe anahtarları, sandbox uçtan uca abonelik/webhook replay kabulü ve hukuk müşaviri nihai onayı.
2. **P0-3 (Gerçek Pilot Saha Kabulü):** 5 müşteri izinli gerçek IFC/PDF dosyasıyla uzman mühendis imzalı (`signOffEvidence`) pilot kabulü.
3. **P0-5 / P1-1 (Güvenlik & Runtime DB Rolü):** Harici sızma testi ve üretimde migration sahibi rolden ayrılmış DML-only uygulama/worker DB rolü.
4. **P1-2 / P1-6 / P1-8:** YFK yazılı veri lisansı, üretim AI sağlayıcı anahtarları (`OPENAI_API_KEY` / `GEMINI_API_KEY`) ve `bimmetraj.com` Stalwart DKIM DNS kaydı.

---

## Önceki Handoff — SmartCheck Safe Bulk Review (2026-08-02)

Branch: `feat/smartcheck-evaluation-baseline`

Son çalışma fazı:

- SmartCheck operasyon özetinden güvenli toplu review akışı eklendi.
- Yeni endpoint: `PATCH /api/smartcheck/documents/:id/bulk-review`.
- Endpoint yalnız `status=approved` kabul eder.
- Yalnız aynı tenant/dokümana ait, `pending_review`, açık bulgusu olmayan
  satırlar toplu onaylanır.
- Açık bulgulu IFC satırları toplu onaylanmaz; düzeltme veya gerekçeli istisna
  gerektirir.
- `/app/smartcheck` ekranında `Bulgusuzları toplu onayla (...)` butonu eklendi.

Doğrulandı:

- `pnpm exec tsx --test src/contracts/smartcheck.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 4/4 geçti.
- `pnpm lint` -> geçti.
- `pnpm run build` -> geçti.
- Headless browser smoke, geçici iki satırlı SmartCheck dokümanında yalnız
  bulgusuz satırın toplu onaylandığını ve bulgulu satırın `pending_review`
  kaldığını doğruladı.
- `graphify update .` çalıştırıldı.

Bilerek stage/commit dışı bırakılacaklar:

- `ifc-document-sample/`
- `graphify-out/2026-08-02/` backup klasörü

Devam için önerilen sıradaki faz:

1. Populated IFC ekranında 160 satırlık görsel/performans smoke.
2. Sonra fiyat kanıtı tarafında daha iyi bulk bağlama/filtreleme UX'i:
   yalnız `safe_candidate` + uyarısız fiyat snapshotlarını otomatik bağla,
   kalanları ayrı “insan kararı gerekir” kuyruğunda göster.
3. Ardından teklif taslağına aktarım öncesi “eksik fiyat kanıtı / risk özeti”
   confirmation paneli.

Servis notu:

- Bu fazın tarayıcı smoke’u için geçici `PORT=3014` server açıldı ve test
  sonrası kapatıldı.
- `3013` portu dolu göründü fakat health cevap vermedi; ara sonrası yerel
  server durumu kontrol edilerek devam edilmeli.

---

# Eski Ara Özet

Tarih: 2026-05-14

## Stratejik Karar

Mevcut Vite + Express + Drizzle + PostgreSQL repo pilot geliştirme zemini olarak
seçildi. Next.js + Prisma + Auth.js geçişi pilot ürün gerçek kullanıcı seviyesine
geldikten sonra parity/cutover planı ile yeniden değerlendirilecek.

## Tamamlanan Commitler

- `52882be` docs: establish pilot roadmap and agent memory
- `26e9432` refactor: split server bootstrap and core routes
- `15df789` feat: harden auth tenant and usage guards
- `bd07ec0` feat: enforce server side quote calculations
- `882e3be` feat: add multi ai provider routing
- `edfc9b2` docs: add pilot deploy security observability readiness
- `446a331` refactor: extract remaining domain routes

## Kalıcı Ajan Hafızası

Eklenen ana dosyalar:

- `AGENTS.md`
- `docs/agent-memory/README.md`
- `docs/agent-memory/PROJECT_BRIEF.md`
- `docs/agent-memory/WORKING_STATE.md`
- `docs/agent-memory/ARCHITECTURE_DECISIONS.md`
- `docs/agent-memory/PILOT_PLAN.md`
- `docs/agent-memory/AGENT_PROTOCOL.md`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- `graphify-out/graph.html`

Graphify kuruldu ve güncellemeler çalıştırıldı. Son bilinen graph update:

- 249 node
- 247 edge
- 60 community

## Mimari Durum

`server.ts` artık küçük entrypoint.

Express app assembly:

- `src/server/app.ts`

Middleware:

- `src/server/middleware/auth.ts`
- `src/server/middleware/usage.ts`

Route modülleri:

- `src/server/routes/auth.ts`
- `src/server/routes/billing.ts`
- `src/server/routes/company.ts`
- `src/server/routes/crm.ts`
- `src/server/routes/regulations.ts`
- `src/server/routes/profit.ts`
- `src/server/routes/ai.ts`
- `src/server/routes/clients.ts`
- `src/server/routes/quotations.ts`

## Güvenlik/Yetki İyileştirmeleri

- Viewer mutasyonlardan server tarafında engellendi.
- Client create, quotation create/revision/status, PDF, AI generation,
  profitability, CRM mutation ve regulation impact owner/admin/manager gerektirir.
- Auth'suz AI legacy endpointleri kapatıldı.
- PDF servisi `companyId` ile quote/client/item filtreliyor.
- Quote creation server-side total hesaplıyor; client toplamlarına güvenmiyor.

## AI Durumu

Multi-provider katmanı eklendi:

- OpenAI primary: `OPENAI_API_KEY` varsa kullanılır.
- Gemini fallback: mevcut davranışı korur.
- Provider router testleri mevcut.

Dosyalar:

- `src/services/ai/providers/types.ts`
- `src/services/ai/providers/openaiProvider.ts`
- `src/services/ai/providers/geminiProvider.ts`
- `src/services/ai/providers/providerRouter.ts`
- `src/services/ai/providers/providerRouter.test.ts`

## Test/Build Durumu

Son tamamlanan doğrulamalar:

- `npm run lint`: geçti
- `npm run test`: 5 test geçti
- `npm run build`: geçti
- `graphify update .`: geçti

Build uyarıları:

- CSS `@import` sırası uyarısı
- Büyük JS chunk uyarısı

Bunlar build'i bozmadı, ama pilot öncesi temizlik/performance fazında ele alınmalı.

## Şu Anki Aktif Faz

Aktif faz: pilot smoke script.

Eklenen/üzerinde çalışılan dosyalar:

- `scripts/pilot-smoke.ts`
- `package.json` içinde `smoke:pilot`
- `src/server/routes/quotations.ts` içinde industry FK savunması

Smoke script hedefi:

1. `/api/health`
2. Auth'suz kritik endpointlerin `401` dönmesi
3. Admin login
4. Test client oluşturma
5. Test quote oluşturma
6. Quote detail geri okuma
7. Server-side item/quote totals kontrolü

Komut:

```bash
BASE_URL=http://localhost:3011 npm run smoke:pilot
```

## Yakalanan Bug

İlk smoke koşusunda quote creation `500` verdi.

Kök neden:

`industryId=residential` gönderiliyor ama lokal DB'deki `industries` tablosunda
`residential` kaydı yok. Bu nedenle `quotations.industry_id` FK constraint
hatası oluştu.

Yapılan fix:

`src/server/routes/quotations.ts` içinde quote create sırasında `industryId`
DB'de gerçekten varsa yazılıyor, yoksa `null` bırakılıyor.

Not:

Bu fix sonrası geçici `3011` server yeniden başlatıldı. Smoke script henüz tekrar
tamamlanmadı; bir sonraki adım smoke scripti tekrar çalıştırmak.

## Servis Durumu

- 3001'deki mevcut kullanıcı servisine dokunulmadı.
- Geçici doğrulamalar için `PORT=3011 npm run dev` kullanılıyor.
- Son durumda `3011` yeni kodla başlatıldı.

## DB Güvenliği

Kullanıcının talimatı devam ediyor:

- Mevcut başka DB'lere dokunma.
- `dropdb`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, `DELETE` kullanma.
- Sadece TeklifPro lokal DB hedeflenmeli.

Smoke script gerçek DB'ye insert yapar. Şu ana kadar oluşturulan kalıcı test
kayıtları `SMOKE ...` isimlidir. Silme yapılmadı.

## Devam Etmek İçin Sonraki Adım

1. `BASE_URL=http://localhost:3011 npm run smoke:pilot`
2. Geçerse:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
   - `graphify update .`
3. `docs/agent-memory/WORKING_STATE.md` ve `PILOT_PLAN.md` güncelle.
4. Commit at.
