ALTER TABLE "document_processing_runs"
  ADD COLUMN "worker_job_id" text,
  ADD COLUMN "worker_lease_token" uuid;

WITH affected AS (
UPDATE "document_processing_runs"
SET "status" = 'failed',
    "current_stage" = 'failed',
    "error_code" = 'WORKER_LEASE_MIGRATION',
    "error_message" = 'Worker lease migration requires an explicit retry.',
    "progress_message" = 'Worker lease migration; retry required',
    "completed_at" = now(),
    "updated_at" = now()
WHERE "status" = 'running'
RETURNING "document_id", "company_id"
)
UPDATE "documents" AS document
SET "status" = 'failed', "updated_at" = now()
FROM affected
WHERE document."id" = affected."document_id"
  AND document."company_id" = affected."company_id";
