# TeklifPro Ara Özet / Handoff

Tarih: 2026-08-02

## Güncel Handoff — SmartCheck Safe Bulk Review

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
