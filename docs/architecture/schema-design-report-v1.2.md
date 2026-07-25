# SmartCheck & Competency Loop — Şema Tasarım Raporu v1.2

Bu rapor, **BIMPlan Academy Faz 1** (SmartCheck) dikey değer döngüsünü veri tabanı seviyesinde en yüksek veri bütünlüğü, asenkron idempotency ve katı kiracı izolasyonu (tenant isolation) ile yürütmek üzere tasarlanmış güncellenmiş şema mimarisidir.

---

## 1. Veri Tabanı Enum Tanımları

Serbest metin (`text`) kullanımından kaynaklanabilecek veri tutarsızlıklarını önlemek amacıyla aşağıdaki PostgreSQL enum türleri oluşturulacaktır:

```sql
CREATE TYPE "public"."document_status" AS ENUM (
  'uploaded', 
  'queued', 
  'processing', 
  'awaiting_review', 
  'completed', 
  'failed', 
  'cancelled',
  'archived'
);

CREATE TYPE "public"."processing_run_status" AS ENUM (
  'queued', 
  'running', 
  'succeeded', 
  'failed', 
  'cancelled'
);

CREATE TYPE "public"."processing_stage" AS ENUM (
  'queued', 
  'parsing', 
  'extracting_rules', 
  'consolidating', 
  'preparing_review', 
  'completed', 
  'failed', 
  'cancelled'
);

CREATE TYPE "public"."rule_candidate_status" AS ENUM (
  'draft', 
  'in_review', 
  'approved', 
  'rejected', 
  'deferred', 
  'merged'
);

CREATE TYPE "public"."rule_status" AS ENUM (
  'draft', 
  'active', 
  'inactive', 
  'archived'
);

CREATE TYPE "public"."review_session_status" AS ENUM (
  'draft', 
  'submitted', 
  'in_progress', 
  'completed', 
  'cancelled', 
  'reopened'
);

CREATE TYPE "public"."finding_status" AS ENUM (
  'open', 
  'in_progress', 
  'resolved', 
  'disputed', 
  'accepted_exception', 
  'rejected'
);

CREATE TYPE "public"."severity" AS ENUM (
  'low', 
  'medium', 
  'high', 
  'critical'
);

CREATE TYPE "public"."error_category" AS ENUM (
  'classification_code', 
  'quantity_unit', 
  'modeling_standard', 
  'missing_duplicate', 
  'pricing_margin'
);

CREATE TYPE "public"."resource_type" AS ENUM (
  'inline_guide', 
  'checklist', 
  'example', 
  'document', 
  'image', 
  'video', 
  'external_link'
);

CREATE TYPE "public"."competency_signal_status" AS ENUM (
  'observing', 
  'suggested', 
  'manager_confirmed', 
  'dismissed', 
  'resolved'
);

CREATE TYPE "public"."rule_scope_type" AS ENUM (
  'company', 
  'quotation'
);
```

---

## 2. Kesin Tablo Listesi, Alanlar ve Veri Tipleri

Tüm zaman damgaları (timestamp) timezone-aware (`timestamp with time zone`) ve varsayılan olarak `defaultNow()` / `notNull()` kurallarına uygun kurgulanacaktır.

### 1. `documents` (Yüklenen BIM/Standart Dokümanları)
*   **Amaç:** Kullanıcılar tarafından yüklenen standartların ve BEP/EIR belgelerinin üst verilerini saklar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `uploaded_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `original_file_name`: `text` (NOT NULL)
    *   `display_name`: `text` (NOT NULL)
    *   `mime_type`: `text` (NOT NULL)
    *   `file_size_bytes`: `bigint` (NOT NULL) -- CHECK (file_size_bytes > 0)
    *   `storage_key`: `text` (NOT NULL, tenant-safe ve tahmin edilemez yol)
    *   `checksum_sha256`: `text` (NOT NULL, idempotency kontrolü için)
    *   `status`: `document_status` (NOT NULL, default 'uploaded')
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `archived_at`: `timestamp with time zone` -- Soft-delete için
*   **Composite Unique Constraint:** `(id, company_id)` -> Child tabloların cross-tenant veri bağlamasını önlemek için zorunludur.

### 2. `document_processing_runs` (Asenkron Pipeline Çalışmaları)
*   **Amaç:** Doküman işleme adımlarını, LLM maliyetlerini ve hataları loglar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `document_id`: `uuid` (NOT NULL)
    *   `status`: `processing_run_status` (NOT NULL, default 'queued')
    *   `current_stage`: `processing_stage` (NOT NULL, default 'queued')
    *   `idempotency_key`: `text` (NOT NULL)
    *   `pipeline_version`: `integer` (NOT NULL, default 1) -- CHECK (pipeline_version > 0)
    *   `provider`: `text` (Nullable)
    *   `model`: `text` (Nullable)
    *   `progress_percent`: `integer` (NOT NULL, default 0) -- CHECK (progress_percent >= 0 AND progress_percent <= 100)
    *   `progress_message`: `text`
    *   `error_code`: `text`
    *   `error_message`: `text` (Kullanıcı dostu, secret/ham log barındırmayan mesaj)
    *   `started_at`: `timestamp with time zone` (Worker başladığında doldurulur)
    *   `completed_at`: `timestamp with time zone` (Yalnızca terminal durumda doldurulur)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint 1:** `(id, company_id)`
*   **Composite Unique Constraint 2:** `(company_id, document_id, idempotency_key)` -> Mükerrer çalışmayı engeller.
*   **Composite Foreign Key:** `(document_id, company_id)` REFERENCES `documents(id, company_id)`

### 3. `rule_candidates` (AI Tarafından Üretilen Kural Adayları)
*   **Amaç:** Triage kuyruğunda bekleyen onaylanmamış taslak kuralları tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `document_id`: `uuid` (NOT NULL)
    *   `processing_run_id`: `uuid` (NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `canonical_statement`: `text` (NOT NULL)
    *   `discipline`: `text` (NOT NULL)
    *   `object_type`: `text`
    *   `parameter`: `text`
    *   `operator`: `text`
    *   `expected_value`: `text`
    *   `error_category`: `error_category` (NOT NULL)
    *   `severity`: `severity` (NOT NULL)
    *   `source_evidence_json`: `jsonb` (NOT NULL, discriminated union formatlı kaynak kanıtı)
    *   `competency_area`: `text`
    *   `confidence_score`: `numeric(3, 2)` (NOT NULL) -- CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00)
    *   `is_ambiguous`: `boolean` (NOT NULL, default false)
    *   `ambiguity_reason`: `text`
    *   `status`: `rule_candidate_status` (NOT NULL, default 'draft')
    *   `candidate_fingerprint`: `text` (NOT NULL)
    *   `scope_type`: `rule_scope_type` (NOT NULL, default 'company')
    *   `quotation_id`: `uuid` (Nullable)
    *   `reviewed_by_user_id`: `uuid` (FK -> users.id)
    *   `reviewed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint 1:** `(id, company_id)`
*   **Composite Unique Constraint 2:** `(company_id, document_id, processing_run_id, candidate_fingerprint)`
*   **Composite Foreign Key 1:** `(document_id, company_id)` REFERENCES `documents(id, company_id)`
*   **Composite Foreign Key 2:** `(processing_run_id, company_id)` REFERENCES `document_processing_runs(id, company_id)`
*   **Composite Foreign Key 3:** `(quotation_id, company_id)` REFERENCES `quotations(id, company_id)`
*   **Check Constraint (Polymorphic Scope Koruması):**
    *   `CHECK ( (scope_type = 'company' AND quotation_id IS NULL) OR (scope_type = 'quotation' AND quotation_id IS NOT NULL) )`

### 4. `rule_registry` (İnsan Onaylı Canonical Kurallar)
*   **Amaç:** Aktif ve doğrulanmış şirket kurallarını barındırır.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `status`: `rule_status` (NOT NULL, default 'draft')
    *   `current_version`: `integer` (NOT NULL, default 1) -- CHECK (current_version > 0)
    *   `scope_type`: `rule_scope_type` (NOT NULL, default 'company')
    *   `quotation_id`: `uuid` (Nullable)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text`
    *   `severity`: `severity` (NOT NULL)
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `approved_by_user_id`: `uuid` (FK -> users.id)
    *   `approved_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)` -> Sürüm geçmişinin tenant-safe kalması için.
*   **Composite Foreign Key:** `(quotation_id, company_id)` REFERENCES `quotations(id, company_id)`
*   **Check Constraint (Polymorphic Scope Koruması):**
    *   `CHECK ( (scope_type = 'company' AND quotation_id IS NULL) OR (scope_type = 'quotation' AND quotation_id IS NOT NULL) )`

### 5. `rule_versions` (Değişmez Kural Geçmişi)
*   **Amaç:** Bir kuralın sürüm geçmişini ve değişiklik günlüklerini (changelog) korur.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `rule_id`: `uuid` (NOT NULL)
    *   `version`: `integer` (NOT NULL) -- CHECK (version > 0)
    *   `canonical_statement`: `text` (NOT NULL)
    *   `structured_condition_json`: `jsonb` (NOT NULL, Zod şemalı deklaratif kural parametreleri)
    *   `source_evidence_json`: `jsonb` (NOT NULL)
    *   `source_candidate_id`: `uuid` (Nullable)
    *   `change_log`: `text`
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(company_id, rule_id, version)`
*   **Composite Foreign Key 1:** `(rule_id, company_id)` REFERENCES `rule_registry(id, company_id)`
*   **Composite Foreign Key 2:** `(source_candidate_id, company_id)` REFERENCES `rule_candidates(id, company_id)`
*   **Composite Unique Index (Tekil Promotion):**
    *   `CREATE UNIQUE INDEX rule_versions_unique_candidate_idx ON rule_versions (company_id, source_candidate_id) WHERE source_candidate_id IS NOT NULL;`

### 6. `review_sessions` (SmartCheck Revizyon Oturumları)
*   **Amaç:** Tasarımcıya gönderilen revizyon paketlerinin (SmartCheck Findings) tek bir bildirimde gruplanmasını sağlar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `quotation_id`: `uuid` (NOT NULL)
    *   `assigned_to_user_id`: `uuid` (FK -> users.id, NOT NULL) -- Tasarımcı ataması
    *   `round_number`: `integer` (NOT NULL, default 1) -- CHECK (round_number > 0)
    *   `status`: `review_session_status` (NOT NULL, default 'draft')
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL) -- BIM Manager
    *   `submitted_at`: `timestamp with time zone`
    *   `completed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint 1:** `(id, company_id)`
*   **Composite Unique Constraint 2:** `(id, quotation_id, company_id)`
*   **Composite Unique Constraint 3 (Round Tekilliği):** `(company_id, quotation_id, assigned_to_user_id, round_number)`
*   **Composite Foreign Key:** `(quotation_id, company_id)` REFERENCES `quotations(id, company_id)`

### 7. `review_findings` (SmartCheck Revizyon Bulguları)
*   **Amaç:** Teklif/Metraj satırlarındaki tekil hata ihlallerini tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `review_session_id`: `uuid` (NOT NULL)
    *   `quotation_id`: `uuid` (NOT NULL)
    *   `quotation_item_id`: `uuid` (NOT NULL)
    *   `rule_id`: `uuid` (Nullable)
    *   `reported_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `error_category`: `error_category` (NOT NULL)
    *   `severity`: `severity` (NOT NULL)
    *   `details`: `text` (NOT NULL, problem tanımı)
    *   `manager_note`: `text`
    *   `status`: `finding_status` (NOT NULL, default 'open')
    *   `resolution_note`: `text`
    *   `resolved_by_user_id`: `uuid` (FK -> users.id)
    *   `resolved_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)`
*   **Composite Foreign Key 1:** `(review_session_id, quotation_id, company_id)` REFERENCES `review_sessions(id, quotation_id, company_id)`
*   **Composite Foreign Key 2:** `(quotation_item_id, quotation_id, company_id)` REFERENCES `quotation_items(id, quotation_id, company_id)`
*   **Composite Foreign Key 3:** `(rule_id, company_id)` REFERENCES `rule_registry(id, company_id)`

### 8. `competency_signals` (Türetilmiş Yetkinlik Gözlem Sinyalleri)
*   **Amaç:** Çalışanların hata örüntülerini 3x3 kuralına göre izler ve biriktirir.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `rule_id`: `uuid` (Nullable)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text` (NOT NULL)
    *   `evidence_count`: `integer` (NOT NULL, default 1) -- CHECK (evidence_count >= 0)
    *   `distinct_quotation_count`: `integer` (NOT NULL, default 1) -- CHECK (distinct_quotation_count >= 0)
    *   `distinct_review_round_count`: `integer` (NOT NULL, default 1) -- CHECK (distinct_review_round_count >= 0)
    *   `signal_fingerprint`: `text` (NOT NULL)
    *   `first_observed_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `last_observed_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `status`: `competency_signal_status` (NOT NULL, default 'observing')
    *   `manager_reviewed_by_user_id`: `uuid` (FK -> users.id)
    *   `manager_reviewed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint 1:** `(id, company_id)`
*   **Composite Unique Constraint 2:** `(company_id, user_id, signal_fingerprint)`
*   **Composite Foreign Key:** `(rule_id, company_id)` REFERENCES `rule_registry(id, company_id)`

### 9. `competency_signal_evidence` (Gözlem Kanıtları - Yeniden Hesaplama Kaynağı)
*   **Amaç:** 3x3 kuralını doğrulamak, itiraz/iptal durumunda yetkinlik sinyalini yeniden hesaplamak için kaynak teşkil eder.
*   **Alanlar:**
    *   `company_id`: `uuid` (NOT NULL)
    *   `competency_signal_id`: `uuid` (NOT NULL)
    *   `review_finding_id`: `uuid` (NOT NULL)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Constraints:**
    *   `PRIMARY KEY (company_id, competency_signal_id, review_finding_id)`
    *   `FOREIGN KEY (competency_signal_id, company_id) REFERENCES competency_signals (id, company_id) ON DELETE CASCADE`
    *   `FOREIGN KEY (review_finding_id, company_id) REFERENCES review_findings (id, company_id) ON DELETE RESTRICT`

### 10. `assistance_resources` (Bağlamsal Yardım Kaynakları)
*   **Amaç:** İhlal edilen kurallara yönelik hazırlanan rehber, checklist ve örnek dosyaları tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `resource_type`: `resource_type` (NOT NULL)
    *   `estimated_duration_seconds`: `integer` (NOT NULL, default 180) -- CHECK (estimated_duration_seconds >= 0)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text` (NOT NULL)
    *   `content_body`: `text` (Markdown/Checklist şeması, external_url dolu ise null olabilir)
    *   `external_url`: `text` (İsteğe bağlı harici link, content_body dolu ise null olabilir)
    *   `is_active`: `boolean` (NOT NULL, default true)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)` -> Çoklu ilişkilerde kiracı sızıntısını önler.
*   **Check Constraint:** `CHECK (content_body IS NOT NULL OR external_url IS NOT NULL)`

### 11. `rule_assistance_resources` (Çoklu İlişki Eşleme Tablosu)
*   **Amaç:** Kural sicili ile yardım kaynakları arasında many-to-many ilişki kurarak bir kurala birden fazla kaynak bağlanabilmesini sağlar.
*   **Alanlar:**
    *   `company_id`: `uuid` (NOT NULL)
    *   `rule_id`: `uuid` (NOT NULL)
    *   `assistance_resource_id`: `uuid` (NOT NULL)
*   **Constraints:**
    *   `PRIMARY KEY (company_id, rule_id, assistance_resource_id)`
    *   `FOREIGN KEY (rule_id, company_id) REFERENCES rule_registry (id, company_id) ON DELETE CASCADE`
    *   `FOREIGN KEY (assistance_resource_id, company_id) REFERENCES assistance_resources (id, company_id) ON DELETE CASCADE`

---

## 3. Mevcut Tablolara Eklenecek Constraint ve Alanlar

Mevcut tablolara minimum müdahale ilkesi gereği:
1.  **`usage_logs`** tablosuna nullable `document_processing_run_id` (uuid) eklenecek ve composite tenant FK ile korunacaktır:
    *   `FOREIGN KEY (document_processing_run_id, company_id) REFERENCES document_processing_runs(id, company_id)`
2.  **`quotations`** tablosuna composite unique constraint eklenecektir:
    *   `CONSTRAINT quotations_id_company_id_key UNIQUE (id, company_id)`
3.  **`quotation_items`** tablosuna composite unique constraint eklenecektir:
    *   `CONSTRAINT quotation_items_id_company_id_key UNIQUE (id, company_id)`
4.  **`quotation_items`** tablosuna composite FK eklenecektir:
    *   `FOREIGN KEY (quotation_id, company_id) REFERENCES quotations(id, company_id)`

---

## 4. Existing Data Integrity Preflight

Yerel veritabanında gerçekleştirilen preflight analiz sonuçları aşağıdaki gibidir:
*   **Quotation Sayısı:** 0
*   **Quotation Item Sayısı:** 0
*   **Null company_id Sayısı (Quotations):** 0
*   **Null company_id Sayısı (Items):** 0
*   **Orphan Item (Bağsız Teklif Kalemi) Sayısı:** 0
*   **Quotation/Item Şirket Uyuşmazlığı (Mismatch) Sayısı:** 0
*   **Usage Log Kayıt Sayısı:** 0
*   **Composite Constraint Eklenebilirlik Sonucu:** Lokal veritabanında yapılan preflight doğrulamasına göre mevcut primary key tekilliği ve company_id bütünlüğü nedeniyle non-destructive olarak eklenebilir.
*   **Usage Log'a Kolon Eklenmesinin Mevcut Kayıtlar Üzerindeki Etkisi:** Mevcut kayıt sayısı 0 olduğundan etki sıfırdır (null olarak güvenle eklenebilir).
*   **Herhangi bir veri düzeltmesi gerekip gerekmediği:** Gerekmemektedir (Veritabanı temiz durumdadır).

---

## 5. Silme (Delete) Davranışları ve Audit Yaklaşımı

*   **Company (Şirket) Silme:** `RESTRICT`. Fiziksel silme engellenir.
*   **Document (Standart) Silme:** Soft-delete yöntemi kullanılacaktır (`archived_at`, `status = 'archived'`). Cascade silme **kesinlikle uygulanmayacak**, AI analiz geçmişi ve kaynak kanıt verileri korunacaktır.
*   **Rule Registry (Onaylı Kural) Silme:** `RESTRICT`. Silme yapılamaz, kural `status = 'archived'` yapılır.
*   **User (Kullanıcı) Silme:** `RESTRICT`. Kullanıcılar fiziksel olarak silinmez, audit geçmişi korunur. Tüm FK alanları `NOT NULL` kalmaya devam edebilir. Şirket ve kullanıcılar için soft-delete deaktif/aktiflik durumu veri tabanındaki mevcut şemada kolon bulunmadığı için veri tabanı düzeyinde silme kısıtlamalarıyla (RESTRICT) korunur. Bu durum Teknik Borç olarak kaydedilmiştir.
*   **Quotation Item (Teklif Kalemi) Silme:** `RESTRICT`.

---

## 6. İndeks Tasarımı (Index Specifications)

Sorguların veri kümesi büyüdüğünde yavaşlamasını engellemek için planlanan indeksler:

```sql
CREATE INDEX idx_documents_company_status ON "documents" ("company_id", "status");
CREATE INDEX idx_processing_runs_lookup ON "document_processing_runs" ("company_id", "document_id", "status");
CREATE INDEX idx_rule_candidates_lookup ON "rule_candidates" ("company_id", "document_id", "status");
CREATE INDEX idx_rule_registry_lookup ON "rule_registry" ("company_id", "status");
CREATE INDEX idx_rule_versions_lookup ON "rule_versions" ("company_id", "rule_id", "version");
CREATE INDEX idx_review_findings_lookup ON "review_findings" ("company_id", "review_session_id");
CREATE INDEX idx_review_sessions_lookup ON "review_sessions" ("company_id", "quotation_id", "status");
CREATE INDEX idx_review_sessions_assignee ON "review_sessions" ("company_id", "assigned_to_user_id", "status");
CREATE INDEX idx_competency_signals_user ON "competency_signals" ("company_id", "user_id", "status");
CREATE INDEX idx_assistance_resources_active ON "assistance_resources" ("company_id", "is_active");
CREATE INDEX idx_usage_logs_processing_run ON "usage_logs" ("company_id", "document_processing_run_id");
```

---

## 7. Idempotency ve Audit Stratejisi

*   **Genişletilmiş Idempotency Key (Doküman İşleme):** `document_processing_runs` üzerinde `idempotency_key` aşağıdaki bileşenlerin deterministik SHA-256 hash'i olacaktır:
    *   `company_id + document_checksum + pipeline_version + extraction_schema_version + prompt_version + configuration_hash`
*   **Candidate Fingerprint (AI Tekrarlarını Önleme):** `rule_candidates` üzerindeki `candidate_fingerprint` normalize edilmiş şu alanlardan üretilecektir:
    *   `discipline + object_type + parameter + operator + expected_value + scope_type + canonical_statement_normalized`
    *   Metin girdileri normalize edilmeden (büyük/küçük harf, boşluk) önce temizlenecektir.
*   **Güncelleme Zaman Damgaları:** Bütün güncelleme (update) işlemlerinde ortak repository data-access fonksiyonları ve worker update operasyonlarında `updatedAt` değeri kod seviyesinde açıkça (`new Date()`) güncellenecektir. Veri tabanı tetikleyicisi (trigger) kullanılmayacaktır.

---

## 8. Zod Kaynak Kanıtı Şeması (Zod Schema for Source Evidence)

`rule_candidates.source_evidence_json` alanına yazılacak JSON verisi, discriminated union yapısında tasarlanmış kaynak kanıt Zod şemasıyla doğrulanacaktır:

```typescript
import { z } from 'zod';

export const PdfEvidenceSchema = z.object({
  sourceType: z.literal('pdf'),
  documentId: z.string().uuid(),
  pageNumber: z.number().int().positive(),
  sectionTitle: z.string().optional(),
  sourceText: z.string().min(1),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const DocxEvidenceSchema = z.object({
  sourceType: z.literal('docx'),
  documentId: z.string().uuid(),
  sectionTitle: z.string().optional(),
  paragraphIndex: z.number().int().nonnegative().optional(),
  sourceText: z.string().min(1),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const XlsxEvidenceSchema = z.object({
  sourceType: z.literal('xlsx'),
  documentId: z.string().uuid(),
  sheetName: z.string().min(1),
  cellRange: z.string().min(1),
  sourceText: z.string().min(1),
  extractionConfidence: z.number().min(0.00).max(1.00)
});

export const SourceEvidenceSchema = z.discriminatedUnion('sourceType', [
  PdfEvidenceSchema,
  DocxEvidenceSchema,
  XlsxEvidenceSchema
]);
```

---

## 9. Zod Yapılandırılmış Mantıksal Kural Şeması (Zod Schema for Structured Condition)

`rule_versions.structured_condition_json` alanındaki kural mantığı, çalıştırılabilir kod saklamak yerine deklaratif kural parametrelerini saklamak üzere şu Zod şemasıyla doğrulanacaktır:

```typescript
import { z } from 'zod';

export const StructuredConditionSchema = z.object({
  schemaVersion: z.literal(1),
  subjectType: z.string().min(1), // Örn: 'column', 'beam'
  parameter: z.string().min(1), // Örn: 'poz_code', 'unit'
  operator: z.enum(['equals', 'not_equals', 'contains', 'matches_regex', 'greater_than', 'less_than']),
  expectedValue: z.string(),
  unit: z.string().optional(),
  conditions: z.array(z.any()).optional() // Karmaşık kurallar için nesting desteği
});
```

---

## 10. Uygulama Seviyesi İşlem Bütünlüğü Kuralları (Application Invariants)

Aşağıdaki operasyonel durumların tek bir veri tabanı transaction bütünlüğü içerisinde yönetilmesi zorunludur:

*   **AI Kural Adayı Terfisi (Candidate Promotion):**
    1.  `rule_registry` kaydının oluşturulması.
    2.  `rule_versions` üzerinde Version 1 kaydının oluşturulması ve `source_candidate_id` referansının bağlanması.
    3.  `rule_candidates.status` alanının `approved` yapılması ve `reviewed_by_user_id`, `reviewed_at` bilgilerinin set edilmesi.
*   **Kural Güncellemesi (Rule Update):**
    1.  Yeni `rule_versions` kaydının eklenmesi.
    2.  `rule_registry.current_version` değerinin artırılması ve `updated_at` zaman damgasının güncellenmesi.

---

## 11. Rollback Stratejisi

Migration uygulandıktan sonra hata alınması durumunda sırayla şu rollback komutları yerel ortamda koşturulacaktır:
1.  Uygulamaya geçmeden önce yerel PostgreSQL veritabanından yedek/snapshot alınacaktır.
2.  Her ileri migration SQL'i için eşdeğer manuel `down.sql` (rollback betiği) hazırlanacak ve test edilecektir.
3.  Migration hatası anında veritabanı snapshot/backup geri yüklemesi tetiklenecektir.
4.  Git üzerinden feature branch'teki şema değişiklikleri geri alınarak baseline sürümüne dönülecektir:
    *   `git checkout feat/smartcheck-phase1-core -- src/db/schema.ts`
