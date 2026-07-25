# SmartCheck & Competency Loop — Şema Tasarım Raporu

Bu rapor, **BIMPlan Academy Faz 1** (SmartCheck) dikey değer döngüsünü veri tabanı seviyesinde en yüksek veri bütünlüğü, asenkron idempotency ve katı kiracı izolasyonu (tenant isolation) ile yürütmek üzere tasarlanmış şema mimarisidir.

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
  'project', 
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
    *   `file_size_bytes`: `bigint` (NOT NULL)
    *   `storage_key`: `text` (NOT NULL, tenant-safe ve tahmin edilemez yol)
    *   `checksum_sha256`: `text` (NOT NULL, idempotency kontrolü için)
    *   `status`: `document_status` (NOT NULL, default 'uploaded')
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)` -> Child tabloların cross-tenant veri bağlamasını önlemek için zorunludur.

### 2. `document_processing_runs` (Asenkron Pipeline Çalışmaları)
*   **Amaç:** Doküman işleme adımlarını, LLM maliyetlerini ve hataları loglar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `document_id`: `uuid` (FK -> documents.id, NOT NULL)
    *   `status`: `document_status` (NOT NULL)
    *   `current_stage`: `processing_stage` (NOT NULL)
    *   `idempotency_key`: `text` (NOT NULL)
    *   `pipeline_version`: `integer` (NOT NULL, default 1)
    *   `provider`: `text` (Nullable)
    *   `model`: `text` (Nullable)
    *   `progress_percent`: `integer` (NOT NULL, default 0)
    *   `progress_message`: `text`
    *   `error_code`: `text`
    *   `error_message`: `text` (Kullanıcı dostu, secret/ham log barındırmayan mesaj)
    *   `started_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `completed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(company_id, idempotency_key)` -> Aynı işin mükerrer çalışmasını engeller.
*   **Composite Foreign Key:** `(document_id, company_id)` -> `documents(id, company_id)` referans alınır (Cross-tenant koruması).

### 3. `rule_candidates` (AI Tarafından Üretilen Kural Adayları)
*   **Amaç:** Triage kuyruğunda bekleyen onaylanmamış taslak kuralları tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `document_id`: `uuid` (FK -> documents.id, NOT NULL)
    *   `processing_run_id`: `uuid` (FK -> document_processing_runs.id, NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `canonical_statement`: `text` (NOT NULL)
    *   `discipline`: `text` (NOT NULL)
    *   `object_type`: `text`
    *   `parameter`: `text`
    *   `operator`: `text`
    *   `expected_value`: `text`
    *   `error_category`: `error_category` (NOT NULL)
    *   `severity`: `severity` (NOT NULL)
    *   `source_evidence_json`: `jsonb` (NOT NULL, Zod şemalı kaynak doğrulaması)
    *   `competency_area`: `text`
    *   `confidence_score`: `numeric(3, 2)` (NOT NULL, 0.00 - 1.00 arası kısıtlı)
    *   `is_ambiguous`: `boolean` (NOT NULL, default false)
    *   `ambiguity_reason`: `text`
    *   `status`: `rule_candidate_status` (NOT NULL, default 'draft')
    *   `candidate_fingerprint`: `text` (NOT NULL, tekrarlanan çıkarmaları önlemek için)
    *   `reviewed_by_user_id`: `uuid` (FK -> users.id)
    *   `reviewed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(company_id, document_id, processing_run_id, candidate_fingerprint)`
*   **Composite Foreign Key:** `(document_id, company_id)` -> `documents(id, company_id)`

### 4. `rule_registry` (İnsan Onaylı Canonical Kurallar)
*   **Amaç:** Aktif ve doğrulanmış şirket kurallarını barındırır.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `status`: `rule_status` (NOT NULL, default 'draft')
    *   `current_version`: `integer` (NOT NULL, default 1)
    *   `scope_type`: `rule_scope_type` (NOT NULL, default 'company')
    *   `scope_reference_id`: `uuid` (Polymorphic UUID, limitsiz risk tespiti için `quotationId` ile yedekli ilişki)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text`
    *   `severity`: `severity` (NOT NULL)
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `approved_by_user_id`: `uuid` (FK -> users.id)
    *   `approved_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)` -> Sürüm geçmişinin tenant-safe kalması için.

### 5. `rule_versions` (Değişmez Kural Geçmişi)
*   **Amaç:** Bir kuralın sürüm geçmişini ve değişiklik günlüklerini (changelog) korur.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `rule_id`: `uuid` (FK -> rule_registry.id, NOT NULL)
    *   `version`: `integer` (NOT NULL)
    *   `canonical_statement`: `text` (NOT NULL)
    *   `condition_logic`: `jsonb` (NOT NULL, çalıştırılabilir kural mantığı)
    *   `source_evidence_json`: `jsonb` (NOT NULL)
    *   `change_log`: `text`
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(company_id, rule_id, version)`
*   **Composite Foreign Key:** `(rule_id, company_id)` -> `rule_registry(id, company_id)`

### 6. `review_sessions` (Onay/İnceleme Oturumları - Gruplama için)
*   **Amaç:** Tasarımcıya gönderilen revizyon paketlerinin (SmartCheck Findings) tek bir bildirimde gruplanmasını sağlar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `quotation_id`: `uuid` (FK -> quotations.id, NOT NULL)
    *   `status`: `text` (NOT NULL, default 'pending') // pending, completed
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Unique Constraint:** `(id, company_id)`

### 7. `review_findings` (SmartCheck Revizyon Bulguları)
*   **Amaç:** Teklif/Metraj satırlarındaki tekil hata ihlallerini tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `review_session_id`: `uuid` (FK -> review_sessions.id, NOT NULL)
    *   `quotation_id`: `uuid` (FK -> quotations.id, NOT NULL)
    *   `quotation_item_id`: `uuid` (FK -> quotation_items.id, NOT NULL)
    *   `rule_id`: `uuid` (FK -> rule_registry.id, Nullable - Manuel bulgular için null olabilir)
    *   `reported_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `assigned_to_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `error_category`: `error_category` (NOT NULL)
    *   `severity`: `severity` (NOT NULL)
    *   `details`: `text` (NOT NULL, problem tanımı)
    *   `manager_note`: `text` (BIM Manager'ın eklediği not)
    *   `status`: `finding_status` (NOT NULL, default 'open')
    *   `resolution_note`: `text` (Tasarımcının çözüm notu)
    *   `resolved_by_user_id`: `uuid` (FK -> users.id)
    *   `resolved_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)
*   **Composite Foreign Key 1:** `(review_session_id, company_id)` -> `review_sessions(id, company_id)`
*   **Composite Foreign Key 2:** `(rule_id, company_id)` -> `rule_registry(id, company_id)`

### 8. `competency_signals` (Kazanılmış Yetkinlik Sinyalleri)
*   **Amaç:** 3x3 kanıt eşiğine göre çalışanların hata örüntülerini biriktirir.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `rule_id`: `uuid` (FK -> rule_registry.id, Nullable)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text` (NOT NULL)
    *   `evidence_count`: `integer` (NOT NULL, default 1)
    *   `distinct_project_count`: `integer` (NOT NULL, default 1)
    *   `distinct_review_round_count`: `integer` (NOT NULL, default 1)
    *   `first_observed_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `last_observed_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `status`: `competency_signal_status` (NOT NULL, default 'observing')
    *   `manager_reviewed_by_user_id`: `uuid` (FK -> users.id)
    *   `manager_reviewed_at`: `timestamp with time zone`
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)

### 9. `assistance_resources` (Bağlamsal Yardım Kaynakları)
*   **Amaç:** İhlal edilen kurallara yönelik hazırlanan rehber, checklist ve örnek dosyaları tutar.
*   **Alanlar:**
    *   `id`: `uuid` (PK, defaultRandom)
    *   `company_id`: `uuid` (FK -> companies.id, NOT NULL)
    *   `created_by_user_id`: `uuid` (FK -> users.id, NOT NULL)
    *   `title`: `text` (NOT NULL)
    *   `resource_type`: `resource_type` (NOT NULL)
    *   `estimated_duration_seconds`: `integer` (NOT NULL, default 180)
    *   `error_category`: `error_category` (NOT NULL)
    *   `competency_area`: `text` (NOT NULL)
    *   `content_body`: `text` (Markdown/Checklist şeması)
    *   `external_url`: `text` (İsteğe bağlı harici video linki)
    *   `is_active`: `boolean` (NOT NULL, default true)
    *   `created_at`: `timestamp with time zone` (NOT NULL, default now)
    *   `updated_at`: `timestamp with time zone` (NOT NULL, default now)

### 10. `rule_assistance_resources` (Çoklu İlişki Eşleme Tablosu)
*   **Amaç:** Kural sicili ile yardım kaynakları arasında many-to-many ilişki kurarak bir kurala birden fazla kaynak bağlanabilmesini sağlar.
*   **Alanlar:**
    *   `company_id`: `uuid` (NOT NULL)
    *   `rule_id`: `uuid` (NOT NULL)
    *   `assistance_resource_id`: `uuid` (NOT NULL)
*   **Constraints:**
    *   `PRIMARY KEY (company_id, rule_id, assistance_resource_id)`
    *   `FOREIGN KEY (rule_id, company_id) REFERENCES rule_registry (id, company_id)`
    *   `FOREIGN KEY (assistance_resource_id) REFERENCES assistance_resources (id)`

---

## 3. Silme (Delete) Davranışları ve Audit Yaklaşımı

Veri kaybını ve geçmiş analizlerin bozulmasını önlemek için silme eylemlerinde PostgreSQL cascade kuralları özelleştirilmiştir:

*   **Company (Şirket) Silme:** B2B şirket hesapları fiziksel olarak silinmez (`is_active = false` yapılır). Bu sayede `RESTRICT` koruması sağlanır; kazara tüm veritabanının silinmesi engellenir.
*   **Document (Standart) Silme:** `CASCADE` uygulanabilir. Bir döküman silindiğinde ona bağlı taslak `rule_candidates` ve `document_processing_runs` verileri silinir (Zaten onaylı kurallar Registry'ye geçtiği için kaybolmaz).
*   **Rule Registry (Onaylı Kural) Silme:** `RESTRICT`. Onaylanmış bir kural silinemez, sadece `status = 'archived'` yapılabilir. Bu sayede geçmiş `review_findings` kayıtlarının ilişkileri korunur.
*   **User (Kullanıcı) Silme:** `SET NULL` veya soft-delete. Bir mühendis silindiğinde audit geçmişini kaybetmemek için `review_findings.assigned_to_user_id` korunur.
*   **Quotation Item (Teklif Kalemi) Silme:** `RESTRICT` veya soft-delete. Hata bulgusu içeren bir teklif kalemi silinmeye çalışıldığında hata geçmişinin bozulmaması için işlem engellenir.

---

## 4. İndeks Tasarımı (Index Specifications)

Sorguların veri kümesi büyüdüğünde yavaşlamasını engellemek için planlanan indeksler:

```sql
CREATE INDEX idx_documents_company_status ON "documents" ("company_id", "status");
CREATE INDEX idx_processing_runs_lookup ON "document_processing_runs" ("company_id", "document_id", "status");
CREATE INDEX idx_rule_candidates_lookup ON "rule_candidates" ("company_id", "document_id", "status");
CREATE INDEX idx_rule_registry_lookup ON "rule_registry" ("company_id", "status");
CREATE INDEX idx_rule_versions_lookup ON "rule_versions" ("company_id", "rule_id", "version");
CREATE INDEX idx_review_findings_quotation ON "review_findings" ("company_id", "quotation_id", "status");
CREATE INDEX idx_review_findings_assignee ON "review_findings" ("company_id", "assigned_to_user_id", "status");
CREATE INDEX idx_competency_signals_user ON "competency_signals" ("company_id", "user_id", "status");
CREATE INDEX idx_assistance_resources_active ON "assistance_resources" ("company_id", "is_active");
```

---

## 5. Idempotency ve Audit Stratejisi

*   **Idempotency Key (Doküman İşleme):** `document_processing_runs` üzerinde `(company_id, idempotency_key)` composite unique key tanımlıdır. Bu anahtar `checksum_sha256 + pipeline_version` şeklinde hesaplanır. Aynı dosya tekrar işlenmek istendiğinde sistem yeni bir run açmak yerine mevcut run'ı kontrol eder.
*   **Candidate Fingerprint (AI Tekrarlarını Önleme):** `rule_candidates` tablosundaki `candidate_fingerprint` alanı, kuralın `title + expectedValue + objectType` verilerinin SHA-256 hash'idir. Aynı run içinde AI aynı kuralı birden fazla kez fırlatırsa unique constraint engeller.
*   **Audit Alanları:** Her tabloda standardizasyon sağlamak amacıyla `created_at`, `updated_at` (timezone-aware) ve `created_by_user_id` / `uploaded_by_user_id` alanları zorunlu kılınmıştır.

---

## 6. SmartCheck Revizyon Gruplama Kararı

*   **Seçenek B (Review Sessions + Review Findings) Seçildi.**
*   *Gerekçe:* Mühendisin ekranını bildirim bombardımanına tutmamak için, BIM Manager'ın aynı inceleme turunda işaretlediği 10 farklı hata tek bir `review_sessions` kaydı altında toplanır. Tasarımcıya tek bir revizyon paketi bildirilir. `review_findings` tablosu `review_session_id` ile bu gruba bağlanır.

---

## 7. Faz 1'e Alınmayan Modeller

*   `exams`, `questions`, `answers` (Sınav motoru veri modelleri)
*   `certificates` (Akademi sertifika kayıtları)
*   `course_progress`, `lesson_completions` (LMS ilerleme tabloları)
*   `stripe_customers`, `invoices` (Faturalama ve abonelik entegrasyonu)
*   `crm_deals`, `crm_pipelines` (CRM modülü veri modelleri)
