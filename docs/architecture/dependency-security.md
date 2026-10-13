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

## Exceptions

None. The extract-zip findings (GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3) left
the dependency tree on 2026-10-13 when Puppeteer moved to 25.12.0, whose
`@puppeteer/browsers` 3.x unpacks with `modern-tar` instead of extract-zip.
`scripts/dependency-audit-policy.mjs` now blocks every high or critical
production finding and audit transport failures.

Deployment still installs Chromium from the operating-system package repository,
sets `PUPPETEER_EXECUTABLE_PATH` and `PUPPETEER_SKIP_DOWNLOAD=true`; the
Puppeteer install hook stays disabled in `pnpm-workspace.yaml`.

## Verification

Before the checkpoint: frozen install, lint, unit/integration suite, Prisma shadow
validation, ExcelJS roundtrip, proxy trust regression, production build and real
Chrome PDF/onboarding smoke must pass. CI execution on a remote runner is a
separate, unverified event until a push and run are explicitly performed.
