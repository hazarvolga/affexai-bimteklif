# Local PostgreSQL with Docker

This is the local-only PostgreSQL setup used to run TeklifPro DB-backed
integration tests.

## Current local target

`.env.local` points to:

```text
postgres://hazarekiz@localhost:5432/teklifpro_local
```

This database is local development/test infrastructure only. Do not point
staging or production at this URL.

## Docker Desktop setup

Docker Desktop may not expose `docker` on the shell `PATH`. On this machine the
bundled CLI is available at:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker
```

Start Docker Desktop first:

```bash
open -a Docker
```

Create the local Postgres container:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker run \
  --name teklifpro-postgres-local \
  -e POSTGRES_USER=hazarekiz \
  -e POSTGRES_DB=teklifpro_local \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 \
  -v teklifpro_postgres_local_data:/var/lib/postgresql/data \
  -d postgres:15
```

Check readiness:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker exec \
  teklifpro-postgres-local \
  pg_isready -U hazarekiz -d teklifpro_local
```

For later sessions, start the existing container instead of creating a new one:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker start teklifpro-postgres-local
```

## Bootstrap schema

The repository contains a pre-SmartCheck TeklifPro backup:

```text
backups/teklifpro_local_pre_smartcheck_20260719_114911.dump
```

Restore it into the empty local container:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker cp \
  backups/teklifpro_local_pre_smartcheck_20260719_114911.dump \
  teklifpro-postgres-local:/tmp/teklifpro_pre_smartcheck.dump

/Applications/Docker.app/Contents/Resources/bin/docker exec \
  teklifpro-postgres-local \
  pg_restore -U hazarekiz -d teklifpro_local --clean --if-exists \
  /tmp/teklifpro_pre_smartcheck.dump
```

Then apply the current Drizzle migrations:

```bash
pnpm exec drizzle-kit migrate --config=src/db/drizzle.config.ts
```

Expected post-migration smoke result:

- public tables: 63
- Drizzle migration rows: 35

## Verification

With the container running, DB-backed integration tests should run instead of
skipping:

```bash
pnpm exec tsx --test \
  src/server/routes/pricing.integration.test.ts \
  src/server/routes/market-intelligence.integration.test.ts \
  src/server/routes/pilot-evidence.integration.test.ts \
  src/server/routes/regulation-impact.integration.test.ts \
  src/server/routes/regulations.integration.test.ts \
  src/server/routes/source-intelligence.integration.test.ts \
  src/server/routes/smartcheck.integration.test.ts
```

Expected result after the IFC HTTP fixture fix:

- tests: 8
- pass: 8
- skipped: 0
