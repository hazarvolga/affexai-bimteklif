# Faz 7 / T41 — `company_id` taşıyan tabloların envanteri ve 0022–0027 + S5 dilimleri

**Tarih:** 26 Ekim 2026
**Kod baseline:** `Rev. 85` (`main`, `0022_tenant_business_rls` + `0023_quotation_core_rls` + `0024_pricing_regulations_rls` + `0025_allplan_learner_rls` + `0026_academy_control_rls` + `0027_smartcheck_pipeline_rls` + `S5 Exact-ACL`)
**Migration:** `0022_tenant_business_rls` – `0027_smartcheck_pipeline_rls`
**Karar:** **CLOSED (Kod & Yerel PG16) — 72 tablonun tamamı (72/72 — %100) sınıflandırıldı ve kontrat altında doğrulandı: 67 tablo FORCE RLS altında (22 önceki + 14 `0022` + 6 `0023` S1 + 8 `0024` S2 + 7 `0025` S4a + 6 `0026` S4b + 4 `0027` S3 SmartCheck doküman/worker hattı) ve 5 S5 authority/audit/kota sayacı tablosu (`memberships`, `invitations`, `pilot_applications`, `admin_audit_logs`, `usage_records`) exact least-privilege ACL (`DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES`, `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL`, `DATABASE_CONTROL_TABLE_ACL`) altında kilitlendi**

## Yöntem

`src/db/schema.ts` içindeki her `pgTable` bloğu `company_id` kolonu için tarandı (`provisioned_company_id` ve `target_company_id` dahil). Her tablo için request-path okuyucu/yazıcıları (`src/server`, `src/services`, `src/smartcheck`), worker yolları (`src/smartcheck/import/processor.ts`, `worker.ts`, `ifc-worker.ts`, `upload-cleanup.ts`) ve control-plane ACL'i (`scripts/database-roles/contract.ts`) çıkarıldı. Bir tablo yalnız şu üç koşul birlikte sağlandığında bu dilime alındı:

1. Worker tabloyu okumuyor veya yazmıyor; worker default-deny kalabilir.
2. Control rolünün tabloda ACL'i yok; app tenant + backup + migrator-owner matrisi yeterli.
3. Bütün request-path erişimi küçük, sınırlı sayıda route içinde ve tek PR'da tenant context'e taşınabilir.

`company_id` taşımayan fakat tenant verisine FK ile bağlı tablolar (`quotation_financials`, `cost_components`, `academy_acquisition_events`) bu envanterin dışındadır. RLS için önce `company_id` kolonu veya join tabanlı bir policy kararı gerekir. Teklif dilimi (S1) ile birlikte ele alınmalıdır.

## Kapsanan tablolar (72/72: 67 FORCE RLS + 5 Exact-ACL)

| Dilim | Migration | Tablolar | Policy matrisi |
|---|---|---|---|
| CDE | `0013_cde_tenant_rls` | `cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions`, `cde_transition_events` | app tenant ALL, backup SELECT, migrator-owner ALL |
| Hakediş | `0015_progress_payment_tenant_rls` | 10 hakediş tablosu | aynı |
| SmartCheck pilot | `0016_smartcheck_pilot_evidence_tenant_rls` | `smartcheck_pilot_cases`, `smartcheck_pilot_measurements` (+ `smartcheck_audit_logs` altı-policy) | 3/4/6 policy |
| Sektör ayarı | `0017_company_industry_settings_tenant_rls` | `company_industry_settings` | app S/I/U |
| CRM/kota | `0018_crm_leads_tenant_rls`, `0019_control_plane_rls` | `leads`, `subscriptions`, `usage_logs` (+ `companies` `id` ile) | asimetrik + control |
| **Tenant iş tabloları** | **`0022_tenant_business_rls`** | `usage_alerts`, `deals`, `activities`, `supplier_quote_submissions`, `supplier_quote_entries`, `rule_candidates`, `rule_registry`, `rule_versions`, `review_sessions`, `review_findings`, `competency_signals`, `competency_signal_evidence`, `assistance_resources`, `rule_assistance_resources` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S1 — Teklif çekirdeği** | **`0023_quotation_core_rls`** | `clients`, `quotations`, `quotation_items`, `quotation_item_evidence`, `quotation_transfer_ledgers`, `quotation_transfer_source_rows` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S2 — Fiyat, kaynak zekâsı ve mevzuat** | **`0024_pricing_regulations_rls`** | `price_sources`, `price_snapshots`, `source_intelligence_adapters`, `source_ingestion_runs`, `source_ingestion_artifacts`, `source_review_items`, `regulation_versions`, `regulation_alerts` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S4a — Allplan öğrenci verisi** | **`0025_allplan_learner_rls`** | `allplan_lesson_progress`, `allplan_lesson_activity`, `allplan_lesson_notes`, `allplan_lesson_bookmarks`, `allplan_checkpoint_attempts`, `allplan_exam_attempts`, `allplan_certificate_audit_logs` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |
| **S4b — Academy control-plane ve halka açık sertifika doğrulama** | **`0026_academy_control_rls`** | `allplan_certificates`, `academy_enrollments`, `academy_learner_profiles`, `academy_activation_events`, `academy_enrollment_audit_logs`, `academy_payment_events` | `allplan_certificates`: app tenant ALL + app verify SELECT (`bimmetraj.certificate_number`) + backup SELECT + migrator-owner ALL; 5 `academy_*`: app tenant SELECT + control ALL (ACL ile hizalı) + backup SELECT + migrator-owner ALL; worker default-deny |
| **S3 — SmartCheck doküman ve worker hattı** | **`0027_smartcheck_pipeline_rls`** | `documents`, `document_processing_runs`, `document_processing_artifacts`, `normalized_quantity_rows` | app tenant ALL + `documents`/`document_processing_runs` için super-admin queue SELECT (`bimmetraj.super_admin_user_id` UUID GUC) + worker ALL + backup SELECT + migrator-owner ALL; control default-deny |
| **S5 — Authority, audit ve kota sayacı (5)** | **`Exact-ACL Kontratı`** | `memberships`, `invitations`, `pilot_applications` (`provisioned_company_id`), `admin_audit_logs` (`target_company_id`), `usage_records` | `DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES` + `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL` + `DATABASE_CONTROL_TABLE_ACL` / `DATABASE_CONTROL_APP_TABLE_ACL`: worker `memberships`/`invitations`/`pilot_applications`/`admin_audit_logs` tablolarında `[]` (sıfır erişim), `usage_records` tablosunda `INSERT/SELECT/UPDATE` (`DELETE` yasak); app `memberships`/`invitations` tablolarında `SELECT`-only, `admin_audit_logs` tablosunda append-only `INSERT/SELECT`, `pilot_applications`/`usage_records` tablolarında `INSERT/SELECT/UPDATE` (`DELETE` yasak) |

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

### 0025 (S4a — Allplan öğrenci verisi) request-path taşıması

- `src/server/routes/academy.ts`: `GET /api/academy/allplan/state`, `POST /api/academy/allplan/lessons/:slug/progress`, `POST /api/academy/allplan/lessons/:slug/activity`, `POST /api/academy/allplan/lessons/:slug/notes`, `DELETE /api/academy/allplan/notes/:id`, `POST /api/academy/allplan/lessons/:slug/bookmark`, `POST /api/academy/allplan/lessons/:slug/checkpoint`, `POST /api/academy/allplan/companion/query` (`usage_logs` dahil), `POST /api/academy/allplan/exam/submit`, `POST /api/academy/allplan/certificates/issue`, `POST /api/academy/allplan/certificates/:id/revoke` ve `GET /api/academy/allplan/team-report` uçlarındaki `allplan_*` okumaları/yazmaları `withAppTenant` / `withAppTenantTransaction` içine taşındı. (`allplan_certificates` tablosu `GET /api/academy/allplan/certificates/verify/:certificateNumber` halka açık sertifika doğrulama rotası nedeniyle S4b'de ayrı policy ile ele alınacaktır.)

### 0026 (S4b — Academy control-plane ve halka açık sertifika doğrulama) request-path taşıması

- `src/server/middleware/academyEntitlement.ts`: `findAllplanEntitlement` içindeki `academy_enrollments` okuması `withAppTenant` içine taşındı.
- `src/server/routes/academy.ts`: `recordLessonActivation`, `GET /api/academy/allplan/admin/enrollments`, `POST /api/academy/allplan/admin/enrollments` (`existing` kontrolü), `POST /api/academy/allplan/admin/enrollments/:enrollmentId/status` (`existing` kontrolü), `GET /api/academy/allplan/learner-profile` ve `POST /api/academy/allplan/structural-early-access` okumaları `withAppTenant` içine taşındı; `GET /api/academy/activation/summary` platform özeti `getControlDatabase().db` üzerine alındı; halka açık `GET /api/academy/allplan/certificates/verify/:certificateNumber` doğrulaması ise transaction-local `set_config('bimmetraj.certificate_number', number, true)` ile yalnız aranan sertifika numarasını okuyabilir.
- `src/server/routes/auth.ts`: `POST /api/auth/login` ve `GET /api/auth/me` içindeki `academy_learner_profiles` okumaları `withAppTenant` içine taşındı.

### 0027 (S3 — SmartCheck doküman ve worker hattı) request-path taşıması

- `src/smartcheck/import/upload-quota.ts` ve `src/smartcheck/import/service.ts`: `reserveDailyUploadAndInsertDocument`, `deleteReservedUploadDocument`, `createOrReuseProcessingRun` ve `retryFailedRun` `withAppTenant` / `withAppTenantTransaction` içine taşındı.
- `src/server/routes/smartcheck.ts`, `src/server/routes/market-intelligence.ts` ve `src/server/routes/admin.ts`: tüm `documents`, `document_processing_runs`, `document_processing_artifacts` ve `normalized_quantity_rows` okumaları/yazmaları `withAppTenant` içine alındı; super-admin kuyruk gözlemi (`GET /api/admin/queues` ve `POST /api/admin/queues/:runId/retry`) `withSuperAdminQueueRead(req.user.userId, ...)` üzerinden transaction-local `bimmetraj.super_admin_user_id` GUC ile izole edildi.

### S5 (Authority, audit ve kota sayacı — 5 tablo) exact-ACL ve request-path kapanışı

- `scripts/database-roles/contract.ts`: `DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES` (`memberships`, `invitations`, `pilot_applications`, `admin_audit_logs`, `usage_records`) eklendi; `pilot_applications` ve `usage_records` `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL` matrisine alınarak `bimmetraj_app` ve `bimmetraj_worker` rollerinden `DELETE` yetkisi ve `bimmetraj_worker` rolünden `pilot_applications` erişimi tamamen kaldırıldı.
- `src/server/routes/company.ts`: `GET /api/company/team` ve `GET /api/invitations` okumaları `withAppTenant(..., { readOnly: true })` içine alındı.

Uygulama katmanındaki `company_id` filtreleri ve RBAC kontrolleri korunur; RLS ve exact-ACL ikinci savunmadır.

## S5 Tablolarının Gerekçeli Exact-ACL Sınıflandırması (5)

| Tablo | Sütun | Neden Exact-ACL? | Rol Yetki Matrisi |
|---|---|---|---|
| `memberships` | `company_id` | Auth middleware ve login akışı tenant bilinmeden önce `user_id` ile üyelik çözer; 30+ tablo `(user_id, company_id)` composite FK ile referans verir. | `app: SELECT`, `control: SELECT/INSERT/UPDATE/DELETE`, `worker: []`, `backup: SELECT` |
| `invitations` | `company_id` | Halka açık `GET /api/invitations/:token` davet önizlemesi tenant bilinmeden önce `token` hash'i ile sorgulanır. | `app: SELECT`, `control: SELECT/INSERT/UPDATE`, `worker: []`, `backup: SELECT` |
| `pilot_applications` | `provisioned_company_id` (nullable) | Halka açık `POST /api/pilot-applications` aday başvurusu henüz şirket yokken (`NULL`) oluşturulur. | `app: SELECT/INSERT/UPDATE`, `control: SELECT/INSERT/UPDATE/DELETE`, `worker: []`, `backup: SELECT` |
| `admin_audit_logs` | `target_company_id` (nullable) | Platform geneli sistem/katalog/cron denetim kayıtlarında `target_company_id` `NULL` olabilir; impersonation iptal kontrolü (`isImpersonationRevoked`) her istekte okur. | `app: SELECT/INSERT`, `control: SELECT/INSERT` (append-only, `UPDATE/DELETE` yasak), `worker: []`, `backup: SELECT` |
| `usage_records` | `company_id` | Teklif ve SmartCheck IFC kota sayacı hem `app` hem `worker` (`consumeIfcQuota`) hem de super-admin tenant istatistikleri (`readAdminTenants`) tarafından okunur/güncellenir. | `app: SELECT/INSERT/UPDATE`, `control: SELECT`, `worker: SELECT/INSERT/UPDATE` (`DELETE` tüm çalışma zamanı rollerine yasak), `backup: SELECT` |

## Kanıt (yerel, izole PostgreSQL 16 Docker)

| Kontrol | Sonuç |
|---|---:|
| `src/contracts/tenant-business-rls.pgtest.ts` (45 `0022`–`0027` FORCE RLS tablosu + 72/72 `company_id` envanter mutabakatı + S5 negatif ACL ve drift testleri) | 1/1 PASS |
| `src/contracts/database-role-provision.pgtest.ts` (pre-schema role contract düzeltmesi ile) | 1/1 PASS |
| Önceki CDE / hakediş / SmartCheck pilot / sektör / CRM PG16 kontratları | 5 + 1 + 1 + 1 + 1 PASS (toplam 11/11 PG16 kontratı PASS) |
| `scripts/release-migrations/artifacts.test.ts` | 17/17 PASS |
| `scripts/release-migrations/verify.integration.test.ts` | 14/14 PASS (1 skipped: pg_dump/pg_restore) |
| CRM route güvenlik/lead testleri | 8/8 PASS |
| TypeScript (`tsc --noEmit`, release-migrations tsconfig) | PASS |

## Açık sınırlar

- Kod ve yerel izole PostgreSQL 16 düzeyinde **72/72 (%100)** `company_id` tablosu sınıflandırılmış ve doğrulanmıştır (67 `FORCE RLS` + 5 S5 exact-ACL).
- Canlı production ortamında `0022`–`0027` migrationlarının uygulanması, `provisionDatabaseRoles` çalıştırılması ve `scripts/role-model-smoke.ts` negatif tenant kanıtının alınması (`T47`/`T52` operasyonel cutover penceresi) deploy sonrası canlı kanıt adımıdır.

Bu rapor bağımsız güvenlik denetimi veya production onayı değildir.
