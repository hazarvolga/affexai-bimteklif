# Faz 7 / T41 — `company_id` taşıyan tabloların envanteri ve 0022 dilimi

**Tarih:** 25 Ekim 2026
**Kod baseline:** `0399ac7` (main, Rev. 72 canlı)
**Migration:** `0022_tenant_business_rls`
**Karar:** **PARTIAL — 72 tablodan 36'sı FORCE RLS altında (22 önceki + 14 yeni); kalan 36 tablo beş dilime ayrıldı, her biri ayrı tasarım/canary gerektirir**

## Yöntem

`src/db/schema.ts` içindeki her `pgTable` bloğu `company_id` kolonu için tarandı (`provisioned_company_id` ve `target_company_id` dahil). Her tablo için request-path okuyucu/yazıcıları (`src/server`, `src/services`, `src/smartcheck`), worker yolları (`src/smartcheck/import/processor.ts`, `worker.ts`, `ifc-worker.ts`, `upload-cleanup.ts`) ve control-plane ACL'i (`scripts/database-roles/contract.ts`) çıkarıldı. Bir tablo yalnız şu üç koşul birlikte sağlandığında bu dilime alındı:

1. Worker tabloyu okumuyor veya yazmıyor; worker default-deny kalabilir.
2. Control rolünün tabloda ACL'i yok; app tenant + backup + migrator-owner matrisi yeterli.
3. Bütün request-path erişimi küçük, sınırlı sayıda route içinde ve tek PR'da tenant context'e taşınabilir.

`company_id` taşımayan fakat tenant verisine FK ile bağlı tablolar (`quotation_financials`, `cost_components`, `academy_acquisition_events`) bu envanterin dışındadır. RLS için önce `company_id` kolonu veya join tabanlı bir policy kararı gerekir. Teklif dilimi (S1) ile birlikte ele alınmalıdır.

## Kapsanan tablolar (36)

| Dilim | Migration | Tablolar | Policy matrisi |
|---|---|---|---|
| CDE | `0013_cde_tenant_rls` | `cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions`, `cde_transition_events` | app tenant ALL, backup SELECT, migrator-owner ALL |
| Hakediş | `0015_progress_payment_tenant_rls` | 10 hakediş tablosu | aynı |
| SmartCheck pilot | `0016_smartcheck_pilot_evidence_tenant_rls` | `smartcheck_pilot_cases`, `smartcheck_pilot_measurements` (+ `smartcheck_audit_logs` altı-policy) | 3/4/6 policy |
| Sektör ayarı | `0017_company_industry_settings_tenant_rls` | `company_industry_settings` | app S/I/U |
| CRM/kota | `0018_crm_leads_tenant_rls`, `0019_control_plane_rls` | `leads`, `subscriptions`, `usage_logs` (+ `companies` `id` ile) | asimetrik + control |
| **Tenant iş tabloları (yeni)** | **`0022_tenant_business_rls`** | `usage_alerts`, `deals`, `activities`, `supplier_quote_submissions`, `supplier_quote_entries`, `rule_candidates`, `rule_registry`, `rule_versions`, `review_sessions`, `review_findings`, `competency_signals`, `competency_signal_evidence`, `assistance_resources`, `rule_assistance_resources` | app tenant ALL, backup SELECT, migrator-owner ALL; worker ve control default-deny |

### 0022 request-path taşıması

- `src/server/routes/crm.ts`: deal detay, pipeline, deal oluşturma, aktivite ekleme/listeleme, aşama değişikliği ve deal analizi `withAppTenant` / `withAppTenantTransaction` içinde çalışır. Deal analizi okumaları tek read-only tenant transactionında yapılır; AI çağrısı transaction dışında kalır, sonuç ayrı kısa bir tenant transactionı ile yazılır. Runner'lar `CrmTenantAccess` ile enjekte edilebilir; varsayılanı production app pool'udur.
- `src/server/routes/billing.ts`: `GET /api/billing/alerts` tenant context içinde okur ve hata durumunda 503 `BILLING_ALERTS_UNAVAILABLE` döner.
- `src/server/routes/market-intelligence.ts`: tedarikçi teklif liste/detay/oluşturma, satır ekleme, SmartCheck satırı aktarma ve satır review akışları tenant context kullanır. Satır insert ile teklif güven skoru güncellemesi artık aynı tenant transactionındadır. RLS dışındaki `documents`, `price_*`, `normalized_quantity_rows` ve audit yazımları bu dilimde değişmedi.
- `rule_*`, `review_*`, `competency_*` ve `assistance_*` tablolarının runtime okuyucu/yazıcısı yoktur (yalnız `scripts/negative-test.ts`). RLS bu tabloları gelecekteki kod için fail-closed başlatır.

Uygulama katmanındaki `company_id` filtreleri ve RBAC kontrolleri korunur; RLS ikinci savunmadır.

## Kalan tablolar (36) ve önerilen dilimler

| Dilim | Tablolar | Engel | Gerekli iş |
|---|---|---|---|
| **S1 — Teklif çekirdeği** | `clients`, `quotations`, `quotation_items`, `quotation_item_evidence`, `quotation_transfer_ledgers`, `quotation_transfer_source_rows` | Yaklaşık 15 route/servis dosyası (`quotations`, `quotation-edit`, `profit`, `crm`, `smartcheck`, `company`, `regulations`, `pricing`, PDF, `integrity`, `edit`, `calm-transfer`, `revision-copy`, kota, hakediş). Worker/control erişimi yok. | Bütün okuma/yazmaları tenant context'e taşıyıp aynı CDE matrisini uygulamak; `quotation_financials` / `cost_components` için `company_id` kararı; `role-model-smoke` teklif akışı zaten var. |
| **S2 — Fiyat ve kaynak zekâsı** | `price_sources`, `price_snapshots`, `source_intelligence_adapters`, `source_ingestion_runs`, `source_ingestion_artifacts`, `source_review_items`, `regulation_versions`, `regulation_alerts` | `regulation_alerts.company_id` nullable; global uyarılar için ayrı app read policy gerekir. `calm-transfer`, `smartcheck`, `pricing`, `market-intelligence`, `source-intelligence`, `regulations` ve `ingest-document` paylaşır. | Tenant + global-read matrisi; ingest servisinin tenant transactionı; S1 ile ortak `calm-transfer` sırası. |
| **S3 — SmartCheck doküman hattı** | `documents`, `document_processing_runs`, `document_processing_artifacts`, `normalized_quantity_rows` | Worker bu tablolara yazıyor (`processor.ts`, `upload-cleanup.ts`). Worker policy'siz FORCE RLS canlı işlemeyi durdurur. | Worker için tenant-bound policy veya dar capability function; worker image canary/drain. Canlı canary gerektirdiği için bu PR'ın kapsamı dışındadır. |
| **S4 — Academy/Allplan öğrenci verisi** | `allplan_lesson_progress`, `allplan_lesson_activity`, `allplan_lesson_notes`, `allplan_lesson_bookmarks`, `allplan_checkpoint_attempts`, `allplan_exam_attempts`, `allplan_certificates`, `allplan_certificate_audit_logs`, `academy_enrollments`, `academy_learner_profiles`, `academy_activation_events`, `academy_enrollment_audit_logs`, `academy_payment_events` | Control-plane ACL'i var (Rev. 57); kayıt/aktivasyon yazımları control pool üzerinden gidiyor. Kullanıcı düzeyinde kapsam (`user_id`) da gerekiyor. | app tenant + user ve control policy matrisi; `DATABASE_CONTROL_TABLE_ACL` ile hizalama; auth/davet akışı regresyonu. |
| **S5 — Authority ve audit** | `memberships`, `invitations`, `pilot_applications` (`provisioned_company_id`), `admin_audit_logs` (`target_company_id`), `usage_records` | Tenant iş verisi değil; auth middleware membership'i tenant bilinmeden okur, super-admin control pool ile tüm tenantları okur. `usage_records` kota sayacıdır (SmartCheck upload ve admin). | Exact ACL modeli korunur; RLS yalnız auth bootstrap (membership lookup) için ayrı tasarım ve control-plane policy ile değerlendirilmelidir. |

## Kanıt (yerel, izole PostgreSQL 16 Docker)

| Kontrol | Sonuç |
|---|---:|
| `src/contracts/tenant-business-rls.pgtest.ts` (yeni) | 1/1 PASS |
| Önceki CDE / hakediş / SmartCheck pilot / sektör / CRM PG16 kontratları | 7 + 1 + 1 + 1 + 1 PASS |
| `scripts/release-migrations/artifacts.test.ts` | 12/12 PASS |
| CRM route güvenlik/lead testleri | 8/8 PASS |
| TypeScript (`tsc --noEmit`, release-migrations tsconfig) | PASS |

Yeni PG16 kontratı her 0022 tablosu için şunları doğrular:

- Context yokken app okuması 0 satır döner, yazma 42501 ile reddedilir.
- Filtresiz app SQL'i yalnız bağlı tenantı görür.
- Cross-tenant INSERT ve `company_id` taşıyan UPDATE 42501 ile reddedilir; yabancı satırları hedefleyen UPDATE/DELETE 0 satır etkiler.
- Worker ve control satır göremez veya yazamaz; backup yalnız okur; migrator yalnız owner rolüyle erişir.
- Tek bağlantılı pool'da commit, rollback ve tenant değişimi sonrasında GUC sızmaz; 25 eşzamanlı A/B transaction çapraz satır görmez.
- Gerçek CRM route handler'ları restricted app rolüyle çalışır: B, A'nın deal'ini açamaz, aktivite ekleyemez, aşamasını değiştiremez veya pipeline'ında göremez.
- FORCE kapatma, policy düşürme, RLS kapatma ve ledger tag silme driftleri inspector/provisioner tarafından reddedilir.

`database-role-provision.pgtest.ts` CI'da çalışmaz ve dedicated `cluster_name` ister. Yerelde hem bu dalda hem değiştirilmemiş `main` (`0399ac7`) üzerinde `bimmetraj_worker_get_entitlement` imza beklentisiyle aynı şekilde başarısız olur. 0022'den bağımsız, önceden var olan bir sorundur.

## Açık sınırlar

- Kalan 36 tablo (S1–S5) FORCE RLS altında değildir; T41 **PARTIAL** kalır.
- Migration ile yeni app image'ı arasındaki kısa deploy penceresinde eski app container'ı CRM deal/aktivite, usage alert ve tedarikçi teklif uçlarında boş/42501 sonuç görebilir. Yeni image ayağa kalkınca kapanır; migrate → app start sırası korunmalıdır.
- `scripts/role-model-smoke.ts` 0022 uçlarıyla genişletildi; provisioned bir sunucuya karşı çalıştırılması deploy sonrası canlı kanıt adımıdır ve bu PR'da yapılmadı.
- Production worker ACL revoke, canary/drain ve canlı negatif tenant kanıtı bu dilimin dışındadır.

Bu rapor bağımsız güvenlik denetimi veya production onayı değildir.
