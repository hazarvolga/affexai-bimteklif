# Faz 7 / T41 — `company_id` taşıyan tabloların envanteri ve 0022–0024 dilimleri

**Tarih:** 25 Ekim 2026
**Kod baseline:** `Rev. 81` (`main`, `0022_tenant_business_rls` + `0023_quotation_core_rls` + `0024_pricing_regulations_rls`)
**Migration:** `0022_tenant_business_rls`, `0023_quotation_core_rls`, `0024_pricing_regulations_rls`
**Karar:** **PARTIAL — 72 tablodan 50'si FORCE RLS altında (22 önceki + 14 `0022` + 6 `0023` S1 teklif çekirdeği + 8 `0024` S2 fiyat/kaynak/mevzuat); kalan 22 tablo üç dilime (S3–S5) ayrıldı, her biri ayrı tasarım/canary gerektirir**

## Yöntem

`src/db/schema.ts` içindeki her `pgTable` bloğu `company_id` kolonu için tarandı (`provisioned_company_id` ve `target_company_id` dahil). Her tablo için request-path okuyucu/yazıcıları (`src/server`, `src/services`, `src/smartcheck`), worker yolları (`src/smartcheck/import/processor.ts`, `worker.ts`, `ifc-worker.ts`, `upload-cleanup.ts`) ve control-plane ACL'i (`scripts/database-roles/contract.ts`) çıkarıldı. Bir tablo yalnız şu üç koşul birlikte sağlandığında bu dilime alındı:

1. Worker tabloyu okumuyor veya yazmıyor; worker default-deny kalabilir.
2. Control rolünün tabloda ACL'i yok; app tenant + backup + migrator-owner matrisi yeterli.
3. Bütün request-path erişimi küçük, sınırlı sayıda route içinde ve tek PR'da tenant context'e taşınabilir.

`company_id` taşımayan fakat tenant verisine FK ile bağlı tablolar (`quotation_financials`, `cost_components`, `academy_acquisition_events`) bu envanterin dışındadır. RLS için önce `company_id` kolonu veya join tabanlı bir policy kararı gerekir. Teklif dilimi (S1) ile birlikte ele alınmalıdır.

## Kapsanan tablolar (50)

| Dilim | Migration | Tablolar | Policy matrisi |
|---|---|---|---|
| CDE | `0013_cde_tenant_rls` | `cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions`, `cde_transition_events` | app tenant ALL, backup SELECT, migrator-owner ALL |
| Hakediş | `0015_progress_payment_tenant_rls` | 10 hakediş tablosu | aynı |
| SmartCheck pilot | `0016_smartcheck_pilot_evidence_tenant_rls` | `smartcheck_pilot_cases`, `smartcheck_pilot_measurements` (+ `smartcheck_audit_logs` altı-policy) | 3/4/6 policy |
| Sektör ayarı | `0017_company_industry_settings_tenant_rls` | `company_industry_settings` | app S/I/U |
| CRM/kota | `0018_crm_leads_tenant_rls`, `0019_control_plane_rls` | `leads`, `subscriptions`, `usage_logs` (+ `companies` `id` ile) | asimetrik + control |
| **Tenant iş tabloları** | **`0022_tenant_business_rls`** | `usage_alerts`, `deals`, `activities`, `supplier_quote_submissions`, `supplier_quote_entries`, `rule_candidates`, `rule_registry`, `rule_versions`, `review_sessions`, `review_findings`, `competency_signals`, `competency_signal_evidence`, `assistance_resources`, `rule_assistance_resources` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S1 — Teklif çekirdeği** | **`0023_quotation_core_rls`** | `clients`, `quotations`, `quotation_items`, `quotation_item_evidence`, `quotation_transfer_ledgers`, `quotation_transfer_source_rows` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S2 — Fiyat, kaynak zekâsı ve mevzuat (yeni)** | **`0024_pricing_regulations_rls`** | `price_sources`, `price_snapshots`, `source_intelligence_adapters`, `source_ingestion_runs`, `source_ingestion_artifacts`, `source_review_items`, `regulation_versions`, `regulation_alerts` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |

### 0022 request-path taşıması

- `src/server/routes/crm.ts`: deal detay, pipeline, deal oluşturma, aktivite ekleme/listeleme, aşama değişikliği ve deal analizi `withAppTenant` / `withAppTenantTransaction` içinde çalışır. Deal analizi okumaları tek read-only tenant transactionında yapılır; AI çağrısı transaction dışında kalır, sonuç ayrı kısa bir tenant transactionı ile yazılır. Runner'lar `CrmTenantAccess` ile enjekte edilebilir; varsayılanı production app pool'udur.
- `src/server/routes/billing.ts`: `GET /api/billing/alerts` tenant context içinde okur ve hata durumunda 503 `BILLING_ALERTS_UNAVAILABLE` döner.
- `src/server/routes/market-intelligence.ts`: tedarikçi teklif liste/detay/oluşturma, satır ekleme, SmartCheck satırı aktarma ve satır review akışları tenant context kullanır. Satır insert ile teklif güven skoru güncellemesi artık aynı tenant transactionındadır. RLS dışındaki `documents`, `price_*`, `normalized_quantity_rows` ve audit yazımları bu dilimde değişmedi.
- `rule_*`, `review_*`, `competency_*` ve `assistance_*` tablolarının runtime okuyucu/yazıcısı yoktur (yalnız `scripts/negative-test.ts`). RLS bu tabloları gelecekteki kod için fail-closed başlatır.

### 0023 (S1 — Teklif çekirdeği) request-path taşıması

- `src/server/routes/clients.ts`: `GET /api/clients` ve `POST /api/clients` `withAppTenant` üzerinden çalışır (`ClientTenantAccess` enjekte edilebilir).
- `src/server/routes/quotations.ts`: `GET /api/quotations`, `GET /api/quotations/:id/smartcheck`, `GET /api/quotations/:id`, `POST /api/quotations/:id/revision`, `PATCH /api/quotations/:id/status`, `PATCH /api/quotations/:id/calibration` ve `GET /api/quotations/:id/pdf` `withAppTenant` üzerinden çalışır; `POST /api/quotations` zaten `reserveQuotaAndCreateQuotation` üzerinden `withAppTenantTransaction` kullanır.
- `src/server/routes/quotation-edit.ts`, `src/services/quotations/edit.ts` ve `src/services/quotations/integrity.ts`: `loadEditableQuotation`, `editManualQuotation` ve `createQuotationRevision` `withAppTenantTransaction` altında çalışır.
- `src/services/quotations/calm-transfer.ts` ve `src/server/routes/smartcheck.ts`: `transferCalmRowsToQuotationRevision` ve `POST /api/smartcheck/documents/:id/transfer-to-quotation` (idempotent replay okumaları dahil) `withAppTenant` / `withAppTenantTransaction` altında çalışır.
- `src/services/pdf/generate.ts`: `generateQuotationPdf` `actor` parametresi verildiğinde `quotations`, `companies`, `clients` ve `quotation_items` okumalarını tek `withAppTenant` çağrısı içinde çalıştırır.
- `src/server/routes/profit.ts`, `src/server/routes/company.ts`, `src/server/routes/regulations.ts` ve `src/server/routes/pricing.ts`: teklif/kalem/kanıt okuma ve fiyat kilitleme (`pricing-snapshot/lock`) işlemleri `withAppTenant` / `withAppTenantTransaction` içine taşındı (AI çağrısı transaction dışında tutuldu).

### 0024 (S2 — Fiyat, kaynak zekâsı ve mevzuat) request-path taşıması

- `src/server/routes/pricing.ts`: `GET /api/pricing/sources`, `POST /api/pricing/sources`, `GET /api/pricing/snapshots`, `POST /api/pricing/snapshot-suggestions`, `POST /api/pricing/catalog/import`, `POST /api/pricing/sources/:sourceId/snapshots` ve `PATCH /api/pricing/snapshots/:snapshotId/review` `withAppTenant` / `withAppTenantTransaction` içine taşındı (AI çağrısı transaction dışında tutuldu).
- `src/server/routes/source-intelligence.ts`: `GET /api/source-intelligence/official-adapters`, `POST /api/source-intelligence/official-adapters`, `GET /api/source-intelligence/health`, `GET /api/source-intelligence/review-queue`, `POST /api/source-intelligence/official-adapters/:adapterId/ingest` ve `PATCH /api/source-intelligence/review-items/:id` `withAppTenant` / `withAppTenantTransaction` içine taşındı.
- `src/server/routes/regulations.ts` ve `src/services/regulations/ingest-document.ts`: `GET /api/regulations/alerts`, `GET /api/regulations/versions` ve `ingestRegulationDocument` `withAppTenant` / `withAppTenantTransaction` içine taşındı.
- `src/server/routes/market-intelligence.ts` ve `src/server/routes/smartcheck.ts`: fiyat belleği (`GET /api/market-intelligence/price-memory`), satır anormallik karşılaştırması ve SmartCheck teklife aktarım öncesi `price_snapshots`/`price_sources` doğrulamaları `withAppTenant` altında çalışır.

Uygulama katmanındaki `company_id` filtreleri ve RBAC kontrolleri korunur; RLS ikinci savunmadır.

## Kalan tablolar (22) ve önerilen dilimler

| Dilim | Tablolar | Engel | Gerekli iş |
|---|---|---|---|
| **S3 — SmartCheck doküman hattı (4)** | `documents`, `document_processing_runs`, `document_processing_artifacts`, `normalized_quantity_rows` | Worker bu tablolara yazıyor (`processor.ts`, `upload-cleanup.ts`). Worker policy'siz FORCE RLS canlı işlemeyi durdurur. | Worker için tenant-bound policy veya dar capability function; worker image canary/drain. |
| **S4 — Academy/Allplan öğrenci verisi (13)** | `allplan_lesson_progress`, `allplan_lesson_activity`, `allplan_lesson_notes`, `allplan_lesson_bookmarks`, `allplan_checkpoint_attempts`, `allplan_exam_attempts`, `allplan_certificates`, `allplan_certificate_audit_logs`, `academy_enrollments`, `academy_learner_profiles`, `academy_activation_events`, `academy_enrollment_audit_logs`, `academy_payment_events` | Control-plane ACL'i var (Rev. 57); kayıt/aktivasyon yazımları control pool üzerinden gidiyor. Kullanıcı düzeyinde kapsam (`user_id`) da gerekiyor. | app tenant + user ve control policy matrisi; `DATABASE_CONTROL_TABLE_ACL` ile hizalama; auth/davet akışı regresyonu. |
| **S5 — Authority ve audit (5)** | `memberships`, `invitations`, `pilot_applications` (`provisioned_company_id`), `admin_audit_logs` (`target_company_id`), `usage_records` | Tenant iş verisi değil; auth middleware membership'i tenant bilinmeden okur, super-admin control pool ile tüm tenantları okur. `usage_records` kota sayacıdır (SmartCheck upload ve admin). | Exact ACL modeli korunur; RLS yalnız auth bootstrap (membership lookup) için ayrı tasarım ve control-plane policy ile değerlendirilmelidir. |

## Kanıt (yerel, izole PostgreSQL 16 Docker)

| Kontrol | Sonuç |
|---|---:|
| `src/contracts/tenant-business-rls.pgtest.ts` (28 tablo: 14 `0022` + 6 `0023` S1 + 8 `0024` S2 + CRM & `/api/clients` route izolasyonu) | 1/1 PASS |
| `src/contracts/database-role-provision.pgtest.ts` (pre-schema role contract düzeltmesi ile) | 1/1 PASS |
| Önceki CDE / hakediş / SmartCheck pilot / sektör / CRM PG16 kontratları | 5 + 1 + 1 + 1 + 1 PASS (toplam 11/11 PG16 kontratı PASS) |
| `scripts/release-migrations/artifacts.test.ts` | 14/14 PASS |
| `scripts/release-migrations/verify.integration.test.ts` | 14/14 PASS (1 skipped: pg_dump/pg_restore) |
| CRM route güvenlik/lead testleri | 8/8 PASS |
| TypeScript (`tsc --noEmit`, release-migrations tsconfig) | PASS |

Yeni PG16 kontratı her `0022`, `0023` ve `0024` tablosu (toplam 28 tablo) için şunları doğrular:

- Context yokken app okuması 0 satır döner, yazma 42501/P0002 ile reddedilir.
- Filtresiz app SQL'i yalnız bağlı tenantı görür.
- Cross-tenant INSERT ve `company_id` taşıyan UPDATE reddedilir (`quotation_transfer_ledgers` ve `quotation_transfer_source_rows` append-only trigger'ları P0001 ile mutasyonu ayrıca reddeder); yabancı satırları hedefleyen UPDATE/DELETE 0 satır etkiler.
- Worker ve control satır göremez veya yazamaz; backup yalnız okur; migrator yalnız owner rolüyle erişir.
- Tek bağlantılı pool'da commit, rollback ve tenant değişimi sonrasında GUC sızmaz; 25 eşzamanlı A/B transaction çapraz satır görmez.
- Gerçek CRM ve `/api/clients` route handler'ları restricted app rolüyle çalışır: B, A'nın deal'ini veya müşterisini açamaz/göremez, aktivite ekleyemez, aşamasını değiştiremez veya pipeline'ında göremez.
- FORCE kapatma, policy düşürme, RLS kapatma ve `0022`/`0023`/`0024` ledger tag silme driftleri inspector/provisioner tarafından reddedilir.

`database-role-provision.pgtest.ts` içinde pre-schema bootstrap modunda henüz var olmayan post-migration public fonksiyonlarının (`bimmetraj_worker_get_entitlement`, `bimmetraj_worker_get_company_context`) atlanması ve `bimmetraj_control` sequence ACL hizalaması tamamlanarak `1/1 PASS` durumuna getirildi.

## Açık sınırlar

- Kalan 22 tablo (S3–S5) FORCE RLS altında değildir; T41 **PARTIAL** kalır.
- Migration ile yeni app image'ı arasındaki kısa deploy penceresinde eski app container'ı CRM deal/aktivite, usage alert, tedarikçi teklif ve teklif çekirdeği uçlarında boş/42501 sonuç görebilir. Yeni image ayağa kalkınca kapanır; migrate → app start sırası korunmalıdır.
- `scripts/role-model-smoke.ts` provisioned bir sunucuya karşı çalıştırılması deploy sonrası canlı kanıt adımıdır.
- Production worker ACL revoke, canary/drain ve canlı negatif tenant kanıtı bu dilimin dışındadır.

Bu rapor bağımsız güvenlik denetimi veya production onayı değildir.
