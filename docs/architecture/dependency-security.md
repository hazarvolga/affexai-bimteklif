# Dependency security checkpoint

Date: 2026-10-08. Package manager: pnpm 11.17.0. Runtime tested: Node 24.18.0.
The pnpm lockfile is canonical; the stale npm lockfile was removed.

## Changes

Compatible production dependency refresh and narrow transitive overrides replace
published vulnerable versions. Cross-major overrides for deepmerge-ts, basic-ftp
and uuid require compatibility checks, not just a passing audit. Shadcn is a
development CLI and is excluded from the production dependency set.

The original production audit reported 65 findings (1 critical, 32 high,
27 moderate, 5 low). The updated lockfile audit reports 2 high findings only.
This is not a zero-vulnerability declaration.

## Temporary exception

The two remaining findings concern extract-zip during Puppeteer's browser
download/unpack operation:

- https://github.com/advisories/GHSA-jmr9-qjv8-65gv
- https://github.com/advisories/GHSA-7pqw-9j4j-h8q3

On the checkpoint date npm lists 2.0.1 as latest; the advisory's 2.0.2 patch is
not published. Do not invent an installable version or replace it with an
unreviewed fork. Puppeteer's install hook is disabled in `pnpm-workspace.yaml`.
Deployment must install Chromium from the operating-system package repository,
set `PUPPETEER_EXECUTABLE_PATH`, and set `PUPPETEER_SKIP_DOWNLOAD=true`.
Application rendering calls launch, not archive download or extraction.
Never run `puppeteer browsers install` in deployment under this exception.

`scripts/dependency-audit-policy.mjs` permits only these two high findings on the
specific Puppeteer downloader path. Critical findings, other high findings,
additional vulnerable dependency paths and audit transport failures block CI.
The exception expires on 2026-10-22 UTC, after which the gate fails closed.
Recheck the upstream release and remove the exception when a verified patch is
published. This mitigation is not proof of production container isolation.

## Verification

Before the checkpoint: frozen install, lint, unit/integration suite, Prisma shadow
validation, ExcelJS roundtrip, proxy trust regression, production build and real
Chrome PDF/onboarding smoke must pass. CI execution on a remote runner is a
separate, unverified event until a push and run are explicitly performed.
