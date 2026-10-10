# Container App And Worker Preparation

This is a local deployment preparation, not evidence of a deployed service,
working backups, production S3 acceptance, or completed GAP step09. The existing
Express/Drizzle application remains the sole write owner.

## Images And Resources

`Dockerfile` pins Node 24.18.0 and build tooling pnpm 11.17.0. Build targets are
`app` and `worker`; both run as the non-root `node` user under tini. Dependency
installation uses the frozen lockfile and skips install scripts, including the
Puppeteer browser download. Debian Chromium supplies the runtime browser.
The Debian packages and PostgreSQL tag are not immutable digest pins; record
resolved image digests and vulnerability scan results for an actual release.

`compose.example.yaml` is intended for Coolify on a VPS (e.g. Contabo) with sufficient
RAM. It budgets up to 1.5 GiB app, 1 GiB worker, 2 GiB ifc-worker, and 512 MiB PostgreSQL, plus host
and Docker overhead. Total required RAM for this composition is ~6 GiB minimum.
- `worker`: processes CSV/XLSX documents (`process_smartcheck_document`). Defaults to concurrency 2.
- `ifc-worker`: dedicated container with Python 3 + IfcOpenShell (`process_smartcheck_ifc_document`). Defaults to concurrency 1, up to 2. Allocated 2 GiB RAM, 1.5 CPUs, and 512 MiB writable `/tmp` tmpfs.
- `migrate`: one-shot service executing `node dist/release-cli.mjs apply` before app boot.

Note on Vercel: Vercel serverless functions cannot run long-lived Graphile background workers,
persistent Puppeteer Chromium pools, or Python IfcOpenShell subprocesses. Vercel is strictly for
SPA/API edge routing if ever used; production background workers MUST run in Docker containers (Coolify/VPS).

Do not run this Compose project over an existing deployment without checking
project name, ports, target database and volumes. PostgreSQL has no host port.
The app binds to localhost port 3002 by default; Coolify should route its proxy
to app port 3000 on the project network. Worker services expose no HTTP endpoint.


## Environment Separation

Keep untracked, access-restricted `.env.app`, `.env.worker`, `.env.postgres`
outside source control. Docker build context excludes env files and private keys.
Use Coolify runtime secrets or an equivalent secret store, never build args.

- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Both app and worker: `DATABASE_URL` pointing to the Compose `postgres` service,
  `JWT_SECRET` (non-placeholder, at least 32 characters), `PUBLIC_APP_URL` (HTTPS),
  `AUTH_EMAIL_WEBHOOK_URL` (HTTPS), `AUTH_EMAIL_WEBHOOK_SECRET`, and valid
  `TRUST_PROXY_HOPS` (1-3). Shared production preflight is intentionally enforced.
- SmartCheck: `SMARTCHECK_IMPORT_ENABLED=true`, approved
  `SMARTCHECK_PILOT_COMPANY_IDS`, `SMARTCHECK_S3_BUCKET`, `SMARTCHECK_S3_REGION`,
  optional HTTPS `SMARTCHECK_S3_ENDPOINT` and `SMARTCHECK_S3_FORCE_PATH_STYLE`,
  paired access/secret keys or a working workload credential provider. Worker
  requires production storage settings even when HTTP import is disabled.
- App/provider secrets: only the AI providers actually used. No provider keys
  are needed for the bounded storage unit tests.
- Compose interpolation: `.env` or Coolify environment supplies `IMAGE_TAG`,
  `APP_PORT`, `SMARTCHECK_WORKER_CONCURRENCY`, `GRAPHILE_WORKER_SCHEMA`.
  These interpolation inputs differ from the per-service `env_file` entries.

## Startup And Release Gates

1. Run focused tests, full tests, typecheck and build on the exact release source.
2. Build locally with `docker build --target app -t teklifpro-app:local .` and
   `docker build --target worker -t teklifpro-worker:local .`.
3. Validate Compose with real local env-file paths using `docker compose -f
   compose.example.yaml config --quiet`. Do not print expanded secret values.
4. Apply the reviewed release migration procedure against the intended database
   before starting the application. This image does not silently seed or migrate
   the application schema. A fresh empty PostgreSQL volume alone is insufficient.
5. Verify `/api/health`, login, tenant isolation, PDF generation, a small SmartCheck
   upload/worker/result cycle, and graceful worker termination in a disposable
   environment. Health checks prove DB/rate-limit reachability, not email inbox
   delivery or S3 authorization. Worker startup is not proof of job progress.

Graphile Worker 0.16 owns SIGINT/SIGTERM graceful shutdown. The entrypoint does
not add competing signal handlers. It honors `GRAPHILE_WORKER_SCHEMA` and caps
the Graphile connection pool at concurrency + 2. The processor's separate DB
pool still follows its existing configuration. Worker may run Graphile's own
schema initialization; the runtime DB role therefore needs the corresponding
reviewed privileges.

Enqueue and worker use the same validated `GRAPHILE_WORKER_SCHEMA` (default
`graphile_worker`). The app initializes Graphile's schema before its first run
request, so its DB role also needs the reviewed migration privileges. Run,
document status, audit and Graphile `add_job` commit in one database transaction.
Queue or audit failures roll everything back; retrying the HTTP request is safe.
Per-document row locking serializes simultaneous process/retry requests.

Stale queued/running records, including pre-change orphan runs with no job,
can use `recover-stale` followed by `retry`. Recovery removes pending old jobs
transactionally. Retry retires old automatic retries before creating a successor.
If Graphile reports any old job as locked, the request returns 409
`PROCESSING_JOB_ACTIVE` and rolls back, including Graphile's key-clearing mutation.
Staleness alone is not proof that a worker stopped. Do not force-unlock a job
while its worker might still execute: investigate/stop that worker first and use
Graphile's reviewed lock-recovery procedure. This endpoint deliberately does not
force-unlock crashed workers. Existing old jobs in a different worker schema must
be drained/stopped before changing `GRAPHILE_WORKER_SCHEMA`; no automatic schema
handoff or cross-schema cancellation is provided.

## Chromium Sandbox

Chromium sandbox remains enabled. Neither image nor Compose adds a sandbox
disable flag, privileged mode, a broad capability grant, or an unconfined
security profile. App/worker drop capabilities, use a read-only root filesystem
and mount bounded writable tmpfs locations. The app has dedicated shared memory.

The target host must support unprivileged user namespaces under its actual
seccomp/AppArmor policy. Standard Docker restrictions on some hosts may prevent
sandboxed Chromium startup. Treat that as a PDF release blocker: have an operator
review a narrowly scoped namespace policy or use a sandbox-capable host. Do not
disable Chromium's sandbox to obtain a green smoke. A successful image build
does not prove this runtime requirement.

Local Docker Desktop validation on 2026-10-08 built the app image and confirmed
Node v24.18.0, UID 1000, and no `/app/.env.local` in the runtime image. A disposable
network-disabled PDF smoke with the Compose capability/read-only/tmpfs settings
failed at Chromium namespace creation (`Operation not permitted`; setuid sandbox
also reported the no-new-privileges restriction). The sandbox was not disabled
and host policy was not changed. PDF runtime acceptance is therefore **blocked
on the tested host**, not verified by the successful build.

## Storage Bounds And Recovery

All local and S3 reads stream into a byte-limited accumulator before final
buffer construction. Default cap is the existing 100 MiB maximum; callers may
pass `{ maxBytes }` for a tighter limit, never a larger one. Spreadsheet admission
still enforces its existing 25 MiB format-specific limit. Reads default to a
30-second deadline including S3 request time; optional `timeoutMs` is limited to
120 seconds, and `signal` enables caller cancellation. Oversize bodies, stream
errors and provider failures reject; active bodies are destroyed on failure.
The final buffer and chunks can coexist briefly, so memory budgeting must allow
roughly twice the cap plus SDK/parser overhead. This does not bound parser memory.

`postgres-data` is persistence, not backup. Before release, require a scheduled
encrypted off-host DB backup, a tested restore into a different database, and
S3 versioning/retention/lifecycle and restore evidence. None is supplied by this
Compose example. Keep previous image digests and migration compatibility notes;
rollback must stop new writes/jobs before a reviewed DB restore or image rollback.
