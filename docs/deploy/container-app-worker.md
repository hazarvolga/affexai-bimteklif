# Container App And Worker Preparation

This is a local deployment preparation, not evidence of a deployed service,
working backups, production S3 acceptance, or completed GAP step09. The existing
Express/Drizzle application remains the sole write owner.

## Images And Resources

`Dockerfile` pins Node 24.18.0 and build tooling pnpm 11.17.0. Build targets are
`app`, `worker`, `ifc-worker`, and `migrate`; runtime targets use the non-root
`node` user under tini. Migration has its own image tag and command. Dependency
installation uses the frozen lockfile and skips install scripts, including the
Puppeteer browser download. Debian Chromium supplies the runtime browser.
The Debian packages and PostgreSQL tag are not immutable digest pins; record
resolved image digests and vulnerability scan results for an actual release.

`compose.example.yaml` is intended for Coolify on a VPS (e.g. Contabo) with sufficient
RAM. It budgets up to 1.5 GiB app, 1 GiB worker, 2 GiB ifc-worker, and 512 MiB PostgreSQL, plus host
and Docker overhead. The configured service RAM ceilings sum to 5 GiB before shared-memory/tmpfs
and host overhead; use a host with headroom and measure actual RSS/CPU before
accepting customer workloads. These limits are not a measured capacity promise.
- `worker`: processes CSV/XLSX documents (`process_smartcheck_document`). Defaults to concurrency 2.
- `ifc-worker`: dedicated container with Python 3.11 + IfcOpenShell 0.8.4.post1 (`process_smartcheck_ifc_document`). Defaults to concurrency 1, up to 2. Allocated 2 GiB RAM, 1.5 CPUs, and 512 MiB writable `/tmp` tmpfs.
- `migrate`: separately tagged one-shot service executing `node dist/release-cli.mjs apply`.
  App and both workers depend on successful completion, as well as PostgreSQL health.
- All runtime Drizzle pools default to four connections in Compose. At default
  worker concurrency, steady-state pool ceilings are 4 app + (4 Drizzle + 4 Graphile)
  generic worker + (4 Drizzle + 3 Graphile) IFC worker = 19 against PostgreSQL's 40.
  Raising replica counts/concurrency requires recalculating this budget. The crawler's
  batch advisory lock occupies one connection within the app pool while it runs.

The deployment example targets long-lived Docker services on Coolify/VPS.
Frontend preview hosting does not replace the worker and PostgreSQL services.

Do not run this Compose project over an existing deployment without checking
project name, ports, target database and volumes. PostgreSQL has no host port.
The app binds to localhost port 3002 by default; Coolify should route its proxy
to app port 3000 on the project network. Worker services expose no HTTP endpoint.


## Coolify Git Deployment For bimmetraj.com

`compose.coolify.yaml` is the self-contained Coolify profile for this release.
Select that Compose file for the Git-backed resource and assign
`https://bimmetraj.com` to service `app`, internal port `3000`, through Coolify's
proxy/domain configuration. The file exposes app port 3000 on the container network
and publishes no host ports for any service. Do not assign a public domain to
PostgreSQL or either worker. DNS/TLS and live domain routing require separate
verification after provisioning; the Compose file alone does not establish them.

This profile has no `env_file` paths. Coolify generates and retains the two named
credential values below when it loads the Git application Compose definition;
reusing each variable passes the same saved value to the relevant services.
The generated password has no symbols and is safe in the database URL; the JWT
secret is hexadecimal. See the official [generated stack values documentation](https://next.coolify.io/docs/applications/builds/docker-compose#generated-stack-values).
Enter the remaining runtime values in Coolify's secret/environment configuration.
Required substitutions reject missing values. Standard Docker Compose does not
generate these variables, so local validation must supply fabricated values.
No secret values belong in Git, build arguments, logs or this runbook.
In Coolify, set **Build time → Not available during build** and keep **Runtime →
Available in the container** for every application environment variable. Merely
using the environment-variable UI does not make a value runtime-only: its default
build availability can place credentials in Docker image history. Verify these
flags after loading Compose and before building. Compare deployed credentials
against image history/config without printing either secret values or raw history.
If any match, rotate the affected credentials, rebuild without cache and repeat
the check; changing the flags alone does not invalidate old image credentials.

| Runtime input | Requirement |
|---|---|
| `SERVICE_PASSWORD_64_POSTGRES` | Coolify-generated 64-character password without symbols; supplied as PostgreSQL's `POSTGRES_PASSWORD` and reused in runtime/migration database URLs. |
| `SERVICE_HEX_64_JWT` | Coolify-generated 64-character hexadecimal value; supplied as the app/worker `JWT_SECRET`. |
| `SMARTCHECK_S3_BUCKET` | Provisioned production bucket with reviewed retention/access policy. |
| `SMARTCHECK_S3_REGION` | Provider region; use `auto` only when required by the selected provider. |
| `SMARTCHECK_S3_ACCESS_KEY_ID`, `SMARTCHECK_S3_SECRET_ACCESS_KEY` | Scoped object-storage credentials, required even while HTTP imports are off because workers use production storage. |
| `SMARTCHECK_S3_ENDPOINT` | HTTPS endpoint for a non-AWS S3-compatible provider; omit for standard AWS endpoints. |
| `SMARTCHECK_S3_FORCE_PATH_STYLE` | Provider-specific boolean; defaults to `false`. |
| `SMARTCHECK_IMPORT_ENABLED` | Defaults to `false`; enable only with approved pilot access. |
| `SMARTCHECK_PILOT_COMPANY_IDS` | Approved tenant IDs; empty is permitted only while HTTP import is disabled. Production preflight rejects enabled imports with an empty allowlist. |
| `SOURCE_COMMIT`, `IMAGE_TAG` | Set to the reviewed release source/tag for health reporting and distinguishable image artifacts. |

The database identity is intentionally fixed: host `postgres`, port `5432`, database
`bimmetraj_production`, user `bimmetraj`. Both runtime URLs and the migration URL
reuse `SERVICE_PASSWORD_64_POSTGRES`. Preserve its saved value across deployments;
changing it on an existing PostgreSQL volume requires a coordinated database
password change. The one-shot migration service gets only its own
release settings, including `RELEASE_ALLOW_PRODUCTION=true` and the matching
`RELEASE_EXPECTED_HOST`, `RELEASE_EXPECTED_DATABASE`, `RELEASE_EXPECTED_USER` tuple.
It does not receive provider or JWT secrets. App and both workers wait for a healthy
PostgreSQL service and a successfully completed migration; migration failure must
stop startup, never be bypassed. Before applying to an existing volume, take the
reviewed backup and migration compatibility checks described below.

`AUTH_EMAIL_DELIVERY_MODE=disabled` is explicit for the app and workers while the
email provider decision is deferred. New email-dependent operations return 503;
this is not an email-enabled release. `SMARTCHECK_IFC_ENGINE=ifcopenshell` and the
shared `teklifpro_queue` schema are explicit. Resource/security limits match the
local example, including non-root images, read-only runtime roots, dropped
capabilities and bounded tmpfs. The `postgres-data` volume is durable storage,
not a backup. Keep the same Coolify resource/project identity across upgrades so
a changed Compose project name does not silently point at a new empty volume.

Local configuration validation on 2026-10-11 used only fabricated environment
values and `docker compose --env-file /dev/null -f compose.coolify.yaml config
--quiet`. Parsed-config assertions verified all five services, migration gates,
email/IFC mode, shared queue schema and absence of host ports/env files. Removing
the object-storage secret caused configuration to fail as intended. No service was
started and no expanded secret-bearing configuration was printed. Production S3
provisioning, migration execution, container runtime acceptance and deployment are
separate pending evidence.

## Environment Separation (Local Example)

Keep untracked, access-restricted `.env.app`, `.env.worker`, `.env.postgres`
outside source control. Docker build context excludes env files and private keys.
Use Coolify runtime secrets or an equivalent secret store, never build args.

- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Both app and worker: `DATABASE_URL` pointing to the Compose `postgres` service,
  `JWT_SECRET` (non-placeholder, at least 32 characters), `PUBLIC_APP_URL` (HTTPS),
  and valid `TRUST_PROXY_HOPS` (1-3). Shared production preflight is enforced.
- Email: `AUTH_EMAIL_DELIVERY_MODE=webhook` is the default and requires an HTTPS
  `AUTH_EMAIL_WEBHOOK_URL` and non-placeholder 32+ character
  `AUTH_EMAIL_WEBHOOK_SECRET` in production. While provider selection is deferred,
  explicitly set `AUTH_EMAIL_DELIVERY_MODE=disabled` in both app/worker runtime
  environments. This permits startup without email credentials; registration,
  new invitations, verification resend and reset-email requests return HTTP 503
  `EMAIL_DELIVERY_DISABLED` before account/token/invitation or rate-limit writes.
  No delivery success or development link is returned in disabled mode. Existing
  login/core work and consumption of already-issued valid links remain available.
  Missing settings in the default webhook mode still fail production preflight.
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
   `docker build --target worker -t teklifpro-worker:local .`,
   `docker build --target ifc-worker -t teklifpro-ifc-worker:local .`, and
   `docker build --target migrate -t teklifpro-migrate:local .`.
   Reuse the same builder/cache; these targets share a single source build stage.
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
the Graphile connection pool at concurrency + 2. The processor's separate Drizzle pool follows `PG_POOL_MAX` (four in Compose). Worker may run Graphile's own
schema initialization; the runtime DB role therefore needs the corresponding
reviewed privileges.

Enqueue and worker must use the same validated `GRAPHILE_WORKER_SCHEMA`.
Compose explicitly configures worker schemas as `teklifpro_queue`; set this same
value in `.env.app`. Never mix defaults between the app and workers. The app initializes Graphile's schema before its first run
request, so its DB role also needs the reviewed migration privileges. Run,
document status, audit and Graphile `add_job` commit in one database transaction.
Queue or audit failures roll everything back; retrying the HTTP request is safe.
Tenant/document locks serialize simultaneous process/retry requests. IFC admission
counts active reservations along with successful consumption before enqueue;
successful usage is consumed once in the run completion transaction.

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

The app alone uses `deploy/chromium-seccomp.json`. Its default action and all 60
upstream rules are preserved from Docker/Moby's
[default profile at commit 6fe7deb1b9fb7c0397a4593480d7d22b9ee8caef](https://github.com/moby/profiles/blob/6fe7deb1b9fb7c0397a4593480d7d22b9ee8caef/seccomp/default.json).
Upstream file SHA256: `6416b47770785a41ac59073cdc77d9fe98517df2799dc83ef207e622de3053f6`.
The only additions are unconditional syscall permits for `clone`, `setns`,
`unshare` (the [official Playwright sandbox pattern](https://playwright.dev/docs/docker#crawling-and-scraping))
and `chroot`. The latter permits Chromium to complete its chroot inside its new
user namespace under `cap_drop: ALL`; it grants no host/container capability.
`clone3` retains the upstream ENOSYS rule. This expands these four syscall
permissions for the app container, so keep the profile app-only and review it
when updating Docker/Chromium. Workers and PostgreSQL retain their default
profiles. No global daemon, sysctl or AppArmor policy changes are required by
this setup.

Committed profile SHA256:
`be5d68008bb4bb67f5eb662fc1d18d0013bbd390e2641290bbc6d7ae44c9e4ce`.

For local Compose the default path is `./deploy/chromium-seccomp.json`. For
Coolify, install the reviewed file on the **Docker daemon host** before deploying;
a checkout inside Coolify's helper container is not necessarily a persistent host
path. The default is `/data/bimmetraj/security/chromium-seccomp.json`, overridden
only by `CHROMIUM_SECCOMP_PROFILE`. After copying the exact reviewed repository
file to the host, an operator can install it using:

```bash
sudo install -d -m 0755 /data/bimmetraj/security
sudo install -m 0644 deploy/chromium-seccomp.json /data/bimmetraj/security/chromium-seccomp.json
sha256sum /data/bimmetraj/security/chromium-seccomp.json
```

Compare the printed hash with the committed hash above before deployment.
Keep the file root-owned and non-writable by the application. Docker fails closed
if the configured profile is missing. Apply the profile by recreating only the
app through the normal reviewed deployment; do not modify Docker's global default.

On 2026-10-11 the production host allowed unprivileged user namespaces, but the
unmodified Docker seccomp policy blocked sandbox startup (`Operation not
permitted`). The three Playwright syscall exceptions advanced startup to
`sys_chroot` failure; adding only the fourth exception resolved it. A separate,
network-disabled Bimmetraj acceptance container using the deployed app image,
UID 1000, `cap_drop: ALL`, `no-new-privileges`, read-only root filesystem, bounded
tmpfs and 256 MiB shared memory passed **5/5 real renderer tests**: default PDF,
three quotation templates including Turkish text/literal injection content,
and remote/local-resource blocking. No sandbox-disable flags, privileged mode,
or capability grants were used. Evidence: `/tmp/bimmetraj-pdf-seccomp-v2-20261011.log`
on the deployment host. This is isolated image/profile acceptance; verify the
app's effective `HostConfig.SecurityOpt` and repeat the renderer smoke after the
profile is wired into the deployed service. The previously recorded Docker Desktop
failure used the unmodified default profile and does not prove acceptance there.

## Storage, Parsers And Quotas

Local and S3 buffered reads default to a 30-second deadline, including the S3
request, and a 100 MiB cap. Callers can reduce the cap; explicit deadlines may
not exceed 120 seconds. Streams are destroyed on cancellation, oversize or failure.
IFC upload completion and disk downloads also use a deadline/abort and byte limit;
checksum verification remains mandatory. Disk download avoids an IFC-sized Node
buffer, but `/tmp` uses container memory in this example. Buffered reads may retain
chunks and the final buffer concurrently, so budget beyond the file size itself.

Spreadsheet admission is capped at 25 MiB; ZIP metadata is checked for inflated
size, excessive entries and compression ratio. Preview and processing parse in a
separate Node child with a 256 MiB V8 heap and 30-second deadline, at most two per
parent process. `dist/spreadsheet-worker.cjs` must ship with the app and workers.
The heap bound excludes native buffers/process overhead; container limits remain
necessary. Overload is rejected instead of forming an unbounded parse queue.

Compose explicitly selects `SMARTCHECK_IFC_ENGINE=ifcopenshell`. Set that value
in any deployment outside Compose too; do not rely on a legacy parser default.
Legacy/shadow modes must not be assumed to have Python process isolation.
Python extraction has a 600-second default deadline with terminate/kill escalation.
The 2 GiB container cap covers Node, Python and tmpfs together. Actual large-file
RSS, runtime and concurrent upload performance remain release measurements.
Explicit supported IFC quantity units are normalized; ambiguous/unsupported
units fail closed. Derived formwork remains review-only metadata and cannot become
an approved billable quantity through the generic evidence transfer path.

PDF rendering has two active slots, a bounded waiting queue and admission deadline,
request-disconnect cancellation, and render/cleanup timeouts. Chromium's sandbox
and network denial remain mandatory. These safeguards do not resolve the host
sandbox acceptance failure documented above.

AI calls reserve monthly usage transactionally before provider work. Failed or
timed-out attempts retain their reservation because provider billing may already
have occurred. Missing/invalid/inactive subscription state fails closed. Upload
admission reserves tenant storage/count atomically (defaults: 2 GiB, 1,000 documents);
quota checks include incomplete uploads. The generic worker periodically removes
expired pending uploads only after signed URL TTL plus cleanup grace, retaining the
reservation if storage deletion fails. Successful IFC runs consume monthly usage
idempotently; the plan's unlimited sentinel is handled explicitly.

Crawler extraction accepts bounded live HTML table candidates with explicit
review provenance. Official CSB/TUIK adapters are unavailable until actual source
parsing/evidence is implemented; hardcoded values are not emitted. Old staging rows
without live extraction evidence cannot be approved. Fetch pins public DNS answers,
rejects redirects/private addresses, and caps body/deadline; HTML parsing has a
separate worker-thread deadline and memory budget. Batch scheduling holds a DB
advisory lock and checks completed nightly audit records across replicas/restarts.

## CI And Remaining Acceptance

`Verify` runs Python 3.11 IFC behavior tests alongside the TypeScript, migration
and browser checks. Container-affecting changes additionally build `app` and
`ifc-worker` using their shared Docker cache, then run network-disabled non-root
artifact/IfcOpenShell/CLI smoke checks. No image is pushed. These smokes require no
production DB, S3 or credentials, and do not claim a working Chromium sandbox,
full worker queue roundtrip, restore drill, or successful production deployment.
A GitHub Actions green run must still be collected for the exact release commit;
editing the workflow is not that evidence.

Coverage percentages have not been established for the complete product. Passing
test counts are not a coverage measurement. A local execution baseline can be
collected using Node 24's built-in runner:

```bash
node --import tsx --test --experimental-test-coverage \
  --test-coverage-include='src/**/*.ts' \
  --test-coverage-exclude='src/**/*.test.ts' 'src/**/*.test.ts'
```

Run this only against an explicitly isolated TeklifPro test database with the
same environment as the normal integration suite. This reports loaded source
coverage, not coverage of every unimported TS/TSX file. For an enforceable 80%
target, first establish a source-map-aware all-files baseline (for example c8 with
explicit TS/TSX include/exclude rules), separate browser-only code, and retain
line/branch/function reports. The Python CLI tests spawn subprocesses: instrument
and combine those subprocesses with coverage.py or the extractor coverage will be
misleading. No unmeasured 80% CI threshold or invented percentage is introduced.

`postgres-data` is persistence, not backup. Before release, require a scheduled
encrypted off-host DB backup, a tested restore into a different database, and
S3 versioning/retention/lifecycle and restore evidence. None is supplied by this
Compose example. Keep previous image digests and migration compatibility notes;
rollback must stop new writes/jobs before a reviewed DB restore or image rollback.

## Compose PostgreSQL Logical Backups

Coolify's installed `ScheduledDatabaseBackup` runner accepts standalone databases
and `ServiceDatabase`, not a Git Application's Compose PostgreSQL. The application's
Storage backup archives volumes; do not treat a live PGDATA archive as a consistent
logical backup. Use the dedicated `backup` service and Coolify **Scheduled Tasks**.

The service uses PostgreSQL 16 `pg_dump`/`pg_restore` plus Debian's packaged AWS CLI.
It has no Docker socket or PostgreSQL volume mount. UID 10001, read-only root,
capability drop, no-new-privileges, 512 MiB memory and 0.5 CPU limits apply. Only
`backup-data:/backups` is writable persistently; `/tmp` is bounded. Its idle process
does not initiate work before a schedule exists. Empty backup credentials do not
block core deployment, but the backup command fails closed before connecting.

Provision a **separate** R2 backup bucket named `bimmetraj-backups` or
`bimmetraj-backups-<suffix>`. Use a credential scoped to that bucket with read,
write, list and delete permissions. Do not reuse application upload credentials
or a broad account/Coolify credential. Configure runtime-only variables:

- `BACKUP_S3_BUCKET`
- `BACKUP_S3_ENDPOINT`: `https://<account>.r2.cloudflarestorage.com`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`

Region is fixed to R2's `auto`; object prefix is fixed to `bimmetraj/postgres/`.
Database host/user/name/port are pinned to `postgres`/`bimmetraj`/
`bimmetraj_production`/5432. Secrets are passed through environment, never command
arguments or output. Keep all Coolify secret variables unavailable at build time.
The existing Coolify S3 configuration can identify the R2 provider/backup bucket
policy, but its stored credential is not automatically injected into this service.

Create one Coolify Application Scheduled Task:

- Container: `backup` (service prefix, not a timestamped container name).
- Command: `/usr/local/bin/bimmetraj-backup`.
- Daily schedule: 00:30 UTC / 03:30 Europe/Istanbul; confirm the scheduler timezone.
- Timeout: 3600 seconds. Enable task-failure notifications.

The command obtains an exclusive file lock; creates a custom-format consistent
`pg_dump --no-owner --no-acl`; validates its archive listing; writes a SHA256 JSON
manifest; uploads then downloads and re-hashes the complete dump; publishes the
completion manifest; and only then applies retention. Remote retention is 14 days,
local retention 7 days, restricted to exact generated filenames under the fixed
prefix. Interrupted upload has no remote completion manifest and must not count
as a valid backup. Failed runs remove only their newly created local dump/manifest
to avoid disk growth during R2 outages; previous successful backups are retained. Failure logs are deliberately generic to prevent CLI output
from leaking credentials or tenant data. Inspect task status, disk free space and
connectivity without printing environment values. Budget local disk for seven
full dumps plus one dump/download pair; monitor capacity and missing backups.
No disk quota or off-host encryption key management is supplied by this service;
confirm the backup store's encryption/access policies before launch.

Acceptance requires more than creating a schedule:

1. Run the task manually and retain its successful execution record, object key,
   SHA256 and byte size. Do not log credentials or actual database contents.
2. Download the dump and completion manifest from R2, verify SHA256, then restore
   using PostgreSQL 16 into a **separate explicitly named disposable database**.
   Use `pg_restore --exit-on-error --no-owner --no-acl` on that target only.
3. Compare release ledger and logical schema signature, critical table counts,
   tenant foreign-key relationships and representative application reads. Never
   restore into `bimmetraj_production` for a drill.
4. Remove only the owned disposable target, confirm the next real scheduled
   execution succeeds, and preserve restore/schedule evidence. Until then,
   scheduled backup and restore acceptance remain incomplete.

Local script regressions: `python3 -m unittest discover -s deploy/backup -p 'test_*.py'`.
They cover target validation, failure ordering, redacted errors, checksum gating
and retention scope; mocks do not establish real R2 or database restore readiness.
