# Release Migration Lineage (Step 07)

This is a local preparation tool, not production deployment authorization.
Historical `drizzle/` migrations remain unchanged. Application schema changes are
limited to the five quota constraints represented by release migration `0002`.

**Production migration blocker:** the current runner intentionally accepts only
loopback connections to the three exact disposable database names below. It
rejects normal production names, the Compose `postgres` hostname, and the shared
`teklifpro_local` database as migration targets. There is no production migration
job in this implementation. The runtime image also omits the runner, release SQL,
snapshots and its development toolchain. Do not work around these guards by
renaming a production database or bypassing checks. A separately reviewed
production migration entrypoint/image, explicit target authorization, backup and
restore gate, and adoption procedure are required before deployment.

## Versioned Release Artifacts

- `drizzle-release/0000_baseline.sql`: 63-table baseline generated from
  `drizzle/meta/0036_snapshot.json` using Drizzle's structured snapshot API.
- `drizzle-release/0001_admin_billing.sql`: additive diff from that snapshot to
  the frozen 66-table schema. No users, privileges or demo data are seeded.
- `drizzle-release/0002_quota_constraints.sql`: unique company/period usage and
  nonnegative usage count, plan quota/price, and subscription bonus constraints.
- `drizzle-release/meta/`: snapshots and ordered journal.
- `drizzle-release/manifest.json`: SQL and snapshot SHA-256 checksums.

Future generation is database-free and append-only (run after a reviewed schema change):

```sh
pnpm exec tsx scripts/release-migrations/generate.ts --name=descriptive_name
pnpm exec tsx --test scripts/release-migrations/artifacts.test.ts scripts/release-migrations/safety.test.ts scripts/release-migrations/backup-docker.test.ts
pnpm exec tsc --noEmit -p scripts/release-migrations/tsconfig.json
```

Generation verifies existing checksums, diffs the latest structured snapshot, and
appends a new SQL file, snapshot, journal and checksum entry. Existing SQL/snapshots
are never rewritten; a no-change diff or existing output filename fails. Review
the generated SQL before application. Tests pin the original baseline/admin hashes.
The runner also requires an independently reviewed catalog pin in
`scripts/release-migrations/stage-signatures.ts`, bound to the stage index/tag and
both artifact hashes. Newly generated, unpinned stages cannot be applied. Establish
new pins by materializing the structured stage snapshot in an owned empty disposable
database, never by accepting a deployment candidate's catalog or ledger. The
lifecycle independently rebuilds every stage snapshot and verifies these pins.

Migration `0002` deliberately contains no data repair. Existing duplicate usage
company/period rows fail with PostgreSQL `23505`; negative quota/count/price/bonus
values fail with `23514`, naming the violated constraint. The entire pending batch
rolls back, including earlier constraints and ledger writes. Investigate and
separately authorize data remediation before retrying; do not delete/merge records
as part of migration. Zero values remain valid.

## Explicit Local Runner

```sh
pnpm exec tsx scripts/release-migrations/cli.ts plan
RELEASE_DATABASE_URL='postgresql://USER@127.0.0.1:5432/teklifpro_bootstrap_test' \
  pnpm exec tsx scripts/release-migrations/cli.ts apply
```

The target must already exist. Exact allowed targets are `teklifpro_bootstrap_test`,
`teklifpro_upgrade_test`, and `teklifpro_migration_restore_test`. No other database
name or remote endpoint is accepted. All URL query parameters are rejected;
effective pg settings and `current_database()`/`current_user` are checked. Local
Docker port-forwarded servers may report an internal server IP.

The first application requires an empty database. The separate
`teklifpro_release.migrations` ledger stores SQL hashes, full logical catalog
signatures and applied/adopted mode. Existing history is checked before applying
pending SQL, with an advisory transaction lock and timeouts. The pending batch
and ledger changes commit atomically; a failed statement rolls them all back.
Repeated execution is a no-op only when history and schema still match.
Every ledger row must match its release-pinned signature, and the current catalog
must match the pinned last stage, not a candidate-supplied ledger hash. Each newly
applied stage is checked against its pin before writing its ledger row; a mismatch
rolls back. A forged complete ledger cannot approve a drifted schema.

Do not run `drizzle-kit migrate` or `push` against this lineage. Its standard
snapshot/journal format is generation metadata; the guarded runner owns its
separate ledger. Historical `drizzle/` remains an audit trail, not the new-environment
release bootstrap. Historical 0028 is unjournaled, but its check constraint change
is also present in 0029; this lineage does not blindly replay it.

## Explicit Adoption

Ordinary apply refuses nonempty databases without a release ledger. For a reviewed
baseline63 candidate, use `adopt-baseline` with
`RELEASE_VERIFIED_BASELINE_SIGNATURE` obtained from an independently bootstrapped,
reviewed reference, not from the candidate's own `inspect` output. Missing or
different signatures fail before metadata is written. The adoption mode is recorded
explicitly. Normal apply then runs the additive migration.
Operator confirmation must equal the pinned baseline63 signature, and the actual
catalog must independently equal that same pin. Supplying head66's own signature
cannot relabel it as baseline63, nor can supplying the correct baseline signature
make a head66 catalog eligible.

This tool does not adopt arbitrary historical versions, partial ad-hoc admin/billing
changes, or head66 databases. It never auto-stamps them. Such states need a separately
reviewed reconciliation/adoption implementation. Production/shared databases are
not allowed targets even with an explicit signature.

## Disposable Validation

```sh
RELEASE_CONTROL_DATABASE_URL='postgresql://USER@127.0.0.1:5432/teklifpro_local' \
RELEASE_WRITE_REPORT=true \
RELEASE_POSTGRES_CONTAINER=teklifpro-postgres \
  pnpm exec tsx --test scripts/release-migrations/verify.integration.test.ts
```

Only this provisioning harness connects to `teklifpro_local`, for identity/catalog
reads and CREATE/DROP DATABASE of the three approved test names. It never changes
that database's schema or rows, and never connects to `postgres` maintenance.
All three names must be absent; it refuses pre-existing databases. Cleanup tracks
databases created by that invocation and checks their OIDs before dropping them;
it never force-terminates sessions or resets a pre-existing database.

Validation covers empty bootstrap, independently generated schema parity, additive
upgrade with synthetic data, idempotency, checksum/history rejection, schema drift,
transaction rollback, guarded adoption and CI schema-isolation compatibility.
Quota acceptance checks each of the five invalid legacy fixtures independently,
proves unchanged data/catalog/ledger on failure, then verifies all five write
guards plus valid zero values and independent tenant/period usage keys.
Expected logical catalogs include columns/types/defaults/nullability, relation
properties, constraints, indexes, enum order, sequences, triggers, policies,
views, functions and extensions. Physical column order is not a parity requirement.

The installed Drizzle push introspector drops bind parameters in this environment.
Verification therefore generates empty-to-current SQL using the structured API,
materializes it transactionally in a separate disposable database, and compares
its PostgreSQL catalog to baseline-plus-additive output. It does not copy a live
database or claim that a schema clone proves bootstrap.

Full synthetic backup/restore additionally requires matching PostgreSQL client
binaries. Set `PG_DUMP` and `PG_RESTORE` when they are not on PATH. Their absence
without a verified container fallback produces an explicit skipped check and
report limitation, not backup success. With the explicit
`RELEASE_POSTGRES_CONTAINER=teklifpro-postgres` opt-in, the fallback verifies the
exact running container name, `postgres:16` image, host port binding and server
system identifier through both connections. It uses the immutable container ID,
checks both client tool versions, and connects only to the named disposable source
and empty restore target. Custom-format archives travel in bounded process memory;
no container files are created. There are no restart or other-container actions.
The harness never reads customer data for backup. A successful synthetic restore
is still not production backup/S3/worker recovery evidence.

CI may provision `teklifpro_bootstrap_test` as its PostgreSQL service database,
run the guarded `apply` command, then set `DATABASE_URL` to that database for the
application test suite. The existing test-isolation helper allows exactly the
three test names plus its existing `teklifpro_local` target. CI must not run the
provisioning harness against its pre-created service database.

No app/worker is started by this tooling. Graphile Worker bootstrap, deployment
topology, and rollback of a deployed application remain separate release gates.

## Local Evidence (2026-10-08)

Artifact/safety/container unit tests: 6 passed. Disposable lifecycle: 15 passed,
zero skipped. Host PostgreSQL clients were unavailable; the verified dedicated
`teklifpro-postgres` container supplied PostgreSQL 16.15 `pg_dump`/`pg_restore`.
Synthetic full backup/restore passed schema, fixture data and ledger/idempotency
checks. The lifecycle also ran all five
test-isolation helper tests against the freshly bootstrapped disposable database.
See `generated/release-migrations-validation.json` for catalog signatures and
archive size. Focused TypeScript verification passed using the installed compiler
directly. No production restore claim is made; release artifacts await commit.

## Static Container Review (2026-10-08)

This review did not build images, start services or modify Docker/application
code. CI-equivalent `pnpm test` on a fresh head0002 database remains pending the
parent's quota GREEN signal; the focused lifecycle results above are not that run.

- **High: server artifacts share the public static directory.** Docker copies all
  `dist` into the image. The build puts `server.cjs`, its source map, and
  `worker.mjs` there, while `src/server/app.ts` serves `dist` with `express.static`.
  Unauthenticated requests can therefore retrieve backend bundles/source maps.
  Separate the browser asset directory from runtime server/worker output before
  deployment; verify those artifact URLs are not served.
- **Production migration path absent.** Compose waits only for PostgreSQL health,
  not completed application migrations. Its fresh volume cannot serve this app
  without the separately authorized production procedure described above.
- **PDF runtime gate remains open.** The sibling container deployment report
  records a Chromium namespace failure under the selected capability and
  no-new-privileges settings. Static review does not clear this host-policy gate;
  retain the sandbox and require a successful PDF smoke on the intended host.
- **Worker liveness is not job progress.** The worker image has no progress health
  check; `restart: unless-stopped` cannot detect an alive but stalled processor.
  Require queue-age/failure monitoring and an actual upload-to-result smoke.

The Compose memory budgets total 3 GiB before host overhead. Named-volume
persistence is not off-host backup. Both limitations are already documented in
`../deploy/container-app-worker.md` and remain deployment prerequisites.
